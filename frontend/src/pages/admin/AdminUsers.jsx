import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Pagination from '../../components/common/Pagination.jsx'
import Modal from '../../components/common/Modal.jsx'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import SkeletonLoader from '../../components/common/SkeletonLoader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import useAsync from '../../hooks/useAsync.js'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { useToast } from '../../context/ToastContext.jsx'
import {
  deleteUser,
  fetchUserDetails,
  fetchUsers,
  setUserActive,
  setUserRole,
} from '../../services/adminService.js'
import { formatCurrency, formatDate, formatNumber } from '../../utils/format.js'

export default function AdminUsers() {
  useDocumentTitle('Users')
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = Object.fromEntries(searchParams.entries())
  const [term, setTerm] = useState(query.q || '')
  const [detailsId, setDetailsId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const users = useAsync(() => fetchUsers({ limit: 15, ...query }), [searchParams.toString()])
  const details = useAsync(
    () => (detailsId ? fetchUserDetails(detailsId) : Promise.resolve(null)),
    [detailsId],
  )

  const update = (patch) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) next.delete(key)
      else next.set(key, String(value))
    })
    setSearchParams(next)
  }

  const toggleActive = async (user) => {
    try {
      await setUserActive(user._id, !user.isActive)
      toast.success(user.isActive ? 'User deactivated' : 'User activated')
      await users.refetch()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const changeRole = async (user, role) => {
    try {
      await setUserRole(user._id, role)
      toast.success(`Role updated to ${role}`)
      await users.refetch()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const confirmDelete = async () => {
    setBusy(true)
    try {
      await deleteUser(deleteTarget._id)
      toast.success('User deleted')
      setDeleteTarget(null)
      await users.refetch()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  const list = users.data?.users || []

  return (
    <div className="dash-page">
      <header className="dash-page__head">
        <div>
          <h1>Users</h1>
          <p className="muted">Search accounts, manage roles and activation.</p>
        </div>
      </header>

      <form
        className="toolbar"
        onSubmit={(event) => {
          event.preventDefault()
          update({ q: term, page: 1 })
        }}
      >
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search by name, email or store"
          aria-label="Search users"
        />
        <select value={query.role || ''} onChange={(event) => update({ role: event.target.value, page: 1 })}>
          <option value="">All roles</option>
          <option value="customer">Customers</option>
          <option value="seller">Sellers</option>
          <option value="admin">Admins</option>
        </select>
        <select value={query.isActive || ''} onChange={(event) => update({ isActive: event.target.value, page: 1 })}>
          <option value="">Any state</option>
          <option value="true">Active</option>
          <option value="false">Deactivated</option>
        </select>
        <button type="submit" className="btn btn--primary">
          Search
        </button>
      </form>

      {users.loading ? (
        <SkeletonLoader variant="row" count={8} />
      ) : users.error ? (
        <ErrorState message={users.error} onRetry={users.refetch} />
      ) : list.length === 0 ? (
        <EmptyState icon={'\u{1F465}'} title="No users match" message="Try a different search or filter." />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Store</th>
                  <th>Joined</th>
                  <th>State</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <strong>{user.name}</strong>
                      <small className="muted">{user.email}</small>
                    </td>
                    <td>
                      <select value={user.role} onChange={(event) => changeRole(user, event.target.value)}>
                        <option value="customer">customer</option>
                        <option value="seller">seller</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>
                      {user.store?.name ? (
                        <>
                          {user.store.name}
                          <StatusBadge status={user.store.status} />
                        </>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <StatusBadge status={user.isActive ? 'active' : 'inactive'} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="link-btn" onClick={() => setDetailsId(user._id)}>
                          Details
                        </button>
                        <button type="button" className="link-btn" onClick={() => toggleActive(user)}>
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button type="button" className="link-btn is-danger" onClick={() => setDeleteTarget(user)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={users.data?.meta} onChange={(page) => update({ page })} />
        </>
      )}

      <Modal open={Boolean(detailsId)} title="User details" onClose={() => setDetailsId(null)}>
        {details.loading ? (
          <SkeletonLoader count={4} />
        ) : details.error ? (
          <ErrorState message={details.error} />
        ) : details.data?.user ? (
          <dl className="meta-list">
            <div>
              <dt>Name</dt>
              <dd>{details.data.user.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{details.data.user.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{details.data.user.role}</dd>
            </div>
            <div>
              <dt>Orders placed</dt>
              <dd>{formatNumber(details.data.stats?.orders || 0)}</dd>
            </div>
            <div>
              <dt>Total spent</dt>
              <dd>{formatCurrency(details.data.stats?.spent || 0)}</dd>
            </div>
            <div>
              <dt>Products listed</dt>
              <dd>{formatNumber(details.data.stats?.products || 0)}</dd>
            </div>
            <div>
              <dt>Addresses</dt>
              <dd>{formatNumber(details.data.stats?.addresses || 0)}</dd>
            </div>
            <div>
              <dt>Reviews written</dt>
              <dd>{formatNumber(details.data.stats?.reviews || 0)}</dd>
            </div>
            <div>
              <dt>Last sign in</dt>
              <dd>{formatDate(details.data.user.lastLoginAt, true)}</dd>
            </div>
          </dl>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this user?"
        message="Accounts with orders are deactivated instead of deleted to keep order history intact."
        confirmLabel="Delete user"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
