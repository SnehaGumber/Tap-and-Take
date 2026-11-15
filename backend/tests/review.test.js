'use strict';

/**
 * Regression tests for:
 *   BUG-02  recalculateProductRating() aggregation was type-unsafe —
 *           passing a string productId sent {product:undefined} to $match
 *           which matched every review in the collection.
 *
 *   SEC-03  assertPurchaseEligibility() included paymentStatus:'pending'
 *           which allowed card-paying customers to review before being charged.
 *           Fixed to use stockCommitted:true as the single confirmation gate.
 */

const {
  app,
  API,
  request,
  createUserAndToken,
  createCategory,
  createProduct,
  createAddress,
} = require('./helpers');
const { Product, Order } = require('../src/models');

// ─── shared setup helpers ────────────────────────────────────────────────────

// Use a counter to generate unique emails when setupScene is called multiple
// times within the same test (Jest does not reset module state between its/its).
let _sceneCounter = 0;

async function setupScene() {
  _sceneCounter += 1;
  const n = _sceneCounter;
  const customer = await createUserAndToken({ email: `rev-customer-${n}@test.dev` });
  const { user: seller } = await createUserAndToken({
    email: `rev-seller-${n}@test.dev`,
    role: 'seller',
  });
  const category = await createCategory(`Review Test Category ${n}`);
  const product = await createProduct({
    seller,
    category,
    overrides: { price: 50, discountPercent: 0, stock: 10 },
  });
  const address = await createAddress(customer.user);
  return { customer, seller, category, product, address };
}

beforeEach(() => { _sceneCounter = 0; });

async function placeAndConfirmCardOrder(customer, address, productId) {
  // Add to cart
  await request(app)
    .post(`${API}/cart/items`)
    .set('Authorization', `Bearer ${customer.token}`)
    .send({ productId: String(productId), quantity: 1 });

  // Create order
  const created = await request(app)
    .post(`${API}/orders`)
    .set('Authorization', `Bearer ${customer.token}`)
    .send({ addressId: String(address._id), paymentMethod: 'card' });

  const orderId = created.body.data.order._id;

  // Confirm payment via test-pay
  await request(app)
    .post(`${API}/payments/test-pay`)
    .set('Authorization', `Bearer ${customer.token}`)
    .send({ orderId, outcome: 'success' });

  return orderId;
}

async function placeCodOrder(customer, address, productId) {
  await request(app)
    .post(`${API}/cart/items`)
    .set('Authorization', `Bearer ${customer.token}`)
    .send({ productId: String(productId), quantity: 1 });

  const created = await request(app)
    .post(`${API}/orders`)
    .set('Authorization', `Bearer ${customer.token}`)
    .send({ addressId: String(address._id), paymentMethod: 'cod' });

  return created.body.data.order._id;
}

// ─── BUG-02: rating aggregation ─────────────────────────────────────────────

describe('Product rating recalculation (BUG-02)', () => {
  it('sets ratingAverage and ratingCount only from reviews of that product', async () => {
    const scene = await setupScene();
    const scene2 = await setupScene();

    // Give scene2's product a different seller so we can distinguish them
    // (setup creates fresh users each time because email is unique per test run).
    const product2 = await createProduct({
      seller: scene2.seller,
      category: scene2.category,
      overrides: { price: 80, discountPercent: 0, stock: 10, title: 'Test Product Beta' },
    });

    // Customer 1 buys and reviews product 1 with rating 4
    await placeAndConfirmCardOrder(scene.customer, scene.address, scene.product._id);
    await request(app)
      .post(`${API}/reviews`)
      .set('Authorization', `Bearer ${scene.customer.token}`)
      .send({ productId: String(scene.product._id), rating: 4, comment: 'Good product overall.' });

    // Customer 2 buys and reviews product 2 with rating 2
    await placeAndConfirmCardOrder(scene2.customer, scene2.address, product2._id);
    await request(app)
      .post(`${API}/reviews`)
      .set('Authorization', `Bearer ${scene2.customer.token}`)
      .send({ productId: String(product2._id), rating: 2, comment: 'Not great but acceptable.' });

    // Product 1 must have average 4, count 1 — not a blend across both products.
    const p1 = await Product.findById(scene.product._id);
    expect(p1.ratingAverage).toBe(4);
    expect(p1.ratingCount).toBe(1);

    // Product 2 must have average 2, count 1.
    const p2 = await Product.findById(product2._id);
    expect(p2.ratingAverage).toBe(2);
    expect(p2.ratingCount).toBe(1);
  });

  it('resets ratingAverage and ratingCount to 0 when the last review is deleted', async () => {
    const { customer, product, address } = await setupScene();

    await placeAndConfirmCardOrder(customer, address, product._id);

    const created = await request(app)
      .post(`${API}/reviews`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: String(product._id), rating: 3, comment: 'Decent product overall.' });

    expect(created.status).toBe(201);
    const reviewId = created.body.data.review._id;

    await request(app)
      .delete(`${API}/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${customer.token}`);

    const fresh = await Product.findById(product._id);
    expect(fresh.ratingAverage).toBe(0);
    expect(fresh.ratingCount).toBe(0);
  });
});

// ─── SEC-03: review eligibility ──────────────────────────────────────────────

describe('Review eligibility (SEC-03)', () => {
  it('blocks a customer from reviewing after placing a card order that has NOT been paid', async () => {
    const { customer, product, address } = await setupScene();

    // Place a card order but do NOT confirm payment
    await request(app)
      .post(`${API}/cart/items`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: String(product._id), quantity: 1 });

    await request(app)
      .post(`${API}/orders`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ addressId: String(address._id), paymentMethod: 'card' });

    // Review attempt must be rejected — payment not yet confirmed, stock not committed
    const response = await request(app)
      .post(`${API}/reviews`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: String(product._id), rating: 5, comment: 'Premature review attempt.' });

    expect(response.status).toBe(403);
  });

  it('allows a customer to review after a card order is paid and stock is committed', async () => {
    const { customer, product, address } = await setupScene();

    await placeAndConfirmCardOrder(customer, address, product._id);

    const response = await request(app)
      .post(`${API}/reviews`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: String(product._id), rating: 5, comment: 'Paid and purchased, great.' });

    expect(response.status).toBe(201);
    expect(response.body.data.review.isVerifiedPurchase).toBe(true);
  });

  it('allows a customer to review after a COD order (stockCommitted is true immediately)', async () => {
    const { customer, product, address } = await setupScene();

    await placeCodOrder(customer, address, product._id);

    // COD: stock committed, order in processing — review must be allowed
    const response = await request(app)
      .post(`${API}/reviews`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: String(product._id), rating: 4, comment: 'COD order, satisfied customer.' });

    expect(response.status).toBe(201);
  });

  it('blocks a review on a cancelled order even if stockCommitted was true', async () => {
    const { customer, product, address } = await setupScene();

    const orderId = await placeCodOrder(customer, address, product._id);

    // Cancel the order — stock is restored, status becomes 'cancelled'
    await request(app)
      .patch(`${API}/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${customer.token}`);

    const response = await request(app)
      .post(`${API}/reviews`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: String(product._id), rating: 1, comment: 'Cancelled order review attempt.' });

    expect(response.status).toBe(403);
  });
});
