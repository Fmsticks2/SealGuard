'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'
import { useWeb3Auth } from '@/hooks/useWeb3Auth'
import { WalletConnect } from '@/components/Web3/WalletConnect'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const { isConnected, isAuthenticated, user } = useWeb3Auth()

  useEffect(() => {
    console.log('Login page - Auth state changed:', { isConnected, isAuthenticated, user: user?.address })
    // Redirect to dashboard when wallet is connected, regardless of SIWE authentication
    // The dashboard will handle the authentication requirement
    if (isConnected && user) {
      console.log('Login page - Wallet connected, redirecting to dashboard')
      router.push('/dashboard')
    }
  }, [isConnected, user, router])

  const handleLoginSuccess = () => {
    toast.success('Wallet connected and authenticated!')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">SealGuard</span>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back
          </h2>
          <p className="text-gray-600">
            Sign in to your account to access your secure documents
          </p>
        </div>

        {/* Web3 Login */}
        <div className="bg-white py-8 px-6 shadow-lg rounded-lg border border-gray-200">
          <WalletConnect onSuccess={handleLoginSuccess} />
        </div>
      </div>
    </div>
  )
}