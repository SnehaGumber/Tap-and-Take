'use strict';

const { z } = require('zod');

const objectId = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Invalid id');

const idParam = z.object({ id: objectId });

const optionalBoolean = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => value === true || value === 'true');

const positiveIntString = z
  .union([z.string(), z.number()])
  .transform((value) => Number(value))
  .refine((value) => Number.isFinite(value) && value > 0, 'Must be a positive number');

const nonNegativeNumber = z
  .union([z.string(), z.number()])
  .transform((value) => Number(value))
  .refine((value) => Number.isFinite(value) && value >= 0, 'Must be zero or greater');

const paginationQuery = {
  page: positiveIntString.optional(),
  limit: positiveIntString.optional(),
};

module.exports = {
  z,
  objectId,
  idParam,
  optionalBoolean,
  positiveIntString,
  nonNegativeNumber,
  paginationQuery,
};
