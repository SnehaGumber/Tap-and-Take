'use strict';

const { z, objectId, positiveIntString } = require('./common');

const createOrderSchema = z.object({
  addressId: objectId,
  paymentMethod: z.enum(['card', 'cod']),
  // Only the code is accepted - the discount itself is calculated on the server.
  couponCode: z.string().trim().max(24).optional(),
});

const confirmPaymentSchema = z.object({
  orderId: objectId,
  paymentIntentId: z.string().trim().min(3).optional(),
});

const simulatePaymentSchema = z.object({
  orderId: objectId,
  outcome: z.enum(['success', 'failure']).optional(),
});

const updateItemStatusSchema = z.object({
  status: z.enum(['processing', 'shipped', 'delivered', 'cancelled']),
  note: z.string().trim().max(200).optional(),
});

const listOrdersQuery = z.object({
  status: z
    .enum(['pending_payment', 'payment_failed', 'processing', 'shipped', 'delivered', 'cancelled'])
    .optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'cancelled', 'refunded']).optional(),
  q: z.string().trim().max(120).optional(),
  page: positiveIntString.optional(),
  limit: positiveIntString.optional(),
});

module.exports = {
  createOrderSchema,
  confirmPaymentSchema,
  simulatePaymentSchema,
  updateItemStatusSchema,
  listOrdersQuery,
};
