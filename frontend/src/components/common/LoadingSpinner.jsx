export default function LoadingSpinner({ label = 'Loading', size = 'md', center = true }) {
  return (
    <div className={`spinner-wrap ${center ? 'spinner-wrap--center' : ''}`} role="status" aria-live="polite">
      <span className={`spinner spinner--${size}`} />
      {label ? <span className="spinner-label">{label}</span> : null}
    </div>
  )
}
