// User and Authentication Types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'user' | 'admin'
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
}

// Document and File Types
export interface Document {
  id: string
  userId: string
  filename: string
  originalName: string
  name: string // Display name for the document
  mimeType: string
  size: number
  hash: string
  filecoinCid?: string
  dealId?: string
  status: DocumentStatus
  verificationStatus: VerificationStatus
  uploadedAt: string
  lastVerifiedAt?: string
  lastVerified?: string // Alternative property name used in components
  storageProvider?: string // Filecoin storage provider
  tags?: string[] // Document tags
  metadata?: DocumentMetadata
}

export type DocumentStatus = 
  | 'uploading'
  | 'processing'
  | 'stored'
  | 'failed'
  | 'deleted'

export type VerificationStatus = 
  | 'pending'
  | 'verified'
  | 'failed'
  | 'expired'
  | 'verifying' // Added missing status used in components

export interface DocumentMetadata {
  description?: string
  tags?: string[]
  category?: string
  isPublic?: boolean
  expiresAt?: string
}

// Filecoin and Storage Types
export interface FilecoinDeal {
  id: string
  documentId: string
  dealId: string
  cid: string
  provider: string
  status: DealStatus
  price: string
  duration: number
  startEpoch: number
  endEpoch: number
  createdAt: string
  updatedAt: string
}

export type DealStatus = 
  | 'pending'
  | 'active'
  | 'expired'
  | 'failed'
  | 'terminated'

// PDP (Proof of Data Possession) Types
export interface PDPChallenge {
  id: string
  documentId: string
  documentName?: string // Document name for display
  challengeType?: string // Type of challenge (random, scheduled, manual)
  challengeData: string | any // Can be string or object with sectors, merkleRoot, etc.
  expectedResponse?: string
  status: ChallengeStatus
  createdAt: string
  respondedAt?: string
  completedAt?: string // When challenge was completed
  response?: string
  responseTime?: number // Response time in milliseconds
  blockNumber?: number // Blockchain block number
  storageProvider?: string // Storage provider identifier
  failureReason?: string // Reason for failure if applicable
}

export type ChallengeStatus = 
  | 'pending'
  | 'responded'
  | 'verified'
  | 'failed'
  | 'expired'
  | 'completed' // Added missing status used in components
  | 'in_progress' // Added missing status used in components

export interface PDPVerification {
  id: string
  documentId: string
  challengeId: string
  isValid: boolean
  verifiedAt: string
  proof: string
}

// Payment Types
export interface Payment {
  id: string
  userId: string
  documentId?: string
  amount: string
  currency: 'FIL' | 'USD'
  status: PaymentStatus
  transactionHash?: string
  createdAt: string
  completedAt?: string
}

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data: T
  meta?: PaginationMeta
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiError {
  success: false
  message: string
  errors?: Record<string, string[]>
  code?: string
}

// UI Component Types
export interface UploadProgress {
  filename: string
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

export interface TableColumn<T = any> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (value: any, item: T) => React.ReactNode
  className?: string
}

export interface TableProps<T = any> {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  pagination?: PaginationMeta
  onPageChange?: (page: number) => void
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  className?: string
}

// Form Types
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'file' | 'checkbox'
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[]
  validation?: {
    min?: number
    max?: number
    pattern?: RegExp
    custom?: (value: any) => string | undefined
  }
}

// Dashboard Types
export interface DashboardStats {
  totalDocuments: number
  totalStorage: number
  activeDeals: number
  totalSpent: string
  verificationRate: number
}

export interface ActivityLog {
  id: string
  userId: string
  action: string
  description: string
  metadata?: Record<string, any>
  createdAt: string
}

// Search and Filter Types
export interface SearchFilters {
  query?: string
  status?: DocumentStatus[]
  verificationStatus?: VerificationStatus[]
  dateFrom?: string
  dateTo?: string
  tags?: string[]
  category?: string
}

export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}

// Notification Types
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  data?: Record<string, any>
  createdAt: string
}

export type NotificationType = 
  | 'document_uploaded'
  | 'verification_completed'
  | 'verification_failed'
  | 'deal_created'
  | 'deal_expired'
  | 'payment_completed'
  | 'payment_failed'
  | 'system_alert'

// Settings Types
export interface UserSettings {
  notifications: {
    email: boolean
    push: boolean
    types: NotificationType[]
  }
  privacy: {
    publicProfile: boolean
    shareAnalytics: boolean
  }
  storage: {
    autoVerification: boolean
    verificationInterval: number
    maxFileSize: number
  }
}

// Utility Types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T = any> {
  data: T | null
  loading: boolean
  error: string | null
}

export type Theme = 'light' | 'dark' | 'system'

export interface AppConfig {
  apiUrl: string
  filecoinNetwork: 'mainnet' | 'testnet'
  maxFileSize: number
  supportedFileTypes: string[]
  verificationInterval: number
}