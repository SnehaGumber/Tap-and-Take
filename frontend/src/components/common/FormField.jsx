export default function FormField({
  label,
  name,
  error,
  hint,
  children,
  required = false,
  className = '',
}) {
  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      <label htmlFor={name}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {hint && !error ? <small className="field__hint">{hint}</small> : null}
      {error ? (
        <small className="field__error" role="alert">
          {error}
        </small>
      ) : null}
    </div>
  )
}
