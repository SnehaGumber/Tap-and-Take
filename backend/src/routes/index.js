'use strict';

const express = require('express');
const env = require('../config/env');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Tap & Take API is healthy',
    data: {
      environment: env.nodeEnv,
      uptimeSeconds: Math.round(process.uptime()),
      integrations: {
        imageStorage: 'local',
        stripe: env.isStripeConfigured ? 'configured (test mode expected)' : 'not configured',
      },
      timestamp: new Date().toISOString(),
    },
  });
});

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/products', require('./productRoutes'));
router.use('/categories', require('./categoryRoutes'));
router.use('/cart', require('./cartRoutes'));
router.use('/wishlist', require('./wishlistRoutes'));
router.use('/addresses', require('./addressRoutes'));
router.use('/orders', require('./orderRoutes'));
router.use('/payments', require('./paymentRoutes'));
router.use('/reviews', require('./reviewRoutes'));
router.use('/seller', require('./sellerRoutes'));
router.use('/admin', require('./adminRoutes'));

module.exports = router;
