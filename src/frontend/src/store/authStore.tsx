'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createContext, useContext, ReactNode } from 'react'
import toast from 'react-hot-toast'

export interface User {
  address: string
  role: 'user' | 'admin'
  connectedAt: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface AuthActions {
  setUser: (address: string) => void
  logout: () => void
}

type AuthStore = AuthState & AuthActions

const useAuthStoreBase = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isLoading: false,
      isAuthenticated: false,

      // Actions
      setUser: (address: string) => {
        const user: User = {
          address,
          role: 'user',
          connectedAt: new Date().toISOString(),
        }
        set({
          user,
          isAuthenticated: true,
        })
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
        })
        
        toast.success('Wallet disconnected successfully')
      },
    }),
    {
      name: 'sealguard-auth',
      partialize: (state) => ({
        user: state.user,
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