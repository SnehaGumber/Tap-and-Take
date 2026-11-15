import { useEffect, useState } from 'react'
import { DISCOUNT_FILTERS } from '../../utils/constants.js'

const RATINGS = [4, 3, 2, 1]

export default function FilterSidebar({
  filters,
  facets,
  categories = [],
  onChange,
  onReset,
  onClose,
}) {
  const [minPrice, setMinPrice] = useState(filters.minPrice || '')
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice || '')

  useEffect(() => {
    setMinPrice(filters.minPrice || '')
    setMaxPrice(filters.maxPrice || '')
  }, [filters.minPrice, filters.maxPrice])

  const brands = facets?.brands || []
  const sellers = facets?.sellers || []
  const selectedBrands = filters.brand ? filters.brand.split(',') : []

  const toggleBrand = (brand) => {
    const next = selectedBrands.includes(brand)
      ? selectedBrands.filter((item) => item !== brand)
      : [...selectedBrands, brand]
    onChange({ brand: next.join(','), page: 1 })
  }

  return (
    <aside className="filters" aria-label="Product filters">
      <div className="filters__header">
        <h3>Filters</h3>
        <div className="filters__header-actions">
          <button type="button" className="link-btn" onClick={onReset}>
            Clear all
          </button>
          {onClose ? (
            <button
              type="button"
              className="filters__close"
              onClick={onClose}
              aria-label="Close filters"
            >
              {'\u2715'}
            </button>
          ) : null}
        </div>
      </div>

      <section className="filters__group">
        <h4>Category</h4>
        <label className="filters__radio">
          <input
            type="radio"
            name="category"
            checked={!filters.category}
            onChange={() => onChange({ category: '', page: 1 })}
          />
          <span>All categories</span>
        </label>
        {categories.map((category) => (
          <label className="filters__radio" key={category._id}>
            <input
              type="radio"
              name="category"
              checked={filters.category === category._id}
              onChange={() => onChange({ category: category._id, page: 1 })}
            />
            <span>{category.name}</span>
          </label>
        ))}
      </section>

      <section className="filters__group">
        <h4>Price range</h4>
        <div className="filters__price">
          <input
            type="number"
            min="0"
            value={minPrice}
            placeholder={String(facets?.minPrice ?? 0)}
            onChange={(event) => setMinPrice(event.target.value)}
            aria-label="Minimum price"
          />
          <span>to</span>
          <input
            type="number"
            min="0"
            value={maxPrice}
            placeholder={String(facets?.maxPrice ?? 0)}
            onChange={(event) => setMaxPrice(event.target.value)}
            aria-label="Maximum price"
          />
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--block"
          onClick={() => onChange({ minPrice, maxPrice, page: 1 })}
        >
          Apply price
        </button>
      </section>

      {sellers.length ? (
        <section className="filters__group">
          <h4>Seller</h4>
          <label className="filters__radio">
            <input
              type="radio"
              name="seller"
              checked={!filters.seller}
              onChange={() => onChange({ seller: '', page: 1 })}
            />
            <span>All sellers</span>
          </label>
          {sellers.map((seller) => (
            <label className="filters__radio" key={seller._id}>
              <input
                type="radio"
                name="seller"
                checked={filters.seller === seller._id}
                onChange={() => onChange({ seller: seller._id, page: 1 })}
              />
              <span>
                {seller.name} <em className="muted">({seller.productCount})</em>
              </span>
            </label>
          ))}
        </section>
      ) : null}

      {brands.length ? (
        <section className="filters__group filters__group--scroll">
          <h4>Brand</h4>
          {brands.map((brand) => (
            <label className="filters__check" key={brand}>
              <input
                type="checkbox"
                checked={selectedBrands.includes(brand)}
                onChange={() => toggleBrand(brand)}
              />
              <span>{brand}</span>
            </label>
          ))}
        </section>
      ) : null}

      <section className="filters__group">
        <h4>Customer rating</h4>
        {RATINGS.map((rating) => (
          <label className="filters__radio" key={rating}>
            <input
              type="radio"
              name="rating"
              checked={String(filters.rating) === String(rating)}
              onChange={() => onChange({ rating, page: 1 })}
            />
            <span>{rating}\u2605 &amp; above</span>
          </label>
        ))}
        <label className="filters__radio">
          <input
            type="radio"
            name="rating"
            checked={!filters.rating}
            onChange={() => onChange({ rating: '', page: 1 })}
          />
          <span>Any rating</span>
        </label>
      </section>

      <section className="filters__group">
        <h4>Discount</h4>
        <label className="filters__radio">
          <input
            type="radio"
            name="minDiscount"
            checked={!filters.minDiscount}
            onChange={() => onChange({ minDiscount: '', page: 1 })}
          />
          <span>Any discount</span>
        </label>
        {DISCOUNT_FILTERS.map((option) => (
          <label className="filters__radio" key={option.value}>
            <input
              type="radio"
              name="minDiscount"
              checked={String(filters.minDiscount) === option.value}
              onChange={() => onChange({ minDiscount: option.value, page: 1 })}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </section>

      <section className="filters__group">
        <h4>Availability</h4>
        <label className="filters__check">
          <input
            type="checkbox"
            checked={filters.inStock === 'true'}
            onChange={(event) => onChange({ inStock: event.target.checked ? 'true' : '', page: 1 })}
          />
          <span>In stock only</span>
        </label>
      </section>
    </aside>
  )
}
