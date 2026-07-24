const crypto = require('crypto');
const Payment = require('../models/Payment');
const { createCharge, getStatus, mapStatus, actionUrl } = require('./midtrans');
const { sendMerchantCallback } = require('./callback');

function publicId() {
  return `pay_${Date.now().toString(36)}_${crypto.randomBytes(5).toString('hex')}`;
}

async function createPayment({ merchant, input }) {
  if (!merchant.isConfigured) throw new Error('Integrasi Midtrans belum dikonfigurasi');
  const expiresAt = new Date(Date.now() + merchant.invoiceExpiryMinutes * 60 * 1000);
  const payment = await Payment.create({
    merchantId: merchant._id,
    publicId: publicId(),
    orderId: input.orderId,
    amount: input.amount,
    description: input.description || 'Pembayaran',
    customer: input.customer || {},
    callbackUrl: input.callbackUrl || merchant.defaultCallbackUrl || '',
    expiresAt
  });

  try {
    const response = await createCharge(merchant, payment);
    payment.midtransTransactionId = response.transaction_id || '';
    payment.providerStatus = response.transaction_status || 'pending';
    payment.paymentType = response.payment_type || 'gopay';
    payment.qrUrl = actionUrl(response.actions, ['generate-qr-code-v2', 'generate-qr-code']);
    payment.deeplinkUrl = actionUrl(response.actions, ['deeplink-redirect']);
    payment.providerResponse = response;
    await payment.save();
    return payment;
  } catch (error) {
    payment.status = 'failed';
    payment.providerStatus = 'create_failed';
    payment.providerResponse = error.details || { message: error.message };
    await payment.save();
    throw error;
  }
}

async function syncPayment(merchant, payment) {
  const response = await getStatus(merchant, payment.orderId);
  const previousStatus = payment.status;
  payment.providerStatus = response.transaction_status || payment.providerStatus;
  payment.paymentType = response.payment_type || payment.paymentType;
  payment.status = mapStatus(payment.providerStatus);
  payment.midtransTransactionId = response.transaction_id || payment.midtransTransactionId;
  payment.lastSyncedAt = new Date();
  payment.providerResponse = response;
  if (payment.status === 'paid' && !payment.paidAt) payment.paidAt = new Date();
  await payment.save();

  if (payment.status !== previousStatus) {
    payment.callbackAttempts += 1;
    const callback = await sendMerchantCallback(merchant, payment);
    payment.callbackState = callback.sent ? 'sent' : (callback.skipped ? 'not_sent' : 'failed');
    await payment.save();
  }
  return payment;
}

module.exports = { createPayment, syncPayment };
