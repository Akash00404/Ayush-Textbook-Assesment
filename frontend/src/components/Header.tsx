import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Bars3Icon, BellIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void
}

const Header = ({ setSidebarOpen }: HeaderProps) => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 flex items-center justify-between h-16 px-4 md:px-6">
      {/* Mobile menu button */}
      <button
        type="button"
        className="md:hidden text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Logo (mobile) */}
      <div className="md:hidden flex items-center">
        <h1 className="text-lg font-semibold text-primary-600">NCISM Review</h1>
      </div>

      {/* Right section */}
      <div className="flex items-center ml-auto">
        {/* Notifications */}
        <button
          type="button"
          className="p-1 rounded-full text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <span className="sr-only">View notifications</span>
          <BellIcon className="h-6 w-6" aria-hidden="true" />
        </button>

        {/* Profile dropdown */}
        <div className="ml-4 relative flex items-center">
          <div className="flex items-center">
            {/* Avatar */}
            <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
              {user?.name.charAt(0)}
            </div>
            
            {/* User info */}
            <div className="ml-3 hidden md:block">
              <div className="text-sm font-medium text-gray-700">{user?.name}</div>
              <div className="text-xs text-gray-500">{user?.role}</div>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="ml-4 p-1 rounded-full text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <span className="sr-only">Logout</span>
            <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header