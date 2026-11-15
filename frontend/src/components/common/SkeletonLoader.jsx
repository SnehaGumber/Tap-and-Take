export default function SkeletonLoader({ variant = 'text', count = 1, height }) {
  if (variant === 'card') {
    return (
      <div className="product-grid">
        {Array.from({ length: count }).map((_, index) => (
          <div className="skeleton-card" key={index}>
            <div className="skeleton skeleton--image" />
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--line skeleton--short" />
            <div className="skeleton skeleton--line skeleton--price" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'row') {
    return (
      <div className="skeleton-rows">
        {Array.from({ length: count }).map((_, index) => (
          <div className="skeleton skeleton--row" key={index} />
        ))}
      </div>
    )
  }

  if (variant === 'block') {
    return <div className="skeleton skeleton--block" style={height ? { height } : undefined} />
  }

  return (
    <div className="skeleton-rows">
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton skeleton--line" key={index} />
      ))}
    </div>
  )
}
