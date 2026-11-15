'use strict';

const ApiError = require('../utils/ApiError');

/** Role based authorization. Roles always come from the DB user, never the client. */
const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`This action requires one of these roles: ${roles.join(', ')}`));
    }
    return next();
  };

/** Sellers must be approved by an admin before they can sell. */
const requireApprovedSeller = (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role === 'admin') return next();
  if (req.user.role !== 'seller') return next(ApiError.forbidden('Seller account required.'));
  if (!req.user.store || req.user.store.status !== 'approved') {
    return next(
      ApiError.forbidden('Your seller account is awaiting admin approval before you can sell.')
    );
  }
  return next();
};

module.exports = { authorize, requireApprovedSeller };
