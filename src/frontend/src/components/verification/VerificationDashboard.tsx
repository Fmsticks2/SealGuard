'use client'

import { useState, useEffect } from 'react'
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  TrendingUp,
  Activity,
  FileText,
  Calendar,
  Hash,
  Server,
  Zap,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { PDPChallenge, ChallengeStatus } from '@/types'
import toast from 'react-hot-toast'

// Mock data - replace with actual API calls
const mockChallenges: PDPChallenge[] = [
  {
    id: 'challenge_001',
    documentId: '1',
    documentName: 'Contract_Agreement_2024.pdf',
    challengeType: 'random',
    status: 'completed',
    createdAt: '2024-01-20T10:00:00Z',
    completedAt: '2024-01-20T10:05:23Z',
    blockNumber: 2845672,
    challengeData: {
      sectors: [1, 45, 89, 123, 200],
      merkleRoot: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
      proof: '0x9876543210fedcba0987654321fedcba0987654321fedcba0987654321fedcba',
    },
    storageProvider: 'f01234',
    responseTime: 323,
  },
  {
    id: 'challenge_002',
    documentId: '2',
    documentName: 'Financial_Report_Q4.xlsx',
    challengeType: 'scheduled',
    status: 'pending',
    createdAt: '2024-01-22T14:30:00Z',
    blockNumber: 2847891,
    challengeData: {
      sectors: [12, 67, 134, 189, 245],
      merkleRoot: '0x2b3c4d5e6f7890ab1a2b3c4d5e6f7890ab1a2b3c4d5e6f7890ab1a2b3c4d5e6f',
    },
    storageProvider: 'f05678',
  },
  {
    id: 'challenge_003',
    documentId: '3',
    documentName: 'Product_Images.zip',
    challengeType: 'random',
    status: 'failed',
    createdAt: '2024-01-21T09:15:00Z',
    completedAt: '2024-01-21T09:25:45Z',
    blockNumber: 2846234,
    challengeData: {
      sectors: [23, 78, 156, 201, 267],
      merkleRoot: '0x3c4d5e6f7890ab1a2b3c4d5e6f7890ab1a2b3c4d5e6f7890ab1a2b3c4d5e6f78',
    },
    storageProvider: 'f09876',
    responseTime: 1205,
    failureReason: 'Storage provider failed to respond within timeout period',
  },
  {
    id: 'challenge_004',
    documentId: '4',
    documentName: 'Presentation_Demo.pptx',
    challengeType: 'manual',
    status: 'in_progress',
    createdAt: '2024-01-22T16:45:00Z',
    blockNumber: 2848123,
    challengeData: {
      sectors: [34, 89, 167, 212, 278],
      merkleRoot: '0x4d5e6f7890ab1a2b3c4d5e6f7890ab1a2b3c4d5e6f7890ab1a2b3c4d5e6f7890',
    },
    storageProvider: 'f01111',
  },
]

function getStatusIcon(status: ChallengeStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-green-600" />
    case 'failed':
      return <AlertTriangle className="h-5 w-5 text-red-600" />
    case 'in_progress':
      return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
    case 'pending':
      return <Clock className="h-5 w-5 text-yellow-600" />
    default:
      return <Clock className="h-5 w-5 text-gray-400" />
  }
}

function getStatusText(status: ChallengeStatus) {
  switch (status) {
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    case 'in_progress':
      return 'In Progress'
    case 'pending':
      return 'Pending'
    default:
      return 'Unknown'
  }
}

function getStatusColor(status: ChallengeStatus) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'failed':
      return 'bg-red-100 text-red-800'
    case 'in_progress':
      return 'bg-blue-100 text-blue-800'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getChallengeTypeColor(type: string) {
  switch (type) {
    case 'random':
      return 'bg-purple-100 text-purple-800'
    case 'scheduled':
      return 'bg-blue-100 text-blue-800'
    case 'manual':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function VerificationDashboard() {
  const [challenges, setChallenges] = useState<PDPChallenge[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | ChallengeStatus>('all')
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d')

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setChallenges(mockChallenges)
      setLoading(false)
    }, 1000)
  }, [])

  const filteredChallenges = challenges.filter(challenge => {
    if (filter !== 'all' && challenge.status !== filter) return false
    
    if (timeRange !== 'all') {
      const now = new Date()
      const challengeDate = new Date(challenge.createdAt)
      const diffHours = (now.getTime() - challengeDate.getTime()) / (1000 * 60 * 60)
      
      switch (timeRange) {
        case '24h':
          return diffHours <= 24
        case '7d':
          return diffHours <= 24 * 7
        case '30d':
          return diffHours <= 24 * 30
      }
    }
    
    return true
  })

  const stats = {
    total: challenges.length,
    completed: challenges.filter(c => c.status === 'completed').length,
    failed: challenges.filter(c => c.status === 'failed').length,
    pending: challenges.filter(c => c.status === 'pending' || c.status === 'in_progress').length,
    avgResponseTime: (() => {
      const challengesWithResponseTime = challenges.filter(c => c.responseTime)
      return challengesWithResponseTime.length > 0 
        ? challengesWithResponseTime.reduce((acc, c) => acc + (c.responseTime || 0), 0) / challengesWithResponseTime.length
        : 0
    })(),
  }

  const successRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0

  const handleRunChallenge = (documentId: string) => {
    toast.success('Manual verification challenge initiated')
    // Implement manual challenge logic
  }

  const handleRetryChallenge = (challengeId: string) => {
    setChallenges(prev => prev.map(c => 
      c.id === challengeId 
        ? { ...c, status: 'in_progress' as ChallengeStatus }
        : c
    ))
    toast.success('Challenge retry initiated')
    
    // Simulate retry process
    setTimeout(() => {
      setChallenges(prev => prev.map(c => 
        c.id === challengeId 
          ? { 
              ...c, 
              status: 'completed' as ChallengeStatus,
              completedAt: new Date().toISOString(),
              responseTime: Math.floor(Math.random() * 500) + 200
            }
          : c
      ))
      toast.success('Challenge completed successfully')
    }, 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PDP Verification</h1>
          <p className="text-gray-600 mt-1">
            Monitor Proof of Data Possession challenges and verification status
          </p>
        </div>
        <button
          onClick={() => handleRunChallenge('manual')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center space-x-2"
        >
          <Zap className="h-4 w-4" />
          <span>Run Manual Challenge</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Challenges</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Failed</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.failed}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Success Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{successRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Avg Response</p>
              <p className="text-2xl font-semibold text-gray-900">{Math.round(stats.avgResponseTime)}ms</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | ChallengeStatus)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Time Range:</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '24h' | '7d' | '30d' | 'all')}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Challenges List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredChallenges.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges found</h3>
            <p className="text-gray-600">
              {filter !== 'all' || timeRange !== 'all'
                ? 'Try adjusting your filters'
                : 'No PDP challenges have been initiated yet'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredChallenges.map((challenge) => (
              <div key={challenge.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-900">
                        {challenge.documentName}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getChallengeTypeColor(challenge.challengeType || 'unknown')}`}>
                        {challenge.challengeType}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Created: {formatDate(challenge.createdAt)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Hash className="h-4 w-4" />
                        <span>Block: {challenge.blockNumber?.toLocaleString() || 'N/A'}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Server className="h-4 w-4" />
                        <span>Provider: {challenge.storageProvider}</span>
                      </div>
                      
                      {challenge.responseTime && (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>Response: {challenge.responseTime}ms</span>
                        </div>
                      )}
                    </div>
                    
                    {challenge.completedAt && (
                      <div className="mt-2 text-sm text-gray-600">
                        Completed: {formatDate(challenge.completedAt)} ({formatRelativeTime(challenge.completedAt)})
                      </div>
                    )}
                    
                    {challenge.failureReason && (
                      <div className="mt-2 text-sm text-red-600">
                        Failure reason: {challenge.failureReason}
                      </div>
                    )}
                    
                    {/* Challenge Data */}
                    <div className="mt-4 bg-gray-50 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Challenge Details</h4>
                      <div className="space-y-2 text-xs text-gray-600">
                        {typeof challenge.challengeData === 'object' && challenge.challengeData.sectors && (
                          <div>
                            <span className="font-medium">Sectors:</span> [{challenge.challengeData.sectors.join(', ')}]
                          </div>
                        )}
                        {typeof challenge.challengeData === 'object' && challenge.challengeData.merkleRoot && (
                          <div className="break-all">
                            <span className="font-medium">Merkle Root:</span> {challenge.challengeData.merkleRoot}
                          </div>
                        )}
                        {typeof challenge.challengeData === 'object' && challenge.challengeData.proof && (
                          <div className="break-all">
                            <span className="font-medium">Proof:</span> {challenge.challengeData.proof}
                          </div>
                        )}
                        {typeof challenge.challengeData === 'string' && (
                          <div className="break-all">
                            <span className="font-medium">Challenge Data:</span> {challenge.challengeData}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 ml-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(challenge.status)}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(challenge.status)}`}>
                        {getStatusText(challenge.status)}
                      </span>
                    </div>
                    
                    {challenge.status === 'failed' && (
                      <button
                        onClick={() => handleRetryChallenge(challenge.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PDP Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">About PDP Verification</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• PDP (Proof of Data Possession) challenges verify that storage providers actually store your data</li>
          <li>• Random challenges are automatically generated by the Filecoin network</li>
          <li>• Scheduled challenges run at regular intervals to ensure continuous verification</li>
          <li>• Manual challenges can be initiated on-demand for immediate verification</li>
          <li>• Failed challenges may indicate data loss or storage provider issues</li>
        </ul>
      </div>
    </div>
  )
}