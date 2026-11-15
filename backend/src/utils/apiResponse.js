'use strict';

/** Consistent success envelope: { success, message, data, meta } */
function sendSuccess(res, { statusCode = 200, message = 'OK', data = null, meta = undefined } = {}) {
  const payload = { success: true, message, data };
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
}

function sendCreated(res, options = {}) {
  return sendSuccess(res, { statusCode: 201, message: 'Created', ...options });
}

module.exports = { sendSuccess, sendCreated };
