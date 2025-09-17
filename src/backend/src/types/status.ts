/**
 * Centralized status definitions for SealGuard
 * This file consolidates all status enums to avoid redundancy
 */

// Document lifecycle states (matches smart contract)
export enum DocumentLifecycle {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING', 
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED'
}

// Document status (simplified for API responses)
export enum DocumentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  ARCHIVED = 'archived'
}

// Verification record status
export enum VerificationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

// User roles (matches smart contract access control)
export enum UserRole {
  USER = 'USER',
  VERIFIER = 'VERIFIER',
  ADMIN = 'ADMIN',
  AUDITOR = 'AUDITOR'
}

// Document categories
export enum DocumentCategory {
  LEGAL = 'LEGAL',
  MEDICAL = 'MEDICAL',
  FINANCIAL = 'FINANCIAL',
  IDENTITY = 'IDENTITY',
  CONTRACT = 'CONTRACT',
  CERTIFICATE = 'CERTIFICATE',
  OTHER = 'OTHER'
}

// Notification types
export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  VERIFICATION_COMPLETE = 'VERIFICATION_COMPLETE',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_EXPIRED = 'DOCUMENT_EXPIRED'
}

// Status mapping utilities
export class StatusMapper {
  /**
   * Convert DocumentLifecycle to DocumentStatus for API responses
   */
  static lifecycleToStatus(lifecycle: DocumentLifecycle): DocumentStatus {
    switch (lifecycle) {
      case DocumentLifecycle.PENDING:
        return DocumentStatus.PENDING;
      case DocumentLifecycle.PROCESSING:
        return DocumentStatus.PROCESSING;
      case DocumentLifecycle.ACTIVE:
        return DocumentStatus.VERIFIED;
      case DocumentLifecycle.REJECTED:
        return DocumentStatus.REJECTED;
      case DocumentLifecycle.EXPIRED:
        return DocumentStatus.EXPIRED;
      case DocumentLifecycle.ARCHIVED:
        return DocumentStatus.ARCHIVED;
      default:
        return DocumentStatus.PENDING;
    }
  }

  /**
   * Convert DocumentStatus to DocumentLifecycle for smart contract
   */
  static statusToLifecycle(status: DocumentStatus): DocumentLifecycle {
    switch (status) {
      case DocumentStatus.PENDING:
        return DocumentLifecycle.PENDING;
      case DocumentStatus.PROCESSING:
        return DocumentLifecycle.PROCESSING;
      case DocumentStatus.VERIFIED:
        return DocumentLifecycle.ACTIVE;
      case DocumentStatus.REJECTED:
        return DocumentLifecycle.REJECTED;
      case DocumentStatus.EXPIRED:
        return DocumentLifecycle.EXPIRED;
      case DocumentStatus.ARCHIVED:
        return DocumentLifecycle.ARCHIVED;
      default:
        return DocumentLifecycle.PENDING;
    }
  }

  /**
   * Check if a status represents a completed verification
   */
  static isVerificationComplete(status: VerificationStatus): boolean {
    return status === VerificationStatus.COMPLETED || status === VerificationStatus.FAILED;
  }

  /**
   * Check if a document status is final (no further processing)
   */
  static isFinalStatus(status: DocumentStatus): boolean {
    return [
      DocumentStatus.VERIFIED,
      DocumentStatus.REJECTED,
      DocumentStatus.EXPIRED,
      DocumentStatus.ARCHIVED
    ].includes(status);
  }

  /**
   * Get user-friendly status text
   */
  static getStatusText(status: DocumentStatus): string {
    switch (status) {
      case DocumentStatus.PENDING:
        return 'Pending Verification';
      case DocumentStatus.PROCESSING:
        return 'Being Verified';
      case DocumentStatus.VERIFIED:
        return 'Verified';
      case DocumentStatus.REJECTED:
        return 'Verification Failed';
      case DocumentStatus.EXPIRED:
        return 'Expired';
      case DocumentStatus.ARCHIVED:
        return 'Archived';
      default:
        return 'Unknown Status';
    }
  }

  /**
   * Get CSS classes for status display
   */
  static getStatusColor(status: DocumentStatus): string {
    switch (status) {
      case DocumentStatus.VERIFIED:
        return 'bg-green-100 text-green-800';
      case DocumentStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      case DocumentStatus.PROCESSING:
        return 'bg-blue-100 text-blue-800';
      case DocumentStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case DocumentStatus.EXPIRED:
        return 'bg-orange-100 text-orange-800';
      case DocumentStatus.ARCHIVED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}

// Type guards
export const isValidDocumentStatus = (status: string): status is DocumentStatus => {
  return Object.values(DocumentStatus).includes(status as DocumentStatus);
};

export const isValidVerificationStatus = (status: string): status is VerificationStatus => {
  return Object.values(VerificationStatus).includes(status as VerificationStatus);
};

export const isValidUserRole = (role: string): role is UserRole => {
  return Object.values(UserRole).includes(role as UserRole);
};

export const isValidDocumentCategory = (category: string): category is DocumentCategory => {
  return Object.values(DocumentCategory).includes(category as DocumentCategory);
};