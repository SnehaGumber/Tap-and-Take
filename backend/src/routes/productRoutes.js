'use strict';

const express = require('express');
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');
const { protect, optionalAuth } = require('../middleware/auth');
const { authorize, requireApprovedSeller } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { uploadProductImages } = require('../middleware/upload');
const { idParam } = require('../validators/common');
const {
  createProductSchema,
  updateProductSchema,
  listProductsQuery,
  suggestionsQuery,
} = require('../validators/productValidator');

const router = express.Router();

// Public catalogue
router.get('/', validate({ query: listProductsQuery }), productController.listProducts);
router.get('/facets/filters', productController.getFacets);
router.get(
  '/suggestions',
  validate({ query: suggestionsQuery }),
  productController.getSuggestions
);
router.get('/sellers/:id', validate({ params: idParam }), productController.getSellerProfile);
router.get('/:productId/reviews', reviewController.listProductReviews);
router.get('/:productId/alternatives', productController.getAlternatives);

// Seller / admin management
router.post(
  '/',
  protect,
  authorize('seller', 'admin'),
  requireApprovedSeller,
  uploadProductImages,
  validate({ body: createProductSchema }),
  productController.createProduct
);

router.patch(
  '/:id',
  protect,
  authorize('seller', 'admin'),
  uploadProductImages,
  validate({ params: idParam, body: updateProductSchema }),
  productController.updateProduct
);

router.delete(
  '/:id',
  protect,
  authorize('seller', 'admin'),
  validate({ params: idParam }),
  productController.deleteProduct
);

// Keep the catch-all last so it never shadows the routes above.
router.get('/:idOrSlug', optionalAuth, productController.getProduct);

module.exports = router;
