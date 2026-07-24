const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  prefix: { type: String, required: true, index: true },
  keyHash: { type: String, required: true, unique: true },
  lastUsedAt: Date,
  revokedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('ApiKey', apiKeySchema);
