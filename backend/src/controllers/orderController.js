'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const orderService = require('../services/orderService');

const getCheckoutSummary = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Checkout summary',
    data: await orderService.getCheckoutSummary(req.user._id, {
      couponCode: req.query.coupon || '',
    }),
  })
);

const createOrder = asyncHandler(async (req, res) =>
  sendCreated(res, {
    message: 'Order created',
    data: await orderService.createOrder(req.user._id, req.body),
  })
);

const listMyOrders = asyncHandler(async (req, res) => {
  const { orders, meta } = await orderService.listMyOrders(req.user._id, req.query);
  return sendSuccess(res, { message: 'Orders', data: { orders }, meta });
});

const getOrder = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Order details',
    data: { order: await orderService.getOrderForCustomer(req.user._id, req.params.id) },
  })
);

const cancelOrder = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Order cancelled',
    data: { order: await orderService.cancelOrder(req.user._id, req.params.id) },
  })
);

module.exports = { getCheckoutSummary, createOrder, listMyOrders, getOrder, cancelOrder };
