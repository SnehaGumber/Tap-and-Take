export const ORDER_STATUSES = [
  'pending_payment',
  'payment_failed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]

export const ITEM_STATUSES = ['processing', 'shipped', 'delivered', 'cancelled']

export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'popular', label: 'Most popular' },
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Customer rating' },
  { value: 'discount', label: 'Highest discount' },
]

export const DISCOUNT_FILTERS = [
  { value: '10', label: '10% or more' },
  { value: '25', label: '25% or more' },
  { value: '40', label: '40% or more' },
]

export const ROLE_HOME = {
  customer: '/',
  seller: '/seller/dashboard',
  admin: '/admin/dashboard',
}

export const TRUST_ITEMS = [
  {
    icon: '\u2713',
    title: 'Verified sellers',
    text: 'Every store is reviewed and approved by the Tap & Take admin team before it can list products.',
  },
  {
    icon: '\u{1F512}',
    title: 'Secure payments',
    text: 'Card payments run through Stripe. Tap & Take never stores your card details.',
  },
  {
    icon: '\u21BB',
    title: 'Easy returns',
    text: 'Raise a return request within 7 days of delivery straight from your order page.',
  },
  {
    icon: '\u{1F69A}',
    title: 'Fast delivery',
    text: 'Free delivery on orders above the free-shipping threshold, tracked at every step.',
  },
  {
    icon: '\u{1F6E1}',
    title: 'Buyer protection',
    text: 'Server-side price and stock checks make sure you always pay the price you were shown.',
  },
]

export const CATEGORY_ICONS = {
  electronics: '\u{1F50C}',
  fashion: '\u{1F455}',
  'home-kitchen': '\u{1F3E1}',
  'beauty-health': '\u{1F9F4}',
  'sports-outdoors': '\u26BD',
  'books-stationery': '\u{1F4DA}',
}

export const PLACEHOLDER_IMAGE = '/product-images/placeholder.svg'
