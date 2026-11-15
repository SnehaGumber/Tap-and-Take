'use strict';

const request = require('supertest');
const app = require('../src/app');
const { User, Category, Product, Address } = require('../src/models');

const API = '/api';

async function createUser({
  name = 'Test User',
  email = 'user@test.dev',
  password = 'Password123',
  role = 'customer',
  storeStatus = 'approved',
  isActive = true,
} = {}) {
  const user = new User({ name, email, password, role, isActive });
  if (role === 'seller') {
    user.store = { name: `${name} Store`, status: storeStatus };
  }
  await user.save();
  return { user, password };
}

async function loginAs(credentials) {
  const response = await request(app)
    .post(`${API}/auth/login`)
    .send({ email: credentials.email, password: credentials.password });
  return response.body.data.token;
}

async function createUserAndToken(options = {}) {
  const { user, password } = await createUser(options);
  const token = await loginAs({ email: user.email, password });
  return { user, token };
}

async function createCategory(name = 'Electronics') {
  return Category.create({ name, description: `${name} products for testing` });
}

async function createProduct({ seller, category, overrides = {} } = {}) {
  return Product.create({
    title: overrides.title || 'Test Product Alpha',
    description:
      overrides.description || 'A dependable test product with a description long enough to pass validation.',
    brand: overrides.brand || 'TestBrand',
    category: category._id,
    seller: seller._id,
    price: overrides.price ?? 100,
    discountPercent: overrides.discountPercent ?? 10,
    stock: overrides.stock ?? 10,
    images: [{ url: 'https://picsum.photos/seed/test/600/600', publicId: '' }],
    isActive: overrides.isActive ?? true,
  });
}

async function createAddress(user) {
  return Address.create({
    user: user._id,
    fullName: user.name,
    phone: '+1 415 555 0000',
    line1: '221B Test Street',
    city: 'San Francisco',
    state: 'California',
    postalCode: '94107',
    country: 'United States',
    isDefault: true,
  });
}

module.exports = {
  app,
  API,
  request,
  createUser,
  loginAs,
  createUserAndToken,
  createCategory,
  createProduct,
  createAddress,
};
