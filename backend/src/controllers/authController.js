'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const authService = require('../services/authService');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return sendCreated(res, { message: 'Account created successfully', data: result });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return sendSuccess(res, { message: 'Signed in successfully', data: result });
});

/**
 * JWTs are stateless: the client discards the token.
 * The endpoint exists so the client has a single, auditable logout call.
 */
const logout = asyncHandler(async (_req, res) =>
  sendSuccess(res, { message: 'Signed out successfully', data: { loggedOut: true } })
);

const me = asyncHandler(async (req, res) =>
  sendSuccess(res, { message: 'Current user', data: { user: await authService.getProfile(req.user._id) } })
);

module.exports = { register, login, logout, me };
