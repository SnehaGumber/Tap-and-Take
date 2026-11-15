'use strict';

const { User, Product, Order, Cart, Wishlist, Address, Review } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta } = require('../utils/pagination');
const { round2 } = require('../utils/pricing');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function listUsers(query = {}) {
  const { page, limit, skip } = getPagination(query, { defaultLimit: 15 });
  const filter = {};

  if (query.role) filter.role = query.role;
  if (query.isActive) filter.isActive = query.isActive === 'true';
  if (query.storeStatus) filter['store.status'] = query.storeStatus;
  if (query.q) {
    const regex = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { 'store.name': regex }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return { users, meta: buildMeta({ page, limit, total }) };
}

async function getUserDetails(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const [orderStats, productCount, addressCount, reviewCount] = await Promise.all([
    Order.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          spent: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$pricing.total', 0] },
          },
        },
      },
    ]),
    user.role === 'seller' ? Product.countDocuments({ seller: user._id }) : 0,
    Address.countDocuments({ user: user._id }),
    Review.countDocuments({ user: user._id }),
  ]);

  return {
    user: user.toJSON(),
    stats: {
      orders: orderStats[0] ? orderStats[0].orders : 0,
      totalSpent: orderStats[0] ? round2(orderStats[0].spent) : 0,
      products: productCount,
      addresses: addressCount,
      reviews: reviewCount,
    },
  };
}

function assertNotSelf(actor, userId, action) {
  if (String(actor._id) === String(userId)) {
    throw ApiError.badRequest(`You cannot ${action} your own admin account.`);
  }
}

async function setUserActive(actor, userId, isActive) {
  assertNotSelf(actor, userId, 'deactivate');
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  user.isActive = isActive;
  await user.save({ validateBeforeSave: false });
  return user.toJSON();
}

async function setUserRole(actor, userId, role) {
  assertNotSelf(actor, userId, 'change the role of');
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  user.role = role;
  if (role === 'seller' && !user.store) {
    user.store = { name: `${user.name}'s Store`, status: 'pending' };
  }
  await user.save({ validateBeforeSave: false });
  return user.toJSON();
}

async function setSellerStatus(userId, status) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role !== 'seller') throw ApiError.badRequest('This user is not a seller.');

  user.store = { ...(user.store ? user.store.toObject() : {}), status };
  await user.save({ validateBeforeSave: false });

  // Rejected sellers should not keep selling.
  if (status !== 'approved') {
    await Product.updateMany({ seller: user._id }, { $set: { isActive: false } });
  }
  return user.toJSON();
}

async function deleteUser(actor, userId) {
  assertNotSelf(actor, userId, 'delete');
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const orderCount = await Order.countDocuments({ user: user._id });
  if (orderCount > 0) {
    throw ApiError.conflict(
      'This user has orders and cannot be deleted. Deactivate the account instead.'
    );
  }

  await Promise.all([
    Cart.deleteOne({ user: user._id }),
    Wishlist.deleteOne({ user: user._id }),
    Address.deleteMany({ user: user._id }),
    Review.deleteMany({ user: user._id }),
    Product.updateMany({ seller: user._id }, { $set: { isActive: false } }),
  ]);
  await user.deleteOne();
  return { deleted: true };
}

module.exports = {
  listUsers,
  getUserDetails,
  setUserActive,
  setUserRole,
  setSellerStatus,
  deleteUser,
};
