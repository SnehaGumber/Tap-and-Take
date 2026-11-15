import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import FormField from '../../components/common/FormField.jsx'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { changePassword, updateProfile } from '../../services/authService.js'
import { formatDate } from '../../utils/format.js'
import { isStrongPassword } from '../../utils/validators.js'

export default function Profile() {
  useDocumentTitle('My profile')
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' })
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [errors, setErrors] = useState({})

  const saveProfile = async (event) => {
    event.preventDefault()
    if (!profile.name.trim()) {
      setErrors({ name: 'Name is required' })
      return
    }
    setErrors({})
    setSavingProfile(true)
    try {
      const result = await updateProfile({ name: profile.name, phone: profile.phone })
      setUser(result.user)
      toast.success('Profile updated')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!passwords.currentPassword) nextErrors.currentPassword = 'Current password is required'
    if (!isStrongPassword(passwords.newPassword)) {
      nextErrors.newPassword = 'Use at least 8 characters with letters and numbers'
    }
    if (passwords.newPassword !== passwords.confirm) nextErrors.confirm = 'Passwords do not match'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSavingPassword(true)
    try {
      await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      })
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' })
      toast.success('Password changed successfully')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="container section">
      <h1>My profile</h1>
      <p className="muted">Manage your personal details and account security.</p>

      <div className="grid grid--2 grid--gap">
        <section className="card">
          <h2>Account details</h2>
          <form onSubmit={saveProfile} noValidate>
            <FormField label="Full name" name="profile-name" error={errors.name} required>
              <input
                id="profile-name"
                value={profile.name}
                onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
              />
            </FormField>
            <FormField label="Email" name="profile-email" hint="Email cannot be changed">
              <input id="profile-email" value={user?.email || ''} readOnly disabled />
            </FormField>
            <FormField label="Phone" name="profile-phone">
              <input
                id="profile-phone"
                value={profile.phone}
                onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
              />
            </FormField>
            <button type="submit" className="btn btn--primary" disabled={savingProfile}>
              {savingProfile ? 'Saving\u2026' : 'Save changes'}
            </button>
          </form>

          <dl className="meta-list">
            <div>
              <dt>Role</dt>
              <dd>{user?.role}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{formatDate(user?.createdAt)}</dd>
            </div>
            <div>
              <dt>Last sign in</dt>
              <dd>{formatDate(user?.lastLoginAt, true)}</dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h2>Change password</h2>
          <form onSubmit={savePassword} noValidate>
            <FormField label="Current password" name="currentPassword" error={errors.currentPassword} required>
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={(event) =>
                  setPasswords((current) => ({ ...current, currentPassword: event.target.value }))
                }
              />
            </FormField>
            <FormField label="New password" name="newPassword" error={errors.newPassword} required>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={passwords.newPassword}
                onChange={(event) =>
                  setPasswords((current) => ({ ...current, newPassword: event.target.value }))
                }
              />
            </FormField>
            <FormField label="Confirm new password" name="confirm" error={errors.confirm} required>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={passwords.confirm}
                onChange={(event) => setPasswords((current) => ({ ...current, confirm: event.target.value }))}
              />
            </FormField>
            <button type="submit" className="btn btn--primary" disabled={savingPassword}>
              {savingPassword ? 'Updating\u2026' : 'Update password'}
            </button>
          </form>

          <p className="muted">
            Passwords are hashed with bcrypt on the server and never stored in plain text.
          </p>
          <Link className="link-btn" to="/addresses">
            Manage delivery addresses
          </Link>
        </section>
      </div>
    </div>
  )
}
