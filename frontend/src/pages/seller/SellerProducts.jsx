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
import { fetchSellerProducts } from '../../services/sellerService.js'
import { deleteProduct } from '../../services/productService.js'
import { formatCurrency, formatDate } from '../../utils/format.js'
import { PLACEHOLDER_IMAGE } from '../../utils/constants.js'

export default function SellerProducts() {
  useDocumentTitle('My products')
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = Object.fromEntries(searchParams.entries())
  const [term, setTerm] = useState(query.q || '')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const products = useAsync(
    () => fetchSellerProducts({ limit: 12, ...query }),
    [searchParams.toString()],
  )

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
      toast.success('Product deleted')
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
          <h1>My products</h1>
          <p className="muted">You can only see and edit products owned by your store.</p>
        </div>
        <Link className="btn btn--primary" to="/seller/products/new">
          Add product
        </Link>
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
          placeholder="Search my catalogue"
          aria-label="Search my products"
        />
        <select value={query.sort || 'newest'} onChange={(event) => update({ sort: event.target.value, page: 1 })}>
          <option value="newest">Newest</option>
          <option value="price_desc">Price high to low</option>
          <option value="price_asc">Price low to high</option>
          <option value="popular">Best selling</option>
        </select>
        <button type="submit" className="btn btn--primary">
          Search
        </button>
      </form>

      {products.loading ? (
        <SkeletonLoader variant="row" count={6} />
      ) : products.error ? (
        <ErrorState message={products.error} onRetry={products.refetch} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={'\u{1F4E6}'}
          title="No products yet"
          message="Add your first product to start selling on Tap & Take."
          actionLabel="Add product"
          actionTo="/seller/products/new"
        />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Rating</th>
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
                          <small className="muted">
                            {product.brand} &middot; added {formatDate(product.createdAt)}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {formatCurrency(product.finalPrice ?? product.price)}
                      {product.discountPercent > 0 ? (
                        <small className="muted">-{product.discountPercent}%</small>
                      ) : null}
                    </td>
                    <td className={product.stock === 0 ? 'is-danger' : product.stock <= 5 ? 'is-warning' : ''}>
                      {product.stock}
                    </td>
                    <td>
                      {(product.ratingAverage || 0).toFixed(1)} ({product.ratingCount || 0})
                    </td>
                    <td>
                      <span className={`badge ${product.isActive ? 'badge--success' : 'badge--muted'}`}>
                        {product.isActive ? 'Published' : 'Hidden'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link className="link-btn" to={`/seller/products/${product._id}/edit`}>
                          Edit
                        </Link>
                        <Link className="link-btn" to={`/products/${product.slug || product._id}`}>
                          View
                        </Link>
                        <button type="button" className="link-btn is-danger" onClick={() => setDeleteTarget(product)}>
                          Delete
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
        title="Delete this product?"
        message={`"${deleteTarget?.title || ''}" will be removed from the storefront. Products that already appear in orders are archived instead of deleted.`}
        confirmLabel="Delete product"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
