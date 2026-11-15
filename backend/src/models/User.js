'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const storeSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120, default: '' },
    description: { type: String, trim: true, maxlength: 1500, default: '' },
    contactEmail: { type: String, trim: true, lowercase: true, default: '' },
    contactPhone: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name must be at most 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['customer', 'seller', 'admin'],
      default: 'customer',
      index: true,
    },
    phone: { type: String, trim: true, default: '' },
    avatar: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    isActive: { type: Boolean, default: true, index: true },
    store: { type: storeSchema, default: undefined },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ name: 'text', email: 'text' });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

userSchema.pre('save', function ensureStore(next) {
  if (this.role === 'seller' && !this.store) {
    this.store = { name: `${this.name}'s Store`, status: 'pending' };
  }
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isApprovedSeller = function isApprovedSeller() {
  return this.role === 'seller' && this.store && this.store.status === 'approved';
};

module.exports = mongoose.model('User', userSchema);
