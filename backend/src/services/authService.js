'use strict';

const { User, Cart, Wishlist } = require('../models');
const ApiError = require('../utils/ApiError');
const { signAccessToken } = require('../utils/token');

async function register(payload) {
  const existing = await User.findOne({ email: payload.email });
  if (existing) throw ApiError.conflict('An account with this email already exists.');

  const role = payload.role === 'seller' ? 'seller' : 'customer';

  const user = new User({
    name: payload.name,
    email: payload.email,
    password: payload.password,
    phone: payload.phone || '',
    role,
  });

  if (role === 'seller') {
    user.store = {
      name: payload.storeName || `${payload.name}'s Store`,
      description: payload.storeDescription || '',
      contactEmail: payload.email,
      contactPhone: payload.phone || '',
      status: 'pending',
    };
  }

  await user.save();
  await Promise.all([
    Cart.create({ user: user._id, items: [] }),
    Wishlist.create({ user: user._id, items: [] }),
  ]);

  return { user: user.toJSON(), token: signAccessToken(user) };
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+password');
  // Same message for unknown email and wrong password (no account enumeration).
  if (!user) throw ApiError.unauthorized('Invalid email or password.');

  const matches = await user.comparePassword(password);
  if (!matches) throw ApiError.unauthorized('Invalid email or password.');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated by an administrator.');

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  await Promise.all([
    Cart.updateOne({ user: user._id }, { $setOnInsert: { items: [] } }, { upsert: true }),
    Wishlist.updateOne({ user: user._id }, { $setOnInsert: { items: [] } }, { upsert: true }),
  ]);

  const safeUser = user.toJSON();
  delete safeUser.password;
  return { user: safeUser, token: signAccessToken(user) };
}

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user.toJSON();
}

async function updateProfile(userId, payload) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  if (payload.name !== undefined) user.name = payload.name;
  if (payload.phone !== undefined) user.phone = payload.phone;
  if (payload.avatarUrl !== undefined) user.avatar = { url: payload.avatarUrl, publicId: '' };

  await user.save();
  return user.toJSON();
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.notFound('User not found');

  const matches = await user.comparePassword(currentPassword);
  if (!matches) throw ApiError.badRequest('Your current password is incorrect.');
  if (currentPassword === newPassword) {
    throw ApiError.badRequest('New password must be different from the current password.');
  }

  user.password = newPassword;
  await user.save();
  return { updated: true };
}

async function updateStore(userId, payload) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role !== 'seller') throw ApiError.forbidden('Only sellers have a store profile.');

  user.store = {
    ...(user.store ? user.store.toObject() : { status: 'pending' }),
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.contactEmail !== undefined ? { contactEmail: payload.contactEmail } : {}),
    ...(payload.contactPhone !== undefined ? { contactPhone: payload.contactPhone } : {}),
  };

  await user.save();
  return user.toJSON();
}

module.exports = { register, login, getProfile, updateProfile, changePassword, updateStore };
