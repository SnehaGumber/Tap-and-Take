'use strict';

const express = require('express');
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { idParam } = require('../validators/common');
const { listProductsQuery } = require('../validators/productValidator');
const { listOrdersQuery, updateItemStatusSchema } = require('../validators/orderValidator');
const {
  listUsersQuery,
  updateUserStatusSchema,
  updateUserRoleSchema,
  updateSellerStatusSchema,
} = require('../validators/adminValidator');

const router = express.Router();

// Platform wide access - admins only.
router.use(protect, authorize('admin'));

router.get('/dashboard', adminController.getDashboard);

router.get('/users', validate({ query: listUsersQuery }), adminController.listUsers);
router.get('/users/:id', validate({ params: idParam }), adminController.getUser);
router.patch(
  '/users/:id/status',
  validate({ params: idParam, body: updateUserStatusSchema }),
  adminController.setUserActive
);
router.patch(
  '/users/:id/role',
  validate({ params: idParam, body: updateUserRoleSchema }),
  adminController.setUserRole
);
router.patch(
  '/sellers/:id/status',
  validate({ params: idParam, body: updateSellerStatusSchema }),
  adminController.setSellerStatus
);
router.delete('/users/:id', validate({ params: idParam }), adminController.deleteUser);

router.get('/products', validate({ query: listProductsQuery }), adminController.listProducts);
router.get('/products/low-stock', adminController.getLowStock);

router.get('/orders', validate({ query: listOrdersQuery }), adminController.listOrders);
router.get('/orders/:id', validate({ params: idParam }), adminController.getOrder);
router.patch('/orders/:id/cancel', validate({ params: idParam }), adminController.cancelOrder);
router.patch(
  '/orders/:id/items/:itemId/status',
  validate({ body: updateItemStatusSchema }),
  adminController.updateItemStatus
);

module.exports = router;
