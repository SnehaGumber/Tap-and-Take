import api, { unwrap } from './api.js'

export const fetchSellerDashboard = () => unwrap(api.get('/seller/dashboard'))
export const fetchSellerProducts = (params) => unwrap(api.get('/seller/products', { params }))
export const fetchSellerOrders = (params) => unwrap(api.get('/seller/orders', { params }))
export const fetchSellerOrder = (id) => unwrap(api.get(`/seller/orders/${id}`))
export const updateSellerItemStatus = (orderId, itemId, payload) =>
  unwrap(api.patch(`/seller/orders/${orderId}/items/${itemId}/status`, payload))
export const updateStoreProfile = (payload) => unwrap(api.patch('/seller/store', payload))

/**
 * Fetch the trust score for the currently authenticated seller.
 * Returns { hasScore, score?, breakdown?, evidence?, explanation, ... }
 */
export const fetchSellerTrustScore = () => unwrap(api.get('/seller/trust-score'))
