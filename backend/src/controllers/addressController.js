'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const addressService = require('../services/addressService');

const listAddresses = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Addresses',
    data: { addresses: await addressService.listAddresses(req.user._id) },
  })
);

const createAddress = asyncHandler(async (req, res) =>
  sendCreated(res, {
    message: 'Address saved',
    data: { address: await addressService.createAddress(req.user._id, req.body) },
  })
);

const updateAddress = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Address updated',
    data: { address: await addressService.updateAddress(req.user._id, req.params.id, req.body) },
  })
);

const deleteAddress = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Address deleted',
    data: await addressService.deleteAddress(req.user._id, req.params.id),
  })
);

const setDefault = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Default address updated',
    data: { address: await addressService.setDefault(req.user._id, req.params.id) },
  })
);

module.exports = { listAddresses, createAddress, updateAddress, deleteAddress, setDefault };
