'use strict';

const env = require('../config/env');

const stamp = () => new Date().toISOString();

const logger = {
  info: (...args) => {
    if (!env.isTest) console.log(`[tap-and-take][info][${stamp()}]`, ...args);
  },
  warn: (...args) => {
    if (!env.isTest) console.warn(`[tap-and-take][warn][${stamp()}]`, ...args);
  },
  error: (...args) => {
    if (!env.isTest) console.error(`[tap-and-take][error][${stamp()}]`, ...args);
  },
};

module.exports = logger;
