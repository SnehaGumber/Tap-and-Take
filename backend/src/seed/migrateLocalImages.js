'use strict';

/**
 * One-time, non-destructive migration:
 * - Replaces only legacy Picsum URLs on existing products.
 * - Updates matching order-item image snapshots.
 * - Does not delete or recreate users, products, orders, payments, or inventory.
 *
 * Run: npm run images:migrate
 */
const { connectDB, disconnectDB } = require('../config/db');
const { Product, Order } = require('../models');
const data = require('./data');

const productIndexByTitle = new Map(data.products.map((product, index) => [product.title, index]));

async function run() {
  await connectDB();

  const products = await Product.find({ 'images.url': /picsum\.photos/i });
  let productsUpdated = 0;

  for (const product of products) {
    const index = productIndexByTitle.get(product.title);
    const nextImages = index === undefined
      ? [{ url: '/product-images/placeholder.svg', publicId: '' }]
      : data.img(index + 1, 3);

    product.images = nextImages;
    await product.save();
    productsUpdated += 1;
  }

  const orders = await Order.find({ 'items.image': /picsum\.photos/i });
  let orderItemsUpdated = 0;

  for (const order of orders) {
    let changed = false;
    for (const item of order.items) {
      if (!/picsum\.photos/i.test(item.image || '')) continue;
      const index = productIndexByTitle.get(item.title);
      item.image = index === undefined
        ? '/product-images/placeholder.svg'
        : data.img(index + 1, 1)[0].url;
      orderItemsUpdated += 1;
      changed = true;
    }
    if (changed) await order.save();
  }

  console.log(`Local image migration complete. Products updated: ${productsUpdated}. Order item images updated: ${orderItemsUpdated}.`);
}

run()
  .catch((error) => {
    console.error('Local image migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
