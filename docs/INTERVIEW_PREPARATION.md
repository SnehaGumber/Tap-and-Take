# Trendora — Interview Preparation

This document contains concise, accurate answers to common interview questions about the engineering decisions in Trendora. Every answer is grounded in the actual source code.

---

## 1. Architecture and Separation of Concerns

**Q: How is the backend structured?**

The backend follows a strict four-layer pipeline: route → controller → service → model.

- **Routes** declare URLs and apply middleware (auth, authorize, validate).
- **Controllers** are thin: they read `req`, call one service function, and send the response. No business logic.
- **Services** own all business rules: pricing, stock, ownership checks, aggregations.
- **Models** define schemas and indexes.

This structure means: if a pricing rule changes, you only edit `pricing.js`. If an authorization rule changes, you only edit the service. No logic is scattered across files.

**Q: Why not use GraphQL or microservices?**

GraphQL adds query-parsing complexity without benefit for a marketplace where the API shape is well-defined. Microservices would require inter-service communication, distributed tracing and deployment orchestration — all unnecessary for a project of this size. Monolith with clear layers is easier to reason about, test and explain.

---

## 2. Authentication vs Authorization

**Authentication** = "are you who you say you are?" → verified by `protect` middleware (JWT).  
**Authorization** = "are you allowed to do this?" → enforced by `authorize()` middleware + ownership checks in services.

**How authentication works:**

1. User logs in → server verifies password with `bcrypt.compare()`.
2. Server signs a JWT with `sub: user._id` and `role: user.role`, expires in 7 days.
3. Client stores JWT in `localStorage`, sends it as `Authorization: Bearer <token>`.
4. `protect` middleware calls `jwt.verify()`, then **re-fetches the user from MongoDB**.
5. If the user has been deactivated, access is denied immediately — no need to wait for token expiry.

**Why re-fetch from DB on every request?**  
JWTs are stateless — a token alone can't know if an account was deactivated. Re-fetching takes one indexed query and solves revocation without a token blacklist.

**Trade-off:** JWTs in `localStorage` are readable by JavaScript (XSS risk). Mitigation: httpOnly cookies with a CSRF token. Not yet implemented — documented as future work.

---

## 3. Password Hashing

```js
// User.js — pre-save hook
const salt = await bcrypt.genSalt(10);
this.password = await bcrypt.hash(this.password, salt);
```

- **Why bcrypt?** It is intentionally slow (cost factor 10 = ~100ms per hash). Brute-forcing a database dump is computationally expensive.
- **Why `select: false`?** The password field is excluded from every query result by default. You must explicitly `.select('+password')` to retrieve it — preventing accidental exposure.
- **Why not SHA-256?** SHA-256 is fast (designed for throughput, not security). Attackers can hash millions of candidates per second. bcrypt makes this infeasible.

---

## 4. MongoDB Schema Design and Indexes

**Why references instead of embedding everywhere?**

- Cart, Wishlist, Address → separate documents (one per user) to avoid unbounded document growth.
- Order items → **embedded as snapshots** (title, price, brand stored at order time). This preserves historical accuracy: if a seller changes the price tomorrow, old orders still show the correct amount.
- Review → separate collection with a compound unique index `(product, user)` enforced at the database level — even if the application checks first, the DB prevents duplicates on concurrent requests.

**Key index design decisions:**

- `Product`: text index on `title+description+brand+tags` for keyword search; `seller+isActive` for seller catalogue queries; `category` for browse.
- `Order`: compound index `items.seller+createdAt` for seller order scoping. Without this, a seller's order list requires a full collection scan.
- `Review`: unique compound index `(product, user)` — enforces one-review-per-product at the database level, not just the application level.

---

## 5. Product Rating Aggregation

**Original bug:** `$match: { product: typeof productId === 'string' ? undefined : productId }` — if `productId` was a string, `$match: { product: undefined }` matched every review in the collection and returned a system-wide average instead of per-product.

**Fix:** Always cast to `ObjectId` before the aggregation:

```js
const oid = new mongoose.Types.ObjectId(String(productId));
const [stats] = await Review.aggregate([
  { $match: { product: oid } },
  { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } },
]);
```

**Why use aggregation instead of `Review.find()`?** `$avg` in an aggregation is a single DB round-trip. `Review.find()` loads all reviews into memory then computes the average in JavaScript — slower and uses more memory as review counts grow.

---

## 6. Inventory Consistency and Concurrent Updates

**The core challenge:** Two customers both add the last unit to their cart and check out simultaneously. Only one should succeed.

**Solution — atomic conditional update:**

```js
const result = await Product.updateOne(
  { _id: item.product, stock: { $gte: item.quantity } },   // condition
  { $inc: { stock: -item.quantity, numSold: item.quantity } }
);
if (result.modifiedCount !== 1) throw ApiError.conflict('out of stock');
```

`$gte` in the filter and `$inc` in the update are executed as a single atomic operation by MongoDB's document-level locking. If two requests arrive simultaneously, one will succeed (modifiedCount=1) and the other will fail (modifiedCount=0, stock unchanged).

**Limitation:** This is per-item, not transactional across multiple items. Without a MongoDB replica set, multi-document transactions are not available. A partial failure is handled by a rollback loop that restores any already-decremented items.

---

## 7. Idempotency and Duplicate Requests

**What is idempotency?** An operation is idempotent if calling it multiple times has the same effect as calling it once. Example: paying for the same order twice should not charge the customer twice.

**How Trendora handles it:**

- `confirmPayment` checks `if (order.paymentStatus === 'paid') return { alreadyPaid: true }` before touching anything.
- `commitOrder` checks `if (order.stockCommitted) return order` — stock is never decremented twice for the same order.
- The payment amount is verified against the Stripe PaymentIntent before committing: `Math.abs(intent.amount - Math.round(order.pricing.total * 100)) > 1`.

**What is missing:** Stripe PaymentIntents are not created with an idempotency key (`idempotencyKey` header). Adding this would make network retries safe — the same key returns the same existing intent instead of creating a duplicate charge.

---

## 8. Payment Lifecycle and Webhooks

**Current implementation:** Stripe test mode with server-side confirmation.

1. Server creates `PaymentIntent` for the server-computed amount.
2. Frontend confirms the intent using the `clientSecret` and Stripe.js.
3. Frontend calls `POST /api/payments/confirm` with the `orderId` and `paymentIntentId`.
4. Server calls `stripe.paymentIntents.retrieve()` to verify the intent status and amount.
5. If verified → `commitOrder()`.

**What is missing:** A Stripe webhook handler (`POST /api/payments/webhook`). In production, Stripe sends `payment_intent.succeeded` asynchronously — the client confirmation is an optimistic path. Webhooks handle the case where the user closes the browser after payment but before the confirmation API call. The webhook must:
- Use `express.raw()` (not `express.json()`) to receive the raw body.
- Call `stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)` to verify the request is genuinely from Stripe.
- Be idempotent — Stripe may deliver the same event more than once.

---

## 9. Order Status vs Payment Status

| Field | Values | Meaning |
|---|---|---|
| `status` | `pending_payment → processing → shipped → delivered → cancelled` | Physical fulfilment / logistics |
| `paymentStatus` | `pending → paid → failed → cancelled → refunded` | Financial / money state |

They are separate because money and logistics move independently:
- A COD order is logistically `processing` (goods are being prepared) but financially `pending` (no money collected yet).
- A card order stays `pending_payment` until the card succeeds.
- A delivered order with a refund request has `status: delivered` but `paymentStatus: refunded`.

**Interview point:** Always separate financial state from fulfilment state. Mixing them creates impossible-to-handle edge cases.

---

## 10. Testing Strategy

**Philosophy:** Integration tests over unit tests for a database-backed API. Testing the full request-to-database path catches more real bugs than mocking the database.

**Setup:**
- `mongodb-memory-server` — spins up a real MongoDB process in memory. No mocking, no stubs. Queries behave exactly as in production.
- `afterEach` wipes all collections — every test starts from a clean state.
- `--runInBand` — tests run serially to avoid race conditions on the shared in-memory database.

**Coverage by file:**

| File | What it covers |
|---|---|
| `auth.test.js` | Register, login, JWT, password change, protected routes |
| `cart.test.js` | Cart CRUD, stock limits, persistence, wishlist move |
| `product.test.js` | Create, update, delete, ownership isolation |
| `order.test.js` | Full order lifecycle, seller isolation, admin dashboard numbers |
| `pricing.test.js` | Round2, finalUnitPrice, computeTotals, coupons (unit tests) |
| `review.test.js` | Rating aggregation correctness, review eligibility, COD/card paths |
| `sellerTrust.test.js` | Trust score threshold, breakdown fields, public profile inclusion |
| `alternatives.test.js` | Scoring, exclusions, ranking, inStock filter |

---

## 11. Seller Trust Score

**Problem:** Customers cannot tell a new seller from a reliable one without browsing their reviews. A summary metric reduces decision friction.

**Implementation:** Pure aggregation from MongoDB. No machine learning, no external service.

```
Score = fulfilment_score(40) + delivery_score(30) + review_score(30) − cancel_penalty(15)
```

- `stockCommitted` as confirmation gate (same signal used for review eligibility).
- Minimum 3 committed orders to show a score (new sellers show "insufficient data").
- Full breakdown always returned so the score is explainable and auditable.

**Why not use a star rating alone?** Star ratings can be gamed by friends or fake accounts. Combining order fulfilment data (which is harder to fake) with reviews provides a more trustworthy signal.

**Alternative considered:** Bayesian average to shrink extreme ratings toward the mean for sellers with few reviews. Decided against it — harder to explain. The minimum order threshold achieves a similar goal more transparently.

---

## 12. Smart Product Alternatives

**Problem:** `getRelatedProducts()` already existed but returned results with no explanation of why they were related.

**Implementation:** Deterministic scoring with explicit `reasons` per alternative:

```
+3 same category  +2 same brand  +2 price ±30%  +2 in stock  +1 rating≥4  +1 lower price
```

**Why deterministic instead of a recommendation model?**
- Reproducible: same inputs always produce the same outputs.
- Testable: unit tests can verify exact scores.
- Explainable: every reason is a human-readable string, not a neural network output.
- No external dependency: works offline, no API key needed.

**Limitation:** Does not consider purchase co-occurrence ("customers who bought X also bought Y"). That would require collaborative filtering, which needs historical transaction data and is out of scope.

---

## 13. Design Trade-offs and Limitations

| Decision | Trade-off | Why chosen |
|---|---|---|
| JWT in localStorage | XSS exposure | Simpler than httpOnly cookies + CSRF. Acceptable for a project where XSS is mitigated by no user-generated HTML rendering. |
| No MongoDB transactions | Partial failure risk | Requires a replica set. Local dev uses a single node. The atomic `$gte` update covers the critical race condition. |
| Coupons hardcoded in `coupons.js` | Cannot be managed via UI | Avoids a full promotions engine. Easy to explain and extend. |
| No email notifications | Incomplete order UX | Requires a transactional email provider (Sendgrid, Resend). Out of scope. |
| Stripe webhook not implemented | Asynchronous payments not handled | The current `confirmPayment` flow works for the demo. Webhook is documented as next step. |
| No refresh tokens | Sessions expire after 7d | Acceptable for a placement demo. Refresh tokens with httpOnly cookies are documented as future work. |

---

## 14. Five Questions You Should Practise

1. **"How does a seller ensure they can't modify another seller's product?"**  
   The `assertProductAccess()` function in `productService.js` loads the product by ID, then compares `String(product.seller) !== String(user._id)`. It throws 403 if they don't match. This runs in every update and delete path.

2. **"How does the application prevent a customer from overcharging or undercharging themselves?"**  
   The client sends only an address ID and payment method. All prices, discounts, tax, shipping and totals are recomputed in `buildTrustedLines()` from the live database. The Stripe PaymentIntent is created for this server-computed amount. `confirmPayment` then re-verifies the intent amount against the order total.

3. **"What happens if two customers buy the last unit simultaneously?"**  
   The `commitOrder` function uses `Product.updateOne({ _id, stock: { $gte: qty } }, { $inc: stock: -qty })`. MongoDB executes this atomically. One request succeeds (`modifiedCount=1`), the other gets `modifiedCount=0` and throws a 409 conflict. The failed one rolls back any partial stock decrements.

4. **"Why do COD orders have `paymentStatus: 'pending'` even after confirmation?"**  
   COD means payment is collected at the door by the courier. The system commits stock immediately (COD is essentially pre-confirmed), but the money hasn't changed hands. `paymentStatus` stays `pending` because it reflects the financial state, not the logistical state.

5. **"How would you add email notifications for order confirmation?"**  
   After `commitOrder()` succeeds, call an email service function (e.g. `sendOrderConfirmation(order)`) that constructs a template and calls a transactional email API (Sendgrid, Resend). This call should be wrapped in a try/catch so an email failure does not roll back the order. For production, move it to a background job queue so a slow email provider doesn't block the HTTP response.
