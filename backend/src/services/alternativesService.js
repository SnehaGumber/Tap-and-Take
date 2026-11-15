'use strict';

/**
 * Smart Product Alternatives
 * ──────────────────────────
 * Returns a ranked list of alternative products for a given product, with
 * explicit human-readable reasons for each recommendation.
 *
 * Algorithm: deterministic scoring — no LLM, no external service.
 * Works offline and degrades gracefully (returns empty array) when there
 * are no suitable alternatives.
 *
 * Scoring:
 *   +3  same category
 *   +2  same brand
 *   +2  price within ±30% of the source product's final price
 *   +2  currently in stock
 *   +1  rating >= 4.0
 *   +1  lower final price than source (genuine value signal)
 *
 * Exclusions:
 *   - The source product itself
 *   - Inactive (delisted) products
 *   - Out-of-stock products (when stockRequired = true, default false)
 */

const { Product } = require('../models');
const { finalUnitPrice } = require('../utils/pricing');

const PRICE_BAND = 0.30;   // ±30 % of source final price
const MAX_RESULTS = 8;

const SCORE = {
  sameCategory: 3,
  sameBrand:    2,
  priceBand:    2,
  inStock:      2,
  highRating:   1,
  lowerPrice:   1,
};

/**
 * @param {string|ObjectId} productId  — source product ID
 * @param {{ stockRequired?: boolean, limit?: number }} [options]
 */
async function getProductAlternatives(productId, { stockRequired = false, limit = MAX_RESULTS } = {}) {
  const source = await Product.findById(productId)
    .populate('category', 'name')
    .populate('seller', 'name store.name')
    .lean();

  if (!source) return { source: null, alternatives: [] };

  const sourceFinalPrice = finalUnitPrice(source.price, source.discountPercent);

  // ── Fetch candidates ───────────────────────────────────────────────────────
  // We cast a wider net (up to 60 candidates) from the same category or same brand,
  // then score them in memory. This avoids a complex aggregation and keeps the
  // query simple and index-friendly (category and brand are both indexed).
  const candidateFilter = {
    _id: { $ne: source._id },
    isActive: true,
    $or: [{ category: source.category?._id ?? source.category }, { brand: source.brand }],
  };
  if (stockRequired) candidateFilter.stock = { $gt: 0 };

  const candidates = await Product.find(candidateFilter)
    .populate('category', 'name')
    .populate('seller', 'name store.name')
    .limit(60)
    .lean();

  // ── Score each candidate ──────────────────────────────────────────────────
  const scored = candidates.map((product) => {
    const finalPrice = finalUnitPrice(product.price, product.discountPercent);
    let score = 0;
    const reasons = [];

    const sourceCategory = String(source.category?._id ?? source.category);
    const productCategory = String(product.category?._id ?? product.category);

    if (productCategory === sourceCategory) {
      score += SCORE.sameCategory;
      reasons.push(`Same category: ${product.category?.name ?? 'Unknown'}`);
    }

    if (product.brand && product.brand.toLowerCase() === source.brand?.toLowerCase()) {
      score += SCORE.sameBrand;
      reasons.push(`Same brand: ${product.brand}`);
    }

    const priceLow  = sourceFinalPrice * (1 - PRICE_BAND);
    const priceHigh = sourceFinalPrice * (1 + PRICE_BAND);
    if (finalPrice >= priceLow && finalPrice <= priceHigh) {
      score += SCORE.priceBand;
      reasons.push('Similar price range');
    }

    if (product.stock > 0) {
      score += SCORE.inStock;
      reasons.push('In stock');
    }

    if (product.ratingAverage >= 4.0) {
      score += SCORE.highRating;
      reasons.push(`Rated ${product.ratingAverage}/5`);
    }

    if (finalPrice < sourceFinalPrice) {
      score += SCORE.lowerPrice;
      reasons.push('Lower price');
    }

    return {
      product: {
        _id:            product._id,
        title:          product.title,
        slug:           product.slug,
        brand:          product.brand,
        price:          product.price,
        discountPercent: product.discountPercent,
        finalPrice,
        stock:          product.stock,
        inStock:        product.stock > 0,
        images:         product.images,
        ratingAverage:  product.ratingAverage,
        ratingCount:    product.ratingCount,
        category:       product.category,
        seller:         product.seller,
      },
      score,
      reasons,
    };
  });

  // ── Sort by score desc, then by rating desc as tiebreaker ─────────────────
  scored.sort((a, b) =>
    b.score !== a.score
      ? b.score - a.score
      : (b.product.ratingAverage ?? 0) - (a.product.ratingAverage ?? 0)
  );

  return {
    source: {
      _id:        source._id,
      title:      source.title,
      finalPrice: sourceFinalPrice,
      brand:      source.brand,
      category:   source.category,
    },
    alternatives: scored.slice(0, limit),
  };
}

module.exports = { getProductAlternatives, SCORE, PRICE_BAND };
