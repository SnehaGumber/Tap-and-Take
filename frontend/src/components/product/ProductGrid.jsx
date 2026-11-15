import ProductCard from './ProductCard.jsx'
import SkeletonLoader from '../common/SkeletonLoader.jsx'
import EmptyState from '../common/EmptyState.jsx'

export default function ProductGrid({
  products = [],
  loading = false,
  skeletonCount = 8,
  view = 'grid',
  emptyProps,
}) {
  if (loading) return <SkeletonLoader variant="card" count={skeletonCount} />
  if (!products.length) {
    return (
      <EmptyState
        icon={'\u{1F6CD}'}
        title="No products found"
        message="Try changing your filters or searching for something else."
        {...emptyProps}
      />
    )
  }

  return (
    <div className={view === 'list' ? 'product-list' : 'product-grid'}>
      {products.map((product) => (
        <ProductCard key={product._id} product={product} view={view} />
      ))}
    </div>
  )
}
