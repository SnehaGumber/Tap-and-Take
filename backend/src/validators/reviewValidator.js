'use strict';

const { z, objectId } = require('./common');

const createReviewSchema = z.object({
  productId: objectId,
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  comment: z.string().trim().min(5, 'Please write at least 5 characters').max(1500),
});

const updateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  title: z.string().trim().max(120).optional(),
  comment: z.string().trim().min(5).max(1500).optional(),
});

module.exports = { createReviewSchema, updateReviewSchema };
