import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { UserRole } from '../types/user'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
}

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuthStore()

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Check if route requires specific roles
  if (allowedRoles && user) {
    const hasRequiredRole = allowedRoles.includes(user.role)
    if (!hasRequiredRole) {
      // Redirect to dashboard if user doesn't have the required role
      return <Navigate to="/dashboard" replace />
    }
  }

  // If there are children, render them, otherwise render the Outlet
  return children ? <>{children}</> : <Outlet />
}

export default ProtectedRoute