import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useWishlist } from '../../context/WishlistContext.jsx'
import QuantitySelector from '../../components/common/QuantitySelector.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { formatCurrency } from '../../utils/format.js'
import { PLACEHOLDER_IMAGE } from '../../utils/constants.js'

export default function Cart() {
  useDocumentTitle('Your cart')
  const { cart, loading, updateQuantity, removeFromCart, clearCart } = useCart()
  const { isAuthenticated } = useAuth()
  const { toggle } = useWishlist()
  const navigate = useNavigate()

  if (!isAuthenticated) {
    return (
      <div className="container section">
        <EmptyState
          icon={'\u{1F512}'}
          title="Sign in to view your cart"
          message="Your cart is stored securely against your account, so it is available on any device."
          actionLabel="Sign in"
          actionTo="/login"
        />
      </div>
    )
  }

  if (loading && !cart.items.length) return <LoadingSpinner label="Loading your cart" />

  if (!cart.items.length) {
    return (
      <div className="container section">
        <EmptyState
          icon={'\u{1F6D2}'}
          title="Your cart is empty"
          message="Browse the catalogue and add products you love."
          actionLabel="Start shopping"
          actionTo="/products"
        />
      </div>
    )
  }

  const { totals } = cart

  return (
    <div className="container section">
      <div className="listing__head">
        <div>
          <h1>Your cart</h1>
          <p className="muted">{cart.itemCount} item(s) - prices verified on the server</p>
        </div>
        <button type="button" className="link-btn" onClick={clearCart}>
          Clear cart
        </button>
      </div>

      <div className="cart">
        <div className="cart__items">
          {cart.items.map((item) => (
            <article className="cart-item" key={item.product._id}>
              <Link to={`/products/${item.product.slug || item.product._id}`} className="cart-item__media">
                <img
                  src={item.product.image || PLACEHOLDER_IMAGE}
                  alt={item.product.title}
                  onError={(event) => {
                    event.currentTarget.src = PLACEHOLDER_IMAGE
                  }}
                />
              </Link>
              <div className="cart-item__body">
                <span className="muted">{item.product.brand}</span>
                <Link to={`/products/${item.product.slug || item.product._id}`}>
                  <strong>{item.product.title}</strong>
                </Link>
                <span className="muted">
                  Sold by {item.product.seller?.store?.name || item.product.seller?.name || 'Tap & Take seller'}
                </span>
                {!item.inStock ? <span className="badge badge--danger">Out of stock</span> : null}
                <div className="cart-item__controls">
                  <QuantitySelector
                    value={item.quantity}
                    max={Math.max(1, Math.min(20, item.product.stock))}
                    onChange={(value) => updateQuantity(item.product._id, value)}
                    disabled={!item.inStock}
                  />
                  <button type="button" className="link-btn" onClick={() => removeFromCart(item.product._id)}>
                    Remove
                  </button>
                  <button type="button" className="link-btn" onClick={() => toggle(item.product._id)}>
                    Save for later
                  </button>
                </div>
              </div>
              <div className="cart-item__price">
                <strong>{formatCurrency(item.lineTotal, totals.currency)}</strong>
                <span className="muted">{formatCurrency(item.unitPrice, totals.currency)} each</span>
              </div>
            </article>
          ))}
        </div>

        <aside className="summary">
          <h2>Order summary</h2>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatCurrency(totals.subtotal, totals.currency)}</dd>
            </div>
            <div>
              <dt>Discount saved</dt>
              <dd className="is-positive">-{formatCurrency(totals.discount, totals.currency)}</dd>
            </div>
            <div>
              <dt>Estimated tax</dt>
              <dd>{formatCurrency(totals.tax, totals.currency)}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>{totals.shipping === 0 ? 'Free' : formatCurrency(totals.shipping, totals.currency)}</dd>
            </div>
          </dl>
          <div className="summary__total">
            <span>Total</span>
            <strong>{formatCurrency(totals.total, totals.currency)}</strong>
          </div>
          <button
            type="button"
            className="btn btn--primary btn--block btn--lg"
            onClick={() => navigate('/checkout')}
            disabled={!cart.items.some((item) => item.inStock)}
          >
            Proceed to checkout
          </button>
          <Link to="/products" className="link-btn summary__link">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  )
}
