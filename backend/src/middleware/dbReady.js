'use strict';

const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

/**
 * Guards every /api request against an unavailable database.
 *
 * Without this, any request that reaches Mongoose while the connection is down
 * fails deep inside the driver and surfaces to the browser as an opaque
 * "500 - Something went wrong". Returning 503 with an actionable message makes
 * the real cause (MongoDB is not running / MONGO_URI is wrong) obvious, and the
 * frontend already renders the message inside its retryable error state.
 *
 * readyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting.
 */
const requireDatabase = (_req, _res, next) => {
  const { readyState } = mongoose.connection;
  if (readyState === 1 || readyState === 2) return next();
  return next(
    ApiError.serviceUnavailable(
      'The Trendora database is unavailable. Start MongoDB (or check MONGO_URI) and try again.'
    )
  );
};

module.exports = { requireDatabase };
