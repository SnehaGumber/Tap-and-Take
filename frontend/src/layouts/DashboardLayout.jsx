import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { initials } from '../utils/format.js'

export default function DashboardLayout({ variant = 'seller', links = [] }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const onLogout = async () => {
    await logout()
    navigate(variant === 'admin' ? '/admin/login' : '/seller/login')
  }

  return (
    <div className={`dash dash--${variant}`}>
      <aside className={`dash__sidebar ${open ? 'is-open' : ''}`}>
        <Link to="/" className="brand brand--light dash__brand">
          <span className="brand__mark" aria-hidden="true">
            T
          </span>
          <span className="brand__text">
            Trendora <small>{variant === 'admin' ? 'Admin' : 'Seller'}</small>
          </span>
        </Link>

        <nav className="dash__nav" onClick={() => setOpen(false)}>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              <span aria-hidden="true">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="dash__user">
          <span className="avatar">{initials(user?.name || 'T')}</span>
          <div>
            <strong>{user?.name}</strong>
            <small>{user?.email}</small>
          </div>
        </div>
        <button type="button" className="btn btn--ghost btn--block" onClick={onLogout}>
          Sign out
        </button>
      </aside>

      <div className="dash__content">
        <header className="dash__topbar">
          <button
            type="button"
            className="navbar__burger navbar__burger--dark"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle sidebar"
          >
            <span />
            <span />
            <span />
          </button>
          <Link to="/" className="link-btn">
            View storefront
          </Link>
        </header>
        <div className="dash__body">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
