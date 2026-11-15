export default function Pagination({ meta, onChange }) {
  if (!meta || meta.totalPages <= 1) return null

  const { page, totalPages } = meta
  const pages = []
  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const end = Math.min(totalPages, start + 4)
  for (let index = start; index <= end; index += 1) pages.push(index)

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="pagination__btn"
        onClick={() => onChange(page - 1)}
        disabled={!meta.hasPrevPage}
      >
        Previous
      </button>
      {start > 1 ? <span className="pagination__dots">\u2026</span> : null}
      {pages.map((item) => (
        <button
          type="button"
          key={item}
          className={`pagination__btn ${item === page ? 'is-active' : ''}`}
          onClick={() => onChange(item)}
          aria-current={item === page ? 'page' : undefined}
        >
          {item}
        </button>
      ))}
      {end < totalPages ? <span className="pagination__dots">\u2026</span> : null}
      <button
        type="button"
        className="pagination__btn"
        onClick={() => onChange(page + 1)}
        disabled={!meta.hasNextPage}
      >
        Next
      </button>
    </nav>
  )
}
