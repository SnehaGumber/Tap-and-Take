import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductGrid from '../../components/product/ProductGrid.jsx'
import FilterSidebar from '../../components/product/FilterSidebar.jsx'
import Pagination from '../../components/common/Pagination.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import SearchBar from '../../components/product/SearchBar.jsx'
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx'
import useAsync from '../../hooks/useAsync.js'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { fetchCategories, fetchFilterFacets, fetchProducts } from '../../services/productService.js'
import { DISCOUNT_FILTERS, SORT_OPTIONS } from '../../utils/constants.js'
import { formatCurrency, formatNumber } from '../../utils/format.js'

const VIEW_KEY = 'tap-and-take_listing_view'

/**
 * All filtering, sorting and pagination is performed by the backend:
 * the query string is forwarded straight to GET /api/products.
 */
export default function Products({ title = 'All products' }) {
  useDocumentTitle(title)
  const [searchParams, setSearchParams] = useSearchParams()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [view, setView] = useState(() => {
    try {
      return window.localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
    } catch (error) {
      return 'grid'
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_KEY, view)
    } catch (error) {
      /* ignore storage failures */
    }
  }, [view])

  const filters = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams])
  const queryKey = searchParams.toString()

  const products = useAsync(() => fetchProducts({ limit: 12, ...filters }), [queryKey])
  const facets = useAsync(() => fetchFilterFacets(), [])
  const categories = useAsync(() => fetchCategories(), [])

  const update = (patch) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(patch).forEach(([key, value]) => {
      if (value === '' || value === undefined || value === null) next.delete(key)
      else next.set(key, String(value))
    })
    setSearchParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const reset = () => setSearchParams(new URLSearchParams())
  const meta = products.data?.meta

  const categoryName = (categories.data?.categories || []).find(
    (category) => category._id === filters.category,
  )?.name
  const sellerName = (facets.data?.sellers || []).find((seller) => seller._id === filters.seller)?.name

  // Human readable summary of everything currently applied.
  const chips = []
  if (filters.q) chips.push({ label: `"${filters.q}"`, clear: { q: '', page: 1 } })
  if (categoryName) chips.push({ label: categoryName, clear: { category: '', page: 1 } })
  if (sellerName) chips.push({ label: `Seller: ${sellerName}`, clear: { seller: '', page: 1 } })
  if (filters.brand) {
    filters.brand.split(',').filter(Boolean).forEach((brand) => {
      chips.push({
        label: brand,
        clear: {
          brand: filters.brand
            .split(',')
            .filter((item) => item && item !== brand)
            .join(','),
          page: 1,
        },
      })
    })
  }
  if (filters.minPrice || filters.maxPrice) {
    chips.push({
      label: `${filters.minPrice ? formatCurrency(filters.minPrice) : 'Any'} - ${
        filters.maxPrice ? formatCurrency(filters.maxPrice) : 'Any'
      }`,
      clear: { minPrice: '', maxPrice: '', page: 1 },
    })
  }
  if (filters.rating) chips.push({ label: `${filters.rating}\u2605 & above`, clear: { rating: '', page: 1 } })
  if (filters.minDiscount) {
    const option = DISCOUNT_FILTERS.find((item) => item.value === String(filters.minDiscount))
    chips.push({
      label: option ? option.label : `${filters.minDiscount}% or more`,
      clear: { minDiscount: '', page: 1 },
    })
  }
  if (filters.inStock === 'true') chips.push({ label: 'In stock only', clear: { inStock: '', page: 1 } })

  return (
    <div className="container section">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: title }]} />

      <div className="listing__head">
        <div>
          <h1>{categoryName || title}</h1>
          <p className="muted">
            {products.loading
              ? 'Loading catalogue\u2026'
              : meta
                ? `${formatNumber(meta.total)} product${meta.total === 1 ? '' : 's'} found`
                : 'Catalogue unavailable'}
            {filters.q ? ` for "${filters.q}"` : ''}
          </p>
        </div>
        <div className="listing__tools">
          <SearchBar
            initialValue={filters.q || ''}
            onSubmit={(value) => update({ q: value, page: 1 })}
          />
          <label className="sort-select">
            <span className="sr-only">Sort products</span>
            <select
              value={filters.sort || (filters.q ? 'relevance' : 'newest')}
              onChange={(event) => update({ sort: event.target.value, page: 1 })}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="view-toggle" role="group" aria-label="Result layout">
            <button
              type="button"
              className={view === 'grid' ? 'is-active' : ''}
              onClick={() => setView('grid')}
              aria-pressed={view === 'grid'}
            >
              Grid
            </button>
            <button
              type="button"
              className={view === 'list' ? 'is-active' : ''}
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
            >
              List
            </button>
          </div>
          <button
            type="button"
            className="btn btn--ghost listing__filter-toggle"
            onClick={() => setMobileFiltersOpen(true)}
          >
            Filters{chips.length ? ` (${chips.length})` : ''}
          </button>
        </div>
      </div>

      {chips.length ? (
        <div className="chip-row">
          {chips.map((chip) => (
            <button
              type="button"
              className="chip"
              key={chip.label}
              onClick={() => update(chip.clear)}
            >
              {chip.label}
              <span aria-hidden="true">{'\u2715'}</span>
            </button>
          ))}
          <button type="button" className="link-btn" onClick={reset}>
            Clear all filters
          </button>
        </div>
      ) : null}

      <div className="listing">
        <div className={`listing__sidebar ${mobileFiltersOpen ? 'is-open' : ''}`}>
          <FilterSidebar
            filters={filters}
            facets={facets.data}
            categories={categories.data?.categories || []}
            onChange={(patch) => {
              update(patch)
              setMobileFiltersOpen(false)
            }}
            onReset={() => {
              reset()
              setMobileFiltersOpen(false)
            }}
            onClose={mobileFiltersOpen ? () => setMobileFiltersOpen(false) : undefined}
          />
        </div>
        {mobileFiltersOpen ? (
          <button
            type="button"
            className="listing__scrim"
            aria-label="Close filters"
            onClick={() => setMobileFiltersOpen(false)}
          />
        ) : null}

        <div className="listing__results">
          {products.error ? (
            <ErrorState
              title="Unable to load products"
              message={`${products.error} Please try again.`}
              onRetry={products.refetch}
            />
          ) : (
            <>
              <ProductGrid
                products={products.data?.products || []}
                loading={products.loading}
                view={view}
                skeletonCount={12}
                emptyProps={{
                  title: 'No products match these filters',
                  message: 'Try widening your price range, clearing filters or searching for something else.',
                  actionLabel: 'Clear filters',
                  onAction: reset,
                }}
              />
              <Pagination meta={meta} onChange={(page) => update({ page })} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
