import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import FormField from '../../components/common/FormField.jsx'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'

export default function AdminLogin() {
  useDocumentTitle('Admin sign in')
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
      if (user.role !== 'admin') {
        await logout()
        toast.error('Administrator access only.')
        return
      }
      toast.success('Signed in to the admin console')
      navigate('/admin/dashboard', { replace: true })
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-card">
      <h1>Admin console</h1>
      <p className="muted">Platform metrics, moderation and order operations.</p>

      <form onSubmit={submit} noValidate>
        <FormField label="Email address" name="admin-email" required>
          <input
            id="admin-email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
          />
        </FormField>
        <FormField label="Password" name="admin-password" required>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
          />
        </FormField>
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Signing in\u2026' : 'Enter console'}
        </button>
      </form>

      <p className="auth-card__foot muted">
        Back to <Link to="/">storefront</Link>
      </p>
    </div>
  )
}
