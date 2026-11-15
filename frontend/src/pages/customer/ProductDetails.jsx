import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ProductGrid from '../../components/product/ProductGrid.jsx'
import Rating from '../../components/common/Rating.jsx'
import QuantitySelector from '../../components/common/QuantitySelector.jsx'
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import FormField from '../../components/common/FormField.jsx'
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx'
import useAsync from '../../hooks/useAsync.js'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { useWishlist } from '../../context/WishlistContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { fetchProduct, fetchSellerProfile, fetchAlternatives } from '../../services/productService.js'
import { createReview } from '../../services/reviewService.js'
import { formatCurrency, formatDate, formatNumber } from '../../utils/format.js'
import { PLACEHOLDER_IMAGE } from '../../utils/constants.js'
import { addRecentlyViewed } from '../../utils/recent.js'
import { RETURN_WINDOW_DAYS, deliveryWindow } from '../../utils/delivery.js'

export default function ProductDetails() {
  const { idOrSlug } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { isAuthenticated } = useAuth()
  const { addToCart, loading: cartLoading } = useCart()
  const { toggle, isWishlisted } = useWishlist()

  const details = useAsync(() => fetchProduct(idOrSlug), [idOrSlug])
  const product = details.data?.product

  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [review, setReview] = useState({ rating: 5, title: '', comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [bundleSelection, setBundleSelection] = useState({})

  useDocumentTitle(product?.title || 'Product')

  const sellerId = product?.seller?._id
  const sellerProfile = useAsync(
    () => (sellerId ? fetchSellerProfile(sellerId) : Promise.resolve(null)),
    [sellerId],
  )

  const productId = product?._id
  const alternatives = useAsync(
    () => (productId ? fetchAlternatives(productId) : Promise.resolve(null)),
    [productId],
  )

  useEffect(() => {
    setQuantity(1)
    setActiveImage(0)
  }, [idOrSlug])

  useEffect(() => {
    if (product?._id) {
      addRecentlyViewed({ ...product, category: product.category?._id || '' })
    }
  }, [product?._id])

  const window7 = useMemo(() => deliveryWindow(), [])

  if (details.loading) return <LoadingSpinner label="Loading product" />
  if (details.error || !product) {
    return (
      <div className="container section">
        <ErrorState
          title="Product unavailable"
          message={
            details.error
              ? `${details.error} Please try again.`
              : 'This product could not be found. It may have been removed by the seller.'
          }
          onRetry={details.refetch}
        />
        <p>
          <Link className="link-btn" to="/products">
            Back to all products
          </Link>
        </p>
      </div>
    )
  }

  const images = product.images?.length ? product.images : [{ url: PLACEHOLDER_IMAGE }]
  const finalPrice = product.finalPrice ?? product.price
  const outOfStock = product.stock <= 0
  const reviews = details.data?.reviews || []
  const distribution = details.data?.ratingDistribution || {}
  const eligibility = details.data?.reviewEligibility
  const related = details.data?.related || []
  const sellerName = product.seller?.store?.name || product.seller?.name
  const storeApproved = product.seller?.store?.status === 'approved'

  // "Frequently bought together" uses the best-selling products from the same
  // category returned by the API - no invented pairings.
  const bundle = [...related].sort((a, b) => (b.numSold || 0) - (a.numSold || 0)).slice(0, 2)
  const bundleTotal =
    finalPrice +
    bundle.reduce(
      (sum, item) => (bundleSelection[item._id] === false ? sum : sum + (item.finalPrice ?? item.price)),
      0,
    )

  const requireLogin = () => {
    toast.info('Please sign in to continue')
    navigate('/login', { state: { from: `/products/${product.slug || product._id}` } })
  }

  const onAddToCart = async () => {
    if (!isAuthenticated) return requireLogin()
    return addToCart(product._id, quantity)
  }

  const onBuyNow = async () => {
    if (!isAuthenticated) return requireLogin()
    const ok = await addToCart(product._id, quantity)
    if (ok) navigate('/checkout')
    return ok
  }

  const onAddBundle = async () => {
    if (!isAuthenticated) return requireLogin()
    let ok = await addToCart(product._id, quantity)
    for (const item of bundle) {
      if (bundleSelection[item._id] === false || item.stock <= 0) continue
      // Sequential so the server-side stock check runs per product.
      // eslint-disable-next-line no-await-in-loop
      ok = (await addToCart(item._id, 1)) && ok
    }
    return ok
  }

  const submitReview = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await createReview({
        product: product._id,
        rating: Number(review.rating),
        title: review.title,
        comment: review.comment,
      })
      toast.success('Thanks for reviewing this product')
      setReview({ rating: 5, title: '', comment: '' })
      await details.refetch()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container section">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Products', to: '/products' },
          ...(product.category
            ? [{ label: product.category.name, to: `/products?category=${product.category._id}` }]
            : []),
          { label: product.title },
        ]}
      />

      <div className="pdp">
        <div className="pdp__gallery">
          <div className="pdp__stage">
            <img
              src={images[activeImage]?.url || PLACEHOLDER_IMAGE}
              alt={product.title}
              onError={(event) => {
                event.currentTarget.src = PLACEHOLDER_IMAGE
              }}
            />
            {product.discountPercent > 0 ? (
              <span className="badge badge--success pdp__badge">-{product.discountPercent}% off</span>
            ) : null}
          </div>
          {images.length > 1 ? (
            <div className="pdp__thumbs">
              {images.map((image, index) => (
                <button
                  type="button"
                  key={image.url + index}
                  className={index === activeImage ? 'is-active' : ''}
                  onClick={() => setActiveImage(index)}
                  aria-label={`View image ${index + 1}`}
                >
                  <img
                    src={image.url}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.src = PLACEHOLDER_IMAGE
                    }}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="pdp__info">
          <span className="muted">{product.brand}</span>
          <h1>{product.title}</h1>
          <div className="pdp__rating">
            <Rating value={product.ratingAverage || 0} count={product.ratingCount || 0} size="md" />
            <span className="muted">
              {product.ratingCount
                ? `${formatNumber(product.ratingCount)} verified review(s)`
                : 'No reviews yet'}
            </span>
            <span className="muted">{formatNumber(product.numSold || 0)} sold</span>
          </div>

          <div className="pdp__price">
            <strong>{formatCurrency(finalPrice)}</strong>
            {product.discountPercent > 0 ? (
              <>
                <s>{formatCurrency(product.price)}</s>
                <span className="badge badge--success">
                  You save {formatCurrency(product.price - finalPrice)}
                </span>
              </>
            ) : null}
          </div>

          {outOfStock ? (
            <p className="stock-flag stock-flag--out">Out of stock</p>
          ) : product.stock <= 5 ? (
            <p className="stock-flag stock-flag--low">Hurry - only {product.stock} left in stock</p>
          ) : (
            <p className="stock-flag stock-flag--in">In stock, ready to dispatch</p>
          )}

          <div className="pdp__buy">
            <QuantitySelector
              value={quantity}
              max={Math.max(1, Math.min(20, product.stock || 1))}
              onChange={setQuantity}
              disabled={outOfStock}
            />
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={onAddToCart}
              disabled={outOfStock || cartLoading}
            >
              Add to cart
            </button>
            <button
              type="button"
              className="btn btn--accent btn--lg"
              onClick={onBuyNow}
              disabled={outOfStock || cartLoading}
            >
              Buy now
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--lg"
              onClick={() => (isAuthenticated ? toggle(product._id) : requireLogin())}
            >
              {isWishlisted(product._id) ? '\u2665 Saved' : '\u2661 Wishlist'}
            </button>
          </div>

          <div className="pdp__facts">
            <div className="pdp__fact">
              <span aria-hidden="true">{'\u{1F69A}'}</span>
              <div>
                <strong>Delivery by {window7.label}</strong>
                <small>Standard delivery, dispatched within 1 business day.</small>
              </div>
            </div>
            <div className="pdp__fact">
              <span aria-hidden="true">{'\u21BB'}</span>
              <div>
                <strong>{RETURN_WINDOW_DAYS} day returns</strong>
                <small>Request a return from your order page after delivery.</small>
              </div>
            </div>
            <div className="pdp__fact">
              <span aria-hidden="true">{'\u{1F512}'}</span>
              <div>
                <strong>Secure checkout</strong>
                <small>Card payments are processed by Stripe in test mode.</small>
              </div>
            </div>
          </div>

          {sellerName ? (
            <div className="pdp__seller">
              <div>
                <span className="muted">Sold by</span>
                <strong>
                  {sellerName}{' '}
                  {storeApproved ? (
                    <span className="badge badge--info" title="Verified Tap & Take seller">
                      Verified seller
                    </span>
                  ) : null}
                </strong>
                {sellerProfile.data?.seller ? (
                  <span className="muted">
                    {formatNumber(sellerProfile.data.productCount || 0)} product(s) listed
                    {sellerProfile.data.ratingAverage
                      ? ` \u00b7 ${sellerProfile.data.ratingAverage.toFixed(1)}\u2605 store rating`
                      : ''}
                  </span>
                ) : null}
              </div>
              <Link className="btn btn--ghost btn--sm" to={`/products?seller=${product.seller._id}`}>
                Visit store
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {bundle.length ? (
        <section className="section">
          <div className="section__head">
            <div>
              <h2>Frequently bought together</h2>
              <p className="muted">Best-selling products from the same category.</p>
            </div>
          </div>
          <div className="bundle">
            <div className="bundle__items">
              <label className="bundle__item">
                <input type="checkbox" checked disabled />
                <img
                  src={images[0]?.url || PLACEHOLDER_IMAGE}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.src = PLACEHOLDER_IMAGE
                  }}
                />
                <span>
                  <strong>This item: {product.title}</strong>
                  <small>{formatCurrency(finalPrice)}</small>
                </span>
              </label>
              {bundle.map((item) => (
                <label className="bundle__item" key={item._id}>
                  <input
                    type="checkbox"
                    checked={bundleSelection[item._id] !== false}
                    onChange={(event) =>
                      setBundleSelection((current) => ({ ...current, [item._id]: event.target.checked }))
                    }
                  />
                  <img
                    src={item.images?.[0]?.url || PLACEHOLDER_IMAGE}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.src = PLACEHOLDER_IMAGE
                    }}
                  />
                  <span>
                    <Link to={`/products/${item.slug || item._id}`}>
                      <strong>{item.title}</strong>
                    </Link>
                    <small>{formatCurrency(item.finalPrice ?? item.price)}</small>
                  </span>
                </label>
              ))}
            </div>
            <div className="bundle__summary">
              <span className="muted">Bundle total</span>
              <strong>{formatCurrency(bundleTotal)}</strong>
              <button
                type="button"
                className="btn btn--primary btn--block"
                onClick={onAddBundle}
                disabled={outOfStock || cartLoading}
              >
                Add selected to cart
              </button>
              <small className="muted">Stock is verified on the server for each product.</small>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section pdp__panels">
        <div className="card">
          <h2>Product description</h2>
          <p className="pdp__description">{product.description}</p>
          {product.tags?.length ? (
            <div className="chip-row">
              {product.tags.map((tag) => (
                <Link className="chip chip--static" key={tag} to={`/products?q=${encodeURIComponent(tag)}`}>
                  {tag}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        {product.specifications?.length ? (
          <div className="card">
            <h2>Specifications</h2>
            <table className="spec-table">
              <tbody>
                {product.specifications.map((spec) => (
                  <tr key={spec.key}>
                    <th scope="row">{spec.key}</th>
                    <td>{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="section">
        <div className="section__head">
          <div>
            <h2>Customer reviews</h2>
            <p className="muted">
              {product.ratingCount
                ? `${product.ratingAverage.toFixed(1)} out of 5 from ${formatNumber(product.ratingCount)} review(s)`
                : 'This product has not been reviewed yet.'}
            </p>
          </div>
        </div>

        <div className="reviews">
          <div className="reviews__summary">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star] || 0
              const percent = product.ratingCount ? Math.round((count / product.ratingCount) * 100) : 0
              return (
                <div className="reviews__bar" key={star}>
                  <span>{star}\u2605</span>
                  <div className="reviews__track">
                    <div className="reviews__fill" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="muted">{count}</span>
                </div>
              )
            })}
          </div>

          <div className="reviews__list">
            {reviews.length === 0 ? (
              <p className="muted">Be the first to review this product after buying it.</p>
            ) : (
              reviews.map((item) => (
                <article className="review" key={item._id}>
                  <header>
                    <strong>{item.user?.name || 'Tap & Take customer'}</strong>
                    <Rating value={item.rating} showValue={false} />
                    <span className="muted">{formatDate(item.createdAt)}</span>
                  </header>
                  {item.title ? <h4>{item.title}</h4> : null}
                  <p>{item.comment}</p>
                </article>
              ))
            )}
          </div>

          <div className="card reviews__form">
            <h3>Write a review</h3>
            {!isAuthenticated ? (
              <p className="muted">
                <Link className="link-btn" to="/login">
                  Sign in
                </Link>{' '}
                to review products you have purchased.
              </p>
            ) : eligibility?.canReview ? (
              <form onSubmit={submitReview}>
                <FormField label="Rating" name="rating">
                  <select
                    id="rating"
                    name="rating"
                    value={review.rating}
                    onChange={(event) => setReview((current) => ({ ...current, rating: event.target.value }))}
                  >
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>
                        {value} star{value === 1 ? '' : 's'}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Title" name="title">
                  <input
                    id="title"
                    name="title"
                    value={review.title}
                    maxLength={120}
                    onChange={(event) => setReview((current) => ({ ...current, title: event.target.value }))}
                  />
                </FormField>
                <FormField label="Your review" name="comment" required>
                  <textarea
                    id="comment"
                    name="comment"
                    rows={4}
                    required
                    value={review.comment}
                    onChange={(event) => setReview((current) => ({ ...current, comment: event.target.value }))}
                  />
                </FormField>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? 'Publishing\u2026' : 'Publish review'}
                </button>
              </form>
            ) : (
              <p className="muted">
                {eligibility?.reason ||
                  'Only customers who have received this product can review it.'}
              </p>
            )}
          </div>
        </div>
      </section>

      {related.length ? (
        <section className="section">
          <div className="section__head">
            <div>
              <h2>Related products</h2>
              <p className="muted">More from {product.category?.name || 'this category'}.</p>
            </div>
            {product.category ? (
              <Link className="link-btn" to={`/products?category=${product.category._id}`}>
                View category
              </Link>
            ) : null}
          </div>
          <ProductGrid products={related} skeletonCount={4} />
        </section>
      ) : null}

      {/* Smart Alternatives — only render once we have data or an error */}
      {(alternatives.data?.alternatives?.length > 0 || alternatives.error) && (
        <section className="section">
          <div className="section__head">
            <div>
              <h2>Smart alternatives</h2>
              <p className="muted">
                Similar products that may better match your needs.
              </p>
            </div>
          </div>

          {alternatives.error ? (
            <p className="muted">Could not load alternatives right now.</p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
              {alternatives.data.alternatives.map(({ product: alt, score, reasons }) => (
                <Link
                  key={alt._id}
                  to={`/products/${alt.slug || alt._id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="card" style={{ height: '100%', padding: '0.75rem' }}>
                    <img
                      src={alt.images?.[0]?.url || PLACEHOLDER_IMAGE}
                      alt={alt.title}
                      style={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        marginBottom: '0.5rem',
                      }}
                    />
                    <p style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                      {alt.title}
                    </p>
                    <p style={{ color: 'var(--brand-500)', fontWeight: 700, marginBottom: '0.25rem' }}>
                      {formatCurrency(alt.finalPrice)}
                    </p>
                    {alt.ratingAverage > 0 && (
                      <p className="muted" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        ★ {alt.ratingAverage.toFixed(1)} ({formatNumber(alt.ratingCount)})
                      </p>
                    )}
                    {/* Match score */}
                    <p className="muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                      Match: {score}/100
                    </p>
                    {/* Reason tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {reasons.map((reason) => (
                        <span key={reason} className="badge badge--info" style={{ fontSize: '0.7rem' }}>
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
