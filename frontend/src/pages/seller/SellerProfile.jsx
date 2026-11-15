import { useState } from 'react'
import FormField from '../../components/common/FormField.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { updateStoreProfile } from '../../services/sellerService.js'
import { isEmail } from '../../utils/validators.js'

export default function SellerProfile() {
  useDocumentTitle('Store profile')
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [values, setValues] = useState({
    name: user?.store?.name || '',
    description: user?.store?.description || '',
    contactEmail: user?.store?.contactEmail || user?.email || '',
    contactPhone: user?.store?.contactPhone || '',
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const onChange = (event) =>
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    if (values.name.trim().length < 2) next.name = 'Store name is required'
    if (values.contactEmail && !isEmail(values.contactEmail)) next.contactEmail = 'Enter a valid email'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      const result = await updateStoreProfile({
        name: values.name.trim(),
        description: values.description.trim(),
        contactEmail: values.contactEmail || undefined,
        contactPhone: values.contactPhone || undefined,
      })
      setUser(result.user)
      toast.success('Store profile updated')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dash-page">
      <header className="dash-page__head">
        <div>
          <h1>Store profile</h1>
          <p className="muted">This information is shown to customers on your product pages.</p>
        </div>
        <StatusBadge status={user?.store?.status || 'pending'} />
      </header>

      <form className="card" onSubmit={submit} noValidate>
        <FormField label="Store name" name="name" error={errors.name} required>
          <input id="name" name="name" value={values.name} onChange={onChange} maxLength={120} />
        </FormField>
        <FormField label="Store description" name="description" hint="Tell customers what you specialise in">
          <textarea
            id="description"
            name="description"
            rows={4}
            value={values.description}
            onChange={onChange}
            maxLength={1500}
          />
        </FormField>
        <div className="grid grid--2">
          <FormField label="Contact email" name="contactEmail" error={errors.contactEmail}>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              value={values.contactEmail}
              onChange={onChange}
            />
          </FormField>
          <FormField label="Contact phone" name="contactPhone">
            <input id="contactPhone" name="contactPhone" value={values.contactPhone} onChange={onChange} />
          </FormField>
        </div>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Saving\u2026' : 'Save store profile'}
        </button>
      </form>

      <section className="card">
        <h2>Account owner</h2>
        <dl className="meta-list">
          <div>
            <dt>Name</dt>
            <dd>{user?.name}</dd>
          </div>
          <div>
            <dt>Login email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt>Store status</dt>
            <dd>
              <StatusBadge status={user?.store?.status || 'pending'} />
            </dd>
          </div>
        </dl>
        <p className="muted">
          Store approval is controlled by platform administrators. Rejected or pending stores cannot
          sell on the storefront.
        </p>
      </section>
    </div>
  )
}
