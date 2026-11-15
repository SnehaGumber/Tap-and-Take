import { Link, useNavigate } from 'react-router-dom'
import Rating from '../common/Rating.jsx'
import { formatCurrency, truncate } from '../../utils/format.js'
import { PLACEHOLDER_IMAGE } from '../../utils/constants.js'
import { useCart } from '../../context/CartContext.jsx'
import { useWishlist } from '../../context/WishlistContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

export default function ProductCard({ product, view = 'grid' }) {
  const { addToCart, loading } = useCart()
  const { toggle, isWishlisted } = useWishlist()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const finalPrice = product.finalPrice ?? product.price
  const outOfStock = product.stock <= 0
  const lowStock = !outOfStock && product.stock <= 5
  const wishlisted = isWishlisted(product._id)
  const href = `/products/${product.slug || product._id}`
  const sellerName = product.seller?.store?.name || product.seller?.name

  const requireLogin = () => navigate('/login', { state: { from: href } })

  return (
    <article className={`product-card ${view === 'list' ? 'product-card--list' : ''}`}>
      <Link className="product-card__media" to={href}>
        <img
          src={product.images?.[0]?.url || product.image || PLACEHOLDER_IMAGE}
          alt={product.title}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = PLACEHOLDER_IMAGE
          }}
        />
        {product.discountPercent > 0 ? (
          <span className="product-card__discount">-{product.discountPercent}%</span>
        ) : null}
        {outOfStock ? <span className="product-card__stock">Out of stock</span> : null}
      </Link>

      <button
        type="button"
        className={`product-card__wish ${wishlisted ? 'is-active' : ''}`}
        onClick={() => (isAuthenticated ? toggle(product._id) : requireLogin())}
        aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
      >
        {wishlisted ? '\u2665' : '\u2661'}
      </button>

      <div className="product-card__body">
        <span className="product-card__brand">{product.brand}</span>
        <Link className="product-card__title" to={href}>
          {truncate(product.title, view === 'list' ? 120 : 62)}
        </Link>
        {sellerName ? (
          <span className="product-card__seller">
            Sold by <strong>{sellerName}</strong>
          </span>
        ) : null}
        <Rating value={product.ratingAverage || 0} count={product.ratingCount || 0} />
        {view === 'list' && product.description ? (
          <p className="product-card__excerpt">{truncate(product.description, 220)}</p>
        ) : null}
        <div className="product-card__price">
          <strong>{formatCurrency(finalPrice)}</strong>
          {product.discountPercent > 0 ? <s>{formatCurrency(product.price)}</s> : null}
          {product.discountPercent > 0 ? (
            <span className="product-card__save">Save {formatCurrency(product.price - finalPrice)}</span>
          ) : null}
        </div>
        {outOfStock ? (
          <span className="stock-flag stock-flag--out">Currently unavailable</span>
        ) : lowStock ? (
          <span className="stock-flag stock-flag--low">Only {product.stock} left</span>
        ) : (
          <span className="stock-flag stock-flag--in">In stock</span>
        )}
        <div className="product-card__actions">
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={outOfStock || loading}
            onClick={() => (isAuthenticated ? addToCart(product._id, 1) : requireLogin())}
          >
            {outOfStock ? 'Unavailable' : 'Add to cart'}
          </button>
          {view === 'list' ? (
            <Link className="btn btn--ghost btn--block" to={href}>
              View details
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  )
}
