'use strict';

/**
 * Trendora development seed script.
 *   npm run seed            -> wipes and re-seeds the database
 *   npm run seed:destroy    -> only clears the collections
 */

const mongoose = require('mongoose');
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const {
  User,
  Category,
  Product,
  Cart,
  Wishlist,
  Address,
  Order,
  Review,
  Payment,
} = require('../models');
const { finalUnitPrice, computeTotals, round2 } = require('../utils/pricing');
const { generateOrderNumber } = require('../utils/orderNumber');
const data = require('./data');

const PASSWORD = env.seedPassword;

async function clearAll() {
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Cart.deleteMany({}),
    Wishlist.deleteMany({}),
    Address.deleteMany({}),
    Order.deleteMany({}),
    Review.deleteMany({}),
    Payment.deleteMany({}),
  ]);
  console.log('Cleared all Trendora collections.');
}

async function createUsers() {
  const admin = await User.create({
    name: 'Trendora Admin',
    email: 'admin@trendora.dev',
    password: PASSWORD,
    role: 'admin',
    phone: '+1 415 555 0100',
  });

  const sellers = [];
  for (const seller of data.sellers) {
    const created = await User.create({
      name: seller.name,
      email: seller.email,
      password: PASSWORD,
      role: 'seller',
      phone: seller.store.contactPhone,
      store: { ...seller.store, contactEmail: seller.email },
    });
    sellers.push(created);
  }

  const customers = [];
  for (const customer of data.customers) {
    const created = await User.create({
      name: customer.name,
      email: customer.email,
      password: PASSWORD,
      role: 'customer',
      phone: customer.phone,
    });
    customers.push(created);
  }

  const everyone = [admin, ...sellers, ...customers];
  await Cart.insertMany(everyone.map((user) => ({ user: user._id, items: [] })));
  await Wishlist.insertMany(everyone.map((user) => ({ user: user._id, items: [] })));

  return { admin, sellers, customers };
}

async function createAddresses(customers) {
  const cities = [
    { city: 'San Francisco', state: 'California', postalCode: '94107' },
    { city: 'Austin', state: 'Texas', postalCode: '73301' },
    { city: 'Seattle', state: 'Washington', postalCode: '98101' },
  ];

  const addresses = [];
  for (let i = 0; i < customers.length; i += 1) {
    const customer = customers[i];
    const place = cities[i % cities.length];
    const created = await Address.create({
      user: customer._id,
      label: 'Home',
      fullName: customer.name,
      phone: customer.phone || '+1 415 555 0000',
      line1: `${120 + i * 7} Market Street`,
      line2: `Apartment ${i + 3}B`,
      city: place.city,
      state: place.state,
      postalCode: place.postalCode,
      country: 'United States',
      isDefault: true,
    });
    addresses.push(created);
  }
  return addresses;
}

async function createCategories() {
  const created = await Category.create(data.categories);
  return new Map(created.map((category) => [category.name, category]));
}

async function createProducts(categoryMap, sellers) {
  const products = [];
  for (let i = 0; i < data.products.length; i += 1) {
    const item = data.products[i];
    const category = categoryMap.get(item.category);
    const seller = sellers[item.storeIndex % sellers.length];

    const product = await Product.create({
      title: item.title,
      description: item.description,
      brand: item.brand,
      category: category._id,
      seller: seller._id,
      price: item.price,
      discountPercent: item.discountPercent,
      stock: item.stock,
      specifications: item.specifications,
      tags: item.tags,
      images: data.img(i + 1, 3),
      isActive: seller.store.status === 'approved',
    });
    products.push(product);
  }
  return products;
}

async function createOrdersAndReviews({ customers, products, addresses }) {
  const orders = [];

  for (let i = 0; i < customers.length; i += 1) {
    const customer = customers[i];
    const address = addresses[i];
    const picked = products.slice(i * 3, i * 3 + 3).filter((product) => product.isActive);
    if (picked.length === 0) continue;

    const items = picked.map((product, index) => {
      const quantity = index === 0 ? 2 : 1;
      const unitPrice = finalUnitPrice(product.price, product.discountPercent);
      return {
        product: product._id,
        seller: product.seller,
        title: product.title,
        brand: product.brand,
        image: product.images[0].url,
        unitPrice,
        originalPrice: product.price,
        quantity,
        lineTotal: round2(unitPrice * quantity),
        status: i === 0 ? 'delivered' : 'processing',
      };
    });

    const pricing = computeTotals(
      items.map((item) => ({
        price: item.unitPrice,
        originalPrice: item.originalPrice,
        quantity: item.quantity,
      }))
    );

    const payment = await Payment.create({
      user: customer._id,
      amount: pricing.total,
      currency: pricing.currency,
      provider: 'simulated',
      method: 'card',
      status: 'succeeded',
      paidAt: new Date(),
    });

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: customer._id,
      items,
      shippingAddress: {
        fullName: address.fullName,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      },
      pricing,
      status: i === 0 ? 'delivered' : 'processing',
      paymentStatus: 'paid',
      paymentMethod: 'card',
      payment: payment._id,
      stockCommitted: true,
      deliveredAt: i === 0 ? new Date() : undefined,
      statusHistory: [
        { status: 'pending_payment', note: 'Order created' },
        { status: 'processing', note: 'Payment confirmed' },
        ...(i === 0 ? [{ status: 'delivered', note: 'Delivered to customer' }] : []),
      ],
      placedAt: new Date(Date.now() - (i + 1) * 86400000 * 6),
      createdAt: new Date(Date.now() - (i + 1) * 86400000 * 6),
    });

    payment.order = order._id;
    await payment.save();

    for (const item of items) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: -item.quantity, numSold: item.quantity } }
      );
    }

    orders.push(order);
  }

  // Reviews - only for products the customer actually bought.
  let templateIndex = 0;
  for (const order of orders) {
    for (const item of order.items) {
      const template = data.reviewTemplates[templateIndex % data.reviewTemplates.length];
      templateIndex += 1;
      await Review.create({
        product: item.product,
        user: order.user,
        order: order._id,
        rating: template.rating,
        title: template.title,
        comment: template.comment,
        isVerifiedPurchase: true,
      });
    }
  }

  // Keep denormalised rating fields in sync.
  const grouped = await Review.aggregate([
    { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  for (const row of grouped) {
    await Product.updateOne(
      { _id: row._id },
      { $set: { ratingAverage: Math.round(row.average * 10) / 10, ratingCount: row.count } }
    );
  }

  return orders;
}

async function seedSampleCartAndWishlist(customers, products) {
  const [first] = customers;
  if (!first) return;
  const active = products.filter((product) => product.isActive && product.stock > 2);
  await Cart.updateOne(
    { user: first._id },
    { $set: { items: active.slice(10, 12).map((product) => ({ product: product._id, quantity: 1 })) } },
    { upsert: true }
  );
  await Wishlist.updateOne(
    { user: first._id },
    {
      $set: {
        items: active.slice(15, 18).map((product) => ({ product: product._id, addedAt: new Date() })),
      },
    },
    { upsert: true }
  );
}

async function run() {
  const destroyOnly = process.argv.includes('--destroy');

  await connectDB();
  await clearAll();

  if (destroyOnly) {
    console.log('Database cleared. Nothing was seeded.');
    await disconnectDB();
    return;
  }

  const { admin, sellers, customers } = await createUsers();
  const categoryMap = await createCategories();
  const products = await createProducts(categoryMap, sellers);
  const addresses = await createAddresses(customers);
  const orders = await createOrdersAndReviews({ customers, products, addresses });
  await seedSampleCartAndWishlist(customers, products);

  console.log('');
  console.log('Trendora seed complete');
  console.log('-----------------------------------------');
  console.log(`Categories : ${categoryMap.size}`);
  console.log(`Products   : ${products.length}`);
  console.log(`Sellers    : ${sellers.length} (1 pending approval)`);
  console.log(`Customers  : ${customers.length}`);
  console.log(`Orders     : ${orders.length}`);
  console.log('-----------------------------------------');
  console.log('Demo accounts (password for all):', PASSWORD);
  console.log(`  Admin    : ${admin.email}`);
  sellers.forEach((seller) => console.log(`  Seller   : ${seller.email} (${seller.store.status})`));
  customers.forEach((customer) => console.log(`  Customer : ${customer.email}`));
  console.log('-----------------------------------------');

  await disconnectDB();
}

run()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('Seed failed:', error.message);
    if (mongoose.connection.readyState === 1) await disconnectDB();
    process.exit(1);
  });
