import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useDebounce from '../../hooks/useDebounce.js'
import { fetchSuggestions } from '../../services/productService.js'
import { addRecentSearch, clearRecentSearches, getRecentSearches } from '../../utils/recent.js'
import { formatCurrency } from '../../utils/format.js'
import { PLACEHOLDER_IMAGE } from '../../utils/constants.js'

const EMPTY = { products: [], categories: [], sellers: [] }

/**
 * Marketplace-style search: debounced backend suggestions for products,
 * categories and stores, plus locally remembered recent searches.
 */
export default function SearchBar({
  initialValue = '',
  onSubmit,
  placeholder = 'Search Trendora for products, brands and stores',
}) {
  const [term, setTerm] = useState(initialValue)
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState(() => getRecentSearches())
  const debounced = useDebounce(term, 300)
  const navigate = useNavigate()
  const wrapperRef = useRef(null)

  useEffect(() => setTerm(initialValue), [initialValue])

  // One request per settled keystroke burst, and never for 1-character terms.
  useEffect(() => {
    const value = debounced.trim()
    if (value.length < 2) {
      setSuggestions(EMPTY)
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    fetchSuggestions(value)
      .then((data) => {
        if (!cancelled) setSuggestions({ ...EMPTY, ...data })
      })
      .catch(() => {
        if (!cancelled) setSuggestions(EMPTY)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debounced])

  useEffect(() => {
    const onClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const runSearch = (value) => {
    const query = String(value || '').trim()
    setOpen(false)
    if (query) setRecent(addRecentSearch(query))
    if (onSubmit) onSubmit(query)
    else navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/products')
  }

  const submit = (event) => {
    event.preventDefault()
    runSearch(term)
  }

  const hasSuggestions =
    suggestions.products.length || suggestions.categories.length || suggestions.sellers.length
  const showPanel = open && (term.trim().length >= 2 ? true : recent.length > 0)

  return (
    <div className="search" ref={wrapperRef}>
      <form className="search-bar" role="search" onSubmit={submit}>
        <span className="search-bar__icon" aria-hidden="true">
          {'\u{1F50D}'}
        </span>
        <input
          type="search"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          aria-label="Search products"
          autoComplete="off"
        />
        <button type="submit" className="btn btn--primary">
          Search
        </button>
      </form>

      {showPanel ? (
        <div className="suggest" role="listbox" aria-label="Search suggestions">
          {term.trim().length < 2 ? (
            <div className="suggest__group">
              <div className="suggest__head">
                <span>Recent searches</span>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setRecent(clearRecentSearches())}
                >
                  Clear
                </button>
              </div>
              {recent.map((item) => (
                <button type="button" key={item} className="suggest__row" onClick={() => runSearch(item)}>
                  <span className="suggest__icon" aria-hidden="true">
                    {'\u21BB'}
                  </span>
                  <span>{item}</span>
                </button>
              ))}
            </div>
          ) : loading && !hasSuggestions ? (
            <div className="suggest__empty">Searching\u2026</div>
          ) : !hasSuggestions ? (
            <div className="suggest__empty">
              No matches for &quot;{term.trim()}&quot;. Press enter to search the full catalogue.
            </div>
          ) : (
            <>
              {suggestions.products.length ? (
                <div className="suggest__group">
                  <div className="suggest__head">
                    <span>Products</span>
                  </div>
                  {suggestions.products.map((product) => (
                    <button
                      type="button"
                      key={product._id}
                      className="suggest__row"
                      onClick={() => {
                        setOpen(false)
                        setRecent(addRecentSearch(product.title))
                        navigate(`/products/${product.slug || product._id}`)
                      }}
                    >
                      <img
                        className="suggest__thumb"
                        src={product.image || PLACEHOLDER_IMAGE}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.src = PLACEHOLDER_IMAGE
                        }}
                      />
                      <span className="suggest__text">
                        <strong>{product.title}</strong>
                        <small>{product.brand}</small>
                      </span>
                      <span className="suggest__price">{formatCurrency(product.finalPrice ?? product.price)}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {suggestions.categories.length ? (
                <div className="suggest__group">
                  <div className="suggest__head">
                    <span>Categories</span>
                  </div>
                  {suggestions.categories.map((category) => (
                    <button
                      type="button"
                      key={category._id}
                      className="suggest__row"
                      onClick={() => {
                        setOpen(false)
                        navigate(`/products?category=${category._id}`)
                      }}
                    >
                      <span className="suggest__icon" aria-hidden="true">
                        {'\u{1F5C2}'}
                      </span>
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {suggestions.sellers.length ? (
                <div className="suggest__group">
                  <div className="suggest__head">
                    <span>Stores</span>
                  </div>
                  {suggestions.sellers.map((seller) => (
                    <button
                      type="button"
                      key={seller._id}
                      className="suggest__row"
                      onClick={() => {
                        setOpen(false)
                        navigate(`/products?seller=${seller._id}`)
                      }}
                    >
                      <span className="suggest__icon" aria-hidden="true">
                        {'\u{1F3EA}'}
                      </span>
                      <span>{seller.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
