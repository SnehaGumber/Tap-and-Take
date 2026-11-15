'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const statsService = require('../services/statsService');
const productService = require('../services/productService');
const orderService = require('../services/orderService');
const authService = require('../services/authService');
const { getSellerTrustScore } = require('../services/sellerTrustService');

const getDashboard = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Seller dashboard',
    data: await statsService.getSellerDashboard(req.user._id),
  })
);

const listMyProducts = asyncHandler(async (req, res) => {
  const { products, meta } = await productService.listProducts(req.query, {
    sellerId: req.user._id,
    includeInactive: true,
  });
  return sendSuccess(res, { message: 'Seller products', data: { products }, meta });
});

const listMyOrders = asyncHandler(async (req, res) => {
  const { orders, meta } = await orderService.listSellerOrders(req.user._id, req.query);
  return sendSuccess(res, { message: 'Seller orders', data: { orders }, meta });
});

const getOrder = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Seller order',
    data: { order: await orderService.getSellerOrder(req.user._id, req.params.id) },
  })
);

const updateItemStatus = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Order item updated',
    data: {
      order: await orderService.updateItemStatus({
        orderId: req.params.id,
        itemId: req.params.itemId,
        actor: req.user,
        status: req.body.status,
        note: req.body.note,
      }),
    },
  })
);

const updateStore = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Store profile updated',
    data: { user: await authService.updateStore(req.user._id, req.body) },
  })
);

const getTrustScore = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Seller trust score',
    data: { trustScore: await getSellerTrustScore(req.user._id) },
  })
);

module.exports = { getDashboard, listMyProducts, listMyOrders, getOrder, updateItemStatus, updateStore, getTrustScore };
