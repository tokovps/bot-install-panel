const Payment = require('../models/Payment');
const ApiKey = require('../models/ApiKey');
const Merchant = require('../models/Merchant');
const env = require('../config/env');
const { encryptText, decryptText, randomToken, sha256 } = require('../utils/crypto');
const { createPayment, syncPayment } = require('../services/payment');

async function index(req, res) {
  const merchantId = req.merchant._id;
  const [summary, recent] = await Promise.all([
    Payment.aggregate([
      { $match: { merchantId } },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
        pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        paidAmount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } }
      } }
    ]),
    Payment.find({ merchantId }).sort({ createdAt: -1 }).limit(7).lean()
  ]);
  res.render('dashboard/index', {
    title: 'Dashboard',
    summary: summary[0] || { total: 0, paidCount: 0, pendingCount: 0, paidAmount: 0 },
    recent
  });
}

async function transactions(req, res) {
  const query = { merchantId: req.merchant._id };
  if (req.query.status && ['pending', 'paid', 'expired', 'failed', 'refunded'].includes(req.query.status)) query.status = req.query.status;
  if (req.query.q) query.$or = [
    { orderId: new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    { description: new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
  ];
  const payments = await Payment.find(query).sort({ createdAt: -1 }).limit(100).lean();
  res.render('dashboard/transactions', { title: 'Transaksi', payments, filters: req.query });
}

function newPayment(req, res) {
  res.render('dashboard/new-payment', { title: 'Buat Pembayaran', error: null });
}

async function createPaymentFromForm(req, res) {
  try {
    const amount = Number(req.body.amount);
    if (!req.body.orderId || !Number.isInteger(amount) || amount < 1000) throw new Error('Order ID dan nominal minimal Rp1.000 wajib diisi');
    const payment = await createPayment({
      merchant: req.merchant,
      input: {
        orderId: String(req.body.orderId).trim(),
        amount,
        description: String(req.body.description || 'Pembayaran').trim(),
        customer: {
          name: String(req.body.customerName || '').trim(),
          email: String(req.body.customerEmail || '').trim(),
          phone: String(req.body.customerPhone || '').trim()
        },
        callbackUrl: String(req.body.callbackUrl || '').trim()
      }
    });
    res.redirect(`/dashboard/payments/${payment.publicId}`);
  } catch (error) {
    res.status(400).render('dashboard/new-payment', { title: 'Buat Pembayaran', error: error.message });
  }
}

async function paymentDetail(req, res) {
  const payment = await Payment.findOne({ merchantId: req.merchant._id, publicId: req.params.publicId }).lean();
  if (!payment) return res.status(404).render('errors/generic', { title: 'Tidak ditemukan', message: 'Pembayaran tidak ditemukan.' });
  res.render('dashboard/payment-detail', { title: payment.orderId, payment });
}

async function syncPaymentFromDashboard(req, res) {
  const payment = await Payment.findOne({ merchantId: req.merchant._id, publicId: req.params.publicId });
  if (!payment) return res.status(404).render('errors/generic', { title: 'Tidak ditemukan', message: 'Pembayaran tidak ditemukan.' });
  try {
    await syncPayment(req.merchant, payment);
    res.redirect(`/dashboard/payments/${payment.publicId}?synced=1`);
  } catch (error) {
    res.redirect(`/dashboard/payments/${payment.publicId}?sync_error=${encodeURIComponent(error.message)}`);
  }
}

function integration(req, res) {
  let clientKeyMasked = '';
  if (req.merchant.midtransClientKeyEncrypted) {
    try {
      const key = decryptText(req.merchant.midtransClientKeyEncrypted, env.encryptionKey);
      clientKeyMasked = `${key.slice(0, 8)}••••••••${key.slice(-4)}`;
    } catch { clientKeyMasked = 'Tersimpan'; }
  }
  res.render('dashboard/integration', {
    title: 'Integrasi',
    saved: req.query.saved === '1',
    welcome: req.query.welcome === '1',
    clientKeyMasked,
    webhookUrl: `${env.appUrl}/api/webhooks/midtrans/${req.merchant._id}`
  });
}

async function saveIntegration(req, res) {
  const update = {
    businessName: String(req.body.businessName || '').trim(),
    phone: String(req.body.phone || '').trim(),
    midtransEnvironment: req.body.midtransEnvironment === 'production' ? 'production' : 'sandbox',
    defaultCallbackUrl: String(req.body.defaultCallbackUrl || '').trim(),
    invoiceExpiryMinutes: Math.max(5, Math.min(10080, Number(req.body.invoiceExpiryMinutes || 30)))
  };
  if (req.body.serverKey) update.midtransServerKeyEncrypted = encryptText(String(req.body.serverKey).trim(), env.encryptionKey);
  if (req.body.clientKey) update.midtransClientKeyEncrypted = encryptText(String(req.body.clientKey).trim(), env.encryptionKey);
  const configured = Boolean(update.midtransServerKeyEncrypted || req.merchant.midtransServerKeyEncrypted);
  update.isConfigured = configured;
  await Merchant.findByIdAndUpdate(req.merchant._id, update);
  res.redirect('/dashboard/integration?saved=1');
}

async function apiKeys(req, res) {
  const keys = await ApiKey.find({ merchantId: req.merchant._id }).sort({ createdAt: -1 }).lean();
  res.render('dashboard/api-keys', { title: 'API Key', keys, newKey: req.query.newKey || '' });
}

async function createApiKey(req, res) {
  const secret = randomToken(24);
  const rawKey = `mf_${req.merchant.midtransEnvironment === 'production' ? 'live' : 'test'}_${secret}`;
  await ApiKey.create({
    merchantId: req.merchant._id,
    name: String(req.body.name || 'Default API Key').trim().slice(0, 60),
    prefix: rawKey.slice(0, 16),
    keyHash: sha256(rawKey)
  });
  res.redirect(`/dashboard/api-keys?newKey=${encodeURIComponent(rawKey)}`);
}

async function revokeApiKey(req, res) {
  await ApiKey.findOneAndUpdate({ _id: req.params.id, merchantId: req.merchant._id }, { revokedAt: new Date() });
  res.redirect('/dashboard/api-keys');
}

module.exports = {
  index, transactions, newPayment, createPaymentFromForm, paymentDetail, syncPaymentFromDashboard,
  integration, saveIntegration, apiKeys, createApiKey, revokeApiKey
};
