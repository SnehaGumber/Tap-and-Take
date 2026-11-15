import { statusLabel } from '../../utils/format.js'

const TONE = {
  pending_payment: 'warning',
  payment_failed: 'danger',
  processing: 'info',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'muted',
  paid: 'success',
  pending: 'warning',
  failed: 'danger',
  refunded: 'muted',
  approved: 'success',
  rejected: 'danger',
  active: 'success',
  inactive: 'muted',
}

export default function StatusBadge({ status }) {
  return <span className={`badge badge--${TONE[status] || 'muted'}`}>{statusLabel(status)}</span>
}
