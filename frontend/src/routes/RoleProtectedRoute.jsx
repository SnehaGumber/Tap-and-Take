import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import LoadingSpinner from '../components/common/LoadingSpinner.jsx'
import ErrorState from '../components/common/ErrorState.jsx'

/**
 * Client-side role gate. The API enforces the same rules server side, so this
 * only improves UX - it is never the only line of defence.
 */
export default function RoleProtectedRoute({ roles = [], redirectTo = '/login', children }) {
  const { user, isAuthenticated, initializing } = useAuth()
  const location = useLocation()

  if (initializing) return <LoadingSpinner label="Checking permissions" />
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname + location.search }} />
  }
  if (roles.length && !roles.includes(user.role)) {
    return (
      <div className="container section">
        <ErrorState
          title="Access denied"
          message={`This area is restricted to ${roles.join(' / ')} accounts. You are signed in as ${user.role}.`}
        />
      </div>
    )
  }
  return children || <Outlet />
}
