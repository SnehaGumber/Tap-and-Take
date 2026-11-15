'use strict';

const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, max: 20, default: 1 },
  },
  { _id: false, timestamps: false }
);

const savedItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, max: 20, default: 1 },
    savedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    items: { type: [cartItemSchema], default: [] },
    /** "Save for later" shelf - kept separate so totals never include it. */
    savedItems: { type: [savedItemSchema], default: [] },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

module.exports = mongoose.model('Cart', cartSchema);
