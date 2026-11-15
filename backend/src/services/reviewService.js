'use strict';

const mongoose = require('mongoose');

const { Review, Product, Order } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta } = require('../utils/pagination');

async function recalculateProductRating(productId) {
  // Always cast to ObjectId so the aggregation $match is type-safe regardless
  // of whether the caller passes a string, ObjectId, or a raw _id reference.
  // The previous implementation branched on typeof, sending undefined to $match
  // when productId was a string — which matches every review in the collection.
  const oid = new mongoose.Types.ObjectId(String(productId));

  const [stats] = await Review.aggregate([
    { $match: { product: oid } },
    { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  if (!stats) {
    // No reviews remain for this product (e.g. the last review was deleted).
    await Product.updateOne({ _id: oid }, { $set: { ratingAverage: 0, ratingCount: 0 } });
    return { ratingAverage: 0, ratingCount: 0 };
  }

  const ratingAverage = Math.round(stats.average * 10) / 10;
  await Product.updateOne(
    { _id: oid },
    { $set: { ratingAverage, ratingCount: stats.count } }
  );
  return { ratingAverage, ratingCount: stats.count };
}

async function listProductReviews(productId, query = {}) {
  const { page, limit, skip } = getPagination(query, { defaultLimit: 10 });
  const [reviews, total] = await Promise.all([
    Review.find({ product: productId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name avatar.url')
      .lean(),
    Review.countDocuments({ product: productId }),
  ]);

  // Guard the aggregation: an undefined _id in $match makes MongoDB throw (HTTP 500).
  const productRef = mongoose.isValidObjectId(productId)
    ? new mongoose.Types.ObjectId(String(productId))
    : null;
  const breakdown = productRef
    ? await Review.aggregate([
        { $match: { product: productRef } },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
      ])
    : [];

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  breakdown.forEach((row) => {
    distribution[row._id] = row.count;
  });

  return { reviews, distribution, meta: buildMeta({ page, limit, total }) };
}

/**
 * Reviews are only allowed after an eligible confirmed purchase, and only once.
 *
 * We use `stockCommitted: true` as the single source of truth for "order is
 * confirmed" instead of paymentStatus. This correctly covers both payment paths:
 *   - Card orders: stockCommitted flips to true only after payment succeeds.
 *   - COD orders:  stockCommitted flips to true immediately on creation (the
 *                  seller ships first; collection happens at the door).
 *
 * The previous check included paymentStatus:'pending', which let a card customer
 * post a review before their card was actually charged.
 */
async function assertPurchaseEligibility(userId, productId) {
  const order = await Order.findOne({
    user: userId,
    'items.product': productId,
    stockCommitted: true,
    status: { $in: ['processing', 'shipped', 'delivered'] },
  })
    .select('_id')
    .lean();

  if (!order) {
    throw ApiError.forbidden('You can only review products you have purchased on Tap & Take.');
  }
  return order._id;
}

async function createReview(userId, { productId, rating, title, comment }) {
  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound('Product not found');

  const existing = await Review.findOne({ product: productId, user: userId });
  if (existing) throw ApiError.conflict('You have already reviewed this product. Edit your existing review instead.');

  const orderId = await assertPurchaseEligibility(userId, productId);

  let review;
  try {
    review = await Review.create({
      product: productId,
      user: userId,
      order: orderId,
      rating,
      title: title || '',
      comment,
      isVerifiedPurchase: true,
    });
  } catch (error) {
    if (error.code === 11000) throw ApiError.conflict('You have already reviewed this product.');
    throw error;
  }

  await recalculateProductRating(product._id);
  return review.populate('user', 'name avatar.url');
}

async function updateReview(userId, reviewId, payload) {
  const review = await Review.findById(reviewId);
  if (!review) throw ApiError.notFound('Review not found');
  if (String(review.user) !== String(userId)) throw ApiError.forbidden('You can only edit your own review.');

  Object.assign(review, payload);
  await review.save();
  await recalculateProductRating(review.product);
  return review.populate('user', 'name avatar.url');
}

async function deleteReview(actor, reviewId) {
  const review = await Review.findById(reviewId);
  if (!review) throw ApiError.notFound('Review not found');

  const isOwner = String(review.user) === String(actor._id);
  if (!isOwner && actor.role !== 'admin') {
    throw ApiError.forbidden('You can only delete your own review.');
  }

  const productId = review.product;
  await review.deleteOne();
  await recalculateProductRating(productId);
  return { deleted: true };
}

async function getMyReviewForProduct(userId, productId) {
  return Review.findOne({ user: userId, product: productId }).lean();
}

async function canUserReview(userId, productId) {
  if (!userId) return { canReview: false, reason: 'not_authenticated' };
  const existing = await Review.findOne({ user: userId, product: productId }).select('_id').lean();
  if (existing) return { canReview: false, reason: 'already_reviewed', reviewId: existing._id };
  try {
    await assertPurchaseEligibility(userId, productId);
    return { canReview: true, reason: 'eligible' };
  } catch (error) {
    return { canReview: false, reason: 'no_purchase' };
  }
}

module.exports = {
  listProductReviews,
  createReview,
  updateReview,
  deleteReview,
  getMyReviewForProduct,
  canUserReview,
  recalculateProductRating,
};
