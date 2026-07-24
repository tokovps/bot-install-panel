const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  eventKey: { type: String, required: true, unique: true },
  orderId: { type: String, required: true, index: true },
  transactionStatus: { type: String, default: '' },
  signatureValid: { type: Boolean, default: false },
  payload: mongoose.Schema.Types.Mixed,
  processedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
