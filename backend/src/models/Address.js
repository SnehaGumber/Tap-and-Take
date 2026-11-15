'use strict';

const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, trim: true, default: 'Home', maxlength: 30 },
    fullName: { type: String, required: [true, 'Full name is required'], trim: true, maxlength: 80 },
    phone: { type: String, required: [true, 'Phone is required'], trim: true, maxlength: 20 },
    line1: { type: String, required: [true, 'Address line 1 is required'], trim: true, maxlength: 160 },
    line2: { type: String, trim: true, default: '', maxlength: 160 },
    city: { type: String, required: [true, 'City is required'], trim: true, maxlength: 60 },
    state: { type: String, required: [true, 'State is required'], trim: true, maxlength: 60 },
    postalCode: { type: String, required: [true, 'Postal code is required'], trim: true, maxlength: 16 },
    country: { type: String, required: true, trim: true, default: 'United States', maxlength: 60 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

addressSchema.index({ user: 1, isDefault: -1 });

module.exports = mongoose.model('Address', addressSchema);
