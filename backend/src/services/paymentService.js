'use strict';

const { stripe, isStripeConfigured } = require('../config/stripe');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { toMinorUnits } = require('../utils/pricing');
const logger = require('../utils/logger');

/**
 * Creates a Stripe PaymentIntent in TEST mode when Stripe keys are configured.
 * When they are not, the API falls back to a clearly labelled simulated payment
 * so the whole checkout flow stays testable locally.
 */
async function createPaymentIntent({
  amount,
  currency = env.currency,
  orderId,
  userId,
}) {
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    throw ApiError.badRequest('Invalid payment amount.');
  }

  if (!orderId || !userId) {
    throw ApiError.badRequest('Order ID and customer ID are required.');
  }

  if (!isStripeConfigured) {
    return {
      provider: 'simulated',
      paymentIntentId: `sim_${Date.now().toString(36)}`,
      clientSecret: null,
      simulated: true,
    };
  }

  const intent = await stripe.paymentIntents.create({
    amount: toMinorUnits(amount),
    currency: String(currency).toLowerCase(),
    metadata: {
      orderId: String(orderId),
      userId: String(userId),
    },
    payment_method_types: ['card'],
    description: 'Tap & Take order payment',
  });

  return {
    provider: 'stripe',
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
    simulated: false,
  };
}

async function retrievePaymentIntent(paymentIntentId) {
  if (!isStripeConfigured) throw ApiError.badRequest('Stripe is not configured on this server.');
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Server side confirmation using Stripe TEST payment methods.
 * Useful when the frontend has no publishable key configured.
 */
async function confirmTestPaymentIntent(paymentIntentId, outcome = 'success') {
  if (process.env.NODE_ENV === 'production') {
    throw ApiError.badRequest('Test payment confirmation is disabled in production.');
  }

  if (!isStripeConfigured) {
    throw ApiError.badRequest('Stripe is not configured on this server.');
  }

  if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
    throw ApiError.badRequest('Invalid Stripe PaymentIntent ID.');
  }

  if (!['success', 'failure'].includes(outcome)) {
    throw ApiError.badRequest('Invalid test payment outcome.');
  }

  const paymentMethod =
    outcome === 'failure' ? 'pm_card_chargeDeclined' : 'pm_card_visa';

  try {
    return await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethod,
      return_url: `${env.clientUrl}/payment-result`,
    });
  } catch (error) {
    logger.warn(`Stripe test confirmation failed: ${error.message}`);

    if (error.payment_intent) return error.payment_intent;

    throw new ApiError(402, error.message || 'Payment was declined.');
  }
}

async function cancelPaymentIntent(paymentIntentId) {
  if (!isStripeConfigured || !paymentIntentId || paymentIntentId.startsWith('sim_')) return null;
  try {
    return await stripe.paymentIntents.cancel(paymentIntentId);
  } catch (error) {
    logger.warn(`Unable to cancel payment intent ${paymentIntentId}: ${error.message}`);
    return null;
  }
}

function getPublicConfig() {
  return {
    stripeEnabled: isStripeConfigured,
    publishableKey: env.stripe.publishableKey || '',
    currency: env.currency,
    simulatedPayments: !isStripeConfigured,
  };
}

module.exports = {
  createPaymentIntent,
  retrievePaymentIntent,
  confirmTestPaymentIntent,
  cancelPaymentIntent,
  getPublicConfig,
  isStripeConfigured,
};
