'use strict';

require('dotenv').config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nodeEnv = process.env.NODE_ENV || 'development';

const rawJwtSecret = process.env.JWT_SECRET;
let jwtSecret = rawJwtSecret;

if (!jwtSecret) {
  if (nodeEnv === 'test') {
    jwtSecret = 'tap-and-take-test-secret-do-not-use-in-production';
  } else {
    throw new Error(
      'Missing JWT_SECRET environment variable. Copy backend/.env.example to backend/.env and set JWT_SECRET.'
    );
  }
}

const clientUrls = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: toNumber(process.env.PORT, 5000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tap-and-take',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrls,
  clientUrl: clientUrls[0],
  currency: (process.env.CURRENCY || 'usd').toLowerCase(),
  taxRate: toNumber(process.env.TAX_RATE, 0.08),
  shippingFlat: toNumber(process.env.SHIPPING_FLAT, 6.99),
  freeShippingThreshold: toNumber(process.env.FREE_SHIPPING_THRESHOLD, 75),
  lowStockThreshold: toNumber(process.env.LOW_STOCK_THRESHOLD, 5),
  seedPassword: process.env.SEED_PASSWORD || 'Tap & Take@123',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
};

env.isStripeConfigured = Boolean(env.stripe.secretKey);

module.exports = env;
