'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Image,
  FileArchive,
  FileVideo,
  FileAudio,
  MoreVertical,
  RefreshCw,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatFileSize, formatDate, formatRelativeTime } from '@/lib/utils'
import { Document, VerificationStatus } from '@/types'
import toast from 'react-hot-toast'

// Mock data - replace with actual API calls
const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Contract_Agreement_2024.pdf',
    size: 2048576,
    mimeType: 'application/pdf',
    uploadedAt: new Date('2024-01-15T10:30:00Z'),
    filecoinCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    verificationStatus: 'verified',
    lastVerified: new Date('2024-01-20T14:22:00Z'),
    storageProvider: 'f01234',
    dealId: 'deal123456',
    tags: ['contract', 'legal'],
  },
  {
    id: '2',
    name: 'Financial_Report_Q4.xlsx',
    size: 5242880,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uploadedAt: new Date('2024-01-18T16:45:00Z'),
    filecoinCid: 'bafybeihkoviema7g3gxyt6la7b7kbbv2dqfqt6qjrpd5yrwmhqx2h5rqm4',
    verificationStatus: 'pending',
    storageProvider: 'f05678',
    dealId: 'deal789012',
    tags: ['finance', 'report'],
  },
  {
    id: '3',
    name: 'Product_Images.zip',
    size: 15728640,
    mimeType: 'application/zip',
    uploadedAt: new Date('2024-01-20T09:15:00Z'),
    filecoinCid: 'bafybeif6guig6ceq2tpat6bqhf6fzqzjqzqzqzqzqzqzqzqzqzqzqzqzq',
    verificationStatus: 'failed',
    lastVerified: new Date('2024-01-21T11:30:00Z'),
    storageProvider: 'f09876',
    dealId: 'deal345678',
    tags: ['images', 'product'],
  },
  {
    id: '4',
    name: 'Presentation_Demo.pptx',
    size: 8388608,
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    uploadedAt: new Date('2024-01-22T13:20:00Z'),
    filecoinCid: 'bafybeigxyz123abc456def789ghi012jkl345mno678pqr901stu234vwx',
    verificationStatus: 'verifying',
    storageProvider: 'f01111',
    dealId: 'deal901234',
    tags: ['presentation'],
  },
]

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.startsWith('video/')) return FileVideo
  if (mimeType.startsWith('audio/')) return FileAudio
  if (mimeType.includes('zip') || mimeType.includes('rar')) return FileArchive
  return FileText
}

function getStatusIcon(status: VerificationStatus) {
  switch (status) {
    case 'verified':
      return <CheckCircle className="h-5 w-5 text-green-600" />
    case 'failed':
      return <AlertTriangle className="h-5 w-5 text-red-600" />
    case 'verifying':
      return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
    case 'pending':
      return <Clock className="h-5 w-5 text-yellow-600" />
    default:
      return <Clock className="h-5 w-5 text-gray-400" />
  }
}

function getStatusText(status: VerificationStatus) {
  switch (status) {
    case 'verified':
      return 'Verified'
    case 'failed':
      return 'Failed'
    case 'verifying':
      return 'Verifying'
    case 'pending':
      return 'Pending'
    default:
      return 'Unknown'
  }
}

function getStatusColor(status: VerificationStatus) {
  switch (status) {
    case 'verified':
      return 'bg-green-100 text-green-800'
    case 'failed':
      return 'bg-red-100 text-red-800'
    case 'verifying':
      return 'bg-blue-100 text-blue-800'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function DocumentLibrary() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setDocuments(mockDocuments)
      setLoading(false)
    }, 1000)
  }, [])

  const filteredDocuments = documents
    .filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesStatus = statusFilter === 'all' || doc.verificationStatus === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'date':
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
          break
        case 'size':
          comparison = a.size - b.size
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const handleSelectDocument = (id: string) => {
    setSelectedDocuments(prev => 
      prev.includes(id) 
        ? prev.filter(docId => docId !== id)
        : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([])
    } else {
      setSelectedDocuments(filteredDocuments.map(doc => doc.id))
    }
  }

  const handleDownload = (document: Document) => {
    toast.success(`Downloading ${document.name}...`)
    // Implement download logic
  }

  const handleView = (document: Document) => {
    toast.success(`Opening ${document.name}...`)
    // Implement view logic
  }

  const handleDelete = (document: Document) => {
    if (confirm(`Are you sure you want to delete ${document.name}?`)) {
      setDocuments(prev => prev.filter(doc => doc.id !== document.id))
      toast.success(`${document.name} deleted successfully`)
    }
  }

  const handleVerify = (document: Document) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === document.id 
        ? { ...doc, verificationStatus: 'verifying' as VerificationStatus }
        : doc
    ))
    toast.success(`Verification started for ${document.name}`)
    
    // Simulate verification process
    setTimeout(() => {
      setDocuments(prev => prev.map(doc => 
        doc.id === document.id 
          ? { 
              ...doc, 
              verificationStatus: 'verified' as VerificationStatus,
              lastVerified: new Date()
            }
          : doc
      ))
      toast.success(`${document.name} verified successfully`)
    }, 3000)
  }

  const handleBulkDelete = () => {
    if (selectedDocuments.length === 0) return
    
    if (confirm(`Are you sure you want to delete ${selectedDocuments.length} document(s)?`)) {
      setDocuments(prev => prev.filter(doc => !selectedDocuments.includes(doc.id)))
      setSelectedDocuments([])
      toast.success(`${selectedDocuments.length} document(s) deleted successfully`)
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Document Library</h1>
          <p className="text-gray-600 mt-1">
            Manage your documents stored on the Filecoin network
          </p>
        </div>
        <div className="flex space-x-3">
          {selectedDocuments.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete ({selectedDocuments.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as VerificationStatus | 'all')}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="verifying">Verifying</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-2">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-')
                setSortBy(field as 'name' | 'date' | 'size')
                setSortOrder(order as 'asc' | 'desc')
              }}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="size-desc">Largest First</option>
              <option value="size-asc">Smallest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Upload your first document to get started'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedDocuments.length === filteredDocuments.length && filteredDocuments.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filecoin CID
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((document) => {
                  const FileIcon = getFileIcon(document.mimeType)
                  
                  return (
                    <tr key={document.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedDocuments.includes(document.id)}
                          onChange={() => handleSelectDocument(document.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <FileIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {document.name}
                            </p>
                            {document.tags && document.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {document.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(document.verificationStatus)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document.verificationStatus)}`}>
                            {getStatusText(document.verificationStatus)}
                          </span>
                        </div>
                        {document.lastVerified && (
                          <p className="text-xs text-gray-500 mt-1">
                            Last verified {formatRelativeTime(document.lastVerified)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatFileSize(document.size)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>
                          {formatDate(document.uploadedAt)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatRelativeTime(document.uploadedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-mono text-gray-900">
                          {document.filecoinCid.substring(0, 20)}...
                        </div>
                        <div className="text-xs text-gray-500">
                          Provider: {document.storageProvider}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleView(document)}
                            className="text-gray-400 hover:text-blue-600"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(document)}
                            className="text-gray-400 hover:text-green-600"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {document.verificationStatus !== 'verifying' && (
                            <button
                              onClick={() => handleVerify(document)}
                              className="text-gray-400 hover:text-blue-600"
                              title="Verify"
                            >
                              <Shield className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(document)}
                            className="text-gray-400 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Documents</p>
              <p className="text-2xl font-semibold text-gray-900">{documents.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Verified</p>
              <p className="text-2xl font-semibold text-gray-900">
                {documents.filter(d => d.verificationStatus === 'verified').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">
                {documents.filter(d => d.verificationStatus === 'pending' || d.verificationStatus === 'verifying').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Failed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {documents.filter(d => d.verificationStatus === 'failed').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}