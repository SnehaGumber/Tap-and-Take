'use strict';

const { Category, Product } = require('../models');
const ApiError = require('../utils/ApiError');

async function listCategories({ includeInactive = false } = {}) {
  const filter = includeInactive ? {} : { isActive: true };
  const categories = await Category.find(filter).sort({ name: 1 }).lean();
  const counts = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((row) => [String(row._id), row.count]));
  return categories.map((category) => ({
    ...category,
    productCount: countMap.get(String(category._id)) || 0,
  }));
}

async function getCategory(idOrSlug) {
  const filter = /^[a-f\d]{24}$/i.test(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  const category = await Category.findOne(filter);
  if (!category) throw ApiError.notFound('Category not found');
  return category;
}

async function createCategory(payload) {
  const exists = await Category.findOne({ name: payload.name });
  if (exists) throw ApiError.conflict('A category with this name already exists.');
  return Category.create(payload);
}

async function updateCategory(id, payload) {
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound('Category not found');
  Object.assign(category, payload);
  await category.save();
  return category;
}

async function deleteCategory(id) {
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound('Category not found');

  const productCount = await Product.countDocuments({ category: id });
  if (productCount > 0) {
    throw ApiError.conflict(
      `This category still has ${productCount} product(s). Move or remove them before deleting.`
    );
  }
  await category.deleteOne();
  return { deleted: true };
}

module.exports = {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
