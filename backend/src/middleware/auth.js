'use strict';

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken, extractBearerToken } = require('../utils/token');

/** Requires a valid JWT. Attaches the fresh DB user to req.user. */
const protect = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req);
  if (!token) throw ApiError.unauthorized('Authentication required. Please sign in.');

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (error) {
    throw ApiError.unauthorized('Session expired or invalid. Please sign in again.');
  }

  const user = await User.findById(decoded.sub);
  if (!user) throw ApiError.unauthorized('Account no longer exists.');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated.');

  req.user = user;
  return next();
});

/** Attaches req.user when a token is present, but never blocks the request. */
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req);
  if (!token) return next();
  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub);
    if (user && user.isActive) req.user = user;
  } catch (error) {
    // Ignore invalid optional tokens.
  }
  return next();
});

module.exports = { protect, optionalAuth };
