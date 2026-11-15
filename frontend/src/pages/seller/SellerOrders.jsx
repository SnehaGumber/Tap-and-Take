import { Link, useSearchParams } from 'react-router-dom'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import Pagination from '../../components/common/Pagination.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import SkeletonLoader from '../../components/common/SkeletonLoader.jsx'
import useAsync from '../../hooks/useAsync.js'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { fetchSellerOrders } from '../../services/sellerService.js'
import { formatCurrency, formatDate, statusLabel } from '../../utils/format.js'
import { ORDER_STATUSES } from '../../utils/constants.js'

export default function SellerOrders() {
  useDocumentTitle('Seller orders')
  const [searchParams, setSearchParams] = useSearchParams()
  const query = Object.fromEntries(searchParams.entries())
  const orders = useAsync(() => fetchSellerOrders({ limit: 10, ...query }), [searchParams.toString()])

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
    <div className="dash-page">
      <header className="dash-page__head">
        <div>
          <h1>Orders for my products</h1>
          <p className="muted">Each row shows only the items your store is fulfilling.</p>
        </div>
        <select value={query.status || ''} onChange={(event) => update({ status: event.target.value, page: 1 })}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
      </header>

      {orders.loading ? (
        <SkeletonLoader variant="row" count={6} />
      ) : orders.error ? (
        <ErrorState message={orders.error} onRetry={orders.refetch} />
      ) : list.length === 0 ? (
        <EmptyState icon={'\u{1F9FE}'} title="No orders yet" message="Orders appear here as soon as customers buy your products." />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Order status</th>
                  <th>Payment</th>
                  <th>Your revenue</th>
                  <th />
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
                    <td>
                      <ul className="cell-list">
                        {(order.items || []).map((item) => (
                          <li key={item._id}>
                            {item.title} &times; {item.quantity} <StatusBadge status={item.status} />
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>
                      <StatusBadge status={order.paymentStatus} />
                    </td>
                    <td>{formatCurrency(order.sellerTotal ?? 0)}</td>
                    <td>
                      <Link className="link-btn" to={`/seller/orders/${order._id}`}>
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={orders.data?.meta} onChange={(page) => update({ page })} />
        </>
      )}
    </div>
  )
}
