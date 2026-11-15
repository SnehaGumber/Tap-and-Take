# Trendora — Implementation Roadmap

## Completed in This Session

| Phase | Work | Status |
|---|---|---|
| BUG-01 | COD order status sync (`syncStatusFromItems`) | ✅ Fixed + 3 regression tests |
| BUG-02 | Rating aggregation type safety | ✅ Fixed + 2 regression tests |
| SEC-03 | Review eligibility — `stockCommitted` gate | ✅ Fixed + 4 regression tests |
| SEC-05 | `/payments/test-pay` production guard | ✅ Fixed |
| Feature A | Seller Trust Score service + endpoint + tests | ✅ Complete (7 tests) |
| Feature B | Smart Product Alternatives service + endpoint + tests | ✅ Complete (6 tests) |
| CI | GitHub Actions workflow | ✅ Created |
| Docs | PROJECT_AUDIT, ARCHITECTURE, INTERVIEW_PREP | ✅ Created |

Test suite: **63 tests, 63 passing** across 8 test files.

---

## High Priority — Next Session

### 1. Stripe Webhook Handler
**Files to create/edit:** `paymentRoutes.js`, `paymentController.js`  
**Why it matters:** Without this, asynchronous Stripe payments (standard Stripe.js flow) are never confirmed. The current `test-pay` endpoint is demo-only.

**Implementation checklist:**
- Register route BEFORE `express.json()` middleware: `app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentRoutes)`
- Verify signature: `stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], env.stripe.webhookSecret)`
- Handle `payment_intent.succeeded` → call `orderService.confirmPayment()`
- Handle `payment_intent.payment_failed` → call `markPaymentFailed()`
- Idempotency: check `order.paymentStatus === 'paid'` before processing

### 2. Refresh Tokens with httpOnly Cookies
**Files to create/edit:** `authController.js`, `authService.js`, `token.js`, frontend `api.js`  
**Why it matters:** Current JWT in localStorage is readable by JavaScript (XSS exposure). httpOnly cookies are not.  
**Requires:** Separate `accessToken` (15m expiry) + `refreshToken` (7d expiry, httpOnly cookie). Add `POST /api/auth/refresh` endpoint.

### 3. Idempotency Key on Stripe PaymentIntent
**File:** `paymentService.js:createPaymentIntent`  
**Change:** Add `idempotencyKey: \`order-${userId}-${Date.now()}\`` to the Stripe API call. Use the order ID once it's created: `idempotencyKey: \`order-${order._id}\``.

---

## Medium Priority

### 4. MongoDB Transaction Wrapper for Order Creation
**Requirement:** MongoDB replica set (Atlas or local `mongod --replSet`)  
**Files:** `orderService.js:createOrder`, `commitOrder`  
**Pattern:**
```js
const session = await mongoose.startSession();
session.startTransaction();
try {
  // all writes with { session }
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
}
```

### 5. Email Notifications
**On `commitOrder`:** Send order confirmation to customer.  
**On seller approval/rejection:** Notify seller.  
**Suggested provider:** Resend (simple API, generous free tier).  
**Key rule:** Wrap in try/catch — email failure must NEVER roll back the order.

### 6. Frontend Tests
**Setup:** Add Vitest + React Testing Library to `frontend/package.json`.  
**Start with:** Login form, add-to-cart button, checkout flow.

---

## Low Priority / Future Work

- Product Q&A section
- Review helpfulness voting
- Seller payout ledger
- Shipment tracking integration (AfterShip, etc.)
- Full-text search with Atlas Search for faceted counts
- Admin moderation queue for reviews
- Multi-currency pricing
