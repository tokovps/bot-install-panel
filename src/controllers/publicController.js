const Payment = require('../models/Payment');
const Merchant = require('../models/Merchant');

function landing(req, res) {
  res.render('landing', { title: 'Otomasi GoPay Merchant' });
}

async function checkout(req, res) {
  const payment = await Payment.findOne({ publicId: req.params.publicId }).lean();
  if (!payment) return res.status(404).render('errors/generic', { title: 'Invoice tidak ditemukan', message: 'Tautan pembayaran tidak tersedia.' });
  const merchant = await Merchant.findById(payment.merchantId).lean();
  res.render('pay/checkout', { title: `Bayar ${payment.orderId}`, payment, checkoutMerchant: merchant });
}

async function checkoutStatus(req, res) {
  const payment = await Payment.findOne({ publicId: req.params.publicId }).select('status providerStatus paidAt expiresAt').lean();
  if (!payment) return res.status(404).json({ success: false });
  res.json({ success: true, data: payment });
}

function docs(req, res) {
  res.render('docs', { title: 'Dokumentasi API' });
}

module.exports = { landing, checkout, checkoutStatus, docs };
