'use strict';

const express = require('express');
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { updateProfileSchema, changePasswordSchema } = require('../validators/authValidator');

const router = express.Router();

router.use(protect);

router.get('/profile', userController.getProfile);
router.patch('/profile', validate({ body: updateProfileSchema }), userController.updateProfile);
router.patch('/password', validate({ body: changePasswordSchema }), userController.changePassword);

module.exports = router;
