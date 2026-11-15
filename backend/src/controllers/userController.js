'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const authService = require('../services/authService');

const getProfile = asyncHandler(async (req, res) =>
  sendSuccess(res, { message: 'Profile', data: { user: await authService.getProfile(req.user._id) } })
);

const updateProfile = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Profile updated',
    data: { user: await authService.updateProfile(req.user._id, req.body) },
  })
);

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user._id, req.body);
  return sendSuccess(res, { message: 'Password changed successfully', data: { updated: true } });
});

module.exports = { getProfile, updateProfile, changePassword };
