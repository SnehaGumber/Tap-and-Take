'use strict';

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be between 1 and 5'],
      max: [5, 'Rating must be between 1 and 5'],
    },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      minlength: [5, 'Review comment is too short'],
      maxlength: [1500, 'Review comment is too long'],
    },
    isVerifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

// One review per user per product.
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
