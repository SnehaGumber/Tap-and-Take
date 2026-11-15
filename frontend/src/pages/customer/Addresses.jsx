import { useState } from 'react'
import FormField from '../../components/common/FormField.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import Modal from '../../components/common/Modal.jsx'
import AccountNav from '../../components/layout/AccountNav.jsx'
import useAsync from '../../hooks/useAsync.js'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { useToast } from '../../context/ToastContext.jsx'
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  setDefaultAddress,
  updateAddress,
} from '../../services/orderService.js'

const EMPTY = {
  label: 'Home',
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  isDefault: false,
}

export default function Addresses() {
  useDocumentTitle('Addresses')
  const toast = useToast()
  const addresses = useAsync(() => fetchAddresses(), [])
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

  const openEdit = (address) => {
    setForm({ ...EMPTY, ...address })
    setEditingId(address._id)
    setErrors({})
    setOpen(true)
  }

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    ;['fullName', 'phone', 'line1', 'city', 'state', 'postalCode', 'country'].forEach((field) => {
      if (!String(form[field] || '').trim()) nextErrors[field] = 'This field is required'
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setBusy(true)
    try {
      const payload = {
        label: form.label,
        fullName: form.fullName,
        phone: form.phone,
        line1: form.line1,
        line2: form.line2 || undefined,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        country: form.country,
        isDefault: Boolean(form.isDefault),
      }
      if (editingId) await updateAddress(editingId, payload)
      else await createAddress(payload)
      toast.success(editingId ? 'Address updated' : 'Address saved')
      setOpen(false)
      await addresses.refetch()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    setBusy(true)
    try {
      await deleteAddress(deleteTarget._id)
      toast.success('Address deleted')
      setDeleteTarget(null)
      await addresses.refetch()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  const makeDefault = async (address) => {
    try {
      await setDefaultAddress(address._id)
      toast.success('Default address updated')
      await addresses.refetch()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const list = addresses.data?.addresses || []

  return (
    <div className="container section">
      <AccountNav
        title="Delivery addresses"
        subtitle="Saved addresses are offered at checkout, and the default one is preselected."
      />
      <div className="listing__head">
        <div>
          <p className="muted">{list.length} saved address(es)</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          Add new address
        </button>
      </div>

      {addresses.loading ? (
        <LoadingSpinner label="Loading addresses" />
      ) : addresses.error ? (
        <ErrorState message={addresses.error} onRetry={addresses.refetch} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={'\u{1F4CD}'}
          title="No addresses saved"
          message="Add a delivery address to speed up checkout."
          actionLabel="Add address"
          onAction={openCreate}
        />
      ) : (
        <div className="grid grid--3 grid--gap">
          {list.map((address) => (
            <article className={`card address ${address.isDefault ? 'is-default' : ''}`} key={address._id}>
              <header>
                <strong>{address.label}</strong>
                {address.isDefault ? <span className="badge badge--success">Default</span> : null}
              </header>
              <p>
                {address.fullName}
                <br />
                {address.line1}
                {address.line2 ? (
                  <>
                    <br />
                    {address.line2}
                  </>
                ) : null}
                <br />
                {address.city}, {address.state} {address.postalCode}
                <br />
                {address.country}
                <br />
                {address.phone}
              </p>
              <div className="address__actions">
                <button type="button" className="link-btn" onClick={() => openEdit(address)}>
                  Edit
                </button>
                {!address.isDefault ? (
                  <button type="button" className="link-btn" onClick={() => makeDefault(address)}>
                    Make default
                  </button>
                ) : null}
                <button type="button" className="link-btn is-danger" onClick={() => setDeleteTarget(address)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={open}
        title={editingId ? 'Edit address' : 'Add a new address'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" form="address-form" className="btn btn--primary" disabled={busy}>
              {busy ? 'Saving\u2026' : 'Save address'}
            </button>
          </>
        }
      >
        <form id="address-form" onSubmit={submit} noValidate>
          <div className="grid grid--2">
            <FormField label="Label" name="label">
              <select id="label" name="label" value={form.label} onChange={onChange}>
                <option value="Home">Home</option>
                <option value="Work">Work</option>
                <option value="Other">Other</option>
              </select>
            </FormField>
            <FormField label="Full name" name="fullName" error={errors.fullName} required>
              <input id="fullName" name="fullName" value={form.fullName} onChange={onChange} />
            </FormField>
          </div>
          <FormField label="Phone" name="phone" error={errors.phone} required>
            <input id="phone" name="phone" value={form.phone} onChange={onChange} />
          </FormField>
          <FormField label="Address line 1" name="line1" error={errors.line1} required>
            <input id="line1" name="line1" value={form.line1} onChange={onChange} />
          </FormField>
          <FormField label="Address line 2" name="line2">
            <input id="line2" name="line2" value={form.line2} onChange={onChange} />
          </FormField>
          <div className="grid grid--2">
            <FormField label="City" name="city" error={errors.city} required>
              <input id="city" name="city" value={form.city} onChange={onChange} />
            </FormField>
            <FormField label="State" name="state" error={errors.state} required>
              <input id="state" name="state" value={form.state} onChange={onChange} />
            </FormField>
          </div>
          <div className="grid grid--2">
            <FormField label="Postal code" name="postalCode" error={errors.postalCode} required>
              <input id="postalCode" name="postalCode" value={form.postalCode} onChange={onChange} />
            </FormField>
            <FormField label="Country" name="country" error={errors.country} required>
              <input id="country" name="country" value={form.country} onChange={onChange} />
            </FormField>
          </div>
          <label className="filters__check">
            <input type="checkbox" name="isDefault" checked={form.isDefault} onChange={onChange} />
            <span>Use as my default delivery address</span>
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this address?"
        message="This cannot be undone. Existing orders keep the address they were shipped to."
        confirmLabel="Delete address"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
