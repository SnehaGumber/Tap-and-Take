'use strict';

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');
const { apiLimiter } = require('./middleware/rateLimiter');
const { requireDatabase } = require('./middleware/dbReady');

const app = express();

app.set('trust proxy', 1);

// Security headers
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS - only the configured frontend origins may call the API.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.clientUrls.includes(origin) || !env.isProduction) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use('/uploads', express.static(path.join(__dirname, '../uploads'), { maxAge: '7d', immutable: true }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(compression());
app.use(mongoSanitize());
app.use(hpp());

if (!env.isTest) {
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));
}

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Trendora API',
    data: { docs: '/api/health', version: '1.0.0' },
  });
});

app.use('/api', apiLimiter, requireDatabase, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
