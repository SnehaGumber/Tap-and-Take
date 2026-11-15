'use strict';

const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema } = require('../validators/authValidator');

const router = express.Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.me);

module.exports = router;
