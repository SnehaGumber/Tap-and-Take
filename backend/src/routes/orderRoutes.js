'use strict';

const express = require('express');
const orderController = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { idParam } = require('../validators/common');
const { createOrderSchema, listOrdersQuery } = require('../validators/orderValidator');

const router = express.Router();

router.use(protect);

router.get('/checkout-summary', orderController.getCheckoutSummary);
router.get('/', validate({ query: listOrdersQuery }), orderController.listMyOrders);
router.post('/', validate({ body: createOrderSchema }), orderController.createOrder);
router.get('/:id', validate({ params: idParam }), orderController.getOrder);
router.patch('/:id/cancel', validate({ params: idParam }), orderController.cancelOrder);

module.exports = router;
