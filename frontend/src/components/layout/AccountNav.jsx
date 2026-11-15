import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/profile', label: 'Profile', icon: '\u{1F464}' },
  { to: '/orders', label: 'Orders', icon: '\u{1F9FE}' },
  { to: '/wishlist', label: 'Wishlist', icon: '\u2661' },
  { to: '/addresses', label: 'Addresses', icon: '\u{1F4CD}' },
  { to: '/profile#security', label: 'Security', icon: '\u{1F512}' },
]

/** Shared sub-navigation so every account page feels like one dashboard. */
export default function AccountNav({ title, subtitle }) {
  return (
    <div className="account-head">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      <nav className="account-nav" aria-label="Account sections">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/profile'}
            className={({ isActive }) => `account-nav__link ${isActive ? 'is-active' : ''}`}
          >
            <span aria-hidden="true">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
