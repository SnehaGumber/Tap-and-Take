import api, { unwrap } from './api.js'

export const fetchAddresses = () => unwrap(api.get('/addresses'))
export const createAddress = (payload) => unwrap(api.post('/addresses', payload))
export const updateAddress = (id, payload) => unwrap(api.patch(`/addresses/${id}`, payload))
export const deleteAddress = (id) => unwrap(api.delete(`/addresses/${id}`))
export const setDefaultAddress = (id) => unwrap(api.patch(`/addresses/${id}/default`))

// The coupon is validated again by the server when the order is created.
export const fetchCheckoutSummary = (coupon = '') =>
  unwrap(api.get('/orders/checkout-summary', { params: coupon ? { coupon } : undefined }))
export const createOrder = (payload) => unwrap(api.post('/orders', payload))
export const fetchOrders = (params) => unwrap(api.get('/orders', { params }))
export const fetchOrder = (id) => unwrap(api.get(`/orders/${id}`))
export const cancelOrder = (id) => unwrap(api.patch(`/orders/${id}/cancel`))

export const fetchPaymentConfig = () => unwrap(api.get('/payments/config'))
export const confirmPayment = (payload) => unwrap(api.post('/payments/confirm', payload))
export const runTestPayment = (payload) => unwrap(api.post('/payments/test-pay', payload))
export const fetchPayments = () => unwrap(api.get('/payments'))
