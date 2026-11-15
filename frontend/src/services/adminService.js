import api, { unwrap } from './api.js'

export const fetchAdminDashboard = () => unwrap(api.get('/admin/dashboard'))
export const fetchUsers = (params) => unwrap(api.get('/admin/users', { params }))
export const fetchUserDetails = (id) => unwrap(api.get(`/admin/users/${id}`))
export const setUserActive = (id, isActive) => unwrap(api.patch(`/admin/users/${id}/status`, { isActive }))
export const setUserRole = (id, role) => unwrap(api.patch(`/admin/users/${id}/role`, { role }))
export const setSellerStatus = (id, status) =>
  unwrap(api.patch(`/admin/sellers/${id}/status`, { status }))
export const deleteUser = (id) => unwrap(api.delete(`/admin/users/${id}`))

export const fetchAdminProducts = (params) => unwrap(api.get('/admin/products', { params }))
export const fetchLowStock = () => unwrap(api.get('/admin/products/low-stock'))
export const fetchAdminOrders = (params) => unwrap(api.get('/admin/orders', { params }))
export const fetchAdminOrder = (id) => unwrap(api.get(`/admin/orders/${id}`))
export const cancelAdminOrder = (id) => unwrap(api.patch(`/admin/orders/${id}/cancel`))
export const updateAdminItemStatus = (orderId, itemId, payload) =>
  unwrap(api.patch(`/admin/orders/${orderId}/items/${itemId}/status`, payload))

export const createCategory = (payload) => unwrap(api.post('/categories', payload))
export const updateCategory = (id, payload) => unwrap(api.patch(`/categories/${id}`, payload))
export const deleteCategory = (id) => unwrap(api.delete(`/categories/${id}`))
