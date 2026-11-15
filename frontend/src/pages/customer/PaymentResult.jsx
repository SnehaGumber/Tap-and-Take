import { Link, useSearchParams } from 'react-router-dom'
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx'
import useAsync from '../../hooks/useAsync.js'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { fetchOrder } from '../../services/orderService.js'
import { formatCurrency } from '../../utils/format.js'
import StatusBadge from '../../components/common/StatusBadge.jsx'

export default function PaymentResult() {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status') || 'success'
  const orderId = searchParams.get('orderId')
  const reason = searchParams.get('reason')
  const success = status === 'success'
  useDocumentTitle(success ? 'Payment successful' : 'Payment failed')

  const order = useAsync(
    () => (orderId ? fetchOrder(orderId) : Promise.resolve(null)),
    [orderId],
  )

  return (
    <div className="container section">
      <div className={`payment-result ${success ? 'is-success' : 'is-failed'}`}>
        <div className="payment-result__icon" aria-hidden="true">
          {success ? '\u2713' : '\u2715'}
        </div>
        <h1>{success ? 'Payment successful' : 'Payment could not be completed'}</h1>
        <p className="muted">
          {success
            ? 'Your order is confirmed and sellers have been notified.'
            : reason || 'Your card was declined. You can retry payment from your order details.'}
        </p>

        {order.loading ? (
          <LoadingSpinner label="Loading order" />
        ) : order.data?.order ? (
          <div className="payment-result__order">
            <div>
              <span className="muted">Order number</span>
              <strong>{order.data.order.orderNumber}</strong>
            </div>
            <div>
              <span className="muted">Amount</span>
              <strong>
                {formatCurrency(order.data.order.pricing.total, order.data.order.pricing.currency)}
              </strong>
            </div>
            <div>
              <span className="muted">Status</span>
              <StatusBadge status={order.data.order.status} />
            </div>
          </div>
        ) : null}

        <div className="payment-result__actions">
          {orderId ? (
            <Link className="btn btn--primary" to={`/orders/${orderId}`}>
              View order details
            </Link>
          ) : null}
          <Link className="btn btn--ghost" to="/products">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
