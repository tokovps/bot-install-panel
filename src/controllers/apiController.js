const { z } = require('zod');
const Payment = require('../models/Payment');
const { createPayment, syncPayment } = require('../services/payment');
const env = require('../config/env');

const createSchema = z.object({
  order_id: z.string().trim().min(1).max(80),
  amount: z.number().int().min(1000).max(1000000000),
  description: z.string().trim().max(200).optional(),
  customer: z.object({
    name: z.string().trim().max(100).optional(),
    email: z.string().trim().email().max(150).optional().or(z.literal('')),
    phone: z.string().trim().max(30).optional()
  }).optional(),
  callback_url: z.string().url().max(500).optional().or(z.literal(''))
});

function serialize(payment) {
  return {
    order_id: payment.orderId,
    public_id: payment.publicId,
    status: payment.status,
    provider_status: payment.providerStatus,
    amount: payment.amount,
    description: payment.description,
    payment_type: payment.paymentType,
    transaction_id: payment.midtransTransactionId,
    qr_url: payment.qrUrl,
    deeplink_url: payment.deeplinkUrl,
    checkout_url: `${env.appUrl}/pay/${payment.publicId}`,
    expires_at: payment.expiresAt,
    paid_at: payment.paidAt || null,
    created_at: payment.createdAt
  };
}

async function create(req, res) {
  try {
    const data = createSchema.parse(req.body);
    const payment = await createPayment({
      merchant: req.merchant,
      input: {
        orderId: data.order_id,
        amount: data.amount,
        description: data.description,
        customer: data.customer,
        callbackUrl: data.callback_url
      }
    });
    res.status(201).json({ success: true, data: serialize(payment) });
  } catch (error) {
    const duplicate = error?.code === 11000;
    res.status(duplicate ? 409 : 400).json({
      success: false,
      error: duplicate ? 'order_id sudah digunakan' : (error.issues?.[0]?.message || error.message)
    });
  }
}

async function status(req, res) {
  const payment = await Payment.findOne({ merchantId: req.merchant._id, orderId: req.params.orderId });
  if (!payment) return res.status(404).json({ success: false, error: 'Pembayaran tidak ditemukan' });
  res.json({ success: true, data: serialize(payment) });
}

async function sync(req, res) {
  const payment = await Payment.findOne({ merchantId: req.merchant._id, orderId: req.params.orderId });
  if (!payment) return res.status(404).json({ success: false, error: 'Pembayaran tidak ditemukan' });
  try {
    await syncPayment(req.merchant, payment);
    res.json({ success: true, data: serialize(payment) });
  } catch (error) {
    res.status(502).json({ success: false, error: error.message });
  }
}

module.exports = { create, status, sync };
