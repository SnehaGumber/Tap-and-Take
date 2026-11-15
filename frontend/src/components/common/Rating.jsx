export default function Rating({ value = 0, count, size = 'sm', showValue = true }) {
  const rounded = Math.round(Number(value) * 2) / 2

  return (
    <span className={`rating rating--${size}`} title={`${value} out of 5`}>
      <span className="rating__stars" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`rating__star ${rounded >= star ? 'is-full' : rounded >= star - 0.5 ? 'is-half' : ''}`}
          >
            {'\u2605'}
          </span>
        ))}
      </span>
      {showValue ? <span className="rating__value">{Number(value).toFixed(1)}</span> : null}
      {count !== undefined ? <span className="rating__count">({count})</span> : null}
    </span>
  )
}
