export const isEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())

export const isStrongPassword = (value = '') =>
  value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value)

/**
 * Tiny shared form validator. Rules are plain functions so pages stay readable.
 */
export function validateForm(values, rules) {
  const errors = {}
  Object.entries(rules).forEach(([field, validate]) => {
    const message = validate(values[field], values)
    if (message) errors[field] = message
  })
  return errors
}

export const required = (label) => (value) =>
  value === undefined || value === null || String(value).trim() === '' ? `${label} is required` : ''
