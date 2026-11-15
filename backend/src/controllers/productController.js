'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const productService = require('../services/productService');
const reviewService = require('../services/reviewService');
const { getProductAlternatives } = require('../services/alternativesService');

const listProducts = asyncHandler(async (req, res) => {
  const { products, meta } = await productService.listProducts(req.query);
  return sendSuccess(res, { message: 'Products', data: { products }, meta });
});

const getFacets = asyncHandler(async (_req, res) =>
  sendSuccess(res, { message: 'Filter options', data: await productService.getFilterFacets() })
);

const getSuggestions = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Search suggestions',
    data: await productService.getSuggestions(req.query.q || ''),
  })
);

const getProduct = asyncHandler(async (req, res) => {
  const includeInactive = req.user?.role === 'admin';
  const product = await productService.getProduct(req.params.idOrSlug, { includeInactive });
  const [related, reviewData, reviewEligibility] = await Promise.all([
    productService.getRelatedProducts(product),
    reviewService.listProductReviews(product._id, { limit: 5 }),
    reviewService.canUserReview(req.user?._id, product._id),
  ]);

  return sendSuccess(res, {
    message: 'Product details',
    data: {
      product,
      related,
      reviews: reviewData.reviews,
      reviewMeta: reviewData.meta,
      ratingDistribution: reviewData.distribution,
      reviewEligibility,
    },
  });
});

const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct({
    sellerId: req.user._id,
    payload: req.body,
    files: req.files || [],
  });
  return sendCreated(res, { message: 'Product created', data: { product } });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct({
    productId: req.params.id,
    user: req.user,
    payload: req.body,
    files: req.files || [],
  });
  return sendSuccess(res, { message: 'Product updated', data: { product } });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const result = await productService.deleteProduct({ productId: req.params.id, user: req.user });
  return sendSuccess(res, { message: 'Product deleted', data: result });
});

const getSellerProfile = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Seller profile',
    data: await productService.getSellerPublicProfile(req.params.id),
  })
);

const getAlternatives = asyncHandler(async (req, res) => {
  const stockRequired = req.query.inStock === 'true';
  const limit = Math.min(Math.max(1, Number(req.query.limit) || 8), 20);
  return sendSuccess(res, {
    message: 'Product alternatives',
    data: await getProductAlternatives(req.params.productId, { stockRequired, limit }),
  });
});

module.exports = {
  listProducts,
  getFacets,
  getSuggestions,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getSellerProfile,
  getAlternatives,
};
