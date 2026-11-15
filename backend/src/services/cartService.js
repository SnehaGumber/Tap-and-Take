'use strict';

const { Cart, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const { computeTotals, finalUnitPrice } = require('../utils/pricing');
const { listPublicCoupons } = require('../config/coupons');

const PRODUCT_FIELDS = 'title slug brand price discountPercent stock images isActive seller ratingAverage ratingCount';

async function getCartDocument(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [], savedItems: [] });
  if (!Array.isArray(cart.savedItems)) cart.savedItems = [];
  return cart;
}

function serializeProduct(product, unitPrice) {
  return {
    _id: product._id,
    title: product.title,
    slug: product.slug,
    brand: product.brand,
    price: product.price,
    discountPercent: product.discountPercent,
    finalPrice: unitPrice,
    stock: product.stock,
    image: product.images?.[0]?.url || '',
    seller: product.seller,
    ratingAverage: product.ratingAverage,
    ratingCount: product.ratingCount,
  };
}

/**
 * Builds the cart view. Prices always come from the database, never the client.
 * Unavailable products are reported so the UI can explain what happened.
 */
async function buildCartView(cart, { couponCode = '' } = {}) {
  await cart.populate([
    {
      path: 'items.product',
      select: PRODUCT_FIELDS,
      populate: { path: 'seller', select: 'name store.name store.status' },
    },
    {
      path: 'savedItems.product',
      select: PRODUCT_FIELDS,
      populate: { path: 'seller', select: 'name store.name store.status' },
    },
  ]);

  const items = [];
  const issues = [];
  let mutated = false;

  for (const item of [...cart.items]) {
    const product = item.product;
    if (!product) {
      issues.push({ message: 'A product in your cart is no longer available and was removed.' });
      cart.items = cart.items.filter((i) => i.product);
      mutated = true;
      continue;
    }
    if (!product.isActive) {
      issues.push({
        productId: String(product._id),
        message: `"${product.title}" is no longer sold and was removed from your cart.`,
      });
      cart.items = cart.items.filter((i) => String(i.product?._id) !== String(product._id));
      mutated = true;
      continue;
    }

    let quantity = item.quantity;
    if (product.stock === 0) {
      issues.push({ productId: String(product._id), message: `"${product.title}" is out of stock.` });
    } else if (quantity > product.stock) {
      quantity = product.stock;
      const target = cart.items.find((i) => String(i.product?._id) === String(product._id));
      if (target) target.quantity = quantity;
      mutated = true;
      issues.push({
        productId: String(product._id),
        message: `Only ${product.stock} unit(s) of "${product.title}" left - quantity updated.`,
      });
    }

    const unitPrice = finalUnitPrice(product.price, product.discountPercent);
    items.push({
      product: serializeProduct(product, unitPrice),
      quantity,
      unitPrice,
      originalPrice: product.price,
      lineTotal: Math.round(unitPrice * quantity * 100) / 100,
      inStock: product.stock > 0,
    });
  }

  const savedItems = [];
  for (const saved of [...cart.savedItems]) {
    const product = saved.product;
    if (!product || !product.isActive) {
      cart.savedItems = cart.savedItems.filter((i) => i.product && i.product.isActive !== false);
      mutated = true;
      continue;
    }
    const unitPrice = finalUnitPrice(product.price, product.discountPercent);
    savedItems.push({
      product: serializeProduct(product, unitPrice),
      quantity: saved.quantity,
      unitPrice,
      savedAt: saved.savedAt,
      inStock: product.stock > 0,
    });
  }

  if (mutated) await cart.save();

  const totals = computeTotals(
    items
      .filter((item) => item.inStock)
      .map((item) => ({
        price: item.unitPrice,
        originalPrice: item.originalPrice,
        quantity: item.quantity,
      })),
    { couponCode }
  );

  return {
    _id: cart._id,
    items,
    savedItems,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    totals,
    issues,
    availableCoupons: listPublicCoupons(),
  };
}

async function getCart(userId, { couponCode = '' } = {}) {
  const cart = await getCartDocument(userId);
  return buildCartView(cart, { couponCode });
}

async function addItem(userId, { productId, quantity = 1 }) {
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw ApiError.notFound('Product not found or no longer available.');
  if (product.stock < 1) throw ApiError.badRequest(`"${product.title}" is out of stock.`);

  const cart = await getCartDocument(userId);
  const existing = cart.items.find((item) => String(item.product) === String(productId));
  const nextQuantity = (existing ? existing.quantity : 0) + quantity;

  if (nextQuantity > product.stock) {
    throw ApiError.badRequest(`Only ${product.stock} unit(s) of "${product.title}" are available.`);
  }
  if (nextQuantity > 20) throw ApiError.badRequest('Maximum 20 units per product per order.');

  if (existing) existing.quantity = nextQuantity;
  else cart.items.push({ product: product._id, quantity });

  await cart.save();
  return buildCartView(cart);
}

async function updateItem(userId, productId, quantity) {
  const cart = await getCartDocument(userId);
  const existing = cart.items.find((item) => String(item.product) === String(productId));
  if (!existing) throw ApiError.notFound('This product is not in your cart.');

  const product = await Product.findById(productId);
  if (!product || !product.isActive) throw ApiError.notFound('Product no longer available.');
  if (quantity > product.stock) {
    throw ApiError.badRequest(`Only ${product.stock} unit(s) of "${product.title}" are available.`);
  }

  existing.quantity = quantity;
  await cart.save();
  return buildCartView(cart);
}

async function removeItem(userId, productId) {
  const cart = await getCartDocument(userId);
  const before = cart.items.length;
  cart.items = cart.items.filter((item) => String(item.product) !== String(productId));
  if (cart.items.length === before) throw ApiError.notFound('This product is not in your cart.');
  await cart.save();
  return buildCartView(cart);
}

async function clearCart(userId) {
  const cart = await getCartDocument(userId);
  cart.items = [];
  await cart.save();
  return buildCartView(cart);
}

/** Move an active cart line to the "saved for later" shelf. */
async function saveForLater(userId, productId) {
  const cart = await getCartDocument(userId);
  const existing = cart.items.find((item) => String(item.product) === String(productId));
  if (!existing) throw ApiError.notFound('This product is not in your cart.');

  cart.items = cart.items.filter((item) => String(item.product) !== String(productId));
  const alreadySaved = cart.savedItems.find((item) => String(item.product) === String(productId));
  if (alreadySaved) alreadySaved.quantity = existing.quantity;
  else cart.savedItems.push({ product: existing.product, quantity: existing.quantity });

  await cart.save();
  return buildCartView(cart);
}

async function moveSavedToCart(userId, productId) {
  const cart = await getCartDocument(userId);
  const saved = cart.savedItems.find((item) => String(item.product) === String(productId));
  if (!saved) throw ApiError.notFound('This product is not saved for later.');

  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw ApiError.notFound('Product no longer available.');
  if (product.stock < 1) throw ApiError.badRequest(`"${product.title}" is out of stock.`);

  const quantity = Math.min(saved.quantity, product.stock, 20);
  const existing = cart.items.find((item) => String(item.product) === String(productId));
  if (existing) existing.quantity = Math.min(existing.quantity + quantity, product.stock, 20);
  else cart.items.push({ product: product._id, quantity });

  cart.savedItems = cart.savedItems.filter((item) => String(item.product) !== String(productId));
  await cart.save();
  return buildCartView(cart);
}

async function removeSaved(userId, productId) {
  const cart = await getCartDocument(userId);
  const before = cart.savedItems.length;
  cart.savedItems = cart.savedItems.filter((item) => String(item.product) !== String(productId));
  if (cart.savedItems.length === before) throw ApiError.notFound('This product is not saved for later.');
  await cart.save();
  return buildCartView(cart);
}

/** Validates a coupon against the live cart and returns the recalculated totals. */
async function previewCoupon(userId, couponCode) {
  const cart = await getCart(userId, { couponCode });
  if (cart.totals.coupon && cart.totals.coupon.applied === false) {
    throw ApiError.badRequest(cart.totals.coupon.message);
  }
  return cart;
}

module.exports = {
  getCart,
  getCartDocument,
  buildCartView,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  saveForLater,
  moveSavedToCart,
  removeSaved,
  previewCoupon,
};
