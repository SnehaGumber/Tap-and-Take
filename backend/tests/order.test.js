'use strict';

const {
  app,
  API,
  request,
  createUserAndToken,
  createCategory,
  createProduct,
  createAddress,
} = require('./helpers');
const { Product, Order, Review } = require('../src/models');

describe('Orders, payments, reviews and seller isolation', () => {
  let customer;
  let seller;
  let otherSeller;
  let product;
  let address;

  beforeEach(async () => {
    customer = await createUserAndToken({ email: 'order-customer@test.dev' });
    seller = await createUserAndToken({ email: 'order-seller@test.dev', role: 'seller' });
    otherSeller = await createUserAndToken({ email: 'order-seller2@test.dev', role: 'seller' });
    const category = await createCategory();
    product = await createProduct({
      seller: seller.user,
      category,
      overrides: { price: 100, discountPercent: 10, stock: 5 },
    });
    address = await createAddress(customer.user);

    await request(app)
      .post(`${API}/cart/items`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: String(product._id), quantity: 2 });
  });

  const createOrder = (paymentMethod = 'card') =>
    request(app)
      .post(`${API}/orders`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ addressId: String(address._id), paymentMethod });

  it('creates an order using server side prices and totals', async () => {
    const response = await createOrder('card');

    expect(response.status).toBe(201);
    const { order } = response.body.data;
    expect(order.status).toBe('pending_payment');
    expect(order.items[0].unitPrice).toBeCloseTo(90, 2);
    expect(order.pricing.subtotal).toBeCloseTo(180, 2);
    expect(order.pricing.total).toBeCloseTo(194.4, 2);
    expect(order.orderNumber).toMatch(/^TRD-/);

    // Stock is only committed once payment succeeds.
    const fresh = await Product.findById(product._id);
    expect(fresh.stock).toBe(5);
  });

  it('rejects an order for an address that belongs to someone else', async () => {
    const stranger = await createUserAndToken({ email: 'stranger@test.dev' });
    const strangerAddress = await createAddress(stranger.user);

    const response = await request(app)
      .post(`${API}/orders`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ addressId: String(strangerAddress._id), paymentMethod: 'card' });

    expect(response.status).toBe(403);
  });

  it('rejects checkout with an empty cart', async () => {
    await request(app).delete(`${API}/cart`).set('Authorization', `Bearer ${customer.token}`);

    const response = await createOrder('card');
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Your cart is empty.');
  });

  it('confirms payment, decrements stock and clears the cart', async () => {
    const created = await createOrder('card');
    const orderId = created.body.data.order._id;

    const paid = await request(app)
      .post(`${API}/payments/test-pay`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ orderId, outcome: 'success' });

    expect(paid.status).toBe(200);
    expect(paid.body.data.order.paymentStatus).toBe('paid');
    expect(paid.body.data.order.status).toBe('processing');

    const fresh = await Product.findById(product._id);
    expect(fresh.stock).toBe(3);
    expect(fresh.numSold).toBe(2);

    const cart = await request(app)
      .get(`${API}/cart`)
      .set('Authorization', `Bearer ${customer.token}`);
    expect(cart.body.data.cart.items).toHaveLength(0);
  });

  it('handles a payment failure without touching stock', async () => {
    const created = await createOrder('card');
    const orderId = created.body.data.order._id;

    const failed = await request(app)
      .post(`${API}/payments/test-pay`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ orderId, outcome: 'failure' });

    expect(failed.status).toBe(402);

    const order = await Order.findById(orderId);
    expect(order.status).toBe('payment_failed');
    expect(order.stockCommitted).toBe(false);

    const fresh = await Product.findById(product._id);
    expect(fresh.stock).toBe(5);
  });

  it('cancels an order and restores stock', async () => {
    const created = await createOrder('cod');
    const orderId = created.body.data.order._id;

    let fresh = await Product.findById(product._id);
    expect(fresh.stock).toBe(3);

    const cancelled = await request(app)
      .patch(`${API}/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${customer.token}`);

    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.order.status).toBe('cancelled');

    fresh = await Product.findById(product._id);
    expect(fresh.stock).toBe(5);
  });

  it('does not let a customer read another customer order', async () => {
    const created = await createOrder('cod');
    const orderId = created.body.data.order._id;
    const stranger = await createUserAndToken({ email: 'nosy@test.dev' });

    const response = await request(app)
      .get(`${API}/orders/${orderId}`)
      .set('Authorization', `Bearer ${stranger.token}`);

    expect(response.status).toBe(403);
  });

  it('scopes seller orders and blocks cross-seller status updates', async () => {
    const created = await createOrder('cod');
    const orderId = created.body.data.order._id;

    const sellerOrders = await request(app)
      .get(`${API}/seller/orders`)
      .set('Authorization', `Bearer ${seller.token}`);
    expect(sellerOrders.status).toBe(200);
    expect(sellerOrders.body.data.orders).toHaveLength(1);

    const otherSellerOrders = await request(app)
      .get(`${API}/seller/orders`)
      .set('Authorization', `Bearer ${otherSeller.token}`);
    expect(otherSellerOrders.body.data.orders).toHaveLength(0);

    const order = await Order.findById(orderId);
    const itemId = order.items[0]._id;

    const forbidden = await request(app)
      .patch(`${API}/seller/orders/${orderId}/items/${itemId}/status`)
      .set('Authorization', `Bearer ${otherSeller.token}`)
      .send({ status: 'shipped' });
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .patch(`${API}/seller/orders/${orderId}/items/${itemId}/status`)
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ status: 'shipped' });
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.order.status).toBe('shipped');
  });

  it('advances a COD order to shipped when the seller marks its item shipped', async () => {
    // COD orders are committed immediately but keep paymentStatus 'pending'.
    // syncStatusFromItems() must still fire for COD — that was the bug.
    const created = await createOrder('cod');
    const orderId = created.body.data.order._id;

    // Immediately after creation the order must be 'processing'.
    expect(created.body.data.order.status).toBe('processing');

    const order = await Order.findById(orderId);
    const itemId = order.items[0]._id;

    const response = await request(app)
      .patch(`${API}/seller/orders/${orderId}/items/${itemId}/status`)
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ status: 'shipped' });

    expect(response.status).toBe(200);
    expect(response.body.data.order.status).toBe('shipped');
    expect(response.body.data.order.items[0].status).toBe('shipped');
  });

  it('advances a COD order to delivered when all items are delivered', async () => {
    const created = await createOrder('cod');
    const orderId = created.body.data.order._id;

    const order = await Order.findById(orderId);
    const itemId = order.items[0]._id;

    // ship first
    await request(app)
      .patch(`${API}/seller/orders/${orderId}/items/${itemId}/status`)
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ status: 'shipped' });

    // then deliver
    const response = await request(app)
      .patch(`${API}/seller/orders/${orderId}/items/${itemId}/status`)
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ status: 'delivered' });

    expect(response.status).toBe(200);
    expect(response.body.data.order.status).toBe('delivered');

    // deliveredAt must be set on the order document in the DB.
    const fresh = await Order.findById(orderId);
    expect(fresh.deliveredAt).toBeTruthy();
  });

  it('blocks item status updates on an unpaid card order', async () => {
    // Card orders start at pending_payment until payment is confirmed.
    // A seller should NOT be able to mark items shipped on an unpaid card order.
    const created = await createOrder('card');
    const orderId = created.body.data.order._id;

    const order = await Order.findById(orderId);
    const itemId = order.items[0]._id;

    const response = await request(app)
      .patch(`${API}/seller/orders/${orderId}/items/${itemId}/status`)
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ status: 'shipped' });

    // The service guard in updateItemStatus() must reject this.
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/not been paid/i);
  });

  it('blocks customers from seller and admin endpoints', async () => {
    const sellerDash = await request(app)
      .get(`${API}/seller/dashboard`)
      .set('Authorization', `Bearer ${customer.token}`);
    expect(sellerDash.status).toBe(403);

    const adminDash = await request(app)
      .get(`${API}/admin/dashboard`)
      .set('Authorization', `Bearer ${customer.token}`);
    expect(adminDash.status).toBe(403);

    const sellerOnAdmin = await request(app)
      .get(`${API}/admin/users`)
      .set('Authorization', `Bearer ${seller.token}`);
    expect(sellerOnAdmin.status).toBe(403);
  });

  it('allows a review only after an eligible purchase and only once', async () => {
    const beforePurchase = await request(app)
      .post(`${API}/reviews`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: String(product._id), rating: 5, comment: 'Great product overall!' });
    expect(beforePurchase.status).toBe(403);

    await createOrder('cod');

    const first = await request(app)
      .post(`${API}/reviews`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: String(product._id), rating: 5, comment: 'Great product overall!' });
    expect(first.status).toBe(201);

    const duplicate = await request(app)
      .post(`${API}/reviews`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: String(product._id), rating: 4, comment: 'Trying to review twice.' });
    expect(duplicate.status).toBe(409);

    const reviewCount = await Review.countDocuments({ product: product._id });
    expect(reviewCount).toBe(1);

    const refreshed = await Product.findById(product._id);
    expect(refreshed.ratingAverage).toBe(5);
    expect(refreshed.ratingCount).toBe(1);
  });

  it('exposes real admin dashboard numbers from the database', async () => {
    const admin = await createUserAndToken({ email: 'dash-admin@test.dev', role: 'admin' });
    const created = await createOrder('card');
    await request(app)
      .post(`${API}/payments/test-pay`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ orderId: created.body.data.order._id });

    const response = await request(app)
      .get(`${API}/admin/dashboard`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(response.status).toBe(200);
    const { metrics } = response.body.data;
    expect(metrics.totalOrders).toBe(1);
    expect(metrics.revenue).toBeCloseTo(194.4, 2);
    expect(metrics.totalSellers).toBe(2);
    expect(metrics.totalProducts).toBe(1);
  });
});
