'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createContext, useContext, ReactNode } from 'react'
import { apiClient } from '@/lib/apiClient'
import toast from 'react-hot-toast'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'user' | 'admin'
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  refreshAuth: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
}

type AuthStore = AuthState & AuthActions

const useAuthStoreBase = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,

      // Actions
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true })
          
          const response = await apiClient.post('/auth/login', {
            email,
            password,
          })

          const { user, token, refreshToken } = response.data.data
          
          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          })

          // Set token in API client
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          toast.success('Login successful!')
        } catch (error: any) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Login failed'
          toast.error(message)
          throw error
        }
      },

      register: async (data: RegisterData) => {
        try {
          set({ isLoading: true })
          
          const response = await apiClient.post('/auth/register', data)
          
          const { user, token, refreshToken } = response.data.data
          
          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          })

          // Set token in API client
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          toast.success('Registration successful!')
        } catch (error: any) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Registration failed'
          toast.error(message)
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        })
        
        // Remove token from API client
        delete apiClient.defaults.headers.common['Authorization']
        
        toast.success('Logged out successfully')
      },

      checkAuth: async () => {
        const { token } = get()
        
        if (!token) {
          set({ isLoading: false })
          return
        }

        try {
          set({ isLoading: true })
          
          // Set token in API client
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          const response = await apiClient.get('/auth/profile')
          const user = response.data.data
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: any) {
          // Token is invalid, clear auth state
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          })
          
          delete apiClient.defaults.headers.common['Authorization']
        }
      },

      refreshAuth: async () => {
        const { refreshToken } = get()
        
        if (!refreshToken) {
          throw new Error('No refresh token available')
        }

        try {
          const response = await apiClient.post('/auth/refresh', {
            refreshToken,
          })
          
          const { token: newToken, refreshToken: newRefreshToken } = response.data.data
          
          set({
            token: newToken,
            refreshToken: newRefreshToken,
          })
          
          // Update token in API client
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
          
          return newToken
        } catch (error) {
          // Refresh failed, logout user
          get().logout()
          throw error
        }
      },

      updateProfile: async (data: Partial<User>) => {
        try {
          const response = await apiClient.put('/auth/profile', data)
          const updatedUser = response.data.data
          
          set({ user: updatedUser })
          
          toast.success('Profile updated successfully')
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to update profile'
          toast.error(message)
          throw error
        }
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        try {
          await apiClient.put('/auth/change-password', {
            currentPassword,
            newPassword,
          })
          
          toast.success('Password changed successfully')
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to change password'
          toast.error(message)
          throw error
        }
      },
    }),
    {
      name: 'sealguard-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Context for SSR compatibility
const AuthContext = createContext<AuthStore | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={useAuthStoreBase()}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthStore(): AuthStore {
  const context = useContext(AuthContext)
  if (!context) {
    return useAuthStoreBase()
  }
  return context
}

// Setup API client interceptors
if (typeof window !== 'undefined') {
  // Request interceptor to add token
  apiClient.interceptors.request.use(
    (config) => {
      const state = useAuthStoreBase.getState()
      if (state.token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${state.token}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  // Response interceptor to handle token refresh
  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config
      
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true
        
        try {
          const state = useAuthStoreBase.getState()
          const newToken = await state.refreshAuth()
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return apiClient(originalRequest)
        } catch (refreshError) {
          // Refresh failed, redirect to login
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      }
      
      return Promise.reject(error)
    }
  )
}