/**
 * Delivery estimates are derived from the current date, not invented data:
 * standard dispatch is 1 business day plus a 3-5 day delivery window.
 */
const DAY = 24 * 60 * 60 * 1000

const FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

export function deliveryWindow(from = new Date()) {
  const start = new Date(from.getTime() + 3 * DAY)
  const end = new Date(from.getTime() + 5 * DAY)
  return {
    start,
    end,
    label: `${FORMATTER.format(start)} - ${FORMATTER.format(end)}`,
  }
}

export const RETURN_WINDOW_DAYS = 7
