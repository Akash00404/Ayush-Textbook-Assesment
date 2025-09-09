import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, LoginCredentials, AuthResponse } from '../types/user'
import axios from '../utils/axios'

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: async (credentials: LoginCredentials & { role?: string }) => {
        set({ isLoading: true, error: null })
        try {
          const response = await axios.post<AuthResponse>('/auth/login', credentials)
          const data = response.data.data
          const token = (response.data as any).token ?? (data as any)?.token

          // Set token in axios default headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

          set({
            user: data.user,
            token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || 'Login failed. Please try again.',
          })
          throw error
        }
      },
      logout: () => {
        // Remove token from axios headers
        delete axios.defaults.headers.common['Authorization']

        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
