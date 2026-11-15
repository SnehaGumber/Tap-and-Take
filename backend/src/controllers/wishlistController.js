'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const wishlistService = require('../services/wishlistService');

const getWishlist = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Wishlist',
    data: { wishlist: await wishlistService.getWishlist(req.user._id) },
  })
);

const addItem = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Added to wishlist',
    data: { wishlist: await wishlistService.addItem(req.user._id, req.body.productId) },
  })
);

const removeItem = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Removed from wishlist',
    data: { wishlist: await wishlistService.removeItem(req.user._id, req.params.productId) },
  })
);

const moveToCart = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Moved to cart',
    data: await wishlistService.moveToCart(req.user._id, req.params.productId, req.body?.quantity || 1),
  })
);

module.exports = { getWishlist, addItem, removeItem, moveToCart };
