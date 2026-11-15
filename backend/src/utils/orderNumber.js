'use strict';

const crypto = require('crypto');

function generateOrderNumber() {
  const time = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `TRD-${time}-${random}`;
}

module.exports = { generateOrderNumber };
