'use strict';

const express = require('express');
const cartController = require('../controllers/cartController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const {
  addToCartSchema,
  updateCartItemSchema,
  applyCouponSchema,
} = require('../validators/cartValidator');

const router = express.Router();

router.use(protect, authorize('customer', 'seller', 'admin'));

router.get('/', cartController.getCart);
router.post('/items', validate({ body: addToCartSchema }), cartController.addItem);
router.patch('/items/:productId', validate({ body: updateCartItemSchema }), cartController.updateItem);
router.delete('/items/:productId', cartController.removeItem);

// Save for later shelf
router.post('/items/:productId/save-for-later', cartController.saveForLater);
router.post('/saved/:productId/move-to-cart', cartController.moveSavedToCart);
router.delete('/saved/:productId', cartController.removeSaved);

// Coupons are validated server side against the live cart
router.post('/coupon', validate({ body: applyCouponSchema }), cartController.applyCoupon);

router.delete('/', cartController.clearCart);

module.exports = router;
