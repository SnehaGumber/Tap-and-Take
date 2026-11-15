import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import useAsync from '../../hooks/useAsync.js'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { useToast } from '../../context/ToastContext.jsx'
import { fetchSellerOrder, updateSellerItemStatus } from '../../services/sellerService.js'
import { formatCurrency, formatDate } from '../../utils/format.js'
import { ITEM_STATUSES, PLACEHOLDER_IMAGE } from '../../utils/constants.js'

export default function SellerOrderDetails() {
  const { id } = useParams()
  useDocumentTitle('Order details')
  const toast = useToast()
  const order = useAsync(() => fetchSellerOrder(id), [id])
  const [savingItem, setSavingItem] = useState(null)

  if (order.loading) return <LoadingSpinner label="Loading order" />
  if (order.error || !order.data?.order) {
    return <ErrorState message={order.error || 'Order not found'} onRetry={order.refetch} />
  }

  const data = order.data.order

  const changeStatus = async (itemId, status) => {
    setSavingItem(itemId)
    try {
      await updateSellerItemStatus(data._id, itemId, { status })
      toast.success(`Item marked as ${status}`)
      await order.refetch()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSavingItem(null)
    }
  }

  return (
    <div className="dash-page">
      <Link className="link-btn" to="/seller/orders">
        &larr; Back to orders
      </Link>

      <header className="dash-page__head">
        <div>
          <h1>{data.orderNumber}</h1>
          <p className="muted">Placed {formatDate(data.createdAt, true)}</p>
        </div>
        <div className="order-card__badges">
          <StatusBadge status={data.status} />
          <StatusBadge status={data.paymentStatus} />
        </div>
      </header>

      <div className="grid grid--2 grid--gap">
        <section className="card">
          <h2>Your items in this order</h2>
          {data.items.map((item) => (
            <div className="order-item" key={item._id}>
              <img
                src={item.image || PLACEHOLDER_IMAGE}
                alt=""
                onError={(event) => {
                  event.currentTarget.src = PLACEHOLDER_IMAGE
                }}
              />
              <div>
                <strong>{item.title}</strong>
                <span className="muted">
                  {formatCurrency(item.unitPrice)} \u00D7 {item.quantity}
                </span>
                <StatusBadge status={item.status} />
              </div>
              <div className="order-item__total">
                <strong>{formatCurrency(item.lineTotal)}</strong>
                <select
                  value={item.status}
                  disabled={savingItem === item._id || data.paymentStatus === 'failed'}
                  onChange={(event) => changeStatus(item._id, event.target.value)}
                  aria-label={`Update status for ${item.title}`}
                >
                  {ITEM_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          <p className="muted">
            Statuses you set here roll up into the order status the customer sees. You can only see
            and edit your own items.
          </p>
        </section>

        <aside className="card">
          <h3>Ship to</h3>
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

          <h3>Customer</h3>
          <p>
            {data.user?.name}
            <br />
            <span className="muted">{data.user?.email}</span>
          </p>

          <h3>Your revenue</h3>
          <div className="summary__total">
            <span>Items total</span>
            <strong>{formatCurrency(data.sellerTotal ?? 0)}</strong>
          </div>
          <p className="muted">Platform totals, tax and shipping are managed by Tap & Take.</p>
        </aside>
      </div>
    </div>
  )
}
