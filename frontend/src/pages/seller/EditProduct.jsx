import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ProductForm from '../../components/product/ProductForm.jsx'
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import useAsync from '../../hooks/useAsync.js'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { useToast } from '../../context/ToastContext.jsx'
import { fetchCategories, fetchProduct, updateProduct } from '../../services/productService.js'

export default function EditProduct() {
  const { id } = useParams()
  useDocumentTitle('Edit product')
  const toast = useToast()
  const navigate = useNavigate()
  const details = useAsync(() => fetchProduct(id), [id])
  const categories = useAsync(() => fetchCategories(), [])
  const [submitting, setSubmitting] = useState(false)

  const submit = async (payload) => {
    setSubmitting(true)
    try {
      await updateProduct(id, payload)
      toast.success('Product updated')
      navigate('/seller/products')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (details.loading) return <LoadingSpinner label="Loading product" />
  if (details.error || !details.data?.product) {
    return <ErrorState message={details.error || 'Product not found'} onRetry={details.refetch} />
  }

  return (
    <div className="dash-page">
      <header className="dash-page__head">
        <div>
          <h1>Edit product</h1>
          <p className="muted">Only the owning seller (or an admin) can update this listing.</p>
        </div>
      </header>

      <ProductForm
        categories={categories.data?.categories || []}
        initialProduct={details.data.product}
        submitting={submitting}
        submitLabel="Save changes"
        onSubmit={submit}
      />
    </div>
  )
}
