'use strict';

const express = require('express');
const categoryController = require('../controllers/categoryController');
const { protect, optionalAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { idParam } = require('../validators/common');
const { createCategorySchema, updateCategorySchema } = require('../validators/categoryValidator');

const router = express.Router();

router.get('/', optionalAuth, categoryController.listCategories);
router.get('/:idOrSlug', categoryController.getCategory);

router.post(
  '/',
  protect,
  authorize('admin'),
  validate({ body: createCategorySchema }),
  categoryController.createCategory
);
router.patch(
  '/:id',
  protect,
  authorize('admin'),
  validate({ params: idParam, body: updateCategorySchema }),
  categoryController.updateCategory
);
router.delete(
  '/:id',
  protect,
  authorize('admin'),
  validate({ params: idParam }),
  categoryController.deleteCategory
);

module.exports = router;
