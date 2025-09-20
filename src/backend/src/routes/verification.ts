import { Router, Request, Response } from 'express';
import { blockchainService } from '../services/blockchainService';
import { documentService } from '../services/documentService';
import { logger } from '../utils/logger';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
  withAuth
} from '../middleware/auth';

// Define enums locally
enum VerificationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED'
}

enum DocumentStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

interface VerificationRecord {
  id: string;
  documentId: string;
  verifierId: string;
  status: string;
  notes?: string;
  proofHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage for verification records
const verificationRecords = new Map<string, VerificationRecord>();

const router = Router();

/**
 * GET /verification/records
 * Get verification records with filtering and pagination
 */
router.get('/records',
  authenticate,
  async (req: Request, res: Response): Promise<Response | void> => {
    const authReq = req as AuthenticatedRequest;
    try {
      const {
        page = 1,
        limit = 20,
        status,
        documentId,
        verifierId,
        dateFrom,
        dateTo
      } = req.query;

      let records = Array.from(verificationRecords.values());

      // Apply filters
      if (status) {
        records = records.filter(record => record.status === status);
      }
      if (documentId) {
        records = records.filter(record => record.documentId === documentId);
      }
      if (verifierId) {
        // Only admin can filter by other verifiers
        if (verifierId !== authReq.user.userId && authReq.user.role !== 'ADMIN') {
          return res.status(403).json({
            success: false,
            message: 'Access denied',
            code: 'ACCESS_DENIED'
          });
        }
        records = records.filter(record => record.verifierId === verifierId);
      } else if (authReq.user.role !== 'ADMIN' && authReq.user.role !== 'MODERATOR') {
        // Regular users can only see their own verifications
        records = records.filter(record => record.verifierId === authReq.user.userId);
      }
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom as string);
        records = records.filter(record => record.createdAt >= fromDate);
      }
      if (dateTo) {
        const toDate = new Date(dateTo as string);
        records = records.filter(record => record.createdAt <= toDate);
      }

      // Sort by creation date (newest first)
      records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const total = records.length;
      const pages = Math.ceil(total / Number(limit));
      const startIndex = (Number(page) - 1) * Number(limit);
      const paginatedRecords = records.slice(startIndex, startIndex + Number(limit));

      // Enrich with document and user data
      const enrichedRecords = await Promise.all(
        paginatedRecords.map(async (record) => {
          const document = await documentService.getDocumentById(record.documentId);
          return {
            ...record,
            document: document ? {
              id: document.id,
              fileName: document.fileName,
              originalName: document.originalName,
              category: document.category,
              status: document.status,
              uploadedAt: document.uploadedAt,
              uploader: {
                id: document.uploaderId,
                walletAddress: 'mock_address' // Would need authService integration
              }
            } : null,
            verifier: {
              id: record.verifierId,
              walletAddress: 'mock_address', // Would need authService integration
              role: 'USER'
            }
          };
        })
      );

      res.json({
        success: true,
        data: {
          records: enrichedRecords,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages
          }
        }
      });
    } catch (error) {
      logger.error('Get verification records failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get verification records',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * POST /verification/submit
 * Submit a document for verification
 */
router.post('/submit',
  authenticate,
  withAuth(async (_req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const { documentId, notes } = _req.body;

      if (!documentId) {
        return res.status(400).json({
          success: false,
          message: 'Document ID is required',
          code: 'MISSING_DOCUMENT_ID'
        });
      }

      // Check if document exists and user has access
      const document = await documentService.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
          code: 'DOCUMENT_NOT_FOUND'
        });
      }

      const canAccess = await documentService.canUserAccessDocument(_req.user.userId, documentId);
      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      // Check if verification already exists
      const existingVerification = Array.from(verificationRecords.values())
        .find(record => record.documentId === documentId && record.status === 'PENDING');
      
      if (existingVerification) {
        return res.status(409).json({
          success: false,
          message: 'Verification already pending for this document',
          code: 'VERIFICATION_EXISTS'
        });
      }

      // Create verification record
      const verificationId = `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const verification: VerificationRecord = {
        id: verificationId,
        documentId,
        verifierId: _req.user.userId,
        status: VerificationStatus.PENDING,
        notes,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      verificationRecords.set(verificationId, verification);

      // Submit to blockchain for verification
      try {
        // Submit verification to blockchain
        await blockchainService.verifyDocument(
          document.ipfsHash
        );
        
        verification.status = VerificationStatus.IN_PROGRESS;
        verification.updatedAt = new Date();
        verificationRecords.set(verificationId, verification);
        
        logger.info(`Document ${documentId} submitted for blockchain verification`);
      } catch (blockchainError) {
        logger.error('Blockchain verification submission failed:', blockchainError);
        verification.status = VerificationStatus.FAILED;
        verification.notes = `Blockchain submission failed: ${blockchainError}`;
        verification.updatedAt = new Date();
        verificationRecords.set(verificationId, verification);
      }

      res.status(201).json({
        success: true,
        data: {
          verification,
          message: 'Document submitted for verification'
        }
      });
    } catch (error) {
      logger.error('Submit verification failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit verification',
        code: 'INTERNAL_ERROR'
      });
    }
  })
);

/**
 * PUT /verification/:id/status
 * Update verification status (admin/moderator only)
 */
router.put('/:id/status',
  authenticate,
  authorize('ADMIN'),
  withAuth(async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { status, notes, proofHash } = req.body;

      if (!Object.values(VerificationStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification status',
          code: 'INVALID_STATUS'
        });
      }

      const verification = verificationRecords.get(id);
      if (!verification) {
        return res.status(404).json({
          success: false,
          message: 'Verification record not found',
          code: 'VERIFICATION_NOT_FOUND'
        });
      }

      // Update verification record
      verification.status = status;
      verification.updatedAt = new Date();
      if (notes) verification.notes = notes;
      if (proofHash) verification.proofHash = proofHash;
      
      verificationRecords.set(id, verification);

      // Update document status based on verification result
      if (status === VerificationStatus.VERIFIED) {
        await documentService.updateDocumentStatus(verification.documentId, DocumentStatus.VERIFIED);
      } else if (status === VerificationStatus.FAILED) {
        await documentService.updateDocumentStatus(verification.documentId, DocumentStatus.REJECTED);
      }

      res.json({
        success: true,
        data: {
          verification,
          message: 'Verification status updated successfully'
        }
      });
    } catch (error) {
      logger.error('Update verification status failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update verification status',
        code: 'INTERNAL_ERROR'
      });
    }
  })
);

/**
 * GET /verification/:id
 * Get verification record by ID
 */
router.get('/:id',
  authenticate,
  withAuth(async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;

      const verification = verificationRecords.get(id);
      if (!verification) {
        return res.status(404).json({
          success: false,
          message: 'Verification record not found',
          code: 'VERIFICATION_NOT_FOUND'
        });
      }

      // Check access permissions
      if (req.user.role !== 'ADMIN' && 
          req.user.role !== 'MODERATOR' && 
          verification.verifierId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      // Enrich with document data
      const document = await documentService.getDocumentById(verification.documentId);
      const enrichedVerification = {
        ...verification,
        document: document ? {
          id: document.id,
          fileName: document.fileName,
          originalName: document.originalName,
          category: document.category,
          status: document.status,
          uploadedAt: document.uploadedAt
        } : null
      };

      res.json({
        success: true,
        data: enrichedVerification
      });
    } catch (error) {
      logger.error('Get verification record failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get verification record',
        code: 'INTERNAL_ERROR'
      });
    }
  })
);

/**
 * GET /verification/document/:documentId
 * Get verification records for a specific document
 */
router.get('/document/:documentId',
  authenticate,
  withAuth(async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const { documentId } = req.params;

      // Check if document exists and user has access
      const document = await documentService.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
          code: 'DOCUMENT_NOT_FOUND'
        });
      }

      const canAccess = await documentService.canUserAccessDocument(req.user.userId, documentId);
      if (!canAccess && req.user.role !== 'ADMIN' && req.user.role !== 'MODERATOR') {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      // Get verification records for this document
      const records = Array.from(verificationRecords.values())
        .filter(record => record.documentId === documentId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      res.json({
        success: true,
        data: {
          documentId,
          records,
          total: records.length
        }
      });
    } catch (error) {
      logger.error('Get document verification records failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get document verification records',
        code: 'INTERNAL_ERROR'
      });
    }
  })
);

/**
 * GET /verification/stats
 * Get verification statistics (admin/moderator only)
 */
router.get('/stats',
  authenticate,
  authorize('ADMIN'),
  withAuth(async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const records = Array.from(verificationRecords.values());
      
      const stats = {
        total: records.length,
        pending: records.filter(r => r.status === VerificationStatus.PENDING).length,
        inProgress: records.filter(r => r.status === VerificationStatus.IN_PROGRESS).length,
        completed: records.filter(r => r.status === VerificationStatus.COMPLETED).length,
        verified: records.filter(r => r.status === VerificationStatus.VERIFIED).length,
        failed: records.filter(r => r.status === VerificationStatus.FAILED).length,
        byStatus: {} as Record<string, number>
      };

      // Count by status
      records.forEach(record => {
        stats.byStatus[record.status] = (stats.byStatus[record.status] || 0) + 1;
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Get verification stats failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get verification statistics',
        code: 'INTERNAL_ERROR'
      });
    }
  })
);

export default router;