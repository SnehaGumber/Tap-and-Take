import { Link } from 'react-router-dom'
import StatCard from '../../components/charts/StatCard.jsx'
import BarChart from '../../components/charts/BarChart.jsx'
import LineChart from '../../components/charts/LineChart.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import useAsync from '../../hooks/useAsync.js'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { fetchSellerDashboard, fetchSellerTrustScore } from '../../services/sellerService.js'
import { formatCurrency, formatDate, formatNumber } from '../../utils/format.js'

export default function SellerDashboard() {
  useDocumentTitle('Seller dashboard')
  const { user } = useAuth()
  const dashboard = useAsync(() => fetchSellerDashboard(), [])
  const trustResult = useAsync(() => fetchSellerTrustScore(), [])
  const trustScore = trustResult.data?.trustScore

  if (dashboard.loading) return <LoadingSpinner label="Loading your metrics" />
  if (dashboard.error) return <ErrorState message={dashboard.error} onRetry={dashboard.refetch} />

  const { metrics, salesSeries, ordersSeries, lowStock, recentOrders, topProducts } = dashboard.data

  return (
    <div className="dash-page">
      <header className="dash-page__head">
        <div>
          <h1>{user?.store?.name || 'Your store'}</h1>
          <p className="muted">Live metrics calculated from your orders and catalogue.</p>
        </div>
        <Link className="btn btn--primary" to="/seller/products/new">
          Add product
        </Link>
      </header>

      {user?.store?.status !== 'approved' ? (
        <p className="notice notice--warning">
          Your store status is <strong>{user?.store?.status || 'pending'}</strong>. An administrator
          must approve your store before your products go live on the storefront.
        </p>
      ) : null}

      <div className="stat-grid">
        <StatCard label="Revenue (paid)" value={formatCurrency(metrics.revenue, metrics.currency)} tone="primary" icon="$" />
        <StatCard label="Orders" value={formatNumber(metrics.totalOrders)} icon={'\u{1F9FE}'} />
        <StatCard label="Units sold" value={formatNumber(metrics.unitsSold)} icon={'\u{1F4E6}'} />
        <StatCard
          label="Customers"
          value={formatNumber(metrics.customers || 0)}
          hint="Unique buyers"
          icon={'\u{1F465}'}
        />
        <StatCard
          label="Average rating"
          value={metrics.reviewCount ? `${metrics.ratingAverage.toFixed(1)} / 5` : 'No reviews yet'}
          hint={metrics.reviewCount ? `${formatNumber(metrics.reviewCount)} review(s)` : undefined}
          icon={'\u2605'}
        />
        <StatCard label="Products" value={`${metrics.activeProducts}/${metrics.totalProducts}`} hint="Published / total" />
        <StatCard label="Pending orders" value={formatNumber(metrics.pendingOrders)} tone="warning" />
        <StatCard label="Low stock" value={formatNumber(metrics.lowStockCount)} tone="danger" />
      </div>

      {/* ── Trust Score panel ─────────────────────────────────────── */}
      {!trustResult.loading && (trustScore || trustResult.error) && (
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card__head">
            <h2>Seller Trust Score</h2>
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              Calculated from fulfilment, delivery, cancellations &amp; reviews
            </span>
          </div>

          {trustResult.error ? (
            <p className="muted">Trust score is temporarily unavailable.</p>
          ) : !trustScore.hasScore ? (
            /* Not enough data yet */
            <div>
              <p className="notice notice--warning" style={{ marginBottom: '0.75rem' }}>
                {trustScore.explanation}
              </p>
              {/* Progress bar toward the minimum */}
              <div style={{ marginBottom: '0.25rem', fontSize: '0.85rem' }}>
                <span>
                  {trustScore.currentOrders || 0} / {trustScore.minimumOrdersRequired} committed orders
                </span>
              </div>
              <div
                style={{
                  height: '8px',
                  background: 'var(--border, #e5e7eb)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(
                      100,
                      ((trustScore.currentOrders || 0) / trustScore.minimumOrdersRequired) * 100,
                    )}%`,
                    background: 'var(--brand-500)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          ) : (
            /* Full score breakdown */
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {/* Big score badge */}
              <div style={{ textAlign: 'center', minWidth: '90px' }}>
                <div
                  style={{
                    fontSize: '2.5rem',
                    fontWeight: 800,
                    color:
                      trustScore.score >= 75
                        ? 'var(--success-600)'
                        : trustScore.score >= 50
                          ? 'var(--warning-600)'
                          : 'var(--danger-600)',
                    lineHeight: 1,
                  }}
                >
                  {trustScore.score}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.35rem' }}>
                  {trustScore.score >= 75 ? 'Excellent' : trustScore.score >= 50 ? 'Good' : 'Needs improvement'}
                </div>
                <div className="muted" style={{ fontSize: '0.8rem' }}>out of 100</div>
              </div>

              {/* Breakdown rows */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '0.3rem 0', color: 'var(--ink-500)' }}>Fulfilment rate</td>
                      <td style={{ padding: '0.3rem 0', textAlign: 'right', fontWeight: 600 }}>
                        {trustScore.breakdown.fulfilment.rate.toFixed(1)}%
                        <span className="muted" style={{ fontWeight: 400, marginLeft: '0.4rem' }}>
                          ({trustScore.breakdown.fulfilment.score.toFixed(1)} / 40 pts)
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.3rem 0', color: 'var(--ink-500)' }}>Delivery rate</td>
                      <td style={{ padding: '0.3rem 0', textAlign: 'right', fontWeight: 600 }}>
                        {trustScore.breakdown.delivery.rate.toFixed(1)}%
                        <span className="muted" style={{ fontWeight: 400, marginLeft: '0.4rem' }}>
                          ({trustScore.breakdown.delivery.score.toFixed(1)} / 30 pts)
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.3rem 0', color: 'var(--ink-500)' }}>Cancellation penalty</td>
                      <td style={{ padding: '0.3rem 0', textAlign: 'right', fontWeight: 600 }}>
                        {trustScore.breakdown.cancellation.rate.toFixed(1)}%
                        <span className="muted" style={{ fontWeight: 400, marginLeft: '0.4rem' }}>
                          ({trustScore.breakdown.cancellation.penalty.toFixed(1)} pts)
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.3rem 0', color: 'var(--ink-500)' }}>Review score</td>
                      <td style={{ padding: '0.3rem 0', textAlign: 'right', fontWeight: 600 }}>
                        {trustScore.breakdown.reviews.weightedAverage
                          ? `${trustScore.breakdown.reviews.weightedAverage.toFixed(1)} ★`
                          : 'No reviews'}
                        <span className="muted" style={{ fontWeight: 400, marginLeft: '0.4rem' }}>
                          ({trustScore.breakdown.reviews.score.toFixed(1)} / 30 pts)
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                  {trustScore.explanation}
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="grid grid--2 grid--gap">
        <section className="card">
          <LineChart title="Sales (last 6 months)" data={salesSeries} currency={metrics.currency} />
        </section>
        <section className="card">
          <BarChart title="Orders per month" data={ordersSeries} />
        </section>
      </div>

      <div className="grid grid--2 grid--gap">
        <section className="card">
          <div className="card__head">
            <h2>Recent orders</h2>
            <Link className="link-btn" to="/seller/orders">
              View all
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="muted">No orders yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Your total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <Link to={`/seller/orders/${order._id}`}>{order.orderNumber}</Link>
                      <small className="muted">{formatDate(order.createdAt)}</small>
                    </td>
                    <td>{order.user?.name || 'Customer'}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>{formatCurrency(order.sellerTotal, metrics.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <div className="card__head">
            <h2>Low stock alerts</h2>
            <Link className="link-btn" to="/seller/products">
              Manage catalogue
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="muted">Every product has healthy stock levels.</p>
          ) : (
            <ul className="list-rows">
              {lowStock.map((product) => (
                <li key={product._id}>
                  <span>{product.title}</span>
                  <strong className={product.stock === 0 ? 'is-danger' : 'is-warning'}>
                    {product.stock} left
                  </strong>
                </li>
              ))}
            </ul>
          )}

          <h3>Top sellers</h3>
          {topProducts.length === 0 ? (
            <p className="muted">No sales recorded yet.</p>
          ) : (
            <ul className="list-rows">
              {topProducts.map((product) => (
                <li key={product._id}>
                  <span>{product.title}</span>
                  <strong>{formatNumber(product.numSold || 0)} sold</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
