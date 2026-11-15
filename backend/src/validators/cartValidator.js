'use strict';

const { z, objectId } = require('./common');

const addToCartSchema = z.object({
  productId: objectId,
  quantity: z.coerce.number().int().min(1).max(20).optional(),
});

const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(20),
});

const applyCouponSchema = z.object({
  code: z.string().trim().min(3, 'Enter a coupon code').max(24),
});

module.exports = { addToCartSchema, updateCartItemSchema, applyCouponSchema };
