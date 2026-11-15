'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/products');
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
};
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 6;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${EXTENSIONS[file.mimetype] || '.img'}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(ApiError.badRequest(`Unsupported image type "${file.mimetype}". Allowed: JPEG, PNG, WEBP, AVIF, GIF.`));
    }
    return cb(null, true);
  },
});

const uploadProductImages = upload.array('images', MAX_FILES);

module.exports = { upload, uploadProductImages, MAX_FILES, MAX_FILE_SIZE, ALLOWED_MIME, UPLOAD_DIR };
