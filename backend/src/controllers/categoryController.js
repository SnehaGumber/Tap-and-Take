'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const categoryService = require('../services/categoryService');

const listCategories = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Categories',
    data: {
      categories: await categoryService.listCategories({
        includeInactive: req.user?.role === 'admin' && req.query.includeInactive === 'true',
      }),
    },
  })
);

const getCategory = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Category',
    data: { category: await categoryService.getCategory(req.params.idOrSlug) },
  })
);

const createCategory = asyncHandler(async (req, res) =>
  sendCreated(res, {
    message: 'Category created',
    data: { category: await categoryService.createCategory(req.body) },
  })
);

const updateCategory = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Category updated',
    data: { category: await categoryService.updateCategory(req.params.id, req.body) },
  })
);

const deleteCategory = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Category deleted',
    data: await categoryService.deleteCategory(req.params.id),
  })
);

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };
