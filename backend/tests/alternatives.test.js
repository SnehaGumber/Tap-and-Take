'use strict';

/**
 * Tests for Smart Product Alternatives (Feature B).
 *
 * Covers:
 *  - Returns alternatives for a product that has same-category neighbours
 *  - Excludes the source product from its own alternatives
 *  - Each alternative includes a score and reasons array
 *  - Inactive products are excluded
 *  - Returns empty alternatives when no neighbours exist
 *  - inStock=true filter excludes out-of-stock products
 *  - Higher-scoring alternatives rank first
 *  - Same-brand alternative scores higher than same-category-only
 */

const {
  app,
  API,
  request,
  createUserAndToken,
  createCategory,
  createProduct,
} = require('./helpers');

let _c = 0;
beforeEach(() => { _c = 0; });
async function freshSeller(extra = '') {
  _c += 1;
  return createUserAndToken({ email: `alt-seller-${_c}-${extra}@test.dev`, role: 'seller' });
}

describe('Product Alternatives (Feature B)', () => {
  it('returns an alternatives list with score and reasons for each item', async () => {
    const { user: seller } = await freshSeller('a');
    const cat = await createCategory('Gadgets');

    const source = await createProduct({
      seller, category: cat,
      overrides: { title: 'Source Gadget', price: 100, discountPercent: 0, stock: 5, brand: 'BrandX' },
    });
    // Same category, same brand — should appear
    await createProduct({
      seller, category: cat,
      overrides: { title: 'Neighbour Gadget', price: 90, discountPercent: 0, stock: 3, brand: 'BrandX' },
    });

    const res = await request(app).get(`${API}/products/${source._id}/alternatives`);
    expect(res.status).toBe(200);

    const { alternatives } = res.body.data;
    expect(alternatives.length).toBeGreaterThanOrEqual(1);

    const first = alternatives[0];
    expect(first.score).toBeGreaterThan(0);
    expect(Array.isArray(first.reasons)).toBe(true);
    expect(first.reasons.length).toBeGreaterThan(0);
    expect(first.product.title).not.toBe('Source Gadget');
  });

  it('never includes the source product in its own alternatives', async () => {
    const { user: seller } = await freshSeller('b');
    const cat = await createCategory('Audio');

    const source = await createProduct({
      seller, category: cat,
      overrides: { title: 'Headphones A', price: 50, stock: 5, brand: 'SoundCo' },
    });
    await createProduct({
      seller, category: cat,
      overrides: { title: 'Headphones B', price: 55, stock: 5, brand: 'SoundCo' },
    });

    const res = await request(app).get(`${API}/products/${source._id}/alternatives`);
    const ids = res.body.data.alternatives.map((a) => a.product._id);
    expect(ids).not.toContain(String(source._id));
  });

  it('excludes inactive (delisted) products', async () => {
    const { user: seller } = await freshSeller('c');
    const cat = await createCategory('Cameras');

    const source = await createProduct({
      seller, category: cat,
      overrides: { title: 'Camera A', price: 200, stock: 5, brand: 'PhotoBrand' },
    });
    const inactive = await createProduct({
      seller, category: cat,
      overrides: { title: 'Camera Delisted', price: 180, stock: 5, brand: 'PhotoBrand', isActive: false },
    });

    const res = await request(app).get(`${API}/products/${source._id}/alternatives`);
    const ids = res.body.data.alternatives.map((a) => a.product._id);
    expect(ids).not.toContain(String(inactive._id));
  });

  it('returns empty alternatives when no other products exist in the same category or brand', async () => {
    const { user: seller } = await freshSeller('d');
    const cat = await createCategory('RareTech');

    const source = await createProduct({
      seller, category: cat,
      overrides: { title: 'Lonely Product', price: 300, stock: 5, brand: 'UniqueBrand' },
    });

    const res = await request(app).get(`${API}/products/${source._id}/alternatives`);
    expect(res.status).toBe(200);
    expect(res.body.data.alternatives).toHaveLength(0);
  });

  it('respects the inStock=true query parameter', async () => {
    const { user: seller } = await freshSeller('e');
    const cat = await createCategory('Monitors');

    const source = await createProduct({
      seller, category: cat,
      overrides: { title: 'Monitor A', price: 300, stock: 5, brand: 'DisplayBrand' },
    });
    await createProduct({
      seller, category: cat,
      overrides: { title: 'Monitor B OOS', price: 280, stock: 0, brand: 'DisplayBrand' },
    });
    const inStockProduct = await createProduct({
      seller, category: cat,
      overrides: { title: 'Monitor C', price: 290, stock: 10, brand: 'DisplayBrand' },
    });

    const res = await request(app)
      .get(`${API}/products/${source._id}/alternatives?inStock=true`);

    const ids = res.body.data.alternatives.map((a) => a.product._id);
    // Monitor B OOS must be excluded; Monitor C must be present
    expect(ids.find((id) => id === String(inStockProduct._id))).toBeTruthy();
    expect(ids.filter((id) => {
      const alt = res.body.data.alternatives.find((a) => a.product._id === id);
      return alt && alt.product.stock === 0;
    })).toHaveLength(0);
  });

  it('ranks same-brand+same-category above same-category-only', async () => {
    const { user: seller } = await freshSeller('f');
    const cat = await createCategory('Keyboards');

    const source = await createProduct({
      seller, category: cat,
      overrides: { title: 'Keyboard Source', price: 100, stock: 5, brand: 'MechKeys' },
    });
    // Same brand AND same category → higher score
    const sameBrandCat = await createProduct({
      seller, category: cat,
      overrides: { title: 'Keyboard MechKeys B', price: 95, stock: 5, brand: 'MechKeys' },
    });
    // Same category only → lower score
    await createProduct({
      seller, category: cat,
      overrides: { title: 'Keyboard OtherBrand', price: 90, stock: 5, brand: 'OtherBrand' },
    });

    const res = await request(app).get(`${API}/products/${source._id}/alternatives`);
    const alts = res.body.data.alternatives;

    // The same-brand-and-category product must rank first
    expect(alts[0].product._id).toBe(String(sameBrandCat._id));
    expect(alts[0].score).toBeGreaterThan(alts[1].score);
  });
});
