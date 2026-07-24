const express = require('express');
const auth = require('../controllers/authController');
const dashboard = require('../controllers/dashboardController');
const publicController = require('../controllers/publicController');
const { requireAuth } = require('../middleware/auth');
const { verifyCsrf } = require('../middleware/csrf');

const router = express.Router();
router.get('/', publicController.landing);
router.get('/docs', publicController.docs);
router.get('/login', auth.showLogin);
router.post('/login', verifyCsrf, auth.login);
router.get('/register', auth.showRegister);
router.post('/register', verifyCsrf, auth.register);
router.post('/logout', verifyCsrf, auth.logout);
router.get('/pay/:publicId', publicController.checkout);

router.get('/dashboard', requireAuth, dashboard.index);
router.get('/dashboard/transactions', requireAuth, dashboard.transactions);
router.get('/dashboard/payments/new', requireAuth, dashboard.newPayment);
router.post('/dashboard/payments', requireAuth, verifyCsrf, dashboard.createPaymentFromForm);
router.get('/dashboard/payments/:publicId', requireAuth, dashboard.paymentDetail);
router.post('/dashboard/payments/:publicId/sync', requireAuth, verifyCsrf, dashboard.syncPaymentFromDashboard);
router.get('/dashboard/integration', requireAuth, dashboard.integration);
router.post('/dashboard/integration', requireAuth, verifyCsrf, dashboard.saveIntegration);
router.get('/dashboard/api-keys', requireAuth, dashboard.apiKeys);
router.post('/dashboard/api-keys', requireAuth, verifyCsrf, dashboard.createApiKey);
router.post('/dashboard/api-keys/:id/revoke', requireAuth, verifyCsrf, dashboard.revokeApiKey);

module.exports = router;
