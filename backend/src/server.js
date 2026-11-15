'use strict';

const app = require('./app'); // express app instance
const env = require('./config/env'); // environment variables and configuration
const { connectDB } = require('./config/db'); // respnsible for connecting to the database
const logger = require('./utils/logger'); // for recording server start/stop events and errors

let server;

async function start() { // async means that this function will return a promise and can use await inside it
  try {
    await connectDB(); // await means that the function will wait for the promise to resolve before continuing

    server = app.listen(env.port, () => {
      logger.info(`Tap & Take API listening on http://localhost:${env.port} (${env.nodeEnv})`); // we write info to the logger that the server is listening on the specified port and environment
      if (!env.isStripeConfigured) {
        logger.warn(
          'Stripe is not configured - card checkout will run in simulated test mode until STRIPE_SECRET_KEY is set.'
        ); // warning that stripe is not configured and card checkout will run in simulated test mode until the STRIPE_SECRET_KEY is set
      }
    });
  } catch (error) {
    logger.error(`Unable to start server: ${error.message}`); // error that the server was unable to start and the error message
    process.exit(1);
  }
}

function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully.`);
  if (server) {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason}`);
});
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();

module.exports = { start };
