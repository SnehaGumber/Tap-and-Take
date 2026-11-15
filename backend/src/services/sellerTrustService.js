'use strict';

/**
 * Seller Trust Score
 * ──────────────────
 * A transparent, data-only score (0–100) derived entirely from verified
 * marketplace activity stored in MongoDB. No external signals, no fabricated
 * data, no ML model.
 *
 * Components:
 *
 *  1. Fulfilment rate  (40 pts)
 *     = committedOrders / totalOrders
 *     An order is "committed" once stockCommitted === true (i.e. it passed the
 *     payment/confirmation gate). Orders that never committed (payment_failed,
 *     still pending_payment) do not count as committed.
 *
 *  2. Delivery rate   (30 pts)
 *     = deliveredItems / terminalItems
 *     "Terminal" means the item reached a final state: either 'delivered' or
 *     'cancelled'. Items still 'processing' or 'shipped' are in-progress — they
 *     are NOT counted at all. This means a seller with all items still shipping
 *     gets 0 delivery pts (neutral), not a penalty. Only actual cancellations
 *     after commitment reduce this rate. The denominator grows only as items
 *     reach terminal states.
 *
 *  3. Cancellation penalty  (up to −15 pts)
 *     = cancelledAfterCommit / committedOrders
 *     Counts orders that were committed (stock reserved) but later cancelled at
 *     the order level. This covers customer-initiated cancellations as well —
 *     all are attributed to the order, not individually blamed on the seller,
 *     which is the fairest available signal without tracking who initiated.
 *
 *  4. Review score   (30 pts)
 *     = weighted average of product ratingAverages, mapped to 0–30.
 *     Weighted by ratingCount so products with more reviews carry more weight.
 *     No reviews → 0 pts (neutral, never negative).
 *     Rating 1 → 0 pts; Rating 5 → 30 pts (linear scale).
 *
 * Minimum sample: MINIMUM_ORDERS committed orders before a score is shown.
 * Below that the response is { hasScore: false, reason: 'insufficient_data' }.
 */

const mongoose = require('mongoose');
const { Order, Product } = require('../models');
const { round2 } = require('../utils/pricing');

const MINIMUM_ORDERS = 3;
const WEIGHTS = {
  fulfilment:    40,
  delivery:      30,
  review:        30,
  cancelPenalty: 15,
};

/**
 * Computes the seller trust score from verified marketplace data.
 * @param {string|ObjectId} sellerId
 */
async function getSellerTrustScore(sellerId) {
  const oid = new mongoose.Types.ObjectId(String(sellerId));

  // ── 1. Order + item aggregation ──────────────────────────────────────────
  // We unwind to item level (to filter only THIS seller's items), then
  // re-group to order level (to count orders), then summarise.
  //
  // Multi-seller orders are handled correctly: after the first $match on
  // 'items.seller', the second $match after $unwind keeps only this seller's
  // items. The $group by _id re-assembles per-order metrics using only those
  // items, so another seller's items never pollute this seller's counts.
  const [orderStats] = await Order.aggregate([
    // Stage 1: narrow to orders that contain at least one item from this seller.
    // Exclude payment_failed orders (never reached the seller).
    { $match: { 'items.seller': oid, status: { $ne: 'payment_failed' } } },

    // Stage 2: flatten to item level.
    { $unwind: '$items' },

    // Stage 3: keep only this seller's items (drop co-sellers' lines).
    { $match: { 'items.seller': oid } },

    // Stage 4: re-group to order level, counting per-seller item statistics.
    {
      $group: {
        _id:            '$_id',
        stockCommitted: { $first: '$stockCommitted' },
        orderStatus:    { $first: '$status' },
        // Count this seller's items by final state.
        committedItemLines: { $sum: 1 },
        deliveredItems: { $sum: { $cond: [{ $eq: ['$items.status', 'delivered'] }, 1, 0] } },
        // terminalItems = delivered + cancelled (excludes processing/shipped)
        terminalItems:  {
          $sum: {
            $cond: [
              { $in: ['$items.status', ['delivered', 'cancelled']] },
              1,
              0,
            ],
          },
        },
      },
    },

    // Stage 5: summarise across all orders for this seller.
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        committedOrders: {
          $sum: { $cond: ['$stockCommitted', 1, 0] },
        },
        // Committed orders whose order-level status became 'cancelled'.
        cancelledAfterCommit: {
          $sum: {
            $cond: [
              { $and: ['$stockCommitted', { $eq: ['$orderStatus', 'cancelled'] }] },
              1,
              0,
            ],
          },
        },
        // Count seller-specific item lines only for committed orders.
        committedItems: {
          $sum: { $cond: ['$stockCommitted', '$committedItemLines', 0] },
        },
        // Terminal/delivered counts only from committed orders.
        terminalItems: {
          $sum: { $cond: ['$stockCommitted', '$terminalItems', 0] },
        },
        deliveredItems: {
          $sum: { $cond: ['$stockCommitted', '$deliveredItems', 0] },
        },
      },
    },
  ]);

  // ── 2. Rating aggregation ─────────────────────────────────────────────────
  // Weighted average across all active products with at least one review.
  // Only this seller's products are matched — ratingAverage on each product is
  // already scoped (updated by recalculateProductRating per product).
  const [ratingStats] = await Product.aggregate([
    { $match: { seller: oid, isActive: true, ratingCount: { $gt: 0 } } },
    {
      $group: {
        _id: null,
        totalWeightedRating: { $sum: { $multiply: ['$ratingAverage', '$ratingCount'] } },
        totalReviews:        { $sum: '$ratingCount' },
        ratedProducts:       { $sum: 1 },
      },
    },
  ]);

  // ── 3. Insufficient data guard ────────────────────────────────────────────
  const committedOrders = orderStats?.committedOrders ?? 0;
  if (committedOrders < MINIMUM_ORDERS) {
    return {
      hasScore: false,
      reason: 'insufficient_data',
      minimumOrdersRequired: MINIMUM_ORDERS,
      currentOrders: committedOrders,
      explanation:
        `This seller has ${committedOrders} confirmed order(s). ` +
        `At least ${MINIMUM_ORDERS} are needed to calculate a trust score.`,
    };
  }

  // ── 4. Component calculations ─────────────────────────────────────────────
  const totalOrders    = orderStats.totalOrders;
  const cancelledAfter = orderStats.cancelledAfterCommit;
  const terminalItems  = orderStats.terminalItems;
  const deliveredItems = orderStats.deliveredItems;

  // 4a. Fulfilment rate: committed / total presented to this seller.
  const fulfilmentRate  = totalOrders > 0 ? committedOrders / totalOrders : 0;
  const fulfilmentScore = round2(fulfilmentRate * WEIGHTS.fulfilment);

  // 4b. Delivery rate: delivered / terminal (delivered + cancelled).
  // Items still in 'processing' or 'shipped' are excluded from both numerator
  // and denominator — they are in-progress, not yet a success or failure.
  // If no items have reached a terminal state yet, rate = 0 (neutral).
  const deliveryRate  = terminalItems > 0 ? deliveredItems / terminalItems : 0;
  const deliveryScore = round2(deliveryRate * WEIGHTS.delivery);

  // 4c. Cancellation penalty: cancelled-after-commit / committed.
  const cancellationRate = committedOrders > 0 ? cancelledAfter / committedOrders : 0;
  const cancelPenalty    = round2(cancellationRate * WEIGHTS.cancelPenalty);

  // 4d. Review score: map weighted-avg rating (1–5) → 0–30 pts.
  // No reviews → 0 pts (not penalised, not rewarded).
  const hasReviews        = ratingStats && ratingStats.totalReviews > 0;
  const weightedAvgRating = hasReviews
    ? ratingStats.totalWeightedRating / ratingStats.totalReviews
    : 0;
  const reviewScore = hasReviews
    ? round2(((weightedAvgRating - 1) / 4) * WEIGHTS.review)
    : 0;

  // ── 5. Final score ────────────────────────────────────────────────────────
  const rawScore = fulfilmentScore + deliveryScore + reviewScore - cancelPenalty;
  const score    = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    hasScore: true,
    score,
    breakdown: {
      fulfilment: {
        score:       fulfilmentScore,
        maxScore:    WEIGHTS.fulfilment,
        rate:        round2(fulfilmentRate * 100),
        description: 'Confirmed orders as a percentage of all orders presented to this seller',
      },
      delivery: {
        score:       deliveryScore,
        maxScore:    WEIGHTS.delivery,
        rate:        round2(deliveryRate * 100),
        description:
          'Delivered items as a percentage of items that have reached a final state ' +
          '(delivered or cancelled). In-progress items are excluded.',
      },
      cancellation: {
        penalty:     cancelPenalty,
        maxPenalty:  WEIGHTS.cancelPenalty,
        rate:        round2(cancellationRate * 100),
        description: 'Penalty for orders cancelled after the seller confirmed them',
      },
      reviews: {
        score:           reviewScore,
        maxScore:        WEIGHTS.review,
        weightedAverage: round2(weightedAvgRating * 10) / 10,
        totalReviews:    ratingStats?.totalReviews ?? 0,
        description:
          'Weighted average customer review score across all products (1 star = 0 pts, 5 stars = 30 pts)',
      },
    },
    evidence: {
  totalOrders,
  committedOrders,
  committedItems: orderStats.committedItems ?? 0,
  cancelledAfterCommit: cancelledAfter,
  terminalItems,
  deliveredItems,
  inProgressItems: Math.max(0, (orderStats.committedItems ?? 0) - terminalItems),
  totalReviews: ratingStats?.totalReviews ?? 0,
  ratedProducts: ratingStats?.ratedProducts ?? 0,
},
    minimumOrdersRequired: MINIMUM_ORDERS,
    explanation:
      'Score = fulfilment rate (40 pts) + delivery rate (30 pts) + ' +
      'review score (30 pts) − cancellation penalty (up to −15 pts). ' +
      'Delivery rate uses only terminal items (delivered or cancelled); ' +
      'in-progress shipments are excluded until resolved. ' +
      'All data is from verified marketplace transactions.',
  };
}

module.exports = { getSellerTrustScore, MINIMUM_ORDERS, WEIGHTS };
