'use strict';

const express = require('express');
const addressController = require('../controllers/addressController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { idParam } = require('../validators/common');
const { createAddressSchema, updateAddressSchema } = require('../validators/addressValidator');

const router = express.Router();

router.use(protect);

router.get('/', addressController.listAddresses);
router.post('/', validate({ body: createAddressSchema }), addressController.createAddress);
router.patch(
  '/:id',
  validate({ params: idParam, body: updateAddressSchema }),
  addressController.updateAddress
);
router.patch('/:id/default', validate({ params: idParam }), addressController.setDefault);
router.delete('/:id', validate({ params: idParam }), addressController.deleteAddress);

module.exports = router;
