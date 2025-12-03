import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BooksPage from './pages/BooksPage'
import BookDetailPage from './pages/BookDetailPage'
import ReviewPage from './pages/ReviewPage'
import AssignmentsPage from './pages/AssignmentsPage'
import AuditLogsPage from './pages/AuditLogsPage'
import SecretariatDashboard from './pages/SecretariatDashboard'
import AdminPage from './pages/AdminPage'
import PublicPortalPage from './pages/PublicPortalPage'
import NotFoundPage from './pages/NotFoundPage'
import ProtectedRoute from './components/ProtectedRoute'
import { UserRole } from './types/user'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} />
      <Route path="/public" element={<PublicPortalPage />} />
      
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/books" element={<BooksPage />} />
          <Route path="/books/:id" element={<BookDetailPage />} />
          <Route path="/assignments" element={<AssignmentsPage />} />
          <Route path="/review/:assignmentId" element={<ReviewPage />} />
          <Route 
            path="/audit-logs" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <AuditLogsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/secretariat" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.SECRETARIAT, UserRole.ADMIN]}>
                <SecretariatDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <AdminPage />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App