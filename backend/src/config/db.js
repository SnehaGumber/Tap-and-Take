'use strict';

const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

async function connectDB(uri = env.mongoUri) {
  if (!uri) {
    throw new Error('Missing MONGO_URI environment variable.');
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      autoIndex: !env.isProduction,
    });
    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    throw error;
  }
}

async function disconnectDB() {
  await mongoose.connection.close();
}

module.exports = { connectDB, disconnectDB };
