import api, { unwrap } from './api.js'

export const fetchCart = (coupon = '') =>
  unwrap(api.get('/cart', { params: coupon ? { coupon } : undefined }))
export const addCartItem = (productId, quantity = 1) =>
  unwrap(api.post('/cart/items', { productId, quantity }))
export const updateCartItem = (productId, quantity) =>
  unwrap(api.patch(`/cart/items/${productId}`, { quantity }))
export const removeCartItem = (productId) => unwrap(api.delete(`/cart/items/${productId}`))
export const clearCart = () => unwrap(api.delete('/cart'))

// "Save for later" shelf
export const saveCartItemForLater = (productId) =>
  unwrap(api.post(`/cart/items/${productId}/save-for-later`))
export const moveSavedItemToCart = (productId) =>
  unwrap(api.post(`/cart/saved/${productId}/move-to-cart`))
export const removeSavedItem = (productId) => unwrap(api.delete(`/cart/saved/${productId}`))

// Coupons are validated on the server against the live cart
export const applyCartCoupon = (code) => unwrap(api.post('/cart/coupon', { code }))

export const fetchWishlist = () => unwrap(api.get('/wishlist'))
export const addWishlistItem = (productId) => unwrap(api.post('/wishlist/items', { productId }))
export const removeWishlistItem = (productId) => unwrap(api.delete(`/wishlist/items/${productId}`))
export const moveWishlistItemToCart = (productId, quantity = 1) =>
  unwrap(api.post(`/wishlist/items/${productId}/move-to-cart`, { quantity }))
