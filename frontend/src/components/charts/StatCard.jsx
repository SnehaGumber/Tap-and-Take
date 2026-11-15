export default function StatCard({ label, value, hint, tone = 'default', icon }) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        {icon ? (
          <span className="stat-card__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>
      <strong className="stat-card__value">{value}</strong>
      {hint ? <span className="stat-card__hint">{hint}</span> : null}
    </div>
  )
}
