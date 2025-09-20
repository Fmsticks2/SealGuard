import { logger } from '../utils/logger';
import crypto from 'crypto';
import path from 'path';
import { User } from './authService';

export interface Document {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  ipfsHash: string;
  ipfsUrl: string;
  description?: string;
  tags: string[];
  category: string;
  isPublic: boolean;
  encryptionKey?: string;
  uploaderId: string;
  status: string;
  uploadedAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface VerificationRecord {
  id: string;
  documentId: string;
  verifierId: string;
  status: string;
  notes?: string;
  createdAt: Date;
}

export interface CreateDocumentRequest {
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  ipfsHash: string;
  ipfsUrl: string;
  description?: string;
  tags?: string[];
  category?: string;
  isPublic?: boolean;
  encryptionKey?: string;
  uploaderId: string;
  expiresAt?: Date;
}

export interface UpdateDocumentRequest {
  description?: string;
  tags?: string[];
  category?: string;
  isPublic?: boolean;
  expiresAt?: Date;
}

export interface DocumentSearchFilters {
  uploaderId?: string;
  category?: string;
  status?: string;
  isPublic?: boolean;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface DocumentWithRelations extends Document {
  uploader: User;
  verifications: VerificationRecord[];
  _count?: {
    verifications: number;
  };
}

// In-memory storage (replace with Redis or external service in production)
const documentStore = new Map<string, Document>();
const verificationStore = new Map<string, VerificationRecord[]>();
const ipfsHashIndex = new Map<string, string>(); // ipfsHash -> documentId

class DocumentService {
  /**
   * Calculate file checksum
   */
  calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Determine document category from file type
   */
  categorizeDocument(fileName: string, _mimeType: string): string {
    const extension = path.extname(fileName).toLowerCase();

    // Legal documents
    if (extension.match(/\.(pdf|doc|docx)$/) && 
        (fileName.toLowerCase().includes('contract') || 
         fileName.toLowerCase().includes('agreement') ||
         fileName.toLowerCase().includes('legal'))) {
      return 'LEGAL';
    }

    // Medical documents
    if (extension.match(/\.(pdf|doc|docx|jpg|jpeg|png)$/) &&
        (fileName.toLowerCase().includes('medical') ||
         fileName.toLowerCase().includes('health') ||
         fileName.toLowerCase().includes('patient'))) {
      return 'MEDICAL';
    }

    // Financial documents
    if (extension.match(/\.(pdf|xls|xlsx|csv)$/) &&
        (fileName.toLowerCase().includes('financial') ||
         fileName.toLowerCase().includes('invoice') ||
         fileName.toLowerCase().includes('receipt'))) {
      return 'FINANCIAL';
    }

    // Identity documents
    if (extension.match(/\.(pdf|jpg|jpeg|png)$/) &&
        (fileName.toLowerCase().includes('id') ||
         fileName.toLowerCase().includes('passport') ||
         fileName.toLowerCase().includes('license'))) {
      return 'IDENTITY';
    }

    return 'OTHER';
  }

  /**
   * Create a new document
   */
  async createDocument(documentData: CreateDocumentRequest): Promise<Document | null> {
    try {
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();
      
      const document: Document = {
        id: documentId,
        fileName: documentData.fileName,
        originalName: documentData.originalName,
        fileSize: documentData.fileSize,
        mimeType: documentData.mimeType,
        ipfsHash: documentData.ipfsHash,
        ipfsUrl: documentData.ipfsUrl,
        description: documentData.description,
        tags: documentData.tags || [],
        category: documentData.category || this.categorizeDocument(documentData.originalName, documentData.mimeType),
        isPublic: documentData.isPublic || false,
        encryptionKey: documentData.encryptionKey,
        uploaderId: documentData.uploaderId,
        status: 'ACTIVE',
        uploadedAt: now,
        updatedAt: now,
        expiresAt: documentData.expiresAt
      };

      // Store document
      documentStore.set(documentId, document);
      ipfsHashIndex.set(documentData.ipfsHash, documentId);
      
      // Initialize empty verifications
      verificationStore.set(documentId, []);

      logger.info(`Document created: ${documentId}`);
      return document;
    } catch (error) {
      logger.error('Failed to create document:', error);
      return null;
    }
  }

  /**
   * Get document by ID
   */
  async getDocumentById(documentId: string, includeRelations = false): Promise<DocumentWithRelations | null> {
    try {
      const document = documentStore.get(documentId);
      if (!document) return null;

      if (includeRelations) {
        // This would require authService integration for uploader info
        const verifications = verificationStore.get(documentId) || [];
        return {
          ...document,
          uploader: { id: document.uploaderId } as User, // Simplified
          verifications,
          _count: { verifications: verifications.length }
        };
      }

      return document as DocumentWithRelations;
    } catch (error) {
      logger.error('Failed to get document by ID:', error);
      return null;
    }
  }

  /**
   * Get document by IPFS hash
   */
  async getDocumentByIpfsHash(ipfsHash: string): Promise<Document | null> {
    try {
      const documentId = ipfsHashIndex.get(ipfsHash);
      if (!documentId) return null;
      
      return documentStore.get(documentId) || null;
    } catch (error) {
      logger.error('Failed to get document by IPFS hash:', error);
      return null;
    }
  }

  /**
   * Update document
   */
  async updateDocument(documentId: string, updateData: UpdateDocumentRequest): Promise<Document | null> {
    try {
      const document = documentStore.get(documentId);
      if (!document) return null;

      const updatedDocument = {
        ...document,
        ...updateData,
        updatedAt: new Date()
      };

      documentStore.set(documentId, updatedDocument);
      return updatedDocument;
    } catch (error) {
      logger.error('Failed to update document:', error);
      return null;
    }
  }

  /**
   * Update document status
   */
  async updateDocumentStatus(documentId: string, status: string): Promise<Document | null> {
    try {
      const document = documentStore.get(documentId);
      if (!document) return null;

      document.status = status;
      document.updatedAt = new Date();
      documentStore.set(documentId, document);
      
      return document;
    } catch (error) {
      logger.error('Failed to update document status:', error);
      return null;
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(
    filters: DocumentSearchFilters,
    page = 1,
    limit = 20,
    includeRelations = false
  ): Promise<{ documents: DocumentWithRelations[]; total: number; pages: number } | null> {
    try {
      let documents = Array.from(documentStore.values());

      // Apply filters
      if (filters.uploaderId) {
        documents = documents.filter(doc => doc.uploaderId === filters.uploaderId);
      }
      if (filters.category) {
        documents = documents.filter(doc => doc.category === filters.category);
      }
      if (filters.status) {
        documents = documents.filter(doc => doc.status === filters.status);
      }
      if (filters.isPublic !== undefined) {
        documents = documents.filter(doc => doc.isPublic === filters.isPublic);
      }
      if (filters.tags && filters.tags.length > 0) {
        documents = documents.filter(doc => 
          filters.tags!.some(tag => doc.tags.includes(tag))
        );
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        documents = documents.filter(doc => 
          doc.fileName.toLowerCase().includes(searchLower) ||
          doc.originalName.toLowerCase().includes(searchLower) ||
          (doc.description && doc.description.toLowerCase().includes(searchLower))
        );
      }

      // Sort by upload date (newest first)
      documents.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

      const total = documents.length;
      const pages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const paginatedDocs = documents.slice(startIndex, startIndex + limit);

      const result = paginatedDocs.map(doc => {
        if (includeRelations) {
          const verifications = verificationStore.get(doc.id) || [];
          return {
            ...doc,
            uploader: { id: doc.uploaderId } as User,
            verifications,
            _count: { verifications: verifications.length }
          };
        }
        return doc as DocumentWithRelations;
      });

      return { documents: result, total, pages };
    } catch (error) {
      logger.error('Failed to search documents:', error);
      return null;
    }
  }

  /**
   * Get user documents
   */
  async getUserDocuments(
    userId: string,
    page = 1,
    limit = 20,
    status?: string
  ): Promise<{ documents: DocumentWithRelations[]; total: number; pages: number } | null> {
    return this.searchDocuments(
      { uploaderId: userId, status },
      page,
      limit,
      true
    );
  }

  /**
   * Get public documents
   */
  async getPublicDocuments(
    page = 1,
    limit = 20,
    category?: string
  ): Promise<{ documents: DocumentWithRelations[]; total: number; pages: number } | null> {
    return this.searchDocuments(
      { isPublic: true, category, status: 'ACTIVE' },
      page,
      limit,
      true
    );
  }

  /**
   * Delete document (soft delete)
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      const document = documentStore.get(documentId);
      if (!document) return false;

      document.status = 'DELETED';
      document.updatedAt = new Date();
      documentStore.set(documentId, document);
      
      return true;
    } catch (error) {
      logger.error('Failed to delete document:', error);
      return false;
    }
  }

  /**
   * Permanently delete document
   */
  async permanentDeleteDocument(documentId: string): Promise<boolean> {
    try {
      const document = documentStore.get(documentId);
      if (!document) return false;

      // Remove from all stores
      documentStore.delete(documentId);
      verificationStore.delete(documentId);
      ipfsHashIndex.delete(document.ipfsHash);
      
      return true;
    } catch (error) {
      logger.error('Failed to permanently delete document:', error);
      return false;
    }
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(userId?: string): Promise<any> {
    try {
      let documents = Array.from(documentStore.values());
      
      if (userId) {
        documents = documents.filter(doc => doc.uploaderId === userId);
      }

      const stats = {
        total: documents.length,
        active: documents.filter(doc => doc.status === 'ACTIVE').length,
        deleted: documents.filter(doc => doc.status === 'DELETED').length,
        public: documents.filter(doc => doc.isPublic).length,
        private: documents.filter(doc => !doc.isPublic).length,
        categories: {} as Record<string, number>
      };

      // Count by category
      documents.forEach(doc => {
        stats.categories[doc.category] = (stats.categories[doc.category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get document stats:', error);
      return null;
    }
  }

  /**
   * Check if user can access document
   */
  async canUserAccessDocument(userId: string, documentId: string): Promise<boolean> {
    try {
      const document = documentStore.get(documentId);
      if (!document) return false;

      // Owner can always access
      if (document.uploaderId === userId) return true;
      
      // Public documents can be accessed by anyone
      if (document.isPublic && document.status === 'ACTIVE') return true;
      
      return false;
    } catch (error) {
      logger.error('Failed to check document access:', error);
      return false;
    }
  }

  /**
   * Add verification record
   */
  async addVerification(documentId: string, verifierId: string, status: string, notes?: string): Promise<VerificationRecord | null> {
    try {
      const verificationId = `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const verification: VerificationRecord = {
        id: verificationId,
        documentId,
        verifierId,
        status,
        notes,
        createdAt: new Date()
      };

      const verifications = verificationStore.get(documentId) || [];
      verifications.push(verification);
      verificationStore.set(documentId, verifications);

      return verification;
    } catch (error) {
      logger.error('Failed to add verification:', error);
      return null;
    }
  }
}

export const documentService = new DocumentService();
export default documentService;