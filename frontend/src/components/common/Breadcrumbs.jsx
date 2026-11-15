import { Link } from 'react-router-dom'

/** items: [{ label, to }] - the last item renders as the current page. */
export default function Breadcrumbs({ items = [] }) {
  if (!items.length) return null
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={`${item.label}-${index}`} className="breadcrumbs__item">
            {isLast || !item.to ? (
              <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
            ) : (
              <Link to={item.to}>{item.label}</Link>
            )}
            {isLast ? null : <span className="breadcrumbs__sep">/</span>}
          </span>
        )
      })}
    </nav>
  )
}
