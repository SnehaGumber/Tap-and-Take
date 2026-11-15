# Trendora — Architecture

## Overview

Trendora is a deliberately monolithic, well-layered MERN application. No microservices, no message queues, no GraphQL. The architecture is chosen to be explainable in an interview and runnable by a single developer without external infrastructure.

```
Browser (React + Vite)
    │  HTTP/JSON over Axios
    ▼
Express REST API (Node.js)
    │  Mongoose ODM
    ▼
MongoDB (single collection-per-resource)
    │
    ├── Local backend uploads  (product image storage)
    └── Stripe      (card payment processing, optional/test mode)
```

---

## Backend Layer Structure

Every request passes through layers in this order:

```
HTTP request
  → app.js middleware stack
      (helmet, cors, body-parser, mongo-sanitize, hpp, compression, rate-limiter)
  → route file          (maps URL + verb to a handler chain)
  → auth middleware     (verifies JWT, loads user from DB)
  → authorize middleware (checks role; requireApprovedSeller for product creation)
  → validate middleware  (Zod schema on body / query / params)
  → controller          (reads req, calls one service, sends response)
  → service             (all business logic: pricing, stock, ownership, aggregations)
  → Mongoose model      (DB query)
  → ApiResponse helper  (normalises to { success, message, data, meta })
  → central error handler (formats every thrown error consistently)
```

**Controllers** contain no business logic — only `req → service call → res`.  
**Services** are the single place where rules live.  
**Validators** are Zod schemas shared between route files. Mongoose schema validation is a second layer.

---

## Data Models and Relationships

```
User (role: customer | seller | admin)
  ├─ has one Cart           (created on register)
  ├─ has one Wishlist        (created on register)
  ├─ has many Address
  ├─ has many Order (as buyer)
  ├─ has many Product (as seller)
  └─ has embedded store{}   (seller only: name, description, status)

Product
  ├─ belongs to Category
  ├─ belongs to User (seller)
  └─ has many Review

Order
  ├─ belongs to User (buyer)
  ├─ has embedded items[]   (product snapshot: price locked at order time)
  ├─ has embedded shippingAddress{} (snapshot)
  └─ has one Payment

Review
  ├─ belongs to Product
  ├─ belongs to User
  └─ belongs to Order       (for verified-purchase gate)
```

---

## Key Design Decisions

### 1. Order items store price snapshots
Order items embed `title`, `unitPrice`, `originalPrice`, `brand` and `image` at creation time. This means historical orders stay accurate even if the seller later changes the price or deletes the product. Only `product._id` and `seller._id` are references.

### 2. stockCommitted as the single confirmation gate
`stockCommitted: true` is set exactly once: when `commitOrder()` runs (after card payment succeeds, or immediately for COD). It is the canonical "this order is real" signal used by both the review eligibility check and the trust score calculation.

### 3. syncStatusFromItems (parent order status is derived)
Sellers update item-level statuses. The parent order status is derived automatically by finding the minimum rank among active items. This is correct for multi-seller orders where items ship independently.

### 4. Server-side pricing — client never sends amounts
The checkout flow only receives `addressId`, `paymentMethod` and an optional coupon code. All prices, discounts, tax, shipping and totals are recomputed from the database. The Stripe PaymentIntent is created for the server-computed amount, and `confirmPayment` verifies that the intent amount matches the order total (±1 cent tolerance for rounding).

### 5. Seller isolation enforced at the service layer
Role checks alone are not sufficient. Every seller-scoped query includes `seller: req.user._id` in its filter, and `assertProductAccess()` compares `product.seller` to `req.user._id` before any write.

---

## New Services Added in This Session

### `sellerTrustService.js` — Seller Trust Score
Computes a 0–100 score from four components (fulfilment rate, delivery rate, review score, cancellation penalty) using verified marketplace data. Returns `{ hasScore: false, reason: 'insufficient_data' }` for new sellers with fewer than `MINIMUM_ORDERS` committed orders.

Endpoint: `GET /api/seller/trust-score` (seller only)  
Also surfaced in: `GET /api/products/sellers/:id` (public profile)

### `alternativesService.js` — Smart Product Alternatives
Returns ranked alternative products with explicit human-readable `reasons` per alternative. Scoring uses six deterministic signals (same category, same brand, price band, in-stock, rating, lower price). No external service required.

Endpoint: `GET /api/products/:productId/alternatives?inStock=true&limit=8`

---

## Database Indexes

| Collection | Index | Purpose |
|---|---|---|
| users | email (unique) | login lookup |
| users | role, isActive | admin user filters |
| users | name text, email text | admin search |
| products | slug (unique) | product page URL |
| products | seller + isActive | seller catalogue |
| products | category | category browse |
| products | price | price sort/filter |
| products | ratingAverage | rating sort |
| products | title+description+brand+tags text | keyword search |
| orders | user | customer order history |
| orders | status, paymentStatus | admin/seller filters |
| orders | items.seller + createdAt | seller order scoping |
| orders | orderNumber (unique) | order lookup |
| reviews | product + user (unique) | duplicate review prevention |
| reviews | product + createdAt | review listing |
| payments | user, stripePaymentIntentId | payment lookup |

---

## Sequence: Card Order Checkout

```
1. POST /api/orders
   → buildTrustedLines()  loads cart, verifies products active + in stock, computes totals from DB prices
   → createPaymentIntent()  creates Stripe PaymentIntent for server-computed amount
   → Payment.create()  stores intent id, status:'requires_payment'
   → Order.create()    status:'pending_payment', stockCommitted:false
   → return { order, clientSecret }

2. Frontend confirms payment with Stripe.js (uses clientSecret + publishable key)

3. POST /api/payments/confirm { orderId, paymentIntentId }
   → stripe.paymentIntents.retrieve()  verifies intent status === 'succeeded'
   → verifies intent.amount matches order.pricing.total (±1 cent)
   → commitOrder()
       → Product.updateOne({ $gte: qty }, { $inc: stock })  atomic per item
       → order.stockCommitted = true, status → 'processing'
       → Payment.status → 'succeeded'
       → Cart cleared

4. Seller: PATCH /api/seller/orders/:id/items/:itemId/status
   → item.status → 'shipped' | 'delivered'
   → syncStatusFromItems()  advances parent order status
```

## Sequence: COD Order Checkout

```
1. POST /api/orders { paymentMethod: 'cod' }
   → same buildTrustedLines() + Order.create()
   → immediately calls commitOrder()  (no card payment needed)
       → stock committed, order status → 'processing', paymentStatus stays 'pending'

2. Seller ships → PATCH status → 'shipped' → order.status → 'shipped'
3. Seller delivers → PATCH status → 'delivered' → order.status → 'delivered'
   (Physical cash collection happens outside the system)
```
