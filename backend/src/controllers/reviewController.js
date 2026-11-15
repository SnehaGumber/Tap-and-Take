'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const reviewService = require('../services/reviewService');

const listProductReviews = asyncHandler(async (req, res) => {
  const { reviews, distribution, meta } = await reviewService.listProductReviews(
    req.params.productId,
    req.query
  );
  return sendSuccess(res, { message: 'Reviews', data: { reviews, distribution }, meta });
});

const createReview = asyncHandler(async (req, res) =>
  sendCreated(res, {
    message: 'Review published',
    data: { review: await reviewService.createReview(req.user._id, req.body) },
  })
);

const updateReview = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Review updated',
    data: { review: await reviewService.updateReview(req.user._id, req.params.id, req.body) },
  })
);

const deleteReview = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Review deleted',
    data: await reviewService.deleteReview(req.user, req.params.id),
  })
);

const getEligibility = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Review eligibility',
    data: await reviewService.canUserReview(req.user._id, req.params.productId),
  })
);

module.exports = { listProductReviews, createReview, updateReview, deleteReview, getEligibility };
