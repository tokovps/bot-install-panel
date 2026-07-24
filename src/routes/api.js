const express = require('express');
const api = require('../controllers/apiController');
const webhook = require('../controllers/webhookController');
const publicController = require('../controllers/publicController');
const { requireApiKey } = require('../middleware/apiAuth');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();
router.get('/public/payments/:publicId/status', rateLimit({ limit: 120 }), publicController.checkoutStatus);
router.post('/webhooks/midtrans/:merchantId', rateLimit({ limit: 300 }), webhook.midtrans);
router.use('/v1', rateLimit({ limit: 120 }), requireApiKey);
router.post('/v1/payments', api.create);
router.get('/v1/payments/:orderId', api.status);
router.post('/v1/payments/:orderId/sync', api.sync);

module.exports = router;
