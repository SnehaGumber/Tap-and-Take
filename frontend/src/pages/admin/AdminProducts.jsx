import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Pagination from '../../components/common/Pagination.jsx'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import SkeletonLoader from '../../components/common/SkeletonLoader.jsx'
import useAsync from '../../hooks/useAsync.js'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { useToast } from '../../context/ToastContext.jsx'
import { fetchAdminProducts } from '../../services/adminService.js'
import { deleteProduct, fetchCategories } from '../../services/productService.js'
import { formatCurrency } from '../../utils/format.js'
import { PLACEHOLDER_IMAGE } from '../../utils/constants.js'

export default function AdminProducts() {
  useDocumentTitle('Products')
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = Object.fromEntries(searchParams.entries())
  const [term, setTerm] = useState(query.q || '')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const products = useAsync(
    () => fetchAdminProducts({ limit: 15, ...query }),
    [searchParams.toString()],
  )
  const categories = useAsync(() => fetchCategories(), [])

  const update = (patch) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) next.delete(key)
      else next.set(key, String(value))
    })
    setSearchParams(next)
  }

  const confirmDelete = async () => {
    setBusy(true)
    try {
      await deleteProduct(deleteTarget._id)
      toast.success('Product removed')
      setDeleteTarget(null)
      await products.refetch()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  const list = products.data?.products || []

  return (
    <div className="dash-page">
      <header className="dash-page__head">
        <div>
          <h1>All products</h1>
          <p className="muted">Moderate listings across every seller.</p>
        </div>
      </header>

      <form
        className="toolbar"
        onSubmit={(event) => {
          event.preventDefault()
          update({ q: term, page: 1 })
        }}
      >
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search products or brands"
          aria-label="Search products"
        />
        <select value={query.category || ''} onChange={(event) => update({ category: event.target.value, page: 1 })}>
          <option value="">All categories</option>
          {(categories.data?.categories || []).map((category) => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </select>
        <select value={query.sort || 'newest'} onChange={(event) => update({ sort: event.target.value, page: 1 })}>
          <option value="newest">Newest</option>
          <option value="popular">Best selling</option>
          <option value="price_desc">Price high to low</option>
          <option value="rating">Top rated</option>
        </select>
        <button type="submit" className="btn btn--primary">
          Search
        </button>
      </form>

      {products.loading ? (
        <SkeletonLoader variant="row" count={8} />
      ) : products.error ? (
        <ErrorState message={products.error} onRetry={products.refetch} />
      ) : list.length === 0 ? (
        <EmptyState icon={'\u{1F4E6}'} title="No products found" message="Adjust your filters to see more listings." />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Seller</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((product) => (
                  <tr key={product._id}>
                    <td>
                      <div className="cell-product">
                        <img
                          src={product.images?.[0]?.url || PLACEHOLDER_IMAGE}
                          alt=""
                          onError={(event) => {
                            event.currentTarget.src = PLACEHOLDER_IMAGE
                          }}
                        />
                        <div>
                          <strong>{product.title}</strong>
                          <small className="muted">{product.brand}</small>
                        </div>
                      </div>
                    </td>
                    <td>{product.seller?.store?.name || product.seller?.name || '-'}</td>
                    <td>{product.category?.name || '-'}</td>
                    <td>{formatCurrency(product.finalPrice ?? product.price)}</td>
                    <td className={product.stock === 0 ? 'is-danger' : product.stock <= 5 ? 'is-warning' : ''}>
                      {product.stock}
                    </td>
                    <td>
                      <span className={`badge ${product.isActive ? 'badge--success' : 'badge--muted'}`}>
                        {product.isActive ? 'Published' : 'Hidden'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link className="link-btn" to={`/products/${product.slug || product._id}`}>
                          View
                        </Link>
                        <button type="button" className="link-btn is-danger" onClick={() => setDeleteTarget(product)}>
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={products.data?.meta} onChange={(page) => update({ page })} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove this product?"
        message={`"${deleteTarget?.title || ''}" will be taken off the storefront.`}
        confirmLabel="Remove product"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
