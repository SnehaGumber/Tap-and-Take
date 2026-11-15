export default function QuantitySelector({ value, max = 20, min = 1, onChange, disabled = false }) {
  const clamp = (next) => Math.max(min, Math.min(max, next))

  return (
    <div className="qty" role="group" aria-label="Quantity">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        &minus;
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(clamp(Number(event.target.value) || min))}
        aria-label="Quantity"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}
