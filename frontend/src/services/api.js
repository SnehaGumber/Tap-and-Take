import axios from 'axios'

export const TOKEN_KEY = 'trendora_token'
export const USER_KEY = 'trendora_user'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
})

// Attach the JWT to every request (persistent login).
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let onUnauthorized = null
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

// Normalise every error into a readable message for the UI.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const payload = error.response?.data

    if (status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      if (onUnauthorized) onUnauthorized()
    }

    const fieldErrors = payload?.errors
    const message =
      (Array.isArray(fieldErrors) && fieldErrors.length > 0
        ? `${payload.message}: ${fieldErrors.map((item) => item.message).join(', ')}`
        : payload?.message) ||
      (error.code === 'ECONNABORTED'
        ? 'The request timed out. Please check that the backend is running.'
        : null) ||
      error.message ||
      'Something went wrong. Please try again.'

    return Promise.reject(Object.assign(new Error(message), { status, fieldErrors }))
  },
)

/** Unwraps the { success, message, data, meta } API envelope. */
export async function unwrap(promise) {
  const response = await promise
  return { ...(response.data?.data || {}), meta: response.data?.meta, message: response.data?.message }
}

export default api
