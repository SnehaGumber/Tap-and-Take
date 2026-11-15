import { useEffect, useState } from 'react'
import FormField from '../common/FormField.jsx'
import { PLACEHOLDER_IMAGE } from '../../utils/constants.js'

const EMPTY = {
  title: '',
  description: '',
  brand: '',
  category: '',
  price: '',
  discountPercent: '0',
  stock: '',
  tags: '',
  isActive: 'true',
}

/**
 * Shared create/edit product form. Images are stored locally by the
 * backend; existing images can be removed by publicId.
 */
export default function ProductForm({
  categories = [],
  initialProduct = null,
  submitting = false,
  submitLabel = 'Save product',
  onSubmit,
}) {
  const [values, setValues] = useState(EMPTY)
  const [specs, setSpecs] = useState([{ key: '', value: '' }])
  const [files, setFiles] = useState([])
  const [removeImages, setRemoveImages] = useState([])
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!initialProduct) return
    setValues({
      title: initialProduct.title || '',
      description: initialProduct.description || '',
      brand: initialProduct.brand || '',
      category: initialProduct.category?._id || initialProduct.category || '',
      price: String(initialProduct.price ?? ''),
      discountPercent: String(initialProduct.discountPercent ?? 0),
      stock: String(initialProduct.stock ?? ''),
      tags: (initialProduct.tags || []).join(', '),
      isActive: initialProduct.isActive === false ? 'false' : 'true',
    })
    setSpecs(
      initialProduct.specifications?.length
        ? initialProduct.specifications.map((spec) => ({ key: spec.key, value: spec.value }))
        : [{ key: '', value: '' }],
    )
  }, [initialProduct])

  const onChange = (event) =>
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }))

  const validate = () => {
    const next = {}
    if (values.title.trim().length < 3) next.title = 'Title must be at least 3 characters'
    if (values.description.trim().length < 20) next.description = 'Description must be at least 20 characters'
    if (!values.brand.trim()) next.brand = 'Brand is required'
    if (!values.category) next.category = 'Choose a category'
    if (!(Number(values.price) > 0)) next.price = 'Price must be greater than 0'
    const discount = Number(values.discountPercent)
    if (Number.isNaN(discount) || discount < 0 || discount > 90) {
      next.discountPercent = 'Discount must be between 0 and 90'
    }
    if (!(Number(values.stock) >= 0) || values.stock === '') next.stock = 'Stock is required'
    if (!initialProduct && files.length === 0) next.images = 'Add at least one product image'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = (event) => {
    event.preventDefault()
    if (!validate()) return

    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      brand: values.brand.trim(),
      category: values.category,
      price: Number(values.price),
      discountPercent: Number(values.discountPercent || 0),
      stock: Number(values.stock),
      isActive: values.isActive,
      specifications: specs.filter((spec) => spec.key.trim() && spec.value.trim()),
      tags: values.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      images: files,
    }
    if (initialProduct && removeImages.length) payload.removeImages = removeImages
    onSubmit(payload)
  }

  const existingImages = (initialProduct?.images || []).filter(
    (image) => !removeImages.includes(image.publicId),
  )

  return (
    <form className="card product-form" onSubmit={submit} noValidate>
      <div className="grid grid--2">
        <FormField label="Product title" name="title" error={errors.title} required>
          <input id="title" name="title" value={values.title} onChange={onChange} maxLength={160} />
        </FormField>
        <FormField label="Brand" name="brand" error={errors.brand} required>
          <input id="brand" name="brand" value={values.brand} onChange={onChange} maxLength={60} />
        </FormField>
      </div>

      <FormField
        label="Description"
        name="description"
        error={errors.description}
        hint="Explain the product in at least 20 characters"
        required
      >
        <textarea
          id="description"
          name="description"
          rows={5}
          value={values.description}
          onChange={onChange}
          maxLength={5000}
        />
      </FormField>

      <div className="grid grid--3">
        <FormField label="Category" name="category" error={errors.category} required>
          <select id="category" name="category" value={values.category} onChange={onChange}>
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Price (USD)" name="price" error={errors.price} required>
          <input
            id="price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={values.price}
            onChange={onChange}
          />
        </FormField>
        <FormField label="Discount %" name="discountPercent" error={errors.discountPercent}>
          <input
            id="discountPercent"
            name="discountPercent"
            type="number"
            min="0"
            max="90"
            value={values.discountPercent}
            onChange={onChange}
          />
        </FormField>
      </div>

      <div className="grid grid--3">
        <FormField label="Stock" name="stock" error={errors.stock} required>
          <input id="stock" name="stock" type="number" min="0" value={values.stock} onChange={onChange} />
        </FormField>
        <FormField label="Tags" name="tags" hint="Comma separated keywords">
          <input id="tags" name="tags" value={values.tags} onChange={onChange} />
        </FormField>
        <FormField label="Visibility" name="isActive">
          <select id="isActive" name="isActive" value={values.isActive} onChange={onChange}>
            <option value="true">Published</option>
            <option value="false">Hidden</option>
          </select>
        </FormField>
      </div>

      <fieldset className="specs">
        <legend>Specifications</legend>
        {specs.map((spec, index) => (
          <div className="specs__row" key={index}>
            <input
              aria-label={`Specification name ${index + 1}`}
              placeholder="e.g. Battery life"
              value={spec.key}
              onChange={(event) =>
                setSpecs((current) =>
                  current.map((item, i) => (i === index ? { ...item, key: event.target.value } : item)),
                )
              }
            />
            <input
              aria-label={`Specification value ${index + 1}`}
              placeholder="e.g. 30 hours"
              value={spec.value}
              onChange={(event) =>
                setSpecs((current) =>
                  current.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)),
                )
              }
            />
            <button
              type="button"
              className="link-btn is-danger"
              onClick={() => setSpecs((current) => current.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setSpecs((current) => [...current, { key: '', value: '' }])}
        >
          Add specification
        </button>
      </fieldset>

      <FormField
        label="Product images"
        name="images"
        error={errors.images}
        hint="Up to 6 images (JPG, PNG or WEBP, max 5MB each). Stored on the Trendora backend."
        required={!initialProduct}
      >
        <input
          id="images"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 6))}
        />
      </FormField>

      {files.length ? (
        <div className="image-strip">
          {files.map((file) => (
            <figure key={file.name}>
              <img src={URL.createObjectURL(file)} alt="" />
              <figcaption>{file.name}</figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      {initialProduct ? (
        <div className="image-strip">
          {existingImages.length === 0 ? (
            <p className="muted">No images left - upload at least one before publishing.</p>
          ) : (
            existingImages.map((image) => (
              <figure key={image.publicId || image.url}>
                <img
                  src={image.url || PLACEHOLDER_IMAGE}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.src = PLACEHOLDER_IMAGE
                  }}
                />
                {image.publicId ? (
                  <button
                    type="button"
                    className="link-btn is-danger"
                    onClick={() => setRemoveImages((current) => [...current, image.publicId])}
                  >
                    Remove
                  </button>
                ) : null}
              </figure>
            ))
          )}
        </div>
      ) : null}

      <button type="submit" className="btn btn--primary btn--lg" disabled={submitting}>
        {submitting ? 'Saving\u2026' : submitLabel}
      </button>
    </form>
  )
}
