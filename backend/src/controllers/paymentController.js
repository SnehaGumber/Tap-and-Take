'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const paymentService = require('../services/paymentService');
const orderService = require('../services/orderService');
const { Payment } = require('../models');

const getConfig = asyncHandler(async (_req, res) =>
  sendSuccess(res, { message: 'Payment configuration', data: paymentService.getPublicConfig() })
);

const confirmPayment = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Payment confirmed',
    data: await orderService.confirmPayment(req.user._id, req.body),
  })
);

/** Test-mode helper so the checkout flow is demoable without Stripe Elements. */
const simulatePayment = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Payment processed',
    data: await orderService.simulatePayment(req.user._id, req.body),
  })
);

const listMyPayments = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Payments',
    data: {
      payments: await Payment.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('order', 'orderNumber status')
        .select('-__v')
        .lean(),
    },
  })
);

module.exports = { getConfig, confirmPayment, simulatePayment, listMyPayments };
