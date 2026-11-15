'use strict';

const express = require('express');
const sellerController = require('../controllers/sellerController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { idParam } = require('../validators/common');
const { listProductsQuery } = require('../validators/productValidator');
const { listOrdersQuery, updateItemStatusSchema } = require('../validators/orderValidator');
const { updateSellerProfileSchema } = require('../validators/adminValidator');

const router = express.Router();

// Every seller route is locked to the seller (or admin) role.
router.use(protect, authorize('seller', 'admin'));

router.get('/dashboard', sellerController.getDashboard);
router.get('/trust-score', sellerController.getTrustScore);
router.get('/products', validate({ query: listProductsQuery }), sellerController.listMyProducts);
router.get('/orders', validate({ query: listOrdersQuery }), sellerController.listMyOrders);
router.get('/orders/:id', validate({ params: idParam }), sellerController.getOrder);
router.patch(
  '/orders/:id/items/:itemId/status',
  validate({ body: updateItemStatusSchema }),
  sellerController.updateItemStatus
);
router.patch('/store', validate({ body: updateSellerProfileSchema }), sellerController.updateStore);

module.exports = router;
