import { Link } from 'react-router-dom'

export default function EmptyState({
  icon = '\u{1F50E}',
  title = 'Nothing here yet',
  message = '',
  actionLabel,
  actionTo,
  onAction,
}) {
  return (
    <div className="state-block">
      <div className="state-block__icon" aria-hidden="true">
        {icon}
      </div>
      <h3>{title}</h3>
      {message ? <p>{message}</p> : null}
      {actionLabel && actionTo ? (
        <Link className="btn btn--primary" to={actionTo}>
          {actionLabel}
        </Link>
      ) : null}
      {actionLabel && onAction ? (
        <button type="button" className="btn btn--primary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
