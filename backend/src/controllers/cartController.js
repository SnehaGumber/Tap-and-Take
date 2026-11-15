'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const cartService = require('../services/cartService');

const getCart = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Cart',
    data: { cart: await cartService.getCart(req.user._id, { couponCode: req.query.coupon || '' }) },
  })
);

const addItem = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Added to cart',
    data: { cart: await cartService.addItem(req.user._id, req.body) },
  })
);

const updateItem = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Cart updated',
    data: { cart: await cartService.updateItem(req.user._id, req.params.productId, req.body.quantity) },
  })
);

const removeItem = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Item removed from cart',
    data: { cart: await cartService.removeItem(req.user._id, req.params.productId) },
  })
);

const clearCart = asyncHandler(async (req, res) =>
  sendSuccess(res, { message: 'Cart cleared', data: { cart: await cartService.clearCart(req.user._id) } })
);

const saveForLater = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Saved for later',
    data: { cart: await cartService.saveForLater(req.user._id, req.params.productId) },
  })
);

const moveSavedToCart = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Moved back to cart',
    data: { cart: await cartService.moveSavedToCart(req.user._id, req.params.productId) },
  })
);

const removeSaved = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Removed from saved items',
    data: { cart: await cartService.removeSaved(req.user._id, req.params.productId) },
  })
);

const applyCoupon = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Coupon applied',
    data: { cart: await cartService.previewCoupon(req.user._id, req.body.code) },
  })
);

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  saveForLater,
  moveSavedToCart,
  removeSaved,
  applyCoupon,
};
