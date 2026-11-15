'use strict';

const { Order, Product, Payment, Cart, User } = require('../models');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { computeTotals, finalUnitPrice, round2 } = require('../utils/pricing');
const { getPagination, buildMeta } = require('../utils/pagination');
const cartService = require('./cartService');
const addressService = require('./addressService');
const paymentService = require('./paymentService');
const logger = require('../utils/logger');

/**
 * Builds trusted order lines straight from the database.
 * Steps 1-5 of the checkout safety checklist live here.
 */
async function buildTrustedLines(userId, { couponCode = '' } = {}) {
  const cart = await Cart.findOne({ user: userId }).populate({
    path: 'items.product',
    populate: { path: 'seller', select: 'name isActive store.status' },
  });

  if (!cart || cart.items.length === 0) {
    throw ApiError.badRequest('Your cart is empty.');
  }

  const lines = [];

  for (const item of cart.items) {
    const product = item.product;
    if (!product) throw ApiError.badRequest('A product in your cart no longer exists. Please review your cart.');
    if (!product.isActive) throw ApiError.badRequest(`"${product.title}" is no longer available. Please remove it from your cart.`);
    if (!product.seller || product.seller.isActive === false) {
      throw ApiError.badRequest(`The store selling "${product.title}" is currently unavailable.`);
    }
    if (product.stock < item.quantity) {
      throw ApiError.badRequest(
        `Only ${product.stock} unit(s) of "${product.title}" left in stock. Please update your cart.`
      );
    }

    const unitPrice = finalUnitPrice(product.price, product.discountPercent);
    lines.push({
      product: product._id,
      seller: product.seller._id,
      title: product.title,
      brand: product.brand,
      image: product.images?.[0]?.url || '',
      unitPrice,
      originalPrice: product.price,
      quantity: item.quantity,
      lineTotal: round2(unitPrice * item.quantity),
      status: 'processing',
    });
  }

  const totals = computeTotals(
    lines.map((line) => ({
      price: line.unitPrice,
      originalPrice: line.originalPrice,
      quantity: line.quantity,
    })),
    { couponCode }
  );

  // A coupon that no longer qualifies must never silently change the charge.
  if (totals.coupon && totals.coupon.applied === false) {
    throw ApiError.badRequest(totals.coupon.message);
  }

  return { cart, lines, totals };
}

async function getCheckoutSummary(userId, { couponCode = '' } = {}) {
  const cartView = await cartService.getCart(userId, { couponCode });
  const addresses = await addressService.listAddresses(userId);
  return {
    cart: cartView,
    addresses,
    payment: paymentService.getPublicConfig(),
    settings: {
      taxRate: env.taxRate,
      shippingFlat: env.shippingFlat,
      freeShippingThreshold: env.freeShippingThreshold,
      currency: env.currency,
    },
  };
}

/** Steps 6-11 + 13: totals are computed server side, then the order + payment are created. */
async function createOrder(userId, { addressId, paymentMethod, couponCode = '' }) {
  const address = await addressService.getOwnedAddress(userId, addressId);
  const { lines, totals } = await buildTrustedLines(userId, { couponCode });

  const intent =
    paymentMethod === 'card'
      ? await paymentService.createPaymentIntent({
          amount: totals.total,
          currency: totals.currency,
          metadata: { userId: String(userId) },
        })
      : { provider: 'cod', paymentIntentId: null, clientSecret: null, simulated: false };

  const payment = await Payment.create({
    user: userId,
    amount: totals.total,
    currency: totals.currency,
    provider: paymentMethod === 'cod' ? 'cod' : intent.provider,
    method: paymentMethod,
    status: 'requires_payment',
    stripePaymentIntentId: intent.paymentIntentId || undefined,
  });

  const order = await Order.create({
    user: userId,
    items: lines,
    shippingAddress: {
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
    },
    pricing: totals,
    status: 'pending_payment',
    paymentStatus: 'pending',
    paymentMethod,
    payment: payment._id,
    statusHistory: [{ status: 'pending_payment', note: 'Order created, awaiting payment' }],
  });

  payment.order = order._id;
  await payment.save();

  // Cash on delivery is confirmed immediately (steps 14-15 run right away).
  if (paymentMethod === 'cod') {
    await commitOrder(order, payment, { note: 'Cash on delivery order confirmed' });
  }

  return {
    order: await getOrderForCustomer(userId, order._id),
    clientSecret: intent.clientSecret,
    paymentIntentId: intent.paymentIntentId,
    payment: paymentService.getPublicConfig(),
    simulated: Boolean(intent.simulated),
  };
}

/** Steps 14-15: reserve inventory atomically, then clear the cart. */
async function commitOrder(order, payment, { note = 'Payment received' } = {}) {
  if (order.stockCommitted) return order;

  const applied = [];
  try {
    for (const item of order.items) {
      const result = await Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity, numSold: item.quantity } }
      );
      if (result.modifiedCount !== 1) {
        throw ApiError.conflict(`"${item.title}" went out of stock while your payment was processing.`);
      }
      applied.push(item);
    }
  } catch (error) {
    // Roll back partial stock decrements.
    for (const item of applied) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity, numSold: -item.quantity } }
      ).catch(() => null);
    }
    throw error;
  }

  order.stockCommitted = true;
  order.status = 'processing';
  order.paymentStatus = order.paymentMethod === 'cod' ? 'pending' : 'paid';
  order.pushStatus('processing', note);
  await order.save();

  if (payment) {
    payment.status = order.paymentMethod === 'cod' ? 'requires_payment' : 'succeeded';
    payment.paidAt = order.paymentMethod === 'cod' ? undefined : new Date();
    await payment.save();
  }

  await Cart.updateOne({ user: order.user }, { $set: { items: [] } });
  return order;
}

async function markPaymentFailed(order, payment, reason) {
  order.status = 'payment_failed';
  order.paymentStatus = 'failed';
  order.pushStatus('payment_failed', reason);
  await order.save();

  if (payment) {
    payment.status = 'failed';
    payment.failureReason = reason;
    await payment.save();
  }
}

async function getOwnedOrder(userId, orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (String(order.user) !== String(userId)) {
    throw ApiError.forbidden('You can only access your own orders.');
  }
  return order;
}

/** Step 12: verify the payment really succeeded before fulfilling. */
async function confirmPayment(userId, { orderId, paymentIntentId }) {
  const order = await getOwnedOrder(userId, orderId);
  const payment = await Payment.findById(order.payment);

  if (!payment) {
    throw ApiError.badRequest('Payment record not found for this order.');
  }

  if (order.paymentStatus === 'paid') {
    return {
      order: await getOrderForCustomer(userId, order._id),
      alreadyPaid: true,
    };
  }

  if (order.status === 'cancelled') {
    throw ApiError.badRequest('This order was cancelled.');
  }

  if (order.paymentMethod !== 'card') {
    throw ApiError.badRequest('This order does not require an online payment.');
  }

  // The database record is the source of truth.
  const storedIntentId = payment.stripePaymentIntentId;

  if (!storedIntentId) {
    throw ApiError.badRequest('Missing payment reference for this order.');
  }

  // Never accept a different reference supplied by the client.
  if (paymentIntentId && paymentIntentId !== storedIntentId) {
    throw ApiError.badRequest('Payment reference does not match this order.');
  }

  if (paymentService.isStripeConfigured) {
    // A simulated reference must never bypass Stripe verification.
    if (String(storedIntentId).startsWith('sim_')) {
      throw ApiError.badRequest('Simulated payment references are not accepted when Stripe is enabled.');
    }

    const intent = await paymentService.retrievePaymentIntent(storedIntentId);

    if (intent.id !== storedIntentId) {
      throw ApiError.badRequest('Stripe payment reference mismatch.');
    }

    if (intent.status !== 'succeeded') {
      const reason =
        intent.last_payment_error?.message ||
        `Payment not completed (status: ${intent.status}).`;

      await markPaymentFailed(order, payment, reason);
      throw new ApiError(402, reason);
    }

    const expectedAmount = Math.round(order.pricing.total * 100);

    if (intent.amount !== expectedAmount) {
      const reason = 'Paid amount does not match the order total.';
      await markPaymentFailed(order, payment, reason);
      throw new ApiError(402, reason);
    }
  } else {
    // Simulation is permitted only when explicitly enabled outside production.
    const simulationAllowed =
      process.env.NODE_ENV !== 'production' &&
      process.env.ALLOW_SIMULATED_PAYMENTS === 'true';

    if (!simulationAllowed || !String(storedIntentId).startsWith('sim_')) {
      throw new ApiError(503, 'Online payment verification is currently unavailable.');
    }

    logger.warn('Confirming an explicitly enabled simulated payment.');
  }

  await commitOrder(order, payment, { note: 'Payment confirmed' });

  return {
    order: await getOrderForCustomer(userId, order._id),
    alreadyPaid: false,
  };
}
/**
 * Test/demo helper: confirms (or intentionally fails) the payment server side.
 * With Stripe configured it uses official Stripe test payment methods.
 */
async function simulatePayment(userId, { orderId, outcome = 'success' }) {
  const order = await getOwnedOrder(userId, orderId);
  const payment = await Payment.findById(order.payment);

  if (order.paymentStatus === 'paid') {
    return { order: await getOrderForCustomer(userId, order._id), status: 'succeeded' };
  }
  if (order.paymentMethod !== 'card') throw ApiError.badRequest('This order does not require an online payment.');

  if (paymentService.isStripeConfigured && payment?.stripePaymentIntentId && !payment.stripePaymentIntentId.startsWith('sim_')) {
    const intent = await paymentService.confirmTestPaymentIntent(payment.stripePaymentIntentId, outcome);
    if (intent.status !== 'succeeded') {
      const reason = intent.last_payment_error?.message || 'Your card was declined.';
      await markPaymentFailed(order, payment, reason);
      throw new ApiError(402, reason);
    }
  } else if (outcome === 'failure') {
    await markPaymentFailed(order, payment, 'Simulated payment failure (test mode).');
    throw new ApiError(402, 'Simulated payment failure (test mode).');
  }

  await commitOrder(order, payment, { note: 'Payment confirmed (test mode)' });
  return { order: await getOrderForCustomer(userId, order._id), status: 'succeeded' };
}

async function listMyOrders(userId, query = {}) {
  const { page, limit, skip } = getPagination(query, { defaultLimit: 10 });
  const filter = { user: userId };
  if (query.status) filter.status = query.status;
  if (query.q) filter.orderNumber = new RegExp(String(query.q).trim(), 'i');

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);

  return { orders, meta: buildMeta({ page, limit, total }) };
}

async function getOrderForCustomer(userId, orderId) {
  const order = await Order.findById(orderId)
    .populate('items.product', 'title slug images')
    .populate('items.seller', 'name store.name')
    .populate('payment', 'status provider method amount currency failureReason paidAt stripePaymentIntentId');

  if (!order) throw ApiError.notFound('Order not found');
  if (String(order.user) !== String(userId)) throw ApiError.forbidden('You can only access your own orders.');
  return order;
}

async function cancelOrder(userId, orderId, { isAdmin = false } = {}) {
  const order = isAdmin ? await Order.findById(orderId) : await getOwnedOrder(userId, orderId);
  if (!order) throw ApiError.notFound('Order not found');

  if (['delivered', 'cancelled'].includes(order.status)) {
    throw ApiError.badRequest(`An order that is already ${order.status} cannot be cancelled.`);
  }
  if (order.items.some((item) => item.status === 'shipped') && !isAdmin) {
    throw ApiError.badRequest('This order has already shipped. Please contact support.');
  }

  if (order.stockCommitted) {
    for (const item of order.items) {
      if (item.status === 'cancelled') continue;
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity, numSold: -item.quantity } }
      ).catch(() => null);
    }
    order.stockCommitted = false;
  }

  order.items.forEach((item) => {
    item.status = 'cancelled';
  });
  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.pushStatus('cancelled', isAdmin ? 'Cancelled by admin' : 'Cancelled by customer');

  const payment = await Payment.findById(order.payment);
  if (payment && payment.status !== 'succeeded') {
    await paymentService.cancelPaymentIntent(payment.stripePaymentIntentId);
    payment.status = 'cancelled';
    await payment.save();
    order.paymentStatus = 'cancelled';
  } else if (payment && payment.status === 'succeeded') {
    order.paymentStatus = 'refunded';
    payment.status = 'refunded';
    await payment.save();
  }

  await order.save();
  return order;
}

/** Seller order list - only orders containing this seller's items, projected to their items. */
async function listSellerOrders(sellerId, query = {}) {
  const { page, limit, skip } = getPagination(query, { defaultLimit: 10 });
  const filter = { 'items.seller': sellerId, paymentStatus: { $ne: 'failed' } };
  if (query.status) filter.status = query.status;
  if (query.q) filter.orderNumber = new RegExp(String(query.q).trim(), 'i');

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email')
      .lean(),
    Order.countDocuments(filter),
  ]);

  const scoped = orders.map((order) => {
    const items = order.items.filter((item) => String(item.seller) === String(sellerId));
    return {
      ...order,
      items,
      sellerTotal: round2(items.reduce((sum, item) => sum + item.lineTotal, 0)),
    };
  });

  return { orders: scoped, meta: buildMeta({ page, limit, total }) };
}

async function getSellerOrder(sellerId, orderId) {
  const order = await Order.findById(orderId).populate('user', 'name email phone').lean();
  if (!order) throw ApiError.notFound('Order not found');

  const items = order.items.filter((item) => String(item.seller) === String(sellerId));
  if (items.length === 0) throw ApiError.forbidden('This order does not contain any of your products.');

  return {
    ...order,
    items,
    sellerTotal: round2(items.reduce((sum, item) => sum + item.lineTotal, 0)),
  };
}

/** Sellers can only move their own line items. Admins can move any. */
async function updateItemStatus({ orderId, itemId, actor, status, note = '' }) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');

  const item = order.items.id(itemId);
  if (!item) throw ApiError.notFound('Order item not found');

  const isAdmin = actor.role === 'admin';
  if (!isAdmin && String(item.seller) !== String(actor._id)) {
    throw ApiError.forbidden('You can only update items sold by your own store.');
  }
  if (order.paymentStatus === 'pending' && order.paymentMethod === 'card') {
    throw ApiError.badRequest('This order has not been paid yet.');
  }
  if (item.status === 'delivered' && status !== 'delivered') {
    throw ApiError.badRequest('A delivered item cannot change status.');
  }
  if (item.status === 'cancelled') {
    throw ApiError.badRequest('A cancelled item cannot change status.');
  }

  if (status === 'cancelled' && order.stockCommitted) {
    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity, numSold: -item.quantity } }
    ).catch(() => null);
  }

  item.status = status;
  order.pushStatus(`item_${status}`, note || `${item.title} marked ${status}`);
  order.syncStatusFromItems();
  await order.save();

  return order;
}

async function listAllOrders(query = {}) {
  const { page, limit, skip } = getPagination(query, { defaultLimit: 15 });
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;

  if (query.q) {
    const regex = new RegExp(String(query.q).trim(), 'i');
    const users = await User.find({ $or: [{ name: regex }, { email: regex }] }).select('_id').lean();
    filter.$or = [{ orderNumber: regex }, { user: { $in: users.map((u) => u._id) } }];
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email')
      .lean(),
    Order.countDocuments(filter),
  ]);

  return { orders, meta: buildMeta({ page, limit, total }) };
}

async function getOrderAsAdmin(orderId) {
  const order = await Order.findById(orderId)
    .populate('user', 'name email phone')
    .populate('items.seller', 'name store.name')
    .populate('payment')
    .lean();
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

module.exports = {
  getCheckoutSummary,
  createOrder,
  confirmPayment,
  simulatePayment,
  listMyOrders,
  getOrderForCustomer,
  cancelOrder,
  listSellerOrders,
  getSellerOrder,
  updateItemStatus,
  listAllOrders,
  getOrderAsAdmin,
  buildTrustedLines,
};
