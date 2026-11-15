'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Zod based validation middleware.
 * Replaces req.body / req.query / req.params with the parsed & coerced values.
 */
const validate = (schemas = {}) => (req, _res, next) => {
  const details = [];

  for (const key of ['body', 'query', 'params']) {
    const schema = schemas[key];
    if (!schema) continue;
    const result = schema.safeParse(req[key]);
    if (!result.success) {
      for (const issue of result.error.issues) {
        details.push({
          field: [key, ...issue.path].join('.'),
          message: issue.message,
        });
      }
    } else if (key === 'query') {
      req.validatedQuery = result.data;
      Object.assign(req.query, result.data);
    } else {
      req[key] = result.data;
    }
  }

  if (details.length > 0) {
    return next(ApiError.validation('Validation failed', details));
  }
  return next();
};

module.exports = { validate };
