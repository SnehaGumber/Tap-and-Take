import { useState } from 'react'
import FormField from '../../components/common/FormField.jsx'
import Modal from '../../components/common/Modal.jsx'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import SkeletonLoader from '../../components/common/SkeletonLoader.jsx'
import useAsync from '../../hooks/useAsync.js'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { useToast } from '../../context/ToastContext.jsx'
import { createCategory, deleteCategory, updateCategory } from '../../services/adminService.js'
import { fetchCategories } from '../../services/productService.js'
import { formatDate } from '../../utils/format.js'

const EMPTY = { name: '', description: '', image: '', isActive: true }

export default function AdminCategories() {
  useDocumentTitle('Categories')
  const toast = useToast()
  const categories = useAsync(() => fetchCategories(), [])
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)

  const onChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  const openCreate = () => {
    setForm(EMPTY)
    setEditingId(null)
    setErrors({})
    setOpen(true)
  }

  const openEdit = (category) => {
    setForm({
      name: category.name,
      description: category.description || '',
      image: category.image || '',
      isActive: category.isActive !== false,
    })
    setEditingId(category._id)
    setErrors({})
    setOpen(true)
  }

  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    if (form.name.trim().length < 2) next.name = 'Category name must be at least 2 characters'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        image: form.image.trim() || undefined,
        isActive: Boolean(form.isActive),
      }
      if (editingId) await updateCategory(editingId, payload)
      else await createCategory(payload)
      toast.success(editingId ? 'Category updated' : 'Category created')
      setOpen(false)
      await categories.refetch()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    setBusy(true)
    try {
      await deleteCategory(deleteTarget._id)
      toast.success('Category deleted')
      setDeleteTarget(null)
      await categories.refetch()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  const list = categories.data?.categories || []

  return (
    <div className="dash-page">
      <header className="dash-page__head">
        <div>
          <h1>Categories</h1>
          <p className="muted">Categories power storefront navigation and product filters.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          New category
        </button>
      </header>

      {categories.loading ? (
        <SkeletonLoader variant="row" count={5} />
      ) : categories.error ? (
        <ErrorState message={categories.error} onRetry={categories.refetch} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={'\u{1F5C2}'}
          title="No categories yet"
          message="Create your first category so sellers can list products."
          actionLabel="New category"
          onAction={openCreate}
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Slug</th>
                <th>Products</th>
                <th>Created</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((category) => (
                <tr key={category._id}>
                  <td>
                    <strong>{category.name}</strong>
                    <small className="muted">{category.description || 'No description'}</small>
                  </td>
                  <td>{category.slug}</td>
                  <td>{category.productCount ?? '-'}</td>
                  <td>{formatDate(category.createdAt)}</td>
                  <td>
                    <span className={`badge ${category.isActive !== false ? 'badge--success' : 'badge--muted'}`}>
                      {category.isActive !== false ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="link-btn" onClick={() => openEdit(category)}>
                        Edit
                      </button>
                      <button type="button" className="link-btn is-danger" onClick={() => setDeleteTarget(category)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        title={editingId ? 'Edit category' : 'New category'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" form="category-form" className="btn btn--primary" disabled={busy}>
              {busy ? 'Saving\u2026' : 'Save category'}
            </button>
          </>
        }
      >
        <form id="category-form" onSubmit={submit} noValidate>
          <FormField label="Name" name="name" error={errors.name} required>
            <input id="name" name="name" value={form.name} onChange={onChange} maxLength={60} />
          </FormField>
          <FormField label="Description" name="description">
            <textarea
              id="description"
              name="description"
              rows={3}
              value={form.description}
              onChange={onChange}
              maxLength={500}
            />
          </FormField>
          <FormField label="Image URL" name="image" hint="Optional banner image for the category">
            <input id="image" name="image" value={form.image} onChange={onChange} />
          </FormField>
          <label className="filters__check">
            <input type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} />
            <span>Visible on the storefront</span>
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this category?"
        message="Categories that still contain products cannot be deleted."
        confirmLabel="Delete category"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
