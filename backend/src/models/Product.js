'use strict';

const mongoose = require('mongoose');
const { slugify } = require('../utils/slugify');
const { finalUnitPrice } = require('../utils/pricing');

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
  },
  { _id: false }
);

const specSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 60 },
    value: { type: String, required: true, trim: true, maxlength: 300 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [160, 'Title must be at most 160 characters'],
    },
    slug: { type: String, unique: true, index: true },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      minlength: [20, 'Description must be at least 20 characters'],
      maxlength: [5000, 'Description is too long'],
    },
    brand: { type: String, required: [true, 'Brand is required'], trim: true, index: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
      index: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0.01, 'Price must be greater than 0'],
    },
    discountPercent: { type: Number, default: 0, min: 0, max: 90 },
    stock: { type: Number, required: true, default: 0, min: [0, 'Stock cannot be negative'] },
    images: {
      type: [imageSchema],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'At least one product image is required',
      },
    },
    specifications: { type: [specSchema], default: [] },
    tags: { type: [String], default: [], index: true },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    numSold: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.index({ title: 'text', description: 'text', brand: 'text', tags: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ ratingAverage: -1 });
productSchema.index({ seller: 1, isActive: 1 });

productSchema.virtual('finalPrice').get(function getFinalPrice() {
  return finalUnitPrice(this.price, this.discountPercent);
});

productSchema.virtual('inStock').get(function getInStock() {
  return this.stock > 0;
});

productSchema.pre('validate', function setSlug(next) {
  if (this.isModified('title') || !this.slug) {
    const base = slugify(this.title) || 'product';
    this.slug = `${base}-${String(this._id).slice(-6)}`;
  }
  return next();
});

module.exports = mongoose.model('Product', productSchema);
