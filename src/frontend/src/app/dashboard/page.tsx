'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWeb3Auth } from '@/hooks/useWeb3Auth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'

export default function DashboardPage() {
  const { user, isConnected, isAuthenticated, isLoading } = useWeb3Auth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && (!isConnected || !isAuthenticated)) {
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

  if (!isConnected || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <DashboardLayout>
      <DashboardOverview />
    </DashboardLayout>
  )
}