'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FileText,
  Upload,
  Shield,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatFileSize, formatDate, formatRelativeTime } from '@/lib/utils'

// Mock data - replace with actual API calls
const mockStats = {
  totalDocuments: 24,
  totalStorage: 1024 * 1024 * 150, // 150MB
  activeDeals: 18,
  totalSpent: '0.0045',
  verificationRate: 98.5,
}

const mockRecentDocuments = [
  {
    id: '1',
    filename: 'contract-2024.pdf',
    size: 1024 * 1024 * 2.5,
    status: 'verified' as const,
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: '2',
    filename: 'financial-report-q4.xlsx',
    size: 1024 * 1024 * 5.2,
    status: 'storing' as const,
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: '3',
    filename: 'presentation-slides.pptx',
    size: 1024 * 1024 * 12.8,
    status: 'verified' as const,
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
]

const mockRecentActivity = [
  {
    id: '1',
    action: 'Document uploaded',
    description: 'contract-2024.pdf uploaded successfully',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    type: 'upload' as const,
  },
  {
    id: '2',
    action: 'Verification completed',
    description: 'PDP verification passed for presentation-slides.pptx',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    type: 'verification' as const,
  },
  {
    id: '3',
    action: 'Storage deal created',
    description: 'Filecoin deal created for financial-report-q4.xlsx',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    type: 'deal' as const,
  },
]

export function DashboardOverview() {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState(mockStats)
  const [recentDocuments, setRecentDocuments] = useState(mockRecentDocuments)
  const [recentActivity, setRecentActivity] = useState(mockRecentActivity)

  useEffect(() => {
    // Simulate API call
    const loadData = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setIsLoading(false)
    }
    loadData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back!</h1>
        <p className="text-blue-100 mb-4">
          Your documents are secure and verified on the Filecoin network.
        </p>
        <Link
          href="/dashboard/upload"
          className="inline-flex items-center px-4 py-2 bg-white text-blue-600 rounded-md font-medium hover:bg-blue-50 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Upload New Document
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Upload className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Storage</p>
              <p className="text-2xl font-bold text-gray-900">{formatFileSize(stats.totalStorage)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Deals</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeDeals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSpent} FIL</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Verification Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.verificationRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Documents</h2>
              <Link
                href="/dashboard/documents"
                className="text-sm text-blue-600 hover:text-blue-500 font-medium"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(doc.size)} • {formatRelativeTime(doc.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {doc.status === 'verified' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {activity.type === 'upload' && (
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Upload className="h-4 w-4 text-blue-600" />
                      </div>
                    )}
                    {activity.type === 'verification' && (
                      <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                    )}
                    {activity.type === 'deal' && (
                      <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Shield className="h-4 w-4 text-purple-600" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.action}
                    </p>
                    <p className="text-sm text-gray-500">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/upload"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Upload Document</p>
              <p className="text-sm text-gray-500">Add a new document to secure storage</p>
            </div>
          </Link>

          <Link
            href="/dashboard/documents"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">View Documents</p>
              <p className="text-sm text-gray-500">Browse your document library</p>
            </div>
          </Link>

          <Link
            href="/dashboard/settings"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Shield className="h-6 w-6 text-purple-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Security Settings</p>
              <p className="text-sm text-gray-500">Manage verification preferences</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}