import api, { unwrap } from './api.js'

export const fetchProducts = (params) => unwrap(api.get('/products', { params }))
export const fetchFilterFacets = () => unwrap(api.get('/products/facets/filters'))
export const fetchSuggestions = (q, config = {}) =>
  unwrap(api.get('/products/suggestions', { params: { q }, ...config }))
export const fetchProduct = (idOrSlug) => unwrap(api.get(`/products/${idOrSlug}`))
export const fetchSellerProfile = (id) => unwrap(api.get(`/products/sellers/${id}`))
export const fetchCategories = () => unwrap(api.get('/categories'))

/**
 * Fetch ranked product alternatives for a given product.
 * Returns { source, alternatives[] } where each alternative has
 * { product, score, reasons[] }.
 */
export const fetchAlternatives = (productId, params = {}) =>
  unwrap(api.get(`/products/${productId}/alternatives`, { params }))

// Products are sent as multipart/form-data so image files can be uploaded.
function toFormData(values) {
  const form = new FormData()
  const jsonFields = ['specifications', 'tags', 'imageUrls', 'removeImages']

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || key === 'images') return
    if (jsonFields.includes(key)) form.append(key, JSON.stringify(value))
    else form.append(key, value)
  })

  ;(values.images || []).forEach((file) => form.append('images', file))
  return form
}

export const createProduct = (values) =>
  unwrap(api.post('/products', toFormData(values), { headers: { 'Content-Type': 'multipart/form-data' } }))

export const updateProduct = (id, values) =>
  unwrap(
    api.patch(`/products/${id}`, toFormData(values), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  )

export const deleteProduct = (id) => unwrap(api.delete(`/products/${id}`))
