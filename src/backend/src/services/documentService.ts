import { db } from '../config/database';
import { logger } from '../utils/logger';
import { Document, User, VerificationRecord } from '@prisma/client';
// DocumentCategory enum values: 'LEGAL', 'FINANCIAL', 'MEDICAL', 'ACADEMIC', 'GOVERNMENT', 'OTHER'
// DocumentStatus enum values: 'PENDING', 'ACTIVE', 'ARCHIVED', 'DELETED'
import crypto from 'crypto';
import path from 'path';

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
  categorizeDocument(fileName: string, mimeType: string): string {
    const extension = path.extname(fileName).toLowerCase();

    // Legal documents
    if (extension.match(/\.(pdf|doc|docx)$/) && 
        (fileName.toLowerCase().includes('contract') || 
         fileName.toLowerCase().includes('agreement') ||
         fileName.toLowerCase().includes('legal'))) {
      return 'LEGAL';
    }

    // Medical documents
    if (fileName.toLowerCase().match(/(medical|health|patient|diagnosis|prescription)/) ||
        mimeType.includes('medical')) {
      return 'MEDICAL';
    }

    // Financial documents
    if (fileName.toLowerCase().match(/(invoice|receipt|financial|bank|tax|statement)/) ||
        mimeType.includes('financial')) {
      return 'FINANCIAL';
    }

    // Identity documents
    if (fileName.toLowerCase().match(/(id|passport|license|identity|ssn)/) ||
        mimeType.includes('identity')) {
      return 'IDENTITY';
    }

    // Certificates
    if (fileName.toLowerCase().match(/(certificate|cert|diploma|award)/) ||
        mimeType.includes('certificate')) {
      return 'CERTIFICATE';
    }

    return 'OTHER';
  }

  /**
   * Create a new document record
   */
  async createDocument(documentData: CreateDocumentRequest): Promise<Document | null> {
    try {
      const category = documentData.category || this.categorizeDocument(documentData.fileName, documentData.mimeType);
      
      const document = await db.document.create({
        data: {
          ...documentData,
          category,
          status: 'PENDING',
          tags: documentData.tags ? documentData.tags.join(',') : '',
          isPublic: documentData.isPublic || false,
        } as any,
      });

      logger.info(`Document created: ${document.id} by user ${documentData.uploaderId}`);
      return document;
    } catch (error) {
      logger.error('Create document failed:', error);
      return null;
    }
  }

  /**
   * Get document by ID with relations
   */
  async getDocumentById(documentId: string, includeRelations = false): Promise<DocumentWithRelations | null> {
    try {
      const queryOptions: any = {
        where: { id: documentId },
      };

      if (includeRelations) {
        queryOptions.include = {
          uploader: true,
          verifications: {
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { verifications: true },
          },
        };
      }

      const document = await db.document.findUnique(queryOptions) as DocumentWithRelations | null;

      return document;
    } catch (error) {
      logger.error('Get document by ID failed:', error);
      return null;
    }
  }

  /**
   * Get document by IPFS hash
   */
  async getDocumentByIpfsHash(ipfsHash: string): Promise<Document | null> {
    try {
      return await db.document.findUnique({
        where: { ipfsHash },
      });
    } catch (error) {
      logger.error('Get document by IPFS hash failed:', error);
      return null;
    }
  }

  /**
   * Update document
   */
  async updateDocument(documentId: string, updateData: UpdateDocumentRequest): Promise<Document | null> {
    try {
      const document = await db.document.update({
        where: { id: documentId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        } as any,
      });

      logger.info(`Document updated: ${documentId}`);
      return document;
    } catch (error) {
      logger.error('Update document failed:', error);
      return null;
    }
  }

  /**
   * Update document status
   */
  async updateDocumentStatus(documentId: string, status: string): Promise<Document | null> {
    try {
      const document = await db.document.update({
        where: { id: documentId },
        data: {
          status,
          updatedAt: new Date(),
        },
      });

      logger.info(`Document status updated: ${documentId} -> ${status}`);
      return document;
    } catch (error) {
      logger.error('Update document status failed:', error);
      return null;
    }
  }

  /**
   * Search documents with filters
   */
  async searchDocuments(
    filters: DocumentSearchFilters,
    page = 1,
    limit = 20,
    includeRelations = false
  ): Promise<{ documents: DocumentWithRelations[]; total: number; pages: number } | null> {
    try {
      const skip = (page - 1) * limit;
      
      const where: any = {};

      if (filters.uploaderId) {
        where.uploaderId = filters.uploaderId;
      }

      if (filters.category) {
        where.category = filters.category;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.isPublic !== undefined) {
        where.isPublic = filters.isPublic;
      }

      if (filters.tags && filters.tags.length > 0) {
        where.tags = {
          hasSome: filters.tags,
        };
      }

      if (filters.dateFrom || filters.dateTo) {
        where.uploadedAt = {};
        if (filters.dateFrom) {
          where.uploadedAt.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          where.uploadedAt.lte = filters.dateTo;
        }
      }

      if (filters.search) {
        where.OR = [
          { fileName: { contains: filters.search, mode: 'insensitive' } },
          { originalName: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const queryOptions: any = {
        where,
        skip,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
      };

      if (includeRelations) {
        queryOptions.include = {
          uploader: true,
          verifications: {
            orderBy: { createdAt: 'desc' },
            take: 5, // Limit verifications to avoid large payloads
          },
          _count: {
            select: { verifications: true },
          },
        };
      }

      const [documents, total] = await Promise.all([
        db.document.findMany(queryOptions) as Promise<DocumentWithRelations[]>,
        db.document.count({ where }),
      ]);

      const pages = Math.ceil(total / limit);

      return { documents, total, pages };
    } catch (error) {
      logger.error('Search documents failed:', error);
      return null;
    }
  }

  /**
   * Get user's documents
   */
  async getUserDocuments(
    userId: string,
    page = 1,
    limit = 20,
    status?: string
  ): Promise<{ documents: DocumentWithRelations[]; total: number; pages: number } | null> {
    const filters: DocumentSearchFilters = { uploaderId: userId };
    if (status) {
      filters.status = status;
    }

    return this.searchDocuments(filters, page, limit, true);
  }

  /**
   * Get public documents
   */
  async getPublicDocuments(
    page = 1,
    limit = 20,
    category?: string
  ): Promise<{ documents: DocumentWithRelations[]; total: number; pages: number } | null> {
    const filters: DocumentSearchFilters = { isPublic: true };
    if (category) {
      filters.category = category;
    }

    return this.searchDocuments(filters, page, limit, true);
  }

  /**
   * Delete document (soft delete by updating status)
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      await db.document.update({
        where: { id: documentId },
        data: {
          status: 'ARCHIVED',
          updatedAt: new Date(),
        },
      });

      logger.info(`Document archived: ${documentId}`);
      return true;
    } catch (error) {
      logger.error('Delete document failed:', error);
      return false;
    }
  }

  /**
   * Hard delete document (permanent removal)
   */
  async permanentDeleteDocument(documentId: string): Promise<boolean> {
    try {
      await db.document.delete({
        where: { id: documentId },
      });

      logger.info(`Document permanently deleted: ${documentId}`);
      return true;
    } catch (error) {
      logger.error('Permanent delete document failed:', error);
      return false;
    }
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(userId?: string): Promise<any> {
    try {
      const where = userId ? { uploaderId: userId } : {};

      const [total, byStatus, byCategory, recentUploads] = await Promise.all([
        db.document.count({ where }),
        db.document.groupBy({
          by: ['status'],
          where,
          _count: { status: true },
        }),
        db.document.groupBy({
          by: ['category'],
          where,
          _count: { category: true },
        }),
        db.document.count({
          where: {
            ...where,
            uploadedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        }),
      ]);

      return {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as Record<string, number>),
        byCategory: byCategory.reduce((acc, item) => {
          acc[item.category] = item._count.category;
          return acc;
        }, {} as Record<string, number>),
        recentUploads,
      };
    } catch (error) {
      logger.error('Get document stats failed:', error);
      return null;
    }
  }

  /**
   * Check if user can access document
   */
  async canUserAccessDocument(userId: string, documentId: string): Promise<boolean> {
    try {
      const document = await db.document.findUnique({
        where: { id: documentId },
        include: { uploader: true },
      });

      if (!document) {
        return false;
      }

      // Owner can always access
      if (document.uploaderId === userId) {
        return true;
      }

      // Public documents can be accessed by anyone
      if (document.isPublic) {
        return true;
      }

      // Check if user has admin/moderator role
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (user && (user.role === 'ADMIN' || user.role === 'MODERATOR')) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Check document access failed:', error);
      return false;
    }
  }
}

export const documentService = new DocumentService();
export default documentService;