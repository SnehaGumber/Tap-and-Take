'use strict';

/**
 * Coupons live on the server only. The client may send a code, never a discount
 * amount, so a customer can never invent their own reduction.
 */
const COUPONS = [
  {
    code: 'TRENDORA10',
    type: 'percent',
    value: 10,
    maxDiscount: 40,
    minSubtotal: 50,
    description: '10% off orders over $50 (up to $40 off)',
  },
  {
    code: 'WELCOME5',
    type: 'flat',
    value: 5,
    minSubtotal: 25,
    description: '$5 off your first order over $25',
  },
  {
    code: 'FREESHIP',
    type: 'shipping',
    value: 0,
    minSubtotal: 0,
    description: 'Free delivery on any order',
  },
];

function normalizeCode(code = '') {
  return String(code).trim().toUpperCase();
}

function findCoupon(code) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return COUPONS.find((coupon) => coupon.code === normalized) || null;
}

function listPublicCoupons() {
  return COUPONS.map(({ code, description, minSubtotal }) => ({ code, description, minSubtotal }));
}

module.exports = { COUPONS, findCoupon, normalizeCode, listPublicCoupons };
