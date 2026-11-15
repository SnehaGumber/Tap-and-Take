'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn, issuer: 'trendora-api' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret, { issuer: 'trendora-api' });
}

function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

module.exports = { signAccessToken, verifyAccessToken, extractBearerToken };
