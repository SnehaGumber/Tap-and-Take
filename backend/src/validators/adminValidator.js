'use strict';

const { z, positiveIntString } = require('./common');

const listUsersQuery = z.object({
  q: z.string().trim().max(120).optional(),
  role: z.enum(['customer', 'seller', 'admin']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  storeStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
  page: positiveIntString.optional(),
  limit: positiveIntString.optional(),
});

const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

const updateUserRoleSchema = z.object({
  role: z.enum(['customer', 'seller', 'admin']),
});

const updateSellerStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
});

const updateSellerProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1500).optional(),
  contactEmail: z.string().trim().email('Provide a valid contact email').optional(),
  contactPhone: z.string().trim().max(20).optional(),
});

module.exports = {
  listUsersQuery,
  updateUserStatusSchema,
  updateUserRoleSchema,
  updateSellerStatusSchema,
  updateSellerProfileSchema,
};
