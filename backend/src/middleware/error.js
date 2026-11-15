'use strict';

const multer = require('multer');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const logger = require('../utils/logger');

const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/* eslint-disable-next-line no-unused-vars */
const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let details = err.details;

  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 422;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for "${err.path}"`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with this ${field} already exists`;
  } else if (err instanceof multer.MulterError) {
    statusCode = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Image too large. Maximum size is 5MB per image.'
        : `Image upload error: ${err.message}`;
  } else if (err.type === 'StripeCardError') {
    statusCode = 402;
    message = err.message;
  }

  if (statusCode >= 500) {
    logger.error(err.stack || err.message);
    // Never leak internals to clients.
    if (env.isProduction) message = 'Internal server error';
  }

  const payload = { success: false, message };
  if (details) payload.errors = details;
  if (!env.isProduction && statusCode >= 500) payload.stack = err.stack;

  return res.status(statusCode).json(payload);
};

module.exports = { notFound, errorHandler, ApiError };
