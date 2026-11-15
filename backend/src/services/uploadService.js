'use strict';

const fs = require('fs');
const path = require('path');
const { UPLOAD_DIR } = require('../middleware/upload');

/** Store uploaded product images on this backend; no external image provider is used. */
async function uploadProductImages(files = []) {
  return files.map((file) => ({
    url: `/uploads/products/${path.basename(file.filename)}`,
    publicId: path.basename(file.filename),
  }));
}

async function destroyImages(fileNames = []) {
  await Promise.all(
    fileNames.filter(Boolean).map(async (fileName) => {
      const safeName = path.basename(fileName);
      const filePath = path.join(UPLOAD_DIR, safeName);
      try {
        await fs.promises.unlink(filePath);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    })
  );
}

module.exports = {
  uploadProductImages,
  destroyImages,
};
