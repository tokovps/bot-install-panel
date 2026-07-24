const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  publicId: { type: String, required: true, unique: true, index: true },
  orderId: { type: String, required: true, trim: true, maxlength: 80 },
  amount: { type: Number, required: true, min: 1 },
  description: { type: String, trim: true, maxlength: 200, default: 'Pembayaran' },
  customer: {
    name: { type: String, trim: true, maxlength: 100, default: '' },
    email: { type: String, trim: true, maxlength: 150, default: '' },
    phone: { type: String, trim: true, maxlength: 30, default: '' }
  },
  status: { type: String, enum: ['pending', 'paid', 'expired', 'failed', 'refunded'], default: 'pending', index: true },
  providerStatus: { type: String, default: 'pending' },
  paymentType: { type: String, default: 'gopay' },
  midtransTransactionId: { type: String, default: '' },
  qrUrl: { type: String, default: '' },
  deeplinkUrl: { type: String, default: '' },
  callbackUrl: { type: String, default: '' },
  expiresAt: { type: Date, required: true, index: true },
  paidAt: Date,
  lastSyncedAt: Date,
  providerResponse: mongoose.Schema.Types.Mixed,
  callbackState: { type: String, enum: ['not_sent', 'sent', 'failed'], default: 'not_sent' },
  callbackAttempts: { type: Number, default: 0 }
}, { timestamps: true });

paymentSchema.index({ merchantId: 1, orderId: 1 }, { unique: true });

module.exports = mongoose.model('Payment', paymentSchema);
