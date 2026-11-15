import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <div className="brand brand--light">
            <span className="brand__mark" aria-hidden="true">
              T
            </span>
            <span className="brand__text">Trendora</span>
          </div>
          <p className="footer__about">
            Trendora is a multi-vendor marketplace built on the MERN stack. Verified sellers,
            server-verified pricing and a secure Stripe test checkout.
          </p>
          <div className="footer__social" aria-label="Trendora social profiles">
            <span className="footer__social-btn" title="Trendora on X" aria-hidden="true">
              X
            </span>
            <span className="footer__social-btn" title="Trendora on Instagram" aria-hidden="true">
              in
            </span>
            <span className="footer__social-btn" title="Trendora on LinkedIn" aria-hidden="true">
              Li
            </span>
            <span className="footer__social-btn" title="Trendora on GitHub" aria-hidden="true">
              Gh
            </span>
          </div>
        </div>

        <div>
          <h4>Shop</h4>
          <Link to="/products">All products</Link>
          <Link to="/products?sort=discount">Today&apos;s deals</Link>
          <Link to="/products?sort=popular">Best sellers</Link>
          <Link to="/products?sort=rating">Top rated</Link>
          <Link to="/products?sort=newest">New arrivals</Link>
        </div>

        <div>
          <h4>Customer support</h4>
          <Link to="/orders">Track an order</Link>
          <Link to="/orders">Returns &amp; refunds</Link>
          <Link to="/cart">Shipping information</Link>
          <Link to="/products">Buyer protection</Link>
        </div>

        <div>
          <h4>Account</h4>
          <Link to="/profile">My account</Link>
          <Link to="/orders">My orders</Link>
          <Link to="/wishlist">Wishlist</Link>
          <Link to="/addresses">Addresses</Link>
        </div>

        <div>
          <h4>Seller centre</h4>
          <Link to="/register?role=seller">Become a seller</Link>
          <Link to="/seller/login">Seller sign in</Link>
          <Link to="/seller/dashboard">Seller dashboard</Link>
          <Link to="/admin/login">Admin console</Link>
        </div>
      </div>

      <div className="container footer__meta">
        <div>
          <h4>About Trendora</h4>
          <p className="muted">
            A portfolio-grade marketplace: React + Vite on the front end, Node.js, Express and
            MongoDB on the back end, with JWT authentication and role-based access for customers,
            sellers and admins.
          </p>
        </div>
        <div>
          <h4>Policies</h4>
          <p className="muted">
            Prices, stock and totals are validated on the server for every order. Returns are
            accepted within 7 days of delivery. Payments run in Stripe test mode only.
          </p>
        </div>
        <div>
          <h4>Contact</h4>
          <p className="muted">
            support@trendora.dev
            <br />
            Seller onboarding: sellers@trendora.dev
            <br />
            Mon-Sat, 9:00-18:00
          </p>
        </div>
      </div>

      <div className="footer__bar">
        <span>&copy; {new Date().getFullYear()} Trendora. Built as a full-stack portfolio project.</span>
        <span>Payments run in Stripe test mode - no real money is charged.</span>
      </div>
    </footer>
  )
}
