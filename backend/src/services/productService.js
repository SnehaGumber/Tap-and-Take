'use strict';

const { Product, Category, Review, User } = require('../models');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { getPagination, buildMeta } = require('../utils/pagination');
const { finalUnitPrice } = require('../utils/pricing');
const uploadService = require('./uploadService');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * `.lean()` returns plain objects, so Mongoose virtuals (finalPrice / inStock)
 * are NOT included. Every lean read goes through this helper so the API always
 * exposes the same shape as a hydrated document.
 */
function decorate(product) {
  if (!product) return product;
  return {
    ...product,
    finalPrice: finalUnitPrice(product.price, product.discountPercent),
    inStock: (product.stock || 0) > 0,
  };
}

const decorateAll = (products = []) => products.map(decorate);

const SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  rating: { ratingAverage: -1, ratingCount: -1 },
  popular: { numSold: -1, ratingCount: -1 },
  discount: { discountPercent: -1 },
  // "relevance" ranks well-selling, well-rated products first; used as the default
  // ordering for keyword searches.
  relevance: { numSold: -1, ratingAverage: -1, ratingCount: -1 },
};

async function resolveCategoryId(value) {
  if (!value) return null;
  if (/^[a-f\d]{24}$/i.test(value)) return value;
  const category = await Category.findOne({ slug: value });
  return category ? category._id : null;
}

/**
 * Real backend search + filter + sort + pagination.
 * Nothing is filtered on the client.
 */
async function listProducts(query = {}, { sellerId = null, includeInactive = false } = {}) {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (!includeInactive) filter.isActive = true;
  if (sellerId) filter.seller = sellerId;
  else if (query.seller && /^[a-f\d]{24}$/i.test(query.seller)) filter.seller = query.seller;

  if (query.q) {
    const regex = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ title: regex }, { brand: regex }, { description: regex }, { tags: regex }];
  }

  if (query.category) {
    const categoryId = await resolveCategoryId(query.category);
    if (!categoryId) {
      return { products: [], meta: buildMeta({ page, limit, total: 0 }) };
    }
    filter.category = categoryId;
  }

  if (query.brand) {
    const brands = String(query.brand)
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);
    if (brands.length === 1) filter.brand = new RegExp(`^${escapeRegex(brands[0])}$`, 'i');
    else if (brands.length > 1) filter.brand = { $in: brands.map((b) => new RegExp(`^${escapeRegex(b)}$`, 'i')) };
  }

  const minPrice = query.minPrice !== undefined ? Number(query.minPrice) : undefined;
  const maxPrice = query.maxPrice !== undefined ? Number(query.maxPrice) : undefined;
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    filter.price = {};
    if (Number.isFinite(minPrice)) filter.price.$gte = minPrice;
    if (Number.isFinite(maxPrice)) filter.price.$lte = maxPrice;
  }

  const rating = query.rating !== undefined ? Number(query.rating) : undefined;
  if (Number.isFinite(rating) && rating > 0) filter.ratingAverage = { $gte: rating };

  if (query.inStock === 'true' || query.inStock === true) filter.stock = { $gt: 0 };

  const minDiscount = query.minDiscount !== undefined ? Number(query.minDiscount) : undefined;
  if (Number.isFinite(minDiscount) && minDiscount > 0) filter.discountPercent = { $gte: minDiscount };

  const sort = SORT_MAP[query.sort] || (query.q ? SORT_MAP.relevance : SORT_MAP.newest);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('category', 'name slug')
      .populate('seller', 'name store.name store.status')
      .lean(),
    Product.countDocuments(filter),
  ]);

  return { products: decorateAll(products), meta: buildMeta({ page, limit, total }) };
}

async function getFilterFacets() {
  const [brands, priceRange, sellerRows] = await Promise.all([
    Product.distinct('brand', { isActive: true }),
    Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
    ]),
    Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$seller', productCount: { $sum: 1 } } },
      { $sort: { productCount: -1 } },
      { $limit: 25 },
    ]),
  ]);

  // Resolved with a second query instead of a $lookup pipeline so the aggregation
  // stays compatible with MongoDB 4.4 as well as 5.x/6.x/7.x.
  const countBySeller = new Map(sellerRows.map((row) => [String(row._id), row.productCount]));
  const sellerNames = await User.find({ _id: { $in: sellerRows.map((row) => row._id) } })
    .select('name store.name')
    .lean();

  return {
    brands: brands.filter(Boolean).sort((a, b) => a.localeCompare(b)),
    minPrice: priceRange[0] ? Math.floor(priceRange[0].min) : 0,
    maxPrice: priceRange[0] ? Math.ceil(priceRange[0].max) : 0,
    sellers: sellerNames
      .map((row) => ({
        _id: row._id,
        name: row.store?.name || row.name || 'Trendora seller',
        productCount: countBySeller.get(String(row._id)) || 0,
      }))
      .sort((a, b) => b.productCount - a.productCount),
  };
}

/**
 * Type-ahead suggestions across products, categories and stores.
 * Deliberately small + lean so it can be called on every debounced keystroke.
 */
async function getSuggestions(term = '') {
  const q = String(term).trim();
  if (q.length < 2) return { products: [], categories: [], sellers: [] };

  const regex = new RegExp(escapeRegex(q), 'i');

  const [products, categories, sellers] = await Promise.all([
    Product.find({ isActive: true, $or: [{ title: regex }, { brand: regex }, { tags: regex }] })
      .sort({ numSold: -1, ratingAverage: -1 })
      .limit(6)
      .select('title slug brand price discountPercent images')
      .lean(),
    Category.find({ isActive: true, name: regex }).limit(4).select('name slug').lean(),
    User.find({
      role: 'seller',
      isActive: true,
      'store.status': 'approved',
      $or: [{ name: regex }, { 'store.name': regex }],
    })
      .limit(4)
      .select('name store.name')
      .lean(),
  ]);

  return {
    products: products.map((product) => ({
      _id: product._id,
      title: product.title,
      slug: product.slug,
      brand: product.brand,
      price: product.price,
      finalPrice: finalUnitPrice(product.price, product.discountPercent),
      image: product.images?.[0]?.url || '',
    })),
    categories: categories.map((category) => ({
      _id: category._id,
      name: category.name,
      slug: category.slug,
    })),
    sellers: sellers.map((seller) => ({
      _id: seller._id,
      name: seller.store?.name || seller.name,
    })),
  };
}

async function getProduct(idOrSlug, { includeInactive = false } = {}) {
  const filter = /^[a-f\d]{24}$/i.test(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  if (!includeInactive) filter.isActive = true;

  const product = await Product.findOne(filter)
    .populate('category', 'name slug')
    .populate('seller', 'name email store createdAt');

  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

async function getRelatedProducts(product, limit = 8) {
  const related = await Product.find({
    _id: { $ne: product._id },
    isActive: true,
    $or: [{ category: product.category?._id || product.category }, { brand: product.brand }],
  })
    .sort({ ratingAverage: -1, numSold: -1 })
    .limit(limit)
    .populate('category', 'name slug')
    .lean();
  return decorateAll(related);
}

function buildImages({ uploaded = [], imageUrls = [] }) {
  return [
    ...uploaded,
    ...imageUrls.filter(Boolean).map((url) => ({ url, publicId: '' })),
  ];
}

async function createProduct({ sellerId, payload, files = [] }) {
  const category = await Category.findById(payload.category);
  if (!category) throw ApiError.badRequest('The selected category does not exist.');

  const uploaded = await uploadService.uploadProductImages(files);
  const images = buildImages({ uploaded, imageUrls: payload.imageUrls || [] });

  if (images.length === 0) {
    throw ApiError.badRequest('Please upload at least one product image (or provide an image URL).');
  }

  try {
    const product = await Product.create({
      title: payload.title,
      description: payload.description,
      brand: payload.brand,
      category: category._id,
      seller: sellerId,
      price: payload.price,
      discountPercent: payload.discountPercent || 0,
      stock: payload.stock,
      specifications: payload.specifications || [],
      tags: payload.tags || [],
      images,
      isActive: payload.isActive === undefined ? true : payload.isActive === true || payload.isActive === 'true',
    });
    return product.populate([
      { path: 'category', select: 'name slug' },
      { path: 'seller', select: 'name store.name' },
    ]);
  } catch (error) {
    // Do not leave orphaned Cloudinary assets behind.
    await uploadService.destroyImages(uploaded.map((image) => image.publicId));
    throw error;
  }
}

/** Ownership check: a seller may only touch their own products. Admins may touch any. */
async function assertProductAccess(productId, user) {
  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound('Product not found');
  if (user.role === 'admin') return product;
  if (String(product.seller) !== String(user._id)) {
    throw ApiError.forbidden('You can only manage products that belong to your own store.');
  }
  return product;
}

async function updateProduct({ productId, user, payload, files = [] }) {
  const product = await assertProductAccess(productId, user);

  if (payload.category) {
    const category = await Category.findById(payload.category);
    if (!category) throw ApiError.badRequest('The selected category does not exist.');
    product.category = category._id;
  }

  const simpleFields = ['title', 'description', 'brand', 'price', 'discountPercent', 'stock'];
  for (const field of simpleFields) {
    if (payload[field] !== undefined) product[field] = payload[field];
  }
  if (payload.specifications !== undefined) product.specifications = payload.specifications;
  if (payload.tags !== undefined) product.tags = payload.tags;
  if (payload.isActive !== undefined) {
    product.isActive = payload.isActive === true || payload.isActive === 'true';
  }

  if (Array.isArray(payload.removeImages) && payload.removeImages.length > 0) {
    const removable = new Set(payload.removeImages);
    const removed = product.images.filter(
      (image) => removable.has(image.publicId) || removable.has(image.url)
    );
    product.images = product.images.filter(
      (image) => !removable.has(image.publicId) && !removable.has(image.url)
    );
    await uploadService.destroyImages(removed.map((image) => image.publicId));
  }

  const uploaded = await uploadService.uploadProductImages(files);
  const newImages = buildImages({ uploaded, imageUrls: payload.imageUrls || [] });
  if (newImages.length > 0) product.images = [...product.images, ...newImages];

  if (product.images.length === 0) {
    throw ApiError.badRequest('A product must keep at least one image.');
  }

  await product.save();
  return product.populate([
    { path: 'category', select: 'name slug' },
    { path: 'seller', select: 'name store.name' },
  ]);
}

async function deleteProduct({ productId, user }) {
  const product = await assertProductAccess(productId, user);
  await uploadService.destroyImages(product.images.map((image) => image.publicId));
  await Review.deleteMany({ product: product._id });
  await product.deleteOne();
  return { deleted: true, id: productId };
}

async function getLowStockProducts({ sellerId = null, limit = 10 } = {}) {
  const filter = { stock: { $lte: env.lowStockThreshold } };
  if (sellerId) filter.seller = sellerId;
  return Product.find(filter)
    .sort({ stock: 1 })
    .limit(limit)
    .select('title stock price images slug seller')
    .populate('seller', 'name store.name')
    .lean();
}

async function getSellerPublicProfile(sellerId) {
  const seller = await User.findOne({ _id: sellerId, role: 'seller' }).select('name store createdAt');
  if (!seller) throw ApiError.notFound('Seller not found');
  const { getSellerTrustScore } = require('./sellerTrustService');
  const [productCount, ratingAgg, trustScore] = await Promise.all([
    Product.countDocuments({ seller: sellerId, isActive: true }),
    Product.aggregate([
      { $match: { seller: seller._id, ratingCount: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$ratingAverage' }, count: { $sum: '$ratingCount' } } },
    ]),
    getSellerTrustScore(sellerId),
  ]);
  return {
    seller: seller.toJSON(),
    productCount,
    ratingAverage: ratingAgg[0] ? Math.round(ratingAgg[0].avg * 10) / 10 : 0,
    ratingCount: ratingAgg[0] ? ratingAgg[0].count : 0,
    trustScore,
  };
}

module.exports = {
  listProducts,
  getFilterFacets,
  getSuggestions,
  getProduct,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  assertProductAccess,
  getLowStockProducts,
  getSellerPublicProfile,
};
