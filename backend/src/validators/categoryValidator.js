'use strict';

const { z } = require('zod');

const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(500).optional(),
  image: z.string().url('Image must be a valid URL').optional(),
  isActive: z.boolean().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

module.exports = { createCategorySchema, updateCategorySchema };
