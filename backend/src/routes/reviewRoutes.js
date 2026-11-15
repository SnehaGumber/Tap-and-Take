'use strict';

const express = require('express');
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { idParam } = require('../validators/common');
const { createReviewSchema, updateReviewSchema } = require('../validators/reviewValidator');

const router = express.Router();

router.get('/product/:productId', reviewController.listProductReviews);

router.use(protect);
router.get('/eligibility/:productId', reviewController.getEligibility);
router.post('/', validate({ body: createReviewSchema }), reviewController.createReview);
router.patch(
  '/:id',
  validate({ params: idParam, body: updateReviewSchema }),
  reviewController.updateReview
);
router.delete('/:id', validate({ params: idParam }), reviewController.deleteReview);

module.exports = router;
