import { formatCurrency, formatNumber } from '../../utils/format.js'

/**
 * Lightweight hand-built SVG bar chart - no chart library dependency.
 */
export default function BarChart({ data = [], currency, title, height = 220 }) {
  const max = Math.max(...data.map((point) => point.value), 1)
  const format = (value) => (currency ? formatCurrency(value, currency) : formatNumber(value))

  return (
    <div className="chart">
      {title ? <h4 className="chart__title">{title}</h4> : null}
      <div className="chart__bars" style={{ height }}>
        {data.map((point) => (
          <div className="chart__bar-col" key={point.key || point.label}>
            <div className="chart__bar-track">
              <div
                className="chart__bar"
                style={{ height: `${Math.max(2, (point.value / max) * 100)}%` }}
                title={`${point.label}: ${format(point.value)}`}
              />
            </div>
            <span className="chart__bar-value">{format(point.value)}</span>
            <span className="chart__bar-label">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
