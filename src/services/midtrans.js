const crypto = require('crypto');
const env = require('../config/env');
const { decryptText, safeEqualHex } = require('../utils/crypto');

function apiBase(environment) {
  return environment === 'production'
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';
}

function getServerKey(merchant) {
  const key = decryptText(merchant.midtransServerKeyEncrypted, env.encryptionKey);
  if (!key) throw new Error('Server Key Midtrans belum dikonfigurasi');
  return key;
}

async function midtransRequest(merchant, path, options = {}) {
  const serverKey = getServerKey(merchant);
  const response = await fetch(`${apiBase(merchant.midtransEnvironment)}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(15000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.status_message || data.message || `Midtrans HTTP ${response.status}`);
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

async function createCharge(merchant, payment) {
  const notificationUrl = `${env.appUrl}/api/webhooks/midtrans/${merchant._id}`;
  const payload = {
    payment_type: 'gopay',
    transaction_details: {
      order_id: payment.orderId,
      gross_amount: payment.amount
    },
    item_details: [{
      id: payment.publicId,
      price: payment.amount,
      quantity: 1,
      name: payment.description.slice(0, 50)
    }],
    customer_details: {
      first_name: payment.customer?.name || 'Customer',
      email: payment.customer?.email || undefined,
      phone: payment.customer?.phone || undefined
    },
    gopay: {
      enable_callback: true,
      callback_url: `${env.appUrl}/pay/${payment.publicId}`
    },
    custom_expiry: {
      expiry_duration: merchant.invoiceExpiryMinutes,
      unit: 'minute'
    }
  };

  return midtransRequest(merchant, '/v2/charge', {
    method: 'POST',
    headers: {
      'Idempotency-Key': payment.publicId,
      'X-Override-Notification': notificationUrl
    },
    body: JSON.stringify(payload)
  });
}

async function getStatus(merchant, orderId) {
  return midtransRequest(merchant, `/v2/${encodeURIComponent(orderId)}/status`, { method: 'GET' });
}

function verifyNotification(payload, merchant) {
  const serverKey = getServerKey(merchant);
  const expected = crypto.createHash('sha512')
    .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`)
    .digest('hex');
  return safeEqualHex(expected, payload.signature_key || '');
}

function mapStatus(providerStatus) {
  if (['settlement', 'capture'].includes(providerStatus)) return 'paid';
  if (['expire'].includes(providerStatus)) return 'expired';
  if (['deny', 'cancel', 'failure'].includes(providerStatus)) return 'failed';
  if (['refund', 'partial_refund'].includes(providerStatus)) return 'refunded';
  return 'pending';
}

function actionUrl(actions = [], names = []) {
  for (const name of names) {
    const action = actions.find((item) => item.name === name);
    if (action?.url) return action.url;
  }
  return '';
}

module.exports = { createCharge, getStatus, verifyNotification, mapStatus, actionUrl };
