import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import SearchBar from '../product/SearchBar.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { useWishlist } from '../../context/WishlistContext.jsx'
import useAsync from '../../hooks/useAsync.js'
import { fetchCategories } from '../../services/productService.js'
import { initials } from '../../utils/format.js'
import { CATEGORY_ICONS } from '../../utils/constants.js'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const { itemCount } = useCart()
  const { count: wishCount } = useWishlist()
  const [menuOpen, setMenuOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const categories = useAsync(() => fetchCategories(), [])

  // Close the mobile drawer and account menu whenever the route changes.
  useEffect(() => {
    setNavOpen(false)
    setMenuOpen(false)
  }, [location.pathname, location.search])

  const onLogout = async () => {
    await logout()
    setMenuOpen(false)
    navigate('/')
  }

  const categoryList = (categories.data?.categories || []).slice(0, 7)

  return (
    <header className="navbar">
      <div className="navbar__top container">
        <Link to="/" className="brand" aria-label="Tap & Take home">
          <span className="brand__mark" aria-hidden="true">
            T
          </span>
          <span className="brand__text">Tap & Take</span>
        </Link>

        <div className="navbar__search">
          <SearchBar />
        </div>

        <button
          type="button"
          className="navbar__burger"
          onClick={() => setNavOpen((open) => !open)}
          aria-label="Toggle navigation"
          aria-expanded={navOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`navbar__links ${navOpen ? 'is-open' : ''}`}>
          <div className="navbar__search navbar__search--mobile">
            <SearchBar />
          </div>

          <NavLink to="/products" className="navbar__link">
            Shop
          </NavLink>
          <NavLink to="/products?sort=discount" className="navbar__link">
            Deals
          </NavLink>
          <NavLink to="/wishlist" className="navbar__icon-link">
            <span aria-hidden="true">{'\u2661'}</span>
            Wishlist
            {wishCount > 0 ? <span className="pill">{wishCount}</span> : null}
          </NavLink>
          <NavLink to="/cart" className="navbar__icon-link">
            <span aria-hidden="true">{'\u{1F6D2}'}</span>
            Cart
            {itemCount > 0 ? <span className="pill">{itemCount}</span> : null}
          </NavLink>

          {isAuthenticated ? (
            <div className="navbar__account">
              <button
                type="button"
                className="avatar-btn"
                onClick={(event) => {
                  event.stopPropagation()
                  setMenuOpen((open) => !open)
                }}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="avatar">{initials(user.name)}</span>
                <span className="avatar-btn__name">{user.name.split(' ')[0]}</span>
              </button>
              {menuOpen ? (
                <div className="menu" role="menu">
                  <span className="menu__label">Signed in as {user.email}</span>
                  <Link to="/profile" role="menuitem" onClick={() => setMenuOpen(false)}>
                    My account
                  </Link>
                  <Link to="/orders" role="menuitem" onClick={() => setMenuOpen(false)}>
                    My orders
                  </Link>
                  <Link to="/wishlist" role="menuitem" onClick={() => setMenuOpen(false)}>
                    Wishlist
                  </Link>
                  <Link to="/addresses" role="menuitem" onClick={() => setMenuOpen(false)}>
                    Addresses
                  </Link>
                  {user.role === 'seller' ? (
                    <Link to="/seller/dashboard" role="menuitem" onClick={() => setMenuOpen(false)}>
                      Seller dashboard
                    </Link>
                  ) : null}
                  {user.role === 'admin' ? (
                    <Link to="/admin/dashboard" role="menuitem" onClick={() => setMenuOpen(false)}>
                      Admin console
                    </Link>
                  ) : null}
                  <button type="button" onClick={onLogout} role="menuitem">
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="navbar__auth">
              <Link to="/login" className="btn btn--ghost btn--sm">
                Sign in
              </Link>
              <Link to="/register" className="btn btn--primary btn--sm">
                Create account
              </Link>
            </div>
          )}

          {user?.role === 'seller' ? null : (
            <Link to="/register?role=seller" className="navbar__seller">
              Sell on Tap & Take
            </Link>
          )}
        </nav>
      </div>

      <div className="navbar__categories">
        <div className="container navbar__categories-inner">
          <Link to="/products" className="cat-link">
            All products
          </Link>
          {categoryList.map((category) => (
            <Link key={category._id} to={`/products?category=${category._id}`} className="cat-link">
              <span aria-hidden="true">{CATEGORY_ICONS[category.slug] || '\u2022'}</span>
              {category.name}
            </Link>
          ))}
          <Link to="/products?sort=rating" className="cat-link cat-link--muted">
            Top rated
          </Link>
        </div>
      </div>
    </header>
  )
}
