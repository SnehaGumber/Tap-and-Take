'use strict';

const mongoose = require('mongoose');
const { slugify } = require('../utils/slugify');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
      maxlength: 60,
    },
    slug: { type: String, unique: true, index: true },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    image: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

categorySchema.pre('validate', function setSlug(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name);
  }
  return next();
});

module.exports = mongoose.model('Category', categorySchema);
