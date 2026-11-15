'use strict';

const { z } = require('zod');

const createAddressSchema = z.object({
  label: z.string().trim().max(30).optional(),
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6, 'Phone number looks too short').max(20),
  line1: z.string().trim().min(4).max(160),
  line2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  postalCode: z.string().trim().min(3).max(16),
  country: z.string().trim().min(2).max(60).optional(),
  isDefault: z.boolean().optional(),
});

const updateAddressSchema = createAddressSchema.partial();

module.exports = { createAddressSchema, updateAddressSchema };
