import axios from 'axios'
import { toast } from 'react-toastify'

const instance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
instance.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const authState = localStorage.getItem('auth-storage')
    if (authState) {
      const { token } = JSON.parse(authState)
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
instance.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const { response } = error
    
    // Handle different error statuses
    if (response) {
      const { status, data } = response
      
      switch (status) {
        case 401: // Unauthorized
          // Clear auth state and redirect to login if not already there
          if (window.location.pathname !== '/login') {
            localStorage.removeItem('auth-storage')
            window.location.href = '/login'
            toast.error('Session expired. Please log in again.')
          }
          break
          
        case 403: // Forbidden
          toast.error('You do not have permission to perform this action')
          break
          
        case 404: // Not found
          toast.error('Resource not found')
          break
          
        case 422: // Validation error
          if (data.errors) {
            Object.values(data.errors).forEach((message: any) => {
              toast.error(message as string)
            })
          } else {
            toast.error(data.message || 'Validation failed')
          }
          break
          
        case 500: // Server error
          toast.error('Server error. Please try again later.')
          break
          
        default:
          toast.error(data.message || 'Something went wrong')
      }
    } else {
      // Network error
      toast.error('Network error. Please check your connection.')
    }
    
    return Promise.reject(error)
  }
)

export default instance