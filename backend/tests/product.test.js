'use strict';

const {
  app,
  API,
  request,
  createUserAndToken,
  createCategory,
  createProduct,
} = require('./helpers');

describe('Products - CRUD, authorization and ownership', () => {
  it('creates a product as an approved seller', async () => {
    const { token } = await createUserAndToken({ email: 'seller@test.dev', role: 'seller' });
    const category = await createCategory();

    const response = await request(app)
      .post(`${API}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Nova Pulse Headphones',
        description: 'Wireless over-ear headphones with active noise cancellation and long battery life.',
        brand: 'NovaSound',
        category: String(category._id),
        price: 199.99,
        discountPercent: 10,
        stock: 25,
        imageUrls: JSON.stringify(['https://picsum.photos/seed/nova/600/600']),
      });

    expect(response.status).toBe(201);
    expect(response.body.data.product.slug).toContain('nova-pulse-headphones');
    expect(response.body.data.product.finalPrice).toBeCloseTo(179.99, 2);
  });

  it('does not allow a customer to create a product', async () => {
    const { token } = await createUserAndToken({ email: 'customer@test.dev' });
    const category = await createCategory();

    const response = await request(app)
      .post(`${API}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Illegal Product',
        description: 'A customer should never be able to create a product on the marketplace.',
        brand: 'Nope',
        category: String(category._id),
        price: 10,
        stock: 1,
        imageUrls: JSON.stringify(['https://picsum.photos/seed/x/600/600']),
      });

    expect(response.status).toBe(403);
  });

  it('blocks a pending seller from listing products', async () => {
    const { token } = await createUserAndToken({
      email: 'pending@test.dev',
      role: 'seller',
      storeStatus: 'pending',
    });
    const category = await createCategory();

    const response = await request(app)
      .post(`${API}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Pending Seller Product',
        description: 'This request must be rejected until an admin approves the seller account.',
        brand: 'Pending',
        category: String(category._id),
        price: 20,
        stock: 5,
        imageUrls: JSON.stringify(['https://picsum.photos/seed/y/600/600']),
      });

    expect(response.status).toBe(403);
  });

  it('prevents a seller from editing or deleting another seller product', async () => {
    const owner = await createUserAndToken({ email: 'owner@test.dev', role: 'seller' });
    const intruder = await createUserAndToken({ email: 'intruder@test.dev', role: 'seller' });
    const category = await createCategory();
    const product = await createProduct({ seller: owner.user, category });

    const update = await request(app)
      .patch(`${API}/products/${product._id}`)
      .set('Authorization', `Bearer ${intruder.token}`)
      .send({ price: 1 });
    expect(update.status).toBe(403);

    const remove = await request(app)
      .delete(`${API}/products/${product._id}`)
      .set('Authorization', `Bearer ${intruder.token}`);
    expect(remove.status).toBe(403);

    const ownerUpdate = await request(app)
      .patch(`${API}/products/${product._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ price: 149.5 });
    expect(ownerUpdate.status).toBe(200);
    expect(ownerUpdate.body.data.product.price).toBe(149.5);
  });

  it('lets an admin delete any product', async () => {
    const seller = await createUserAndToken({ email: 'seller2@test.dev', role: 'seller' });
    const admin = await createUserAndToken({ email: 'admin@test.dev', role: 'admin' });
    const category = await createCategory();
    const product = await createProduct({ seller: seller.user, category });

    const response = await request(app)
      .delete(`${API}/products/${product._id}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(response.status).toBe(200);
  });

  it('searches, filters, sorts and paginates on the server', async () => {
    const { user: seller } = await createUserAndToken({ email: 'seller3@test.dev', role: 'seller' });
    const electronics = await createCategory('Electronics');
    const fashion = await createCategory('Fashion');

    await createProduct({
      seller,
      category: electronics,
      overrides: { title: 'Nova Wireless Headphones', brand: 'NovaSound', price: 200, stock: 5 },
    });
    await createProduct({
      seller,
      category: electronics,
      overrides: { title: 'Nova Budget Earbuds', brand: 'NovaSound', price: 50, stock: 5 },
    });
    await createProduct({
      seller,
      category: fashion,
      overrides: { title: 'Cotton T-Shirt', brand: 'Urban Thread', price: 25, stock: 0 },
    });

    const keyword = await request(app).get(`${API}/products?q=headphones`);
    expect(keyword.status).toBe(200);
    expect(keyword.body.data.products).toHaveLength(1);

    const byCategory = await request(app).get(`${API}/products?category=${electronics._id}`);
    expect(byCategory.body.data.products).toHaveLength(2);

    const byPrice = await request(app).get(`${API}/products?minPrice=100&maxPrice=300`);
    expect(byPrice.body.data.products).toHaveLength(1);

    const byBrand = await request(app).get(`${API}/products?brand=Urban Thread`);
    expect(byBrand.body.data.products).toHaveLength(1);

    const inStock = await request(app).get(`${API}/products?inStock=true`);
    expect(inStock.body.data.products).toHaveLength(2);

    const sorted = await request(app).get(`${API}/products?sort=price_asc`);
    const prices = sorted.body.data.products.map((product) => product.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));

    const paged = await request(app).get(`${API}/products?page=1&limit=2`);
    expect(paged.body.data.products).toHaveLength(2);
    expect(paged.body.meta.total).toBe(3);
    expect(paged.body.meta.totalPages).toBe(2);
    expect(paged.body.meta.hasNextPage).toBe(true);
  });

  it('returns product details with related products', async () => {
    const { user: seller } = await createUserAndToken({ email: 'seller4@test.dev', role: 'seller' });
    const category = await createCategory();
    const product = await createProduct({ seller, category });
    await createProduct({ seller, category, overrides: { title: 'Related Product Beta' } });

    const response = await request(app).get(`${API}/products/${product._id}`);
    expect(response.status).toBe(200);
    expect(response.body.data.product.title).toBe(product.title);
    expect(response.body.data.related).toHaveLength(1);
  });

  it('rejects invalid product payloads with 422', async () => {
    const { token } = await createUserAndToken({ email: 'seller5@test.dev', role: 'seller' });
    const category = await createCategory();

    const response = await request(app)
      .post(`${API}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'no', description: 'too short', brand: '', category: String(category._id), price: -5, stock: -1 });

    expect(response.status).toBe(422);
  });
});
