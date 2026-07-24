const ApiKey = require('../models/ApiKey');
const Merchant = require('../models/Merchant');
const { sha256 } = require('../utils/crypto');

async function requireApiKey(req, res, next) {
  const rawKey = req.get('x-api-key') || '';
  if (!rawKey.startsWith('mf_')) {
    return res.status(401).json({ success: false, error: 'API key tidak valid' });
  }

  const record = await ApiKey.findOne({ keyHash: sha256(rawKey), revokedAt: null });
  if (!record) return res.status(401).json({ success: false, error: 'API key tidak valid atau sudah dicabut' });

  const merchant = await Merchant.findById(record.merchantId);
  if (!merchant) return res.status(401).json({ success: false, error: 'Merchant tidak ditemukan' });

  record.lastUsedAt = new Date();
  await record.save();
  req.apiKey = record;
  req.merchant = merchant;
  next();
}

module.exports = { requireApiKey };
