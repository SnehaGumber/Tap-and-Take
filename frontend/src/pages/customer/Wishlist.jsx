import { Link } from 'react-router-dom'
import { useWishlist } from '../../context/WishlistContext.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx'
import Rating from '../../components/common/Rating.jsx'
import AccountNav from '../../components/layout/AccountNav.jsx'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { formatCurrency } from '../../utils/format.js'
import { PLACEHOLDER_IMAGE } from '../../utils/constants.js'

export default function Wishlist() {
  useDocumentTitle('Wishlist')
  const { wishlist, loading, toggle, moveToCart } = useWishlist()
  const items = wishlist.items || []

  if (loading && !items.length) return <LoadingSpinner label="Loading your wishlist" />

  return (
    <div className="container section">
      <AccountNav
        title="Your wishlist"
        subtitle={items.length ? `${items.length} saved item(s)` : 'Save products to buy them later'}
      />

      {!items.length ? (
        <EmptyState
          icon={'\u2661'}
          title="Your wishlist is empty"
          message="Tap the heart on any product to save it here. Wishlisted items are stored against your account, so they follow you to any device."
          actionLabel="Browse products"
          actionTo="/products"
        />
      ) : (
        <div className="wishlist">
          {items.map((item) => {
            const product = item.product
            if (!product) return null
            const price = product.finalPrice ?? product.price
            const outOfStock = product.stock <= 0
            return (
              <article className="wish-item" key={product._id}>
                <Link to={`/products/${product.slug || product._id}`} className="wish-item__media">
                  <img
                    src={product.images?.[0]?.url || PLACEHOLDER_IMAGE}
                    alt={product.title}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.src = PLACEHOLDER_IMAGE
                    }}
                  />
                </Link>
                <div className="wish-item__body">
                  <span className="muted">{product.brand}</span>
                  <Link to={`/products/${product.slug || product._id}`}>
                    <strong>{product.title}</strong>
                  </Link>
                  <Rating value={product.ratingAverage || 0} count={product.ratingCount || 0} />
                  <div className="wish-item__price">
                    <strong>{formatCurrency(price)}</strong>
                    {product.discountPercent > 0 ? (
                      <>
                        <s>{formatCurrency(product.price)}</s>
                        <span className="badge badge--success">-{product.discountPercent}%</span>
                      </>
                    ) : null}
                  </div>
                  {outOfStock ? (
                    <span className="stock-flag stock-flag--out">Out of stock</span>
                  ) : product.stock <= 5 ? (
                    <span className="stock-flag stock-flag--low">Only {product.stock} left</span>
                  ) : (
                    <span className="stock-flag stock-flag--in">In stock</span>
                  )}
                </div>
                <div className="wish-item__actions">
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={outOfStock}
                    onClick={() => moveToCart(product._id, 1)}
                  >
                    Move to cart
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => toggle(product._id)}>
                    Remove
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
