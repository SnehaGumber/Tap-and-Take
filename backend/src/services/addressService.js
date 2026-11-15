'use strict';

const { Address } = require('../models');
const ApiError = require('../utils/ApiError');

async function listAddresses(userId) {
  return Address.find({ user: userId }).sort({ isDefault: -1, updatedAt: -1 }).lean();
}

async function getOwnedAddress(userId, addressId) {
  const address = await Address.findById(addressId);
  if (!address) throw ApiError.notFound('Address not found');
  if (String(address.user) !== String(userId)) {
    throw ApiError.forbidden('You can only use your own addresses.');
  }
  return address;
}

async function createAddress(userId, payload) {
  const count = await Address.countDocuments({ user: userId });
  if (count >= 10) throw ApiError.badRequest('You can save at most 10 addresses.');

  const shouldBeDefault = payload.isDefault === true || count === 0;
  if (shouldBeDefault) {
    await Address.updateMany({ user: userId }, { $set: { isDefault: false } });
  }

  return Address.create({ ...payload, user: userId, isDefault: shouldBeDefault });
}

async function updateAddress(userId, addressId, payload) {
  const address = await getOwnedAddress(userId, addressId);

  if (payload.isDefault === true) {
    await Address.updateMany({ user: userId }, { $set: { isDefault: false } });
  }
  Object.assign(address, payload);
  await address.save();
  return address;
}

async function deleteAddress(userId, addressId) {
  const address = await getOwnedAddress(userId, addressId);
  const wasDefault = address.isDefault;
  await address.deleteOne();

  if (wasDefault) {
    const next = await Address.findOne({ user: userId }).sort({ updatedAt: -1 });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }
  return { deleted: true };
}

async function setDefault(userId, addressId) {
  const address = await getOwnedAddress(userId, addressId);
  await Address.updateMany({ user: userId }, { $set: { isDefault: false } });
  address.isDefault = true;
  await address.save();
  return address;
}

module.exports = {
  listAddresses,
  getOwnedAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefault,
};
