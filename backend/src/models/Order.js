'use strict';

const mongoose = require('mongoose');
const { generateOrderNumber } = require('../utils/orderNumber');

const ITEM_STATUSES = ['processing', 'shipped', 'delivered', 'cancelled'];
const ORDER_STATUSES = [
  'pending_payment',
  'payment_failed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    image: { type: String, default: '' },
    brand: { type: String, default: '' },
    unitPrice: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ITEM_STATUSES, default: 'processing' },
  },
  { _id: true }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'An order needs at least one item',
      },
    },
    shippingAddress: { type: shippingAddressSchema, required: true },
    pricing: {
      subtotal: { type: Number, required: true, min: 0 },
      discount: { type: Number, required: true, min: 0, default: 0 },
      couponCode: { type: String, default: '' },
      couponDiscount: { type: Number, min: 0, default: 0 },
      tax: { type: Number, required: true, min: 0, default: 0 },
      shipping: { type: Number, required: true, min: 0, default: 0 },
      total: { type: Number, required: true, min: 0 },
      currency: { type: String, required: true, default: 'usd' },
    },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending_payment', index: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentMethod: { type: String, enum: ['card', 'cod'], required: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    stockCommitted: { type: Boolean, default: false },
    statusHistory: [
      {
        status: { type: String, required: true },
        note: { type: String, default: '' },
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    placedAt: { type: Date, default: Date.now, index: true },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

orderSchema.index({ 'items.seller': 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

orderSchema.pre('validate', function setOrderNumber(next) {
  if (!this.orderNumber) this.orderNumber = generateOrderNumber();
  return next();
});

orderSchema.methods.pushStatus = function pushStatus(status, note = '') {
  this.statusHistory.push({ status, note, at: new Date() });
};

/** Order level status derived from the least advanced active item. */
orderSchema.methods.syncStatusFromItems = function syncStatusFromItems() {
  // Allow sync when the order is paid (card) OR when it is a COD order.
  // COD orders are operationally committed immediately but keep paymentStatus
  // 'pending' until the courier collects; blocking on 'paid' would permanently
  // freeze COD order status at 'processing'.
  if (this.paymentStatus !== 'paid' && this.paymentMethod !== 'cod') return;
  const active = this.items.filter((item) => item.status !== 'cancelled');
  if (active.length === 0) {
    this.status = 'cancelled';
    this.cancelledAt = this.cancelledAt || new Date();
    return;
  }
  const rank = { processing: 0, shipped: 1, delivered: 2 };
  const lowest = active.reduce(
    (acc, item) => Math.min(acc, rank[item.status] ?? 0),
    2
  );
  const next = ['processing', 'shipped', 'delivered'][lowest];
  this.status = next;
  if (next === 'delivered' && !this.deliveredAt) this.deliveredAt = new Date();
};

module.exports = mongoose.model('Order', orderSchema);
module.exports.ITEM_STATUSES = ITEM_STATUSES;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
