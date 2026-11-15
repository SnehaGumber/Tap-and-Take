import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import FormField from '../../components/common/FormField.jsx'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { isEmail, required, validateForm } from '../../utils/validators.js'
import { ROLE_HOME } from '../../utils/constants.js'

export default function Login() {
  useDocumentTitle('Sign in')
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const onChange = (event) =>
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = validateForm(values, {
      email: (value) => (!value ? 'Email is required' : !isEmail(value) ? 'Enter a valid email' : ''),
      password: required('Password'),
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setBusy(true)
    try {
      const user = await login(values)
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`)
      const target = location.state?.from || ROLE_HOME[user.role] || '/'
      navigate(target, { replace: true })
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-card">
      <h1>Sign in to Tap & Take</h1>
      <p className="muted">Access your cart, wishlist and orders.</p>

      <form onSubmit={submit} noValidate>
        <FormField label="Email address" name="email" error={errors.email} required>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={onChange}
            placeholder="you@example.com"
          />
        </FormField>

        <FormField label="Password" name="password" error={errors.password} required>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={onChange}
            placeholder="Your password"
          />
        </FormField>

        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Signing in\u2026' : 'Sign in'}
        </button>
      </form>

      <p className="auth-card__foot">
        New to Tap & Take? <Link to="/register">Create an account</Link>
      </p>
      <p className="auth-card__foot muted">
        Seller? <Link to="/seller/login">Seller sign in</Link> &middot; Admin?{' '}
        <Link to="/admin/login">Admin console</Link>
      </p>
    </div>
  )
}
