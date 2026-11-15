import api, { unwrap } from './api.js'

export const fetchProductReviews = (productId, params) =>
  unwrap(api.get(`/reviews/product/${productId}`, { params }))
export const fetchReviewEligibility = (productId) =>
  unwrap(api.get(`/reviews/eligibility/${productId}`))
export const createReview = (payload) => unwrap(api.post('/reviews', payload))
export const updateReview = (id, payload) => unwrap(api.patch(`/reviews/${id}`, payload))
export const deleteReview = (id) => unwrap(api.delete(`/reviews/${id}`))
