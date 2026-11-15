'use strict';

const { z, objectId, nonNegativeNumber, positiveIntString } = require('./common');

const specificationSchema = z.object({
  key: z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(300),
});

/** multipart/form-data sends everything as strings, so JSON fields are parsed leniently. */
const jsonArray = (schema) =>
  z
    .union([z.string(), z.array(z.any())])
    .transform((value, ctx) => {
      if (Array.isArray(value)) return value;
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) throw new Error('not array');
        return parsed;
      } catch (error) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be a JSON array' });
        return z.NEVER;
      }
    })
    .pipe(z.array(schema));

const createProductSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(5000),
  brand: z.string().trim().min(1).max(60),
  category: objectId,
  price: nonNegativeNumber.refine((value) => value > 0, 'Price must be greater than 0'),
  discountPercent: nonNegativeNumber.refine((value) => value <= 90, 'Discount cannot exceed 90%').optional(),
  stock: nonNegativeNumber,
  specifications: jsonArray(specificationSchema).optional(),
  tags: jsonArray(z.string().trim().min(1).max(30)).optional(),
  imageUrls: jsonArray(z.string().url()).optional(),
  isActive: z.union([z.boolean(), z.enum(['true', 'false'])]).optional(),
});

const updateProductSchema = createProductSchema.partial().extend({
  removeImages: jsonArray(z.string().min(1)).optional(),
});

const listProductsQuery = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  minPrice: nonNegativeNumber.optional(),
  maxPrice: nonNegativeNumber.optional(),
  rating: nonNegativeNumber.optional(),
  minDiscount: nonNegativeNumber.optional(),
  inStock: z.enum(['true', 'false']).optional(),
  sort: z
    .enum([
      'relevance',
      'newest',
      'oldest',
      'price_asc',
      'price_desc',
      'rating',
      'popular',
      'discount',
    ])
    .optional(),
  page: positiveIntString.optional(),
  limit: positiveIntString.optional(),
  seller: z.string().trim().optional(),
});

const suggestionsQuery = z.object({
  q: z.string().trim().max(120).optional(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  listProductsQuery,
  suggestionsQuery,
};
