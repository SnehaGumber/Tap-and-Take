'use strict';

const Stripe = require('stripe');
const env = require('./env');

const stripe = env.isStripeConfigured
  ? new Stripe(env.stripe.secretKey, { apiVersion: '2024-06-20' })
  : null;

module.exports = {
  stripe,
  isStripeConfigured: env.isStripeConfigured,
};
