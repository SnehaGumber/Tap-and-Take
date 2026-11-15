'use strict';

/**
 * Pure money math. No database required: these guarantee that the server, and
 * only the server, decides what a customer pays.
 */
const { computeTotals, finalUnitPrice, toMinorUnits } = require('../src/utils/pricing');
const { findCoupon, listPublicCoupons } = require('../src/config/coupons');

describe('pricing utils', () => {
  it('applies and clamps percentage discounts', () => {
    expect(finalUnitPrice(100, 10)).toBe(90);
    expect(finalUnitPrice(19.99, 0)).toBe(19.99);
    expect(finalUnitPrice(100, 999)).toBe(10); // discount is capped at 90%
  });

  it('computes subtotal, discount, tax and free shipping', () => {
    const totals = computeTotals([{ price: 90, originalPrice: 100, quantity: 2 }]);
    expect(totals.subtotal).toBe(180);
    expect(totals.discount).toBe(20);
    expect(totals.shipping).toBe(0); // above the free shipping threshold
    expect(totals.tax).toBeCloseTo(14.4, 2);
    expect(totals.total).toBeCloseTo(194.4, 2);
  });

  it('charges flat shipping below the threshold and nothing for an empty cart', () => {
    expect(computeTotals([{ price: 20, originalPrice: 20, quantity: 1 }]).shipping).toBe(6.99);
    const empty = computeTotals([]);
    expect(empty.total).toBe(0);
    expect(empty.shipping).toBe(0);
  });

  it('converts totals to Stripe minor units without float drift', () => {
    expect(toMinorUnits(194.4)).toBe(19440);
    expect(toMinorUnits(0.1 + 0.2)).toBe(30);
  });
});

describe('coupons', () => {
  it('caps a percentage coupon at its maximum discount and taxes the reduced base', () => {
    const totals = computeTotals([{ price: 500, originalPrice: 500, quantity: 1 }], {
      couponCode: 'trendora10',
    });
    expect(totals.couponCode).toBe('TRENDORA10');
    expect(totals.couponDiscount).toBe(40);
    expect(totals.tax).toBeCloseTo(460 * 0.08, 2);
  });

  it('rejects a coupon below its minimum subtotal with an explanatory message', () => {
    const totals = computeTotals([{ price: 10, originalPrice: 10, quantity: 1 }], {
      couponCode: 'TRENDORA10',
    });
    expect(totals.couponDiscount).toBe(0);
    expect(totals.couponCode).toBe('');
    expect(totals.coupon.applied).toBe(false);
    expect(totals.coupon.message).toEqual(expect.any(String));
  });

  it('never lets an invented coupon code change the total', () => {
    const base = computeTotals([{ price: 100, originalPrice: 100, quantity: 1 }]);
    const forged = computeTotals([{ price: 100, originalPrice: 100, quantity: 1 }], {
      couponCode: 'FREE-MONEY',
    });
    expect(forged.total).toBe(base.total);
    expect(forged.coupon.applied).toBe(false);
  });

  it('FREESHIP only removes shipping', () => {
    const totals = computeTotals([{ price: 20, originalPrice: 20, quantity: 1 }], {
      couponCode: 'FREESHIP',
    });
    expect(totals.shipping).toBe(0);
    expect(totals.couponDiscount).toBe(0);
  });

  it('exposes only public coupon fields to the client', () => {
    listPublicCoupons().forEach((coupon) => {
      expect(Object.keys(coupon).sort()).toEqual(['code', 'description', 'minSubtotal']);
    });
    expect(findCoupon('  welcome5 ').code).toBe('WELCOME5');
    expect(findCoupon('nope')).toBeNull();
  });
});
