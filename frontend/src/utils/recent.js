/**
 * Small localStorage helpers for recent searches and recently viewed products.
 * Everything is wrapped in try/catch so private-mode browsers never crash the UI.
 */
const SEARCH_KEY = 'tap-and-take_recent_searches'
const VIEWED_KEY = 'tap-and-take_recent_products'
const MAX_SEARCHES = 6
const MAX_VIEWED = 8

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : fallback
  } catch (error) {
    return fallback
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    /* storage unavailable - recent items are a nicety, not a requirement */
  }
}

export const getRecentSearches = () => read(SEARCH_KEY, [])

export function addRecentSearch(term) {
  const value = String(term || '').trim()
  if (value.length < 2) return getRecentSearches()
  const next = [value, ...getRecentSearches().filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(
    0,
    MAX_SEARCHES,
  )
  write(SEARCH_KEY, next)
  return next
}

export function clearRecentSearches() {
  write(SEARCH_KEY, [])
  return []
}

export const getRecentlyViewed = () => read(VIEWED_KEY, [])

export function addRecentlyViewed(product) {
  if (!product?._id) return getRecentlyViewed()
  const entry = {
    _id: product._id,
    slug: product.slug,
    title: product.title,
    brand: product.brand,
    price: product.price,
    finalPrice: product.finalPrice ?? product.price,
    discountPercent: product.discountPercent || 0,
    image: product.images?.[0]?.url || '',
    ratingAverage: product.ratingAverage || 0,
    ratingCount: product.ratingCount || 0,
  }
  const next = [entry, ...getRecentlyViewed().filter((item) => item._id !== entry._id)].slice(0, MAX_VIEWED)
  write(VIEWED_KEY, next)
  return next
}
