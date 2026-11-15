export function formatCurrency(amount, currency = 'USD') {
  const value = Number(amount) || 0
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'USD').toUpperCase(),
      maximumFractionDigits: 2,
    }).format(value)
  } catch (error) {
    return `$${value.toFixed(2)}`
  }
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0)
}

export function formatDate(value, withTime = false) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

export function statusLabel(status = '') {
  return String(status)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function truncate(text = '', length = 90) {
  return text.length > length ? `${text.slice(0, length - 1)}\u2026` : text
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}
