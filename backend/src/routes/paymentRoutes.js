'use strict';

const express = require('express');
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { confirmPaymentSchema, simulatePaymentSchema } = require('../validators/orderValidator');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const router = express.Router();

router.get('/config', paymentController.getConfig);

router.use(protect);
router.get('/', paymentController.listMyPayments);
router.post('/confirm', validate({ body: confirmPaymentSchema }), paymentController.confirmPayment);

// Test-only endpoint: simulates payment confirmation without real Stripe charges.
// Disabled in production so customers cannot bypass the real payment flow.
router.post(
  '/test-pay',
  (req, _res, next) => {
    if (env.isProduction) return next(ApiError.notFound('Route not found'));
    return next();
  },
  validate({ body: simulatePaymentSchema }),
  paymentController.simulatePayment
);

module.exports = router;
