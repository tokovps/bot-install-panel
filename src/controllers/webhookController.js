const crypto = require('crypto');
const Merchant = require('../models/Merchant');
const Payment = require('../models/Payment');
const WebhookEvent = require('../models/WebhookEvent');
const { verifyNotification, mapStatus } = require('../services/midtrans');
const { sendMerchantCallback } = require('../services/callback');

async function midtrans(req, res) {
  const merchant = await Merchant.findById(req.params.merchantId);
  if (!merchant) return res.status(404).json({ ok: false });

  const payload = req.body || {};
  const signatureValid = verifyNotification(payload, merchant);
  if (!signatureValid) return res.status(401).json({ ok: false, error: 'invalid signature' });

  const eventKey = crypto.createHash('sha256').update([
    merchant._id,
    payload.transaction_id || '',
    payload.order_id || '',
    payload.transaction_status || '',
    payload.status_code || ''
  ].join(':')).digest('hex');

  try {
    await WebhookEvent.create({
      merchantId: merchant._id,
      eventKey,
      orderId: payload.order_id,
      transactionStatus: payload.transaction_status,
      signatureValid,
      payload
    });
  } catch (error) {
    if (error.code === 11000) return res.status(200).json({ ok: true, duplicate: true });
    throw error;
  }

  const payment = await Payment.findOne({ merchantId: merchant._id, orderId: payload.order_id });
  if (!payment) return res.status(200).json({ ok: true, unmatched: true });

  const previousStatus = payment.status;
  payment.providerStatus = payload.transaction_status || payment.providerStatus;
  payment.paymentType = payload.payment_type || payment.paymentType;
  const statusRank = { pending: 0, failed: 1, expired: 1, paid: 2, refunded: 3 };
  let nextStatus = mapStatus(payment.providerStatus);
  if (nextStatus === 'paid' && payload.fraud_status && String(payload.fraud_status).toLowerCase() !== 'accept') {
    nextStatus = 'pending';
  }
  if ((statusRank[nextStatus] ?? 0) >= (statusRank[payment.status] ?? 0)) payment.status = nextStatus;
  payment.midtransTransactionId = payload.transaction_id || payment.midtransTransactionId;
  payment.providerResponse = payload;
  payment.lastSyncedAt = new Date();
  if (payment.status === 'paid' && !payment.paidAt) payment.paidAt = payload.settlement_time ? new Date(payload.settlement_time.replace(' ', 'T') + '+07:00') : new Date();
  await payment.save();

  if (payment.status !== previousStatus) {
    payment.callbackAttempts += 1;
    const callback = await sendMerchantCallback(merchant, payment);
    payment.callbackState = callback.sent ? 'sent' : (callback.skipped ? 'not_sent' : 'failed');
    await payment.save();
  }

  await WebhookEvent.updateOne({ eventKey }, { processedAt: new Date() });
  res.status(200).json({ ok: true });
}

module.exports = { midtrans };
