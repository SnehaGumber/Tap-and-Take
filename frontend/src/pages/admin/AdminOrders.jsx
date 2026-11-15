import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Pagination from '../../components/common/Pagination.jsx'
import Modal from '../../components/common/Modal.jsx'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import SkeletonLoader from '../../components/common/SkeletonLoader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import useAsync from '../../hooks/useAsync.js'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { useToast } from '../../context/ToastContext.jsx'
import {
  cancelAdminOrder,
  fetchAdminOrder,
  fetchAdminOrders,
  updateAdminItemStatus,
} from '../../services/adminService.js'
import { formatCurrency, formatDate, statusLabel } from '../../utils/format.js'
import { ITEM_STATUSES, ORDER_STATUSES } from '../../utils/constants.js'

export default function AdminOrders() {
  useDocumentTitle('Orders')
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = Object.fromEntries(searchParams.entries())
  const [term, setTerm] = useState(query.q || '')
  const [detailsId, setDetailsId] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const orders = useAsync(() => fetchAdminOrders({ limit: 15, ...query }), [searchParams.toString()])
  const details = useAsync(
    () => (detailsId ? fetchAdminOrder(detailsId) : Promise.resolve(null)),
    [detailsId],
  )

  const update = (patch) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) next.delete(key)
      else next.set(key, String(value))
    })
    setSearchParams(next)
  }

  const changeItemStatus = async (orderId, itemId, status) => {
    try {
      await updateAdminItemStatus(orderId, itemId, { status })
      toast.success(`Item marked as ${status}`)
      await Promise.all([details.refetch(), orders.refetch()])
    } catch (error) {
      toast.error(error.message)
    }
  }

  const confirmCancel = async () => {
    setBusy(true)
    try {
      await cancelAdminOrder(cancelTarget._id)
      toast.success('Order cancelled')
      setCancelTarget(null)
      await orders.refetch()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  const list = orders.data?.orders || []

  return (
    <div className="dash-page">
      <header className="dash-page__head">
        <div>
          <h1>Orders</h1>
          <p className="muted">Search every order, inspect items and resolve issues.</p>
        </div>
      </header>

      <form
        className="toolbar"
        onSubmit={(event) => {
          event.preventDefault()
          update({ q: term, page: 1 })
        }}
      >
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search by order number"
          aria-label="Search orders"
        />
        <select value={query.status || ''} onChange={(event) => update({ status: event.target.value, page: 1 })}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
        <select
          value={query.paymentStatus || ''}
          onChange={(event) => update({ paymentStatus: event.target.value, page: 1 })}
        >
          <option value="">Any payment state</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
        <button type="submit" className="btn btn--primary">
          Search
        </button>
      </form>

      {orders.loading ? (
        <SkeletonLoader variant="row" count={8} />
      ) : orders.error ? (
        <ErrorState message={orders.error} onRetry={orders.refetch} />
      ) : list.length === 0 ? (
        <EmptyState icon={'\u{1F9FE}'} title="No orders found" message="Try another filter or search term." />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <strong>{order.orderNumber}</strong>
                      <small className="muted">{formatDate(order.createdAt, true)}</small>
                    </td>
                    <td>
                      {order.user?.name || 'Customer'}
                      <small className="muted">{order.user?.email}</small>
                    </td>
                    <td>{order.items?.length || 0}</td>
                    <td>{formatCurrency(order.pricing?.total, order.pricing?.currency)}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>
                      <StatusBadge status={order.paymentStatus} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="link-btn" onClick={() => setDetailsId(order._id)}>
                          Manage
                        </button>
                        {!['cancelled', 'delivered'].includes(order.status) ? (
                          <button type="button" className="link-btn is-danger" onClick={() => setCancelTarget(order)}>
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={orders.data?.meta} onChange={(page) => update({ page })} />
        </>
      )}

      <Modal open={Boolean(detailsId)} title="Order details" size="lg" onClose={() => setDetailsId(null)}>
        {details.loading ? (
          <SkeletonLoader count={5} />
        ) : details.error ? (
          <ErrorState message={details.error} />
        ) : details.data?.order ? (
          <div>
            <div className="order-card__head">
              <div>
                <strong>{details.data.order.orderNumber}</strong>
                <span className="muted">{formatDate(details.data.order.createdAt, true)}</span>
              </div>
              <div className="order-card__badges">
                <StatusBadge status={details.data.order.status} />
                <StatusBadge status={details.data.order.paymentStatus} />
              </div>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Seller</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {details.data.order.items.map((item) => (
                  <tr key={item._id}>
                    <td>{item.title}</td>
                    <td>{item.seller?.store?.name || item.seller?.name || '-'}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.lineTotal, details.data.order.pricing.currency)}</td>
                    <td>
                      <select
                        value={item.status}
                        onChange={(event) =>
                          changeItemStatus(details.data.order._id, item._id, event.target.value)
                        }
                        aria-label={`Update status for ${item.title}`}
                      >
                        {ITEM_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="meta-list">
              <div>
                <dt>Customer</dt>
                <dd>
                  {details.data.order.user?.name} ({details.data.order.user?.email})
                </dd>
              </div>
              <div>
                <dt>Payment method</dt>
                <dd>{details.data.order.paymentMethod === 'cod' ? 'Cash on delivery' : 'Card (Stripe test)'}</dd>
              </div>
              <div>
                <dt>Ship to</dt>
                <dd>
                  {details.data.order.shippingAddress.line1}, {details.data.order.shippingAddress.city},{' '}
                  {details.data.order.shippingAddress.state} {details.data.order.shippingAddress.postalCode}
                </dd>
              </div>
              <div>
                <dt>Order total</dt>
                <dd>
                  {formatCurrency(details.data.order.pricing.total, details.data.order.pricing.currency)}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel this order?"
        message="Stock is returned to sellers and paid orders are flagged for refund."
        confirmLabel="Cancel order"
        danger
        busy={busy}
        onConfirm={confirmCancel}
        onClose={() => setCancelTarget(null)}
      />
    </div>
  )
}
