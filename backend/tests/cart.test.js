'use strict';

const {
  app,
  API,
  request,
  createUserAndToken,
  createCategory,
  createProduct,
} = require('./helpers');

describe('Cart and wishlist', () => {
  let customer;
  let product;

  beforeEach(async () => {
    customer = await createUserAndToken({ email: 'cart-customer@test.dev' });
    const { user: seller } = await createUserAndToken({ email: 'cart-seller@test.dev', role: 'seller' });
    const category = await createCategory();
    product = await createProduct({ seller, category, overrides: { price: 100, discountPercent: 10, stock: 3 } });
  });

  it('requires authentication', async () => {
    const response = await request(app).get(`${API}/cart`);
    expect(response.status).toBe(401);
  });

  it('adds an item and computes totals on the server', async () => {
    const response = await request(app)
      .post(`${API}/cart/items`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: String(product._id), quantity: 2 });

    expect(response.status).toBe(200);
    const { cart } = response.body.data;
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].unitPrice).toBeCloseTo(90, 2);
    expect(cart.totals.subtotal).toBeCloseTo(180, 2);
    expect(cart.totals.tax).toBeCloseTo(14.4, 2);
    expect(cart.totals.shipping).toBe(0); // above the free shipping threshold
    expect(cart.totals.total).toBeCloseTo(194.4, 2);
  });

  it('never allows more units than the available stock', async () => {
    const response = await request(app)
      .post(`${API}/cart/items`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: String(product._id), quantity: 9 });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Only 3 unit');
  });

  it('updates the quantity and removes items', async () => {
    await request(app)
      .post(`${API}/cart/items`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: String(product._id), quantity: 1 });

    const updated = await request(app)
      .patch(`${API}/cart/items/${product._id}`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quantity: 3 });
    expect(updated.body.data.cart.items[0].quantity).toBe(3);

    const removed = await request(app)
      .delete(`${API}/cart/items/${product._id}`)
      .set('Authorization', `Bearer ${customer.token}`);
    expect(removed.body.data.cart.items).toHaveLength(0);
  });

  it('persists the cart across requests (stored in MongoDB)', async () => {
    await request(app)
      .post(`${API}/cart/items`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: String(product._id), quantity: 2 });

    const fetched = await request(app)
      .get(`${API}/cart`)
      .set('Authorization', `Bearer ${customer.token}`);

    expect(fetched.body.data.cart.items[0].quantity).toBe(2);
  });

  it('moves a wishlist item into the cart', async () => {
    await request(app)
      .post(`${API}/wishlist/items`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: String(product._id) });

    const moved = await request(app)
      .post(`${API}/wishlist/items/${product._id}/move-to-cart`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quantity: 1 });

    expect(moved.status).toBe(200);
    expect(moved.body.data.wishlist.items).toHaveLength(0);
    expect(moved.body.data.cart.items).toHaveLength(1);
  });
});
