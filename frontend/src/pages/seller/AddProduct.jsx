import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProductForm from '../../components/product/ProductForm.jsx'
import useAsync from '../../hooks/useAsync.js'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { useToast } from '../../context/ToastContext.jsx'
import { createProduct, fetchCategories } from '../../services/productService.js'

export default function AddProduct() {
  useDocumentTitle('Add product')
  const toast = useToast()
  const navigate = useNavigate()
  const categories = useAsync(() => fetchCategories(), [])
  const [submitting, setSubmitting] = useState(false)

  const submit = async (payload) => {
    setSubmitting(true)
    try {
      await createProduct(payload)
      toast.success('Product created')
      navigate('/seller/products')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dash-page">
      <header className="dash-page__head">
        <div>
          <h1>Add a product</h1>
          <p className="muted">Images are stored on the Tap & Take backend, so no third-party image host is required.</p>
        </div>
      </header>

      <ProductForm
        categories={categories.data?.categories || []}
        submitting={submitting}
        submitLabel="Publish product"
        onSubmit={submit}
      />
    </div>
  )
}
