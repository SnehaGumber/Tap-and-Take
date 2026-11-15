'use strict';

const env = require('../config/env');

const stamp = () => new Date().toISOString();

const logger = {
  info: (...args) => {
    if (!env.isTest) console.log(`[trendora][info][${stamp()}]`, ...args);
  },
  warn: (...args) => {
    if (!env.isTest) console.warn(`[trendora][warn][${stamp()}]`, ...args);
  },
  error: (...args) => {
    if (!env.isTest) console.error(`[trendora][error][${stamp()}]`, ...args);
  },
};

module.exports = logger;
