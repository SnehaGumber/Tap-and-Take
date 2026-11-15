'use strict';

const express = require('express');
const wishlistController = require('../controllers/wishlistController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { addToCartSchema } = require('../validators/cartValidator');

const router = express.Router();

router.use(protect);

router.get('/', wishlistController.getWishlist);
router.post('/items', validate({ body: addToCartSchema }), wishlistController.addItem);
router.delete('/items/:productId', wishlistController.removeItem);
router.post('/items/:productId/move-to-cart', wishlistController.moveToCart);

module.exports = router;
