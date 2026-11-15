import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import FormField from '../../components/common/FormField.jsx'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'

export default function SellerLogin() {
  useDocumentTitle('Seller sign in')
  const { login, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [values, setValues] = useState({ email: '', password: '' })
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      const user = await login(values)
      if (user.role !== 'seller') {
        await logout()
        toast.error('This portal is for seller accounts only.')
        return
      }
      toast.success(`Welcome back, ${user.store?.name || user.name}`)
      navigate('/seller/dashboard', { replace: true })
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-card">
      <h1>Seller sign in</h1>
      <p className="muted">Manage your catalogue, orders and store profile.</p>

      <form onSubmit={submit} noValidate>
        <FormField label="Email address" name="seller-email" required>
          <input
            id="seller-email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
          />
        </FormField>
        <FormField label="Password" name="seller-password" required>
          <input
            id="seller-password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
          />
        </FormField>
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Signing in\u2026' : 'Sign in to seller hub'}
        </button>
      </form>

      <p className="auth-card__foot">
        Not a seller yet? <Link to="/register?role=seller">Open a store</Link>
      </p>
      <p className="auth-card__foot muted">
        Shopping instead? <Link to="/login">Customer sign in</Link>
      </p>
    </div>
  )
}
