# Tap & Take — Project Audit

This document records the findings from the Phase 1 audit performed against the actual source files. All findings are confirmed by code inspection or test execution.

---

## Verified Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React + Vite | React 18, Vite 5 |
| Backend | Node.js + Express | Node ≥ 18, Express 4 |
| Database | MongoDB + Mongoose | Mongoose 8 |
| Auth | JWT + bcryptjs | jsonwebtoken 9, bcryptjs 2.4 |
| Validation | Zod | 3.x |
| Testing | Jest + Supertest + mongodb-memory-server | Jest 29 |
| Image upload | local image storage (optional) | cloudinary 1.x |
| Payments | Stripe test mode (optional) | stripe 16 |

---

## Confirmed Defects (Fixed)

### BUG-01 — COD order status never propagated (`Order.js:syncStatusFromItems`)

**Status:** Fixed.  
**File:** `backend/src/models/Order.js`  
**Description:** The guard `if (this.paymentStatus !== 'paid') return` blocked status sync for all COD orders, because COD orders intentionally keep `paymentStatus: 'pending'` until physical collection. Item status updates by sellers had no effect on the parent order status.  
**Fix:** `if (this.paymentStatus !== 'paid' && this.paymentMethod !== 'cod') return`  
**Tests added:** 3 new regression tests in `backend/tests/order.test.js`

### BUG-02 — Rating aggregation type-unsafe (`reviewService.js:recalculateProductRating`)

**Status:** Fixed.  
**File:** `backend/src/services/reviewService.js`  
**Description:** The aggregation used `typeof productId === 'string' ? undefined : productId` in `$match`. When `productId` was a string, MongoDB received `{ product: undefined }` which matched every review in the collection. The old fallback disguised this.  
**Fix:** Always cast to `ObjectId` before the aggregation. Removed the misleading fallback.  
**Tests added:** `backend/tests/review.test.js`

### SEC-03 — Review eligibility allowed unconfirmed card orders (`reviewService.js:assertPurchaseEligibility`)

**Status:** Fixed.  
**File:** `backend/src/services/reviewService.js`  
**Description:** The eligibility query included `paymentStatus: { $in: ['paid', 'pending'] }` which allowed a card customer to review before their card was charged.  
**Fix:** Filter on `stockCommitted: true` instead. This is the single source of truth for "order confirmed" across both payment methods.  
**Tests added:** `backend/tests/review.test.js`

### SEC-05 — `/payments/test-pay` reachable in production (`paymentRoutes.js`)

**Status:** Fixed.  
**File:** `backend/src/routes/paymentRoutes.js`  
**Description:** The test payment endpoint had no production guard. In a production deployment with real Stripe keys, it would call `stripe.paymentIntents.confirm` with a hardcoded test card.  
**Fix:** Returns 404 when `NODE_ENV === 'production'`.

---

## Confirmed Good (No Change Required)

| Check | Evidence |
|---|---|
| `requireApprovedSeller` on product creation | `productRoutes.js` line 36 |
| Password `select: false` and never serialised | `User.js` schema + `toJSON` transform |
| Prices recomputed server-side at checkout | `orderService.buildTrustedLines()` |
| Atomic stock decrement with `$gte` guard | `orderService.commitOrder()` |
| Stock rolled back on partial failure | try/catch rollback loop in `commitOrder()` |
| Seller owns only their products/orders | `assertProductAccess()`, `getSellerOrder()` |
| JWT verified + user re-fetched on every request | `auth.js:protect` middleware |
| Role comes from DB, never from JWT payload | `authorize.js` reads `req.user.role` |
| `helmet`, `cors`, `mongo-sanitize`, `hpp`, rate limiting | `app.js` |

---

## Remaining Limitations (Not Fixed in This Session)

| Item | Reason not fixed |
|---|---|
| Stripe webhook handler (`POST /payments/webhook`) | Missing feature, not a regression. Requires external Stripe configuration to test properly. |
| JWT in `localStorage` (XSS risk) | Architectural change requiring frontend + backend rework. Documented trade-off. |
| No MongoDB transactions on order writes | Requires replica set. Single-node dev setup does not support transactions. The atomic `$gte` update covers the most critical race condition. |
| No email notifications | Out of scope for this session. Requires a transactional email provider. |
