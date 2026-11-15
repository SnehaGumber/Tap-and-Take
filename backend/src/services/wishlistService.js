'use strict';

const { Wishlist, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const cartService = require('./cartService');

async function getWishlistDocument(userId) {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) wishlist = await Wishlist.create({ user: userId, items: [] });
  return wishlist;
}

async function buildView(wishlist) {
  await wishlist.populate({
    path: 'items.product',
    select: 'title slug brand price discountPercent stock images isActive ratingAverage ratingCount',
  });

  const items = wishlist.items
    .filter((item) => item.product && item.product.isActive)
    .map((item) => ({
      product: item.product,
      addedAt: item.addedAt,
    }));

  return { _id: wishlist._id, items, itemCount: items.length };
}

async function getWishlist(userId) {
  const wishlist = await getWishlistDocument(userId);
  return buildView(wishlist);
}

async function addItem(userId, productId) {
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw ApiError.notFound('Product not found or no longer available.');

  const wishlist = await getWishlistDocument(userId);
  const exists = wishlist.items.some((item) => String(item.product) === String(productId));
  if (!exists) {
    wishlist.items.unshift({ product: product._id, addedAt: new Date() });
    await wishlist.save();
  }
  return buildView(wishlist);
}

async function removeItem(userId, productId) {
  const wishlist = await getWishlistDocument(userId);
  const before = wishlist.items.length;
  wishlist.items = wishlist.items.filter((item) => String(item.product) !== String(productId));
  if (wishlist.items.length === before) throw ApiError.notFound('This product is not in your wishlist.');
  await wishlist.save();
  return buildView(wishlist);
}

async function moveToCart(userId, productId, quantity = 1) {
  const cart = await cartService.addItem(userId, { productId, quantity });
  const wishlist = await getWishlistDocument(userId);
  wishlist.items = wishlist.items.filter((item) => String(item.product) !== String(productId));
  await wishlist.save();
  return { cart, wishlist: await buildView(wishlist) };
}

module.exports = { getWishlist, addItem, removeItem, moveToCart };
