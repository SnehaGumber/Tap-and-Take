# Trendora — Full Stack E-Commerce Marketplace (MERN)

Trendora is a multi-seller e-commerce marketplace built with the MERN stack. It ships with three
fully separated roles (customer, seller, admin), real backend search/filtering/pagination,
server-side pricing, Stripe test-mode payments, local disk image uploads and database-driven
dashboards.

---

## 1. Project overview

| | |
|---|---|
| **Name** | Trendora |
| **Type** | Multi-seller e-commerce marketplace (Amazon/Flipkart style functionality, original branding) |
| **Stack** | React + Vite (frontend), Node.js + Express (backend), MongoDB + Mongoose (database) |
| **Roles** | Customer, Seller, Admin |
| **Integrations** | Local product image storage, Stripe test mode (payments) |
| **Auth** | JWT access tokens + bcrypt password hashing + role-based authorization |

The project is deliberately built as a *monolithic, well-layered* application: no microservices, no
GraphQL, no message queues — just clean Express layering that is easy to explain in an interview.

---

## 2. Features

### Customer
- Register / login / logout, persistent login via stored JWT, protected routes
- Profile view + edit, change password, multiple delivery addresses with a default address
- Product listing with **backend** keyword search, category, brand, min/max price, rating,
  in-stock filter, 7 sort modes and pagination
- Rich product detail page: image gallery, brand, rating distribution, price/discount/savings,
  stock messaging, quantity selector, add to cart, wishlist, specifications table, seller card,
  reviews and related products
- Persistent server-side cart (add / update quantity / remove / clear) with live totals
- Wishlist (add / remove / move to cart)
- Checkout: address selection, order summary, tax, shipping (free above a threshold), Stripe test
  payment or cash on delivery, success/failure result page
- Orders: history with status filter + pagination, order details with status timeline, retry
  payment, cancel order (stock is restored)
- Reviews: star rating + text, verified-purchase only, one review per product per user

### Seller
- Seller sign-in portal, store profile (name, description, contact email/phone), approval status
- Dashboard from live aggregations: revenue, units sold, orders, pending orders, product counts,
  low-stock count, 6-month sales line chart, orders bar chart, recent orders, top products
- Full product CRUD with multi-image local upload, discount, stock, category, brand,
  specifications, tags, publish/hide toggle
- Order management scoped to the seller's own items, with per-item status updates
  (processing → shipped → delivered → cancelled)
- Hard ownership isolation: a seller can never read or mutate another seller's products/orders

### Admin
- Admin console sign-in
- Dashboard: users, customers, sellers, pending sellers, products, categories, orders, revenue,
  average order value, pending orders, low stock + charts for revenue, orders, new users and
  products per category, plus top products, top sellers, recent orders, low-stock list
- User management: search, filter by role/state, view details (orders, spend, listings, reviews),
  activate/deactivate, change role, delete (deactivates when history exists)
- Seller management: filter by store status, approve, reject, activate/deactivate
- Product moderation: search/filter across all sellers, remove listings
- Category management: create, edit, hide, delete (blocked when products exist)
- Order operations: search/filter, inspect items, update item statuses, cancel orders

---

## 3. Tech stack

**Frontend:** React 18, Vite 5, React Router 6, Axios, Context API (auth, cart, wishlist, toast),
custom hooks, hand-written CSS design system (no UI kit), hand-built SVG/CSS charts.

**Backend:** Node.js, Express 4, Mongoose 8, jsonwebtoken, bcryptjs, zod validation, helmet, cors,
express-rate-limit, express-mongo-sanitize, hpp, compression, morgan, multer, cloudinary, stripe,
dotenv.

**Testing:** Jest + Supertest + mongodb-memory-server.

---

## 4. Architecture

```
React (Vite)  ──axios──>  Express REST API  ──mongoose──>  MongoDB
     │                          │
     │                          ├── Local disk (image upload)
     └── JWT in localStorage    └── Stripe (test mode payments)
```

Request flow inside the backend:

```
route → auth middleware → authorize middleware → zod validate middleware
      → controller (thin) → service (business logic) → mongoose model
      → ApiResponse helper → centralized error handler
```

- **Controllers** only read the request, call a service and send a response.
- **Services** own the business rules (pricing, stock, ownership, aggregations).
- **Validators** are zod schemas applied by a single `validate({ body, query, params })` middleware.
- **Errors** are thrown as `ApiError` instances and formatted by one error handler, so clients always
  receive `{ success, message, errors? }` and never a stack trace in production.
- **Responses** are always `{ success, message, data, meta }`.

---

## 5. Folder structure

```
trendora/
├── backend/
│   ├── src/
│   │   ├── config/          # env loading, mongo connection, cloudinary, stripe
│   │   ├── controllers/     # thin HTTP handlers
│   │   ├── middleware/      # auth, authorize, validate, upload, error handler, rate limit
│   │   ├── models/          # User, Product, Category, Cart, Wishlist, Order, Review, Address, Payment
│   │   ├── routes/          # one router per resource
│   │   ├── services/        # business logic
│   │   ├── validators/      # zod schemas
│   │   ├── utils/           # ApiError, ApiResponse, asyncHandler, pagination, pricing, slugify, jwt
│   │   ├── seed/            # seed script + realistic demo data
│   │   ├── app.js           # express app (middleware + routes)
│   │   └── server.js        # db connect + listen
│   ├── tests/               # jest + supertest integration tests
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/      # common/, product/, charts/, layout/
│   │   ├── context/         # AuthContext, CartContext, WishlistContext, ToastContext
│   │   ├── hooks/           # useAsync, useDebounce, useDocumentTitle
│   │   ├── layouts/         # CustomerLayout, AuthLayout, DashboardLayout
│   │   ├── pages/           # auth/, customer/, seller/, admin/
│   │   ├── routes/          # AppRoutes, ProtectedRoute, RoleProtectedRoute
│   │   ├── services/        # axios instance + one module per API area
│   │   ├── styles/global.css
│   │   ├── utils/           # format, constants, validators
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── package.json             # convenience scripts for both apps
├── .gitignore
└── README.md
```

---

## 6. Database models

| Model | Key fields | Relationships |
|---|---|---|
| **User** | name, email (unique), password (hashed, `select: false`), role, phone, isActive, store{name, description, contactEmail, contactPhone, status}, lastLoginAt | referenced by Product.seller, Order.user, Cart.user, Review.user, Address.user |
| **Product** | title, slug (unique), description, brand, price, discountPercent, `finalPrice` (virtual), stock, images[{url, publicId}], specifications[{key,value}], tags, ratingAverage, ratingCount, numSold, isActive | `seller` → User, `category` → Category |
| **Category** | name (unique), slug (unique), description, image, isActive | referenced by Product.category |
| **Cart** | items[{product, quantity, addedAt}] | `user` → User (one cart per user) |
| **Wishlist** | items[{product, addedAt}] | `user` → User |
| **Address** | label, fullName, phone, line1, line2, city, state, postalCode, country, isDefault | `user` → User |
| **Order** | orderNumber (unique), items[{product, seller, title, image, brand, unitPrice, originalPrice, quantity, lineTotal, status}], shippingAddress snapshot, pricing{subtotal, discount, tax, shipping, total, currency}, status, paymentStatus, paymentMethod, statusHistory[], stockCommitted | `user` → User, `payment` → Payment, item.product → Product, item.seller → User |
| **Payment** | provider, amount, currency, status, stripePaymentIntentId, clientSecret, failureReason, simulated | `order` → Order, `user` → User |
| **Review** | rating (1-5), title, comment, isVerifiedPurchase | `product` → Product, `user` → User, unique compound index (product, user) |

Indexes cover text search on products (title/brand/tags), category+price, seller, slug, order
number, user+createdAt, and the unique review pair. Order items store a *price/title snapshot* so
historical orders stay accurate, but no bulk duplication of product documents.

---


## Local product images (no external image host)

- Demo catalogue artwork is stored in `frontend/public/product-images/` and served by Vite as `/product-images/...`.
- New seller-uploaded images are stored on the backend in `backend/uploads/products/` and served at `/uploads/...`.
- The Vite development server proxies `/uploads` to the Express backend.
- Existing products created before this change can be migrated without reseeding or deleting data:

```bash
cd backend
npm run images:migrate
```

The migration replaces only legacy Picsum image references. It does not clear or recreate users, products, orders, payments, or inventory. Uploaded files in `backend/uploads/` are runtime data and are intentionally excluded from Git; back up this folder if you need to preserve seller-uploaded images.

## 7. API overview

Base URL: `/api`

| Area | Endpoints |
|---|---|
| **Auth** | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| **Users** | `GET /users/profile`, `PATCH /users/profile`, `PATCH /users/password` |
| **Products** | `GET /products`, `GET /products/facets/filters`, `GET /products/:idOrSlug`, `GET /products/sellers/:id`, `POST /products` (seller), `PATCH /products/:id` (owner), `DELETE /products/:id` (owner/admin) |
| **Categories** | `GET /categories`, `GET /categories/:idOrSlug`, `POST/PATCH/DELETE /categories` (admin) |
| **Cart** | `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:productId`, `DELETE /cart/items/:productId`, `DELETE /cart` |
| **Wishlist** | `GET /wishlist`, `POST /wishlist/items`, `DELETE /wishlist/items/:productId`, `POST /wishlist/items/:productId/move-to-cart` |
| **Addresses** | `GET /addresses`, `POST /addresses`, `PATCH /addresses/:id`, `PATCH /addresses/:id/default`, `DELETE /addresses/:id` |
| **Orders** | `GET /orders/checkout-summary`, `POST /orders`, `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/cancel` |
| **Payments** | `GET /payments/config`, `GET /payments`, `POST /payments/confirm`, `POST /payments/test-pay`, `POST /payments/webhook` |
| **Reviews** | `GET /reviews/product/:productId`, `GET /reviews/product/:productId/eligibility`, `POST /reviews`, `PATCH /reviews/:id`, `DELETE /reviews/:id` |
| **Seller** | `GET /seller/dashboard`, `GET /seller/products`, `GET /seller/orders`, `GET /seller/orders/:id`, `PATCH /seller/orders/:id/items/:itemId/status`, `PATCH /seller/store` |
| **Admin** | `GET /admin/dashboard`, `GET /admin/users`, `GET /admin/users/:id`, `PATCH /admin/users/:id/status`, `PATCH /admin/users/:id/role`, `PATCH /admin/sellers/:id/status`, `DELETE /admin/users/:id`, `GET /admin/products`, `GET /admin/products/low-stock`, `GET /admin/orders`, `GET /admin/orders/:id`, `PATCH /admin/orders/:id/cancel`, `PATCH /admin/orders/:id/items/:itemId/status` |
| **Health** | `GET /api/health` |

Every endpoint talks to MongoDB — there are no mocked responses anywhere in the project.

---

## 8. Environment setup

Copy the examples and fill in your own values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**backend/.env**

```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/trendora
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
CURRENCY=usd
TAX_RATE=0.08
SHIPPING_FLAT=6.99
FREE_SHIPPING_THRESHOLD=75
LOW_STOCK_THRESHOLD=5
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
SEED_PASSWORD=Trendora@123
```

`JWT_SECRET` and `MONGO_URI` are required. local image storage and Stripe keys are optional for local
development: without them, image upload returns a clear configuration error and card payments run
in a clearly-labelled simulated mode. No real secrets are committed to the repository.

**frontend/.env**

```
VITE_API_URL=/api
VITE_STRIPE_PUBLISHABLE_KEY=
```

---

## 9. MongoDB setup

**Option A — local MongoDB**
1. Install MongoDB Community Server and start the service (`mongod`).
2. Keep `MONGO_URI=mongodb://127.0.0.1:27017/trendora`. The database is created automatically.

**Option B — MongoDB Atlas (free tier)**
1. Create a free cluster, add a database user, and allow your IP in Network Access.
2. Copy the connection string and set it as `MONGO_URI`, ending with `/trendora`.

Verify the API can reach the database by opening `http://localhost:5000/api/health`.

---

## 10. local image storage setup

1. Create a free local image storage account.
2. From the dashboard copy **Cloud name**, **API key** and **API secret**.
3. Put them in `backend/.env` as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
   `CLOUDINARY_API_SECRET`.
4. Product images uploaded by sellers are streamed to the `trendora/products` folder; only the
   secure URL and `publicId` are stored in MongoDB, and deleting an image also deletes it in
   local image storage. The API secret never leaves the server.

If the variables are missing, product creation with files responds with HTTP 503 and an explicit
message describing exactly which variables to configure.

---

## 11. Stripe test setup

1. Create a Stripe account and stay in **Test mode**.
2. Copy the test **Secret key** (`sk_test_...`) into `STRIPE_SECRET_KEY` and the test
   **Publishable key** (`pk_test_...`) into `STRIPE_PUBLISHABLE_KEY` (backend) and
   `VITE_STRIPE_PUBLISHABLE_KEY` (frontend).
3. Optional: for webhooks run the Stripe CLI and forward events to
   `http://localhost:5000/api/payments/webhook`, then copy the signing secret into
   `STRIPE_WEBHOOK_SECRET`.
4. Checkout creates a PaymentIntent server-side for the **server-computed amount**, and the order is
   only marked paid after the intent succeeds. The secret key is used exclusively on the backend.

Without Stripe keys the checkout page clearly states that payments are simulated, and you can still
test both the success and the failure path.

---

## 12. Installation

```bash
# from the trendora/ folder
npm run install:all
```

or install each app separately:

```bash
cd backend && npm install
cd ../frontend && npm install
```

---

## 13. Running the frontend

```bash
cd frontend
npm run dev
```

Opens `http://localhost:5173`. Vite proxies `/api` to `http://localhost:5000`, so no CORS headaches
in development. Production build: `npm run build`, preview with `npm run preview`.

---

## 14. Running the backend

```bash
cd backend
npm run dev      # nodemon
# or
npm start        # node src/server.js
```

API runs on `http://localhost:5000` with health check `GET /api/health`.

---

## 15. Seed data

```bash
cd backend
npm run seed
```

The seed script wipes the Trendora collections and recreates:
- 1 admin, 4 sellers (one intentionally left **pending approval**), 3 customers
- 6 categories (Electronics, Fashion, Home & Kitchen, Beauty & Health, Sports & Outdoors,
  Books & Stationery)
- 37 realistic products with specifications, discounts, stock levels (including deliberate
  low-stock items) and remote placeholder images
- Reviews across products (which recalculate rating averages) and sample paid/processing/delivered
  orders so both dashboards have real numbers on first run

---

## 16. Demo accounts

All seeded accounts use the password from `SEED_PASSWORD` (default `Trendora@123`).

| Role | Email | Notes |
|---|---|---|
| Admin | `admin@trendora.dev` | Sign in at `/admin/login` |
| Seller | `seller@trendora.dev` | NovaTech Store (approved) |
| Seller | `seller2@trendora.dev` | Urban Thread (approved) |
| Seller | `seller3@trendora.dev` | HomeCraft Living (approved) |
| Seller | `seller4@trendora.dev` | PureGlow Wellness (**pending** — use it to test approval) |
| Customer | `customer@trendora.dev` | Has orders + reviews |
| Customer | `customer2@trendora.dev` | |
| Customer | `customer3@trendora.dev` | |

Seller portal: `/seller/login`. Customer portal: `/login`.

---

## 17. Testing

```bash
cd backend
npm test
```

Jest + Supertest run against an in-memory MongoDB instance (no external database needed). Covered
behaviour:
- registration validation, duplicate email rejection, password hashing (never returned)
- login success/failure and `GET /auth/me`
- protected route rejection without/with an invalid token
- role authorization (customer blocked from seller and admin routes)
- product create/update/delete happy paths
- **product ownership**: seller B cannot update or delete seller A's product
- cart add/update/remove and stock-limit validation
- order creation: server-side totals, stock decrement, cart clearing, empty-cart rejection

---

## 18. Deployment

**Backend (Render / Railway / any Node host)**
1. Root directory `backend`, build `npm install`, start `npm start`.
2. Set all backend environment variables; `CLIENT_URL` must be your deployed frontend origin.
3. Use MongoDB Atlas for `MONGO_URI`.

**Frontend (Vercel / Netlify)**
1. Root directory `frontend`, build `npm run build`, output `dist`.
2. Set `VITE_API_URL` to your deployed API base, e.g. `https://your-api.onrender.com/api`.
3. Add a SPA rewrite so all routes fall back to `index.html`.

**Checklist:** `NODE_ENV=production`, fresh long `JWT_SECRET`, live-vs-test Stripe keys chosen
deliberately, Atlas network access configured, and `npm run seed` executed once if you want demo
data in the deployed environment.

---

## 19. Security

- **Passwords**: bcrypt (10 salt rounds), `select: false`, never serialized in responses.
- **JWT**: signed with `JWT_SECRET`, expiry from env, verified on every protected request; the user
  is re-fetched from MongoDB so deactivated accounts lose access immediately.
- **Authorization**: `authorize(...roles)` for role gates plus explicit ownership checks in services
  (a seller's product/order queries are always filtered by `seller: req.user._id`).
- **Never trusting the client**: prices, discounts, tax, shipping and totals are always recomputed
  from database documents; the client only sends product ids, quantities, an address id and a
  payment method. User ids and roles come from the verified token, never from the request body.
- **Validation**: zod schemas on body/query/params, with Mongoose schema validation as a second layer.
- **Transport & headers**: helmet, CORS restricted to `CLIENT_URL`, hpp, `express-mongo-sanitize`
  against operator injection, compression, request logging.
- **Rate limiting**: global limiter plus a stricter limiter on authentication routes.
- **Uploads**: multer memory storage, MIME allow-list, size cap, max image count.
- **Errors**: `ApiError` + central handler return safe messages; stack traces only in development.
- **Secrets**: only in `.env` files (git-ignored); `.env.example` documents them with empty values.

---

## 20. Future improvements

- Refresh-token rotation with httpOnly cookies
- Email notifications (order confirmation, seller approval) via a transactional provider
- Coupons/promotions engine and multi-currency pricing
- Product Q&A, review images and helpfulness voting
- Full-text search with Atlas Search or Elasticsearch, plus faceted counts
- Seller payouts ledger and shipment tracking integration
- MongoDB transactions for multi-document order writes on a replica set
- CI pipeline (lint + tests) and frontend component tests

---

## How to explain this project in an interview

**Architecture.** "Trendora is a MERN monolith with clear layers. React (Vite) is the client;
Express exposes a REST API under `/api`; Mongoose talks to MongoDB. On the server each request
passes through auth → authorization → zod validation → a thin controller → a service that owns the
business rules → the model. Responses are normalized to `{ success, message, data, meta }` and all
errors funnel through one error handler."

**Authentication.** "Users register with bcrypt-hashed passwords. Login returns a signed JWT that
the React app stores and sends as a Bearer token. The `protect` middleware verifies the token and
re-loads the user from MongoDB, so a deactivated user is locked out instantly. Persistent login is
just re-validating the stored token on app start via `GET /auth/me`."

**JWT vs sessions.** "JWT keeps the API stateless and easy to scale horizontally; the trade-off is
revocation, which I mitigate by re-fetching the user on every request and by short-ish expiry. A
production next step would be refresh tokens in httpOnly cookies."

**MongoDB & Mongoose.** "Nine collections with references instead of duplication: Product
references seller and category; Cart/Wishlist are one document per user; Order stores item
snapshots (title, unit price) because product prices change over time. I use indexes for the query
patterns I actually run — a text index for search, category+price, seller, slug uniqueness, and a
compound unique index on (product, user) in Review to make duplicate reviews impossible at the
database level."

**API design.** "Resource-oriented routes with correct verbs and status codes: GET for reads, POST
to create, PATCH for partial updates, DELETE to remove, 201 on creation, 400 for validation, 401
vs 403 for authentication vs authorization, 404, 409 for conflicts like duplicate email."

**Authorization.** "Three roles. `authorize('seller')` gates the seller routes, but role checks
alone aren't enough, so services also apply ownership filters. Seller product queries include
`seller: req.user._id`, and updating a product loads it and compares owners before writing — that's
how a seller can never touch another seller's catalogue."

**Cart.** "The cart lives in MongoDB, one document per user, storing only product ids and
quantities. Totals are computed on read from current product prices, so a stale client can't lock
in an old price and the cart survives logout and device changes."

**Order lifecycle.** "Order creation is a strict server-side sequence: load the cart from the
database, verify every product still exists and is active, verify stock, read current prices,
compute subtotal → discount → tax → shipping → total, create a Payment record, create the order in
`pending_payment`, confirm the payment, and only then decrement stock and clear the cart. If
payment fails the order is marked `payment_failed`, stock is untouched and the customer can retry.
Cancellation restores stock and flags paid orders for refund. Every transition is appended to
`statusHistory`."

**Payment.** "Stripe test mode. The backend creates a PaymentIntent for the amount it computed
itself and stores the intent id on a Payment document linked to the order and the user. The secret
key stays server-side; only the publishable key reaches the browser. I handle initiation, success,
failure and cancellation, and there's a webhook endpoint for asynchronous confirmation."

**Search, filtering, sorting, pagination.** "All server-side. `GET /products` accepts `q`,
`category`, `brand`, `minPrice`, `maxPrice`, `rating`, `inStock`, `sort` and `page`/`limit`, builds
a Mongo filter, and returns `meta` with page, limit, total, totalPages and next/prev flags. React
just mirrors the query string into the URL — it never downloads the catalogue to filter locally.
There's also a facets endpoint that returns available brands and the price range for the sidebar."

**Seller isolation and admin authorization.** "Sellers see dashboards aggregated from only their own
order items, using a Mongo aggregation pipeline that unwinds items and matches their seller id.
Admins are the only role that can approve stores, change roles, moderate products and cancel any
order; every admin route is behind `authorize('admin')`."

**Security decisions.** "bcrypt hashing, JWT verification, role plus ownership checks, zod
validation on every input, helmet, CORS restricted to the client origin, mongo-sanitize against
operator injection, hpp, rate limiting (stricter on auth), upload MIME/size limits, safe error
messages with stack traces only in development, and — the one I'm proudest of — never trusting
client-supplied prices, totals, user ids or roles."

**What I'd do next.** "Refresh tokens, transactions on a replica set for the order write, email
notifications, and Atlas Search for faceted search at scale."

---

## 21. Professional polish pass (what the marketplace now includes)

This release upgraded Trendora from a working CRUD marketplace into a production-style
shopping experience. Everything below is backed by real endpoints and real data - no mock
responses, no placeholder screens.

### Storefront

- **Marketplace header** - brand, full-width search, category strip generated from the
  `categories` collection, wishlist and cart counters, account menu and a "Sell on Trendora"
  entry point, all collapsing into a mobile drawer.
- **Search suggestions** - `GET /api/products/suggestions?q=` returns matching products,
  categories and stores. Requests are debounced (300 ms) and skipped for fewer than two
  characters. Recent searches are stored locally and can be cleared.
- **Homepage** - hero with primary/secondary CTAs and category tiles, category cards,
  and six data-driven rails: Trending now, Today's deals, Best sellers, Top rated,
  New arrivals and Recommended for you (built from the last category you browsed).
  A trust strip and a full footer close the page. Recently viewed products appear once
  you have opened a product.
- **Listing page** - server-side search, category, price range, rating, **seller**,
  **discount** and availability filters, seven sort modes (including Relevance and
  Highest discount), pagination, live product count, removable filter chips,
  grid/list view toggle and a slide-in filter drawer on tablet/mobile.
- **Product page** - gallery, rating breakdown, stock indicators, quantity selector,
  Add to cart, **Buy now**, wishlist, verified-seller panel with store rating and product
  count, computed delivery window, return policy, secure-checkout note, specifications,
  reviews (only purchasers can post), related products and a **Frequently bought together**
  bundle built from the best-selling products in the same category.

### Cart, coupons and checkout

- **Cart** - seller per line, quantity controls, remove, **Save for later** shelf,
  wishlist shortcut, per-item discount badges, server-calculated subtotal, discounts,
  tax, shipping and total, plus a confirmation dialog before clearing.
- **Coupons** - validated entirely on the server (`POST /api/cart/coupon`, and again when
  the order is created). Built-in test coupons:
  | Code | Effect | Condition |
  | --- | --- | --- |
  | `TRENDORA10` | 10% off (max 40) | Subtotal >= 50 |
  | `WELCOME5` | 5 flat off | Subtotal >= 25 |
  | `FREESHIP` | Free shipping | Any cart |
- **Multi-step checkout** - Address -> Delivery -> Review -> Payment -> Confirmation with a
  persistent order summary. The client only ever sends an address id, a payment method and
  an optional coupon code; prices, discounts, tax, shipping and stock are recalculated and
  re-validated by the server before the order is written.

### Account, seller and admin

- **Account shell** - a shared sub-navigation (Profile, Orders, Wishlist, Addresses,
  Security) across every account page, an identity card, and an account-settings block
  with session, address and seller actions.
- **Seller dashboard** - now also reports **unique customers**, **average rating** and
  **review count** next to revenue, orders, units sold, catalogue size, pending orders and
  low stock, alongside sales/orders charts, best sellers and recent orders.
- **Admin console** - platform KPIs, revenue/orders/users/category charts, top products and
  sellers, low-stock watchlist and recent order activity, plus user, seller, product,
  category and order management.

### Polish details

Breadcrumbs, back-to-top button, discount and stock badges, verified-seller badge,
rating stars, delivery estimates, secure-checkout indicators, skeleton loaders,
empty states with actions, retry-able error states ("Unable to load products. Please try
again."), toasts for every mutation, disabled buttons while submitting and confirmation
dialogs for destructive actions.

### New API surface added in this pass

```
GET    /api/products/suggestions?q=              # product / category / seller suggestions
GET    /api/products?minDiscount=&seller=&sort=relevance
GET    /api/products/facets/filters              # brands, price bounds, sellers + counts
POST   /api/cart/items/:productId/save-for-later
POST   /api/cart/saved/:productId/move-to-cart
DELETE /api/cart/saved/:productId
POST   /api/cart/coupon                          # { code }
GET    /api/cart?coupon=CODE
GET    /api/orders/checkout-summary?coupon=CODE
POST   /api/orders                               # { addressId, paymentMethod, couponCode? }
```

## Safe setup and sharing

1. Copy `backend/.env.example` to `backend/.env` and set your own local values. Never commit or share `.env` files.
2. Use a unique, randomly generated `JWT_SECRET` (at least 32 characters) and a unique `SEED_PASSWORD`. Do not reuse example values.
3. Install dependencies from the lockfiles with `npm ci` in `backend/` and `frontend/`. `node_modules/` is intentionally excluded from source archives.
4. Run backend tests with `npm test` from `backend/`, and build the frontend with `npm run build` from `frontend/`.
5. If a real secret was ever included in a shared ZIP or repository, rotate it in the relevant provider/dashboard; deleting the file alone does not revoke it.

---
---

## Application Screenshots

> Add your own screenshots to the `screenshots/` folder using the filenames below. Once you add the images, they will display automatically in this README on GitHub.

### 1. Homepage

![Trendora Homepage](screenshots/01-homepage.png)

### 2. Product Listing

![Trendora Product Listing](screenshots/02-products.png)

### 3. Product Details

![Trendora Product Details](screenshots/03-product-details.png)

### 4. Cart and Checkout

![Trendora Cart and Checkout](screenshots/04-cart-checkout.png)

### 5. Seller Dashboard

![Trendora Seller Dashboard](screenshots/05-seller-dashboard.png)

### 6. Admin Dashboard

![Trendora Admin Dashboard](screenshots/06-admin-dashboard.png)
