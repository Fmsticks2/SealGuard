/**
 * Centralized status definitions for SealGuard Frontend
 * This file consolidates all status types to avoid redundancy
 */

// Document verification status (matches backend API)
export type VerificationStatus = 
  | 'pending'
  | 'processing' 
  | 'verified'
  | 'rejected'
  | 'expired'
  | 'archived';

// Challenge status for verification dashboard
export type ChallengeStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed';

// Document lifecycle states (matches smart contract)
export type DocumentLifecycle = 
  | 'PENDING'
  | 'PROCESSING'
  | 'ACTIVE'
  | 'REJECTED'
  | 'EXPIRED'
  | 'ARCHIVED';

// User roles
export type UserRole = 
  | 'USER'
  | 'VERIFIER'
  | 'ADMIN'
  | 'AUDITOR';

// Document categories
export type DocumentCategory = 
  | 'LEGAL'
  | 'MEDICAL'
  | 'FINANCIAL'
  | 'IDENTITY'
  | 'CONTRACT'
  | 'CERTIFICATE'
  | 'OTHER';

// Notification types
export type NotificationType = 
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR'
  | 'VERIFICATION_COMPLETE'
  | 'VERIFICATION_FAILED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_EXPIRED';

// Status utility functions
export const StatusUtils = {
  /**
   * Get user-friendly status text
   */
  getStatusText(status: VerificationStatus): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'verified':
        return 'Verified';
      case 'rejected':
        return 'Rejected';
      case 'expired':
        return 'Expired';
      case 'archived':
        return 'Archived';
      default:
        return 'Unknown';
    }
  },

  /**
   * Get CSS classes for status display
   */
  getStatusColor(status: VerificationStatus): string {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-orange-100 text-orange-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  },

  /**
   * Get challenge status text
   */
  getChallengeStatusText(status: ChallengeStatus): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  },

  /**
   * Get challenge status color
   */
  getChallengeStatusColor(status: ChallengeStatus): string {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  },

  /**
   * Check if status represents a final state
   */
  isFinalStatus(status: VerificationStatus): boolean {
    return ['verified', 'rejected', 'expired', 'archived'].includes(status);
  },

  /**
   * Check if status allows verification
   */
  canVerify(status: VerificationStatus): boolean {
    return ['pending'].includes(status);
  },

  /**
   * Check if status is in progress
   */
  isInProgress(status: VerificationStatus): boolean {
    return status === 'processing';
  },

  /**
   * Convert lifecycle to verification status
   */
  lifecycleToStatus(lifecycle: DocumentLifecycle): VerificationStatus {
    switch (lifecycle) {
      case 'PENDING':
        return 'pending';
      case 'PROCESSING':
        return 'processing';
      case 'ACTIVE':
        return 'verified';
      case 'REJECTED':
        return 'rejected';
      case 'EXPIRED':
        return 'expired';
      case 'ARCHIVED':
        return 'archived';
      default:
        return 'pending';
    }
  }
};

// Status icons mapping
export const StatusIcons = {
  verified: '✅',
  rejected: '❌',
  processing: '⏳',
  pending: '⏸️',
  expired: '⏰',
  archived: '📦'
};

// Type guards
export const isValidVerificationStatus = (status: string): status is VerificationStatus => {
  return ['pending', 'processing', 'verified', 'rejected', 'expired', 'archived'].includes(status);
};

export const isValidChallengeStatus = (status: string): status is ChallengeStatus => {
  return ['pending', 'in_progress', 'completed', 'failed'].includes(status);
};

export const isValidUserRole = (role: string): role is UserRole => {
  return ['USER', 'VERIFIER', 'ADMIN', 'AUDITOR'].includes(role);
};

export const isValidDocumentCategory = (category: string): category is DocumentCategory => {
  return ['LEGAL', 'MEDICAL', 'FINANCIAL', 'IDENTITY', 'CONTRACT', 'CERTIFICATE', 'OTHER'].includes(category);
};