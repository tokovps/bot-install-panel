const mongoose = require('mongoose');

const merchantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  businessName: { type: String, trim: true, maxlength: 100, default: '' },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  midtransEnvironment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
  midtransServerKeyEncrypted: { type: String, default: null },
  midtransClientKeyEncrypted: { type: String, default: null },
  defaultCallbackUrl: { type: String, trim: true, default: '' },
  webhookSecret: { type: String, required: true },
  invoiceExpiryMinutes: { type: Number, min: 5, max: 10080, default: 30 },
  isConfigured: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Merchant', merchantSchema);
