import { Link } from 'react-router-dom'
import useDocumentTitle from '../hooks/useDocumentTitle.js'

export default function NotFound() {
  useDocumentTitle('Page not found')

  return (
    <div className="container section state-block">
      <div className="state-block__icon" aria-hidden="true">
        404
      </div>
      <h3>We could not find that page</h3>
      <p>The link may be broken or the product may no longer be listed.</p>
      <Link className="btn btn--primary" to="/products">
        Continue shopping
      </Link>
    </div>
  )
}
