import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import LoadingSpinner from '../components/common/LoadingSpinner.jsx'

export default function ProtectedRoute({ redirectTo = '/login', children }) {
  const { isAuthenticated, initializing } = useAuth()
  const location = useLocation()

  if (initializing) return <LoadingSpinner label="Checking your session" />
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname + location.search }} />
  }
  return children || <Outlet />
}
