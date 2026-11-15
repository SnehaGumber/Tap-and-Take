import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import useAsync from '../../hooks/useAsync.js'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { useToast } from '../../context/ToastContext.jsx'
import { cancelOrder, fetchOrder, runTestPayment } from '../../services/orderService.js'
import { formatCurrency, formatDate } from '../../utils/format.js'
import { PLACEHOLDER_IMAGE } from '../../utils/constants.js'

const CANCELLABLE = ['pending_payment', 'payment_failed', 'processing']

export default function OrderDetails() {
  const { id } = useParams()
  const toast = useToast()
  const navigate = useNavigate()
  const order = useAsync(() => fetchOrder(id), [id])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useDocumentTitle(order.data?.order?.orderNumber || 'Order details')

  if (order.loading) return <LoadingSpinner label="Loading order" />
  if (order.error || !order.data?.order) {
    return (
      <div className="container section">
        <ErrorState title="Order unavailable" message={order.error || 'Not found'} onRetry={order.refetch} />
      </div>
    )
  }

  const data = order.data.order

  const doCancel = async () => {
    setBusy(true)
    try {
      await cancelOrder(data._id)
      toast.success('Order cancelled and stock restored')
      setConfirmOpen(false)
      await order.refetch()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  const retryPayment = async () => {
    setBusy(true)
    try {
      await runTestPayment({ orderId: data._id, outcome: 'success' })
      toast.success('Payment completed')
      await order.refetch()
    } catch (error) {
      toast.error(error.message)
      navigate(`/payment-result?status=failed&orderId=${data._id}&reason=${encodeURIComponent(error.message)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container section">
      <Link className="link-btn" to="/orders">
        &larr; Back to orders
      </Link>

      <div className="listing__head">
        <div>
          <h1>{data.orderNumber}</h1>
          <p className="muted">Placed {formatDate(data.createdAt, true)}</p>
        </div>
        <div className="order-card__badges">
          <StatusBadge status={data.status} />
          <StatusBadge status={data.paymentStatus} />
        </div>
      </div>

      <div className="order-detail">
        <div className="order-detail__main">
          <section className="card">
            <h2>Items</h2>
            {data.items.map((item) => (
              <div className="order-item" key={item._id}>
                <img
                  src={item.image || item.product?.images?.[0]?.url || PLACEHOLDER_IMAGE}
                  alt={item.title}
                  onError={(event) => {
                    event.currentTarget.src = PLACEHOLDER_IMAGE
                  }}
                />
                <div>
                  <strong>{item.title}</strong>
                  <span className="muted">
                    {item.brand} &middot; Sold by {item.seller?.store?.name || item.seller?.name || 'seller'}
                  </span>
                  <span className="muted">
                    {formatCurrency(item.unitPrice, data.pricing.currency)} \u00D7 {item.quantity}
                  </span>
                  <StatusBadge status={item.status} />
                </div>
                <div className="order-item__total">
                  <strong>{formatCurrency(item.lineTotal, data.pricing.currency)}</strong>
                  {item.product?.slug ? (
                    <Link className="link-btn" to={`/products/${item.product.slug}`}>
                      Buy again
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </section>

          <section className="card">
            <h2>Status timeline</h2>
            <ol className="timeline">
              {(data.statusHistory || []).map((entry, index) => (
                <li key={`${entry.status}-${index}`}>
                  <div>
                    <strong>{entry.status.replace(/_/g, ' ')}</strong>
                    <span className="muted">{formatDate(entry.at, true)}</span>
                  </div>
                  {entry.note ? <p className="muted">{entry.note}</p> : null}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="order-detail__side">
          <section className="card">
            <h3>Delivery address</h3>
            <p>
              {data.shippingAddress.fullName}
              <br />
              {data.shippingAddress.line1}
              {data.shippingAddress.line2 ? (
                <>
                  <br />
                  {data.shippingAddress.line2}
                </>
              ) : null}
              <br />
              {data.shippingAddress.city}, {data.shippingAddress.state} {data.shippingAddress.postalCode}
              <br />
              {data.shippingAddress.country}
              <br />
              {data.shippingAddress.phone}
            </p>
          </section>

          <section className="card">
            <h3>Payment</h3>
            <dl className="meta-list">
              <div>
                <dt>Method</dt>
                <dd>{data.paymentMethod === 'cod' ? 'Cash on delivery' : 'Card (Stripe test)'}</dd>
              </div>
              <div>
                <dt>Payment status</dt>
                <dd>
                  <StatusBadge status={data.paymentStatus} />
                </dd>
              </div>
              {data.payment?.failureReason ? (
                <div>
                  <dt>Failure reason</dt>
                  <dd>{data.payment.failureReason}</dd>
                </div>
              ) : null}
            </dl>

            <dl>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatCurrency(data.pricing.subtotal, data.pricing.currency)}</dd>
              </div>
              <div>
                <dt>Discount</dt>
                <dd className="is-positive">-{formatCurrency(data.pricing.discount, data.pricing.currency)}</dd>
              </div>
              <div>
                <dt>Tax</dt>
                <dd>{formatCurrency(data.pricing.tax, data.pricing.currency)}</dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd>{formatCurrency(data.pricing.shipping, data.pricing.currency)}</dd>
              </div>
            </dl>
            <div className="summary__total">
              <span>Total</span>
              <strong>{formatCurrency(data.pricing.total, data.pricing.currency)}</strong>
            </div>

            {data.paymentStatus !== 'paid' &&
            data.paymentMethod === 'card' &&
            data.status !== 'cancelled' ? (
              <button type="button" className="btn btn--primary btn--block" onClick={retryPayment} disabled={busy}>
                Retry payment
              </button>
            ) : null}

            {CANCELLABLE.includes(data.status) ? (
              <button
                type="button"
                className="btn btn--danger btn--block"
                onClick={() => setConfirmOpen(true)}
                disabled={busy}
              >
                Cancel order
              </button>
            ) : null}
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Cancel this order?"
        message="Stock will be returned to sellers. Paid orders are marked for refund."
        confirmLabel="Cancel order"
        danger
        busy={busy}
        onConfirm={doCancel}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  )
}
