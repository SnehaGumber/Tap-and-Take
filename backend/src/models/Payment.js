'use strict';

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'usd' },
    provider: { type: String, enum: ['stripe', 'cod', 'simulated'], required: true },
    method: { type: String, enum: ['card', 'cod'], required: true },
    status: {
      type: String,
      enum: ['requires_payment', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'],
      default: 'requires_payment',
      index: true,
    },
    stripePaymentIntentId: { type: String, index: true, sparse: true },
    failureReason: { type: String, default: '' },
    paidAt: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

module.exports = mongoose.model('Payment', paymentSchema);
