import { Link, Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <div className="auth-shell__aside">
        <Link to="/" className="brand brand--light">
          <span className="brand__mark" aria-hidden="true">
            T
          </span>
          <span className="brand__text">Tap & Take</span>
        </Link>
        <h2>Shop smarter on a marketplace built for everyone.</h2>
        <ul>
          <li>Thousands of products from verified sellers</li>
          <li>Secure JWT protected accounts</li>
          <li>Real-time stock and server-side pricing</li>
          <li>Stripe test-mode checkout</li>
        </ul>
      </div>
      <div className="auth-shell__main">
        <Outlet />
      </div>
    </div>
  )
}
