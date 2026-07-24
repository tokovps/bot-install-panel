const crypto = require('crypto');
const { hmacSha256 } = require('../utils/crypto');

async function sendMerchantCallback(merchant, payment) {
  const callbackUrl = payment.callbackUrl || merchant.defaultCallbackUrl;
  if (!callbackUrl) return { sent: false, skipped: true };

  const eventId = crypto.randomUUID();
  const body = JSON.stringify({
    event: `payment.${payment.status}`,
    id: eventId,
    created_at: new Date().toISOString(),
    data: {
      order_id: payment.orderId,
      public_id: payment.publicId,
      status: payment.status,
      amount: payment.amount,
      payment_type: payment.paymentType,
      transaction_id: payment.midtransTransactionId,
      paid_at: payment.paidAt || null
    }
  });

  const signature = hmacSha256(body, merchant.webhookSecret);
  try {
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MerchantFlow-Webhook/1.0',
        'X-MerchantFlow-Event': `payment.${payment.status}`,
        'X-MerchantFlow-Delivery': eventId,
        'X-MerchantFlow-Signature': `sha256=${signature}`
      },
      body,
      signal: AbortSignal.timeout(3500)
    });
    return { sent: response.ok, status: response.status };
  } catch (error) {
    return { sent: false, error: error.message };
  }
}

module.exports = { sendMerchantCallback };
