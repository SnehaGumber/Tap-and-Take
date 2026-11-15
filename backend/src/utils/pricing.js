'use strict';

const env = require('../config/env');
const { findCoupon, normalizeCode } = require('../config/coupons');

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/** Price a customer actually pays for one unit. */
function finalUnitPrice(price, discountPercent = 0) {
  const discount = Math.min(Math.max(Number(discountPercent) || 0, 0), 90);
  return round2(Number(price) - (Number(price) * discount) / 100);
}

/**
 * Server-side money math. `items` must already contain trusted DB prices.
 * items: [{ price, originalPrice, quantity }]
 * options: { couponCode } - the code is validated here; the client never sends amounts.
 */
function computeTotals(items = [], { couponCode = '' } = {}) {
  let subtotal = 0;
  let discount = 0;

  for (const item of items) {
    const quantity = Number(item.quantity) || 0;
    subtotal += Number(item.price) * quantity;
    discount += (Number(item.originalPrice || item.price) - Number(item.price)) * quantity;
  }

  subtotal = round2(subtotal);
  discount = round2(discount);

  let shipping = subtotal > 0 && subtotal < env.freeShippingThreshold ? round2(env.shippingFlat) : 0;

  const requested = normalizeCode(couponCode);
  const coupon = findCoupon(requested);
  let couponDiscount = 0;
  let couponStatus = null;

  if (requested) {
    if (!coupon) {
      couponStatus = { code: requested, applied: false, message: 'That coupon code is not valid.' };
    } else if (subtotal <= 0) {
      couponStatus = { code: coupon.code, applied: false, message: 'Add items to your cart to use this coupon.' };
    } else if (subtotal < coupon.minSubtotal) {
      couponStatus = {
        code: coupon.code,
        applied: false,
        message: `Spend at least ${coupon.minSubtotal} to use ${coupon.code}.`,
      };
    } else if (coupon.type === 'shipping') {
      shipping = 0;
      couponStatus = { code: coupon.code, applied: true, message: 'Free delivery applied.' };
    } else {
      const raw = coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
      couponDiscount = round2(Math.min(raw, coupon.maxDiscount || raw, subtotal));
      couponStatus = { code: coupon.code, applied: true, message: `${coupon.code} applied.` };
    }
  }

  const taxableBase = round2(Math.max(subtotal - couponDiscount, 0));
  const tax = round2(taxableBase * env.taxRate);
  const total = round2(taxableBase + tax + shipping);

  return {
    subtotal,
    discount,
    couponCode: couponStatus && couponStatus.applied ? couponStatus.code : '',
    couponDiscount,
    tax,
    shipping,
    total,
    currency: env.currency,
    coupon: couponStatus,
  };
}

/** Stripe expects the smallest currency unit (cents). */
function toMinorUnits(amount) {
  return Math.round(round2(amount) * 100);
}

module.exports = { round2, finalUnitPrice, computeTotals, toMinorUnits };
