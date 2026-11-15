/* Offline verification harness: exercises the pure, DB-free parts of the API. */
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'verification-secret-key-1234567890'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/tap-and-take_verify'
process.env.TAX_RATE = '0.08'
process.env.SHIPPING_FLAT = '6.99'
process.env.FREE_SHIPPING_THRESHOLD = '75'

const assert = require('assert')
const path = require('path').join(__dirname, '..', 'src') + '/';

let passed = 0
const check = (name, fn) => {
  try {
    fn()
    passed += 1
    console.log('PASS  ' + name)
  } catch (error) {
    console.log('FAIL  ' + name + ' -> ' + error.message)
    process.exitCode = 1
  }
}

const { computeTotals, finalUnitPrice, round2, toMinorUnits } = require(path + 'utils/pricing')
const { getPagination, buildMeta } = require(path + 'utils/pagination')
const { findCoupon, normalizeCode, listPublicCoupons } = require(path + 'config/coupons')
const { slugify } = require(path + 'utils/slugify')
const ApiError = require(path + 'utils/ApiError')
const { listProductsQuery, suggestionsQuery } = require(path + 'validators/productValidator')

check('finalUnitPrice applies percentage discounts', () => {
  assert.strictEqual(finalUnitPrice(100, 10), 90)
  assert.strictEqual(finalUnitPrice(19.99, 0), 19.99)
  assert.strictEqual(finalUnitPrice(100, 999), 10) // clamped at 90%
})

check('computeTotals: tax + free shipping threshold', () => {
  const t = computeTotals([{ price: 90, originalPrice: 100, quantity: 2 }])
  assert.strictEqual(t.subtotal, 180)
  assert.strictEqual(t.discount, 20)
  assert.strictEqual(t.shipping, 0)
  assert.strictEqual(t.tax, 14.4)
  assert.strictEqual(t.total, 194.4)
})

check('computeTotals: flat shipping under the threshold', () => {
  const t = computeTotals([{ price: 20, originalPrice: 20, quantity: 1 }])
  assert.strictEqual(t.shipping, 6.99)
  assert.strictEqual(t.total, round2(20 + 1.6 + 6.99))
})

check('computeTotals: empty cart has no shipping and no total', () => {
  const t = computeTotals([])
  assert.strictEqual(t.subtotal, 0)
  assert.strictEqual(t.shipping, 0)
  assert.strictEqual(t.total, 0)
})

check('coupon TAP & TAKE10 caps at maxDiscount', () => {
  const t = computeTotals([{ price: 500, originalPrice: 500, quantity: 1 }], { couponCode: 'tap-and-take10' })
  assert.strictEqual(t.couponDiscount, 40)
  assert.strictEqual(t.couponCode, 'TAP & TAKE10')
  assert.strictEqual(t.tax, round2(460 * 0.08))
})

check('coupon is rejected below its minimum subtotal', () => {
  const t = computeTotals([{ price: 10, originalPrice: 10, quantity: 1 }], { couponCode: 'TAP & TAKE10' })
  assert.strictEqual(t.couponDiscount, 0)
  assert.strictEqual(t.couponCode, '')
  assert.strictEqual(t.coupon.applied, false)
  assert.ok(t.coupon.message.length > 0)
})

check('unknown coupon codes never change the total', () => {
  const base = computeTotals([{ price: 100, originalPrice: 100, quantity: 1 }])
  const hacked = computeTotals([{ price: 100, originalPrice: 100, quantity: 1 }], { couponCode: 'FREE-MONEY' })
  assert.strictEqual(hacked.total, base.total)
  assert.strictEqual(hacked.coupon.applied, false)
})

check('FREESHIP removes shipping only', () => {
  const t = computeTotals([{ price: 20, originalPrice: 20, quantity: 1 }], { couponCode: 'FREESHIP' })
  assert.strictEqual(t.shipping, 0)
  assert.strictEqual(t.couponDiscount, 0)
})

check('coupon catalogue exposes no internal fields', () => {
  const list = listPublicCoupons()
  assert.strictEqual(list.length, 3)
  list.forEach((c) => assert.deepStrictEqual(Object.keys(c).sort(), ['code', 'description', 'minSubtotal']))
  assert.strictEqual(findCoupon('  welcome5 ').code, 'WELCOME5')
  assert.strictEqual(findCoupon('nope'), null)
  assert.strictEqual(normalizeCode(' abc '), 'ABC')
})

check('stripe amounts convert to minor units', () => {
  assert.strictEqual(toMinorUnits(194.4), 19440)
  assert.strictEqual(toMinorUnits(0.1 + 0.2), 30)
})

check('pagination clamps page/limit and builds meta', () => {
  assert.deepStrictEqual(getPagination({ page: '3', limit: '12' }), { page: 3, limit: 12, skip: 24 })
  assert.deepStrictEqual(getPagination({ page: '-5', limit: '9999' }), { page: 1, limit: 60, skip: 0 })
  const meta = buildMeta({ page: 2, limit: 12, total: 37 })
  assert.strictEqual(meta.totalPages, 4)
  assert.strictEqual(meta.hasNextPage, true)
  assert.strictEqual(meta.hasPrevPage, true)
})

check('slugify produces url safe slugs', () => {
  assert.strictEqual(slugify('Aurora 27" 4K Monitor!'), 'aurora-27-4k-monitor')
})

check('ApiError factories map to the right status codes', () => {
  assert.strictEqual(ApiError.badRequest().statusCode, 400)
  assert.strictEqual(ApiError.unauthorized().statusCode, 401)
  assert.strictEqual(ApiError.forbidden().statusCode, 403)
  assert.strictEqual(ApiError.notFound().statusCode, 404)
  assert.strictEqual(ApiError.conflict().statusCode, 409)
  assert.strictEqual(ApiError.validation().statusCode, 422)
  assert.strictEqual(ApiError.serviceUnavailable().statusCode, 503)
})

check('product list query validator coerces and rejects bad input', () => {
  const ok = listProductsQuery.safeParse({
    q: 'headphones',
    sort: 'discount',
    minDiscount: '15',
    minPrice: '10',
    inStock: 'true',
    page: '2',
    limit: '12',
  })
  assert.ok(ok.success, JSON.stringify(ok.error && ok.error.issues))
  assert.strictEqual(typeof ok.data.minDiscount, 'number')
  assert.strictEqual(listProductsQuery.safeParse({ sort: 'cheapest' }).success, false)
  assert.strictEqual(listProductsQuery.safeParse({ minPrice: 'abc' }).success, false)
  assert.strictEqual(suggestionsQuery.safeParse({ q: 'ph' }).success, true)
})

check('every sort option in the API contract is implemented', () => {
  const source = require('fs').readFileSync(path + 'services/productService.js', 'utf8')
  const sorts = ['relevance', 'newest', 'oldest', 'price_asc', 'price_desc', 'rating', 'popular', 'discount']
  sorts.forEach((sort) => assert.ok(new RegExp('\\n  ' + sort + ':').test(source), 'missing sort ' + sort))
})

check('lean reads no longer rely on unsupported lean virtuals', () => {
  const fs = require('fs')
  const files = fs.readdirSync(path + 'services')
  files.forEach((file) => {
    const src = fs.readFileSync(path + 'services/' + file, 'utf8')
    assert.ok(!src.includes('lean({ virtuals'), file + ' still uses lean({ virtuals: true })')
  })
})

console.log('\n' + passed + ' checks passed')
