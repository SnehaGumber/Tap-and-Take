import { Link, useSearchParams } from 'react-router-dom'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import Pagination from '../../components/common/Pagination.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import SkeletonLoader from '../../components/common/SkeletonLoader.jsx'
import AccountNav from '../../components/layout/AccountNav.jsx'
import useAsync from '../../hooks/useAsync.js'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { fetchOrders } from '../../services/orderService.js'
import { formatCurrency, formatDate, statusLabel } from '../../utils/format.js'
import { ORDER_STATUSES } from '../../utils/constants.js'

export default function Orders() {
  useDocumentTitle('My orders')
  const [searchParams, setSearchParams] = useSearchParams()
  const query = Object.fromEntries(searchParams.entries())
  const orders = useAsync(() => fetchOrders({ limit: 10, ...query }), [searchParams.toString()])

  const update = (patch) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) next.delete(key)
      else next.set(key, String(value))
    })
    setSearchParams(next)
  }

  const list = orders.data?.orders || []

  return (
    <div className="container section">
      <AccountNav
        title="My orders"
        subtitle="Track deliveries, review payments and cancel orders where allowed."
      />
      <div className="listing__head">
        <div>
          <p className="muted">Filter by status to find a specific order.</p>
        </div>
        <label className="sort-select">
          <span className="sr-only">Filter by status</span>
          <select value={query.status || ''} onChange={(event) => update({ status: event.target.value, page: 1 })}>
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {orders.loading ? (
        <SkeletonLoader variant="row" count={5} />
      ) : orders.error ? (
        <ErrorState message={orders.error} onRetry={orders.refetch} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={'\u{1F9FE}'}
          title="No orders yet"
          message="When you place an order it will appear here with live status updates."
          actionLabel="Start shopping"
          actionTo="/products"
        />
      ) : (
        <>
          <div className="order-list">
            {list.map((order) => (
              <article className="order-card" key={order._id}>
                <div className="order-card__head">
                  <div>
                    <strong>{order.orderNumber}</strong>
                    <span className="muted">Placed {formatDate(order.createdAt, true)}</span>
                  </div>
                  <div className="order-card__badges">
                    <StatusBadge status={order.status} />
                    <StatusBadge status={order.paymentStatus} />
                  </div>
                </div>
                <ul className="order-card__items">
                  {order.items.slice(0, 3).map((item) => (
                    <li key={item._id}>
                      {item.title} &times; {item.quantity}
                    </li>
                  ))}
                  {order.items.length > 3 ? <li>+{order.items.length - 3} more item(s)</li> : null}
                </ul>
                <div className="order-card__foot">
                  <strong>{formatCurrency(order.pricing.total, order.pricing.currency)}</strong>
                  <Link className="btn btn--ghost btn--sm" to={`/orders/${order._id}`}>
                    View details
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <Pagination meta={orders.data?.meta} onChange={(page) => update({ page })} />
        </>
      )}
    </div>
  )
}
