import { Link } from 'react-router-dom'
import StatCard from '../../components/charts/StatCard.jsx'
import BarChart from '../../components/charts/BarChart.jsx'
import LineChart from '../../components/charts/LineChart.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import useAsync from '../../hooks/useAsync.js'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { fetchAdminDashboard } from '../../services/adminService.js'
import { formatCurrency, formatDate, formatNumber } from '../../utils/format.js'

export default function AdminDashboard() {
  useDocumentTitle('Admin dashboard')
  const dashboard = useAsync(() => fetchAdminDashboard(), [])

  if (dashboard.loading) return <LoadingSpinner label="Aggregating platform metrics" />
  if (dashboard.error) return <ErrorState message={dashboard.error} onRetry={dashboard.refetch} />

  const {
    metrics,
    revenueSeries,
    ordersSeries,
    usersSeries,
    productsByCategory,
    topProducts,
    topSellers,
    lowStock,
    recentOrders,
  } = dashboard.data

  return (
    <div className="dash-page">
      <header className="dash-page__head">
        <div>
          <h1>Platform overview</h1>
          <p className="muted">Every number is aggregated live from MongoDB.</p>
        </div>
        <Link className="btn btn--ghost" to="/admin/orders">
          Go to orders
        </Link>
      </header>

      <div className="stat-grid">
        <StatCard label="Revenue (paid)" value={formatCurrency(metrics.revenue, metrics.currency)} tone="primary" icon="$" />
        <StatCard label="Orders" value={formatNumber(metrics.totalOrders)} icon={'\u{1F9FE}'} />
        <StatCard label="Avg order value" value={formatCurrency(metrics.averageOrderValue, metrics.currency)} />
        <StatCard label="Users" value={formatNumber(metrics.totalUsers)} hint={`${metrics.totalCustomers} customers`} />
        <StatCard label="Sellers" value={formatNumber(metrics.totalSellers)} hint={`${metrics.pendingSellers} pending approval`} tone={metrics.pendingSellers ? 'warning' : 'default'} />
        <StatCard label="Products" value={formatNumber(metrics.totalProducts)} hint={`${metrics.totalCategories} categories`} />
        <StatCard label="Pending orders" value={formatNumber(metrics.pendingOrders)} tone="warning" />
        <StatCard label="Low stock" value={formatNumber(metrics.lowStockCount)} tone="danger" />
      </div>

      <div className="grid grid--2 grid--gap">
        <section className="card">
          <LineChart title="Revenue (last 6 months)" data={revenueSeries} currency={metrics.currency} />
        </section>
        <section className="card">
          <BarChart title="Orders per month" data={ordersSeries} />
        </section>
        <section className="card">
          <BarChart title="New users per month" data={usersSeries} />
        </section>
        <section className="card">
          <BarChart title="Products per category" data={productsByCategory} />
        </section>
      </div>

      <div className="grid grid--2 grid--gap">
        <section className="card">
          <h2>Top products</h2>
          <ul className="list-rows">
            {topProducts.map((product) => (
              <li key={product._id}>
                <span>
                  {product.title}
                  <small className="muted">
                    {product.seller?.store?.name || product.seller?.name || 'Seller'}
                  </small>
                </span>
                <strong>{formatNumber(product.numSold || 0)} sold</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>Top sellers by revenue</h2>
          {topSellers.length === 0 ? (
            <p className="muted">No paid orders yet.</p>
          ) : (
            <ul className="list-rows">
              {topSellers.map((seller) => (
                <li key={seller._id}>
                  <span>
                    {seller.storeName || seller.name}
                    <small className="muted">{formatNumber(seller.units)} units</small>
                  </span>
                  <strong>{formatCurrency(seller.revenue, metrics.currency)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card__head">
            <h2>Recent orders</h2>
            <Link className="link-btn" to="/admin/orders">
              View all
            </Link>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order._id}>
                  <td>
                    <strong>{order.orderNumber}</strong>
                    <small className="muted">{formatDate(order.createdAt)}</small>
                  </td>
                  <td>{order.user?.name || 'Customer'}</td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                  <td>{formatCurrency(order.total, metrics.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <div className="card__head">
            <h2>Low stock products</h2>
            <Link className="link-btn" to="/admin/products">
              Manage catalogue
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="muted">Inventory levels look healthy.</p>
          ) : (
            <ul className="list-rows">
              {lowStock.map((product) => (
                <li key={product._id}>
                  <span>
                    {product.title}
                    <small className="muted">
                      {product.seller?.store?.name || product.seller?.name || 'Seller'}
                    </small>
                  </span>
                  <strong className={product.stock === 0 ? 'is-danger' : 'is-warning'}>
                    {product.stock} left
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
