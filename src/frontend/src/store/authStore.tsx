'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createContext, useContext, ReactNode } from 'react'
import { apiClient } from '@/lib/apiClient'
import toast from 'react-hot-toast'

export interface User {
  id: string
  address: string
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
  logout: () => void
  checkAuth: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
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

// Setup API client interceptors for wallet-based auth
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
}