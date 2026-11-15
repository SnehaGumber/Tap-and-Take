'use strict';

const mongoose = require('mongoose');
const { Order, Product, User, Category } = require('../models');
const env = require('../config/env');
const { round2 } = require('../utils/pricing');

const PAID_MATCH = { paymentStatus: { $in: ['paid'] }, status: { $ne: 'cancelled' } };

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function lastMonths(count = 6) {
  const months = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ key: monthKey(date), label: date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }) });
  }
  return months;
}

function fillSeries(months, rows, valueKey = 'value') {
  const map = new Map(rows.map((row) => [row._id, row[valueKey]]));
  return months.map((month) => ({
    label: month.label,
    key: month.key,
    value: round2(map.get(month.key) || 0),
  }));
}

async function getSellerDashboard(sellerId) {
  const sellerObjectId = new mongoose.Types.ObjectId(String(sellerId));
  const months = lastMonths(6);
  const since = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 5, 1));

  const [
    totalProducts,
    activeProducts,
    revenueAgg,
    orderCountAgg,
    pendingAgg,
    lowStock,
    recentOrders,
    monthlyAgg,
    topProducts,
    customersAgg,
    ratingAgg,
  ] = await Promise.all([
    Product.countDocuments({ seller: sellerObjectId }),
    Product.countDocuments({ seller: sellerObjectId, isActive: true }),
    Order.aggregate([
      { $match: { ...PAID_MATCH, 'items.seller': sellerObjectId } },
      { $unwind: '$items' },
      { $match: { 'items.seller': sellerObjectId, 'items.status': { $ne: 'cancelled' } } },
      { $group: { _id: null, revenue: { $sum: '$items.lineTotal' }, units: { $sum: '$items.quantity' } } },
    ]),
    Order.countDocuments({ 'items.seller': sellerObjectId, paymentStatus: { $ne: 'failed' } }),
    Order.aggregate([
      { $match: { 'items.seller': sellerObjectId, status: { $in: ['processing', 'shipped'] } } },
      { $unwind: '$items' },
      { $match: { 'items.seller': sellerObjectId, 'items.status': { $in: ['processing', 'shipped'] } } },
      { $group: { _id: '$_id' } },
      { $count: 'count' },
    ]),
    Product.find({ seller: sellerObjectId, stock: { $lte: env.lowStockThreshold } })
      .sort({ stock: 1 })
      .limit(8)
      .select('title stock price images slug')
      .lean(),
    Order.find({ 'items.seller': sellerObjectId, paymentStatus: { $ne: 'failed' } })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('user', 'name email')
      .lean(),
    Order.aggregate([
      { $match: { ...PAID_MATCH, 'items.seller': sellerObjectId, createdAt: { $gte: since } } },
      { $unwind: '$items' },
      { $match: { 'items.seller': sellerObjectId, 'items.status': { $ne: 'cancelled' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          value: { $sum: '$items.lineTotal' },
          orders: { $addToSet: '$_id' },
        },
      },
    ]),
    Product.find({ seller: sellerObjectId })
      .sort({ numSold: -1 })
      .limit(5)
      .select('title numSold price ratingAverage images slug ratingCount stock')
      .lean(),
    // Unique paying customers for this store.
    Order.aggregate([
      { $match: { ...PAID_MATCH, 'items.seller': sellerObjectId } },
      { $group: { _id: '$user' } },
      { $count: 'count' },
    ]),
    // Average rating across the store's rated products.
    Product.aggregate([
      { $match: { seller: sellerObjectId, ratingCount: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          avg: { $avg: '$ratingAverage' },
          reviews: { $sum: '$ratingCount' },
        },
      },
    ]),
  ]);

  const revenue = revenueAgg[0] ? round2(revenueAgg[0].revenue) : 0;
  const unitsSold = revenueAgg[0] ? revenueAgg[0].units : 0;

  const recentScoped = recentOrders.map((order) => {
    const items = order.items.filter((item) => String(item.seller) === String(sellerId));
    return {
      _id: order._id,
      orderNumber: order.orderNumber,
      user: order.user,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      itemCount: items.length,
      sellerTotal: round2(items.reduce((sum, item) => sum + item.lineTotal, 0)),
    };
  });

  return {
    metrics: {
      revenue,
      unitsSold,
      totalOrders: orderCountAgg,
      totalProducts,
      activeProducts,
      pendingOrders: pendingAgg[0] ? pendingAgg[0].count : 0,
      lowStockCount: lowStock.length,
      customers: customersAgg[0] ? customersAgg[0].count : 0,
      ratingAverage: ratingAgg[0] ? Math.round(ratingAgg[0].avg * 10) / 10 : 0,
      reviewCount: ratingAgg[0] ? ratingAgg[0].reviews : 0,
      currency: env.currency,
    },
    salesSeries: fillSeries(months, monthlyAgg),
    ordersSeries: fillSeries(
      months,
      monthlyAgg.map((row) => ({ _id: row._id, value: row.orders.length }))
    ),
    lowStock,
    recentOrders: recentScoped,
    topProducts,
  };
}

async function getAdminDashboard() {
  const months = lastMonths(6);
  const since = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 5, 1));

  const [
    totalUsers,
    totalCustomers,
    totalSellers,
    pendingSellers,
    totalProducts,
    totalCategories,
    totalOrders,
    revenueAgg,
    pendingOrders,
    lowStock,
    revenueSeriesAgg,
    usersSeriesAgg,
    productsByCategory,
    topProducts,
    topSellersAgg,
    recentOrders,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'seller' }),
    User.countDocuments({ role: 'seller', 'store.status': 'pending' }),
    Product.countDocuments({}),
    Category.countDocuments({}),
    Order.countDocuments({}),
    Order.aggregate([
      { $match: PAID_MATCH },
      { $group: { _id: null, revenue: { $sum: '$pricing.total' }, avg: { $avg: '$pricing.total' } } },
    ]),
    Order.countDocuments({ status: { $in: ['processing', 'shipped'] } }),
    Product.find({ stock: { $lte: env.lowStockThreshold } })
      .sort({ stock: 1 })
      .limit(8)
      .select('title stock price seller slug')
      .populate('seller', 'name store.name')
      .lean(),
    Order.aggregate([
      { $match: { ...PAID_MATCH, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          value: { $sum: '$pricing.total' },
          orders: { $sum: 1 },
        },
      },
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          value: { $sum: 1 },
        },
      },
    ]),
    Product.aggregate([
      { $group: { _id: '$category', value: { $sum: 1 } } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      { $project: { _id: 0, label: '$category.name', value: 1 } },
      { $sort: { value: -1 } },
    ]),
    Product.find({})
      .sort({ numSold: -1 })
      .limit(6)
      .select('title numSold price ratingAverage images slug seller')
      .populate('seller', 'name store.name')
      .lean(),
    Order.aggregate([
      { $match: PAID_MATCH },
      { $unwind: '$items' },
      { $match: { 'items.status': { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$items.seller',
          revenue: { $sum: '$items.lineTotal' },
          units: { $sum: '$items.quantity' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 6 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'seller' } },
      { $unwind: '$seller' },
      {
        $project: {
          _id: 1,
          revenue: 1,
          units: 1,
          name: '$seller.name',
          storeName: '$seller.store.name',
        },
      },
    ]),
    Order.find({})
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('user', 'name email')
      .select('orderNumber user status paymentStatus pricing.total createdAt items')
      .lean(),
  ]);

  return {
    metrics: {
      totalUsers,
      totalCustomers,
      totalSellers,
      pendingSellers,
      totalProducts,
      totalCategories,
      totalOrders,
      revenue: revenueAgg[0] ? round2(revenueAgg[0].revenue) : 0,
      averageOrderValue: revenueAgg[0] ? round2(revenueAgg[0].avg) : 0,
      pendingOrders,
      lowStockCount: lowStock.length,
      currency: env.currency,
    },
    revenueSeries: fillSeries(months, revenueSeriesAgg),
    ordersSeries: fillSeries(
      months,
      revenueSeriesAgg.map((row) => ({ _id: row._id, value: row.orders }))
    ),
    usersSeries: fillSeries(months, usersSeriesAgg),
    productsByCategory,
    topProducts,
    topSellers: topSellersAgg.map((row) => ({ ...row, revenue: round2(row.revenue) })),
    lowStock,
    recentOrders: recentOrders.map((order) => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      user: order.user,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.pricing?.total || 0,
      itemCount: order.items?.length || 0,
      createdAt: order.createdAt,
    })),
  };
}

module.exports = { getSellerDashboard, getAdminDashboard };
