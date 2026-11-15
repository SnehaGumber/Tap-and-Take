import { formatCurrency, formatNumber } from '../../utils/format.js'

export default function LineChart({ data = [], currency, title, height = 200 }) {
  const width = 520
  const padding = 28
  const max = Math.max(...data.map((point) => point.value), 1)
  const step = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0
  const format = (value) => (currency ? formatCurrency(value, currency) : formatNumber(value))

  const points = data.map((point, index) => {
    const x = padding + index * step
    const y = height - padding - (point.value / max) * (height - padding * 2)
    return { ...point, x, y }
  })

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
  const area = points.length
    ? `${path} L${points[points.length - 1].x},${height - padding} L${points[0].x},${height - padding} Z`
    : ''

  return (
    <div className="chart">
      {title ? <h4 className="chart__title">{title}</h4> : null}
      <svg viewBox={`0 0 ${width} ${height}`} className="chart__svg" role="img" aria-label={title}>
        <path d={area} className="chart__area" />
        <path d={path} className="chart__line" />
        {points.map((point) => (
          <g key={point.key || point.label}>
            <circle cx={point.x} cy={point.y} r="4" className="chart__dot">
              <title>{`${point.label}: ${format(point.value)}`}</title>
            </circle>
            <text x={point.x} y={height - 8} className="chart__axis" textAnchor="middle">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
