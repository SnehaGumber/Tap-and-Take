import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import FormField from '../../components/common/FormField.jsx'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { isEmail, isStrongPassword, required, validateForm } from '../../utils/validators.js'
import { ROLE_HOME } from '../../utils/constants.js'

export default function Register() {
  useDocumentTitle('Create account')
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: searchParams.get('role') === 'seller' ? 'seller' : 'customer',
    storeName: '',
    storeDescription: '',
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const onChange = (event) =>
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = validateForm(values, {
      name: (value) => (!value ? 'Name is required' : value.trim().length < 2 ? 'Name is too short' : ''),
      email: (value) => (!value ? 'Email is required' : !isEmail(value) ? 'Enter a valid email' : ''),
      password: (value) =>
        !value
          ? 'Password is required'
          : !isStrongPassword(value)
            ? 'Use at least 8 characters with letters and numbers'
            : '',
      confirmPassword: (value, all) => (value !== all.password ? 'Passwords do not match' : ''),
      storeName: (value, all) => (all.role === 'seller' ? required('Store name')(value) : ''),
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setBusy(true)
    try {
      const payload = {
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
        role: values.role,
        ...(values.role === 'seller'
          ? { storeName: values.storeName, storeDescription: values.storeDescription || undefined }
          : {}),
      }
      const user = await register(payload)
      toast.success('Account created successfully')
      if (user.role === 'seller') {
        toast.info('Your store is pending admin approval before you can publish products.')
      }
      navigate(ROLE_HOME[user.role] || '/', { replace: true })
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-card">
      <h1>Create your Trendora account</h1>
      <p className="muted">Shop as a customer or open your own store.</p>

      <div className="role-toggle" role="group" aria-label="Account type">
        <button
          type="button"
          className={values.role === 'customer' ? 'is-active' : ''}
          onClick={() => setValues((current) => ({ ...current, role: 'customer' }))}
        >
          I want to shop
        </button>
        <button
          type="button"
          className={values.role === 'seller' ? 'is-active' : ''}
          onClick={() => setValues((current) => ({ ...current, role: 'seller' }))}
        >
          I want to sell
        </button>
      </div>

      <form onSubmit={submit} noValidate>
        <FormField label="Full name" name="name" error={errors.name} required>
          <input id="name" name="name" value={values.name} onChange={onChange} autoComplete="name" />
        </FormField>

        <FormField label="Email address" name="email" error={errors.email} required>
          <input id="email" name="email" type="email" value={values.email} onChange={onChange} autoComplete="email" />
        </FormField>

        <div className="grid grid--2">
          <FormField
            label="Password"
            name="password"
            error={errors.password}
            hint="Min 8 characters, letters and numbers"
            required
          >
            <input
              id="password"
              name="password"
              type="password"
              value={values.password}
              onChange={onChange}
              autoComplete="new-password"
            />
          </FormField>
          <FormField label="Confirm password" name="confirmPassword" error={errors.confirmPassword} required>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={values.confirmPassword}
              onChange={onChange}
              autoComplete="new-password"
            />
          </FormField>
        </div>

        <FormField label="Phone (optional)" name="phone" error={errors.phone}>
          <input id="phone" name="phone" value={values.phone} onChange={onChange} autoComplete="tel" />
        </FormField>

        {values.role === 'seller' ? (
          <>
            <FormField label="Store name" name="storeName" error={errors.storeName} required>
              <input id="storeName" name="storeName" value={values.storeName} onChange={onChange} />
            </FormField>
            <FormField label="Store description (optional)" name="storeDescription">
              <textarea
                id="storeDescription"
                name="storeDescription"
                rows={3}
                value={values.storeDescription}
                onChange={onChange}
              />
            </FormField>
          </>
        ) : null}

        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Creating account\u2026' : 'Create account'}
        </button>
      </form>

      <p className="auth-card__foot">
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </div>
  )
}
