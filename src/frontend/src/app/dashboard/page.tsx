'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWeb3Auth } from '@/hooks/useWeb3Auth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { ReownConnect } from '@/components/Web3/ReownConnect'

export default function DashboardPage() {
  const { user, isConnected, isAuthenticated, isLoading } = useWeb3Auth()
  const router = useRouter()

  useEffect(() => {
    console.log('Dashboard page - Auth state changed:', { 
      isLoading, 
      isConnected, 
      isAuthenticated, 
      user: user?.address 
    });
    
    if (!isLoading && !isConnected) {
      console.log('Dashboard page - Wallet not connected, redirecting to login');
      router.push('/login')
    }
  }, [isConnected, isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isConnected || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Show SIWE authentication prompt if wallet is connected but not authenticated
  if (isConnected && user && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Complete Authentication
            </h2>
            <p className="text-gray-600 mb-6">
              Please sign the message to complete your authentication and access the dashboard.
            </p>
          </div>
          <div className="bg-white py-8 px-6 shadow-lg rounded-lg border border-gray-200">
            <ReownConnect onSuccess={() => router.push('/dashboard')} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <DashboardOverview />
    </DashboardLayout>
  )
}