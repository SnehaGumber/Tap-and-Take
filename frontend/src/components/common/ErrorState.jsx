export default function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this content. Please try again.',
  onRetry,
}) {
  return (
    <div className="state-block state-block--error" role="alert">
      <div className="state-block__icon" aria-hidden="true">
        !
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  )
}
