import { Router, Request, Response } from 'express';
import { blockchainService } from '../services/blockchainService';
import { documentService } from '../services/documentService';
import { logger } from '../utils/logger';
import {
  authenticate,
  authorize,
  AuthenticatedRequest
} from '../middleware/auth';
import { db } from '../config/database';

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

const router = Router();

/**
 * GET /verification/records
 * Get verification records with filtering and pagination
 */
router.get('/records',
  authenticate,
  async (req: Request, res: Response) => {
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

      // Build filters
      const where: any = {};
      
      if (status) where.status = status as string;
      if (documentId) where.documentId = documentId as string;
      if (verifierId) {
        // Only admin can filter by other verifiers
        if (verifierId !== authReq.user.userId && authReq.user.role !== 'ADMIN') {
          return res.status(403).json({
            success: false,
            message: 'Access denied',
            code: 'ACCESS_DENIED'
          });
        }
        where.verifierId = verifierId as string;
      } else if (authReq.user.role !== 'ADMIN' && authReq.user.role !== 'MODERATOR') {
        // Regular users can only see their own verifications
        where.verifierId = authReq.user.userId;
      }
      
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
        if (dateTo) where.createdAt.lte = new Date(dateTo as string);
      }

      const [records, total] = await Promise.all([
        db.verificationRecord.findMany({
          where,
          include: {
            document: {
              select: {
                id: true,
                fileName: true,
                originalName: true,
                category: true,
                status: true,
                uploadedAt: true,
                uploader: {
                  select: {
                    id: true,
                    walletAddress: true
                  }
                }
              }
            },
            verifier: {
              select: {
                id: true,
                walletAddress: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (parseInt(page as string) - 1) * parseInt(limit as string),
          take: parseInt(limit as string)
        }),
        db.verificationRecord.count({ where })
      ]);

      const pages = Math.ceil(total / parseInt(limit as string));

      res.json({
        success: true,
        data: {
          records,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            pages
          }
        }
      });
    } catch (error) {
      logger.error('Get verification records error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get verification records',
        code: 'GET_RECORDS_ERROR'
      });
    }
  }
);

/**
 * GET /verification/records/:id
 * Get verification record by ID
 */
router.get('/records/:id',
  authenticate,
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const { id } = req.params;
      
      const record = await db.verificationRecord.findUnique({
        where: { id },
        include: {
          document: {
            include: {
              uploader: {
                select: {
                  id: true,
                  walletAddress: true,
                  username: true
                }
              }
            }
          },
          verifier: {
            select: {
              id: true,
              walletAddress: true,
              role: true
            }
          }
        }
      });

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Verification record not found',
          code: 'RECORD_NOT_FOUND'
        });
      }

      // Check access permissions
      const canAccess = authReq.user.role === 'ADMIN' ||
          authReq.user.role === 'MODERATOR' ||
          record.verifierId === authReq.user.userId ||
          record.document.uploaderId === authReq.user.userId;

      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      res.json({
        success: true,
        data: { record }
      });
    } catch (error) {
      logger.error('Get verification record error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get verification record',
        code: 'GET_RECORD_ERROR'
      });
    }
  }
);

/**
 * POST /verification/verify/:documentId
 * Start verification process for a document
 */
router.post('/verify/:documentId',
  authenticate,
  authorize('AUDITOR'),
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const { documentId } = req.params;
      const { notes } = req.body;
      
      // Check if document exists
      const document = await documentService.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
          code: 'DOCUMENT_NOT_FOUND'
        });
      }

      // Check if already verified or in progress
      if (document.status === DocumentStatus.VERIFIED) {
        return res.status(400).json({
          success: false,
          message: 'Document already verified',
          code: 'ALREADY_VERIFIED'
        });
      }

      if (document.status === DocumentStatus.PROCESSING) {
        return res.status(400).json({
          success: false,
          message: 'Document verification already in progress',
          code: 'VERIFICATION_IN_PROGRESS'
        });
      }

      // Update document status
      await documentService.updateDocumentStatus(documentId, DocumentStatus.PROCESSING);

      // Create verification record
      const verificationRecord = await db.verificationRecord.create({
        data: {
          documentId,
          verifierId: authReq.user.userId,
          status: VerificationStatus.PENDING,
          notes: notes?.trim(),
          metadata: {
            startedAt: new Date().toISOString(),
            verifierRole: authReq.user.role
          }
        },
        include: {
          document: {
            select: {
              id: true,
              fileName: true,
              ipfsHash: true
            }
          }
        }
      });

      // Start blockchain verification
      try {
        const verificationResult = await blockchainService.verifyDocument(document.ipfsHash);
        
        // Update verification record with blockchain data
        await db.verificationRecord.update({
          where: { id: verificationRecord.id },
          data: {
            transactionHash: verificationResult.transactionHash,
            blockNumber: verificationResult.blockNumber,
            gasUsed: verificationResult.gasUsed
          }
        });

        return res.status(201).json({
          success: true,
          message: 'Verification process started',
          data: {
            verificationRecord: {
              id: verificationRecord.id,
              status: verificationRecord.status,
              transactionHash: verificationResult.transactionHash,
              verificationId: verificationResult.verificationId
            }
          }
        });
      } catch (blockchainError) {
        logger.error('Blockchain verification failed:', blockchainError);
        
        // Update verification record with error
        await db.verificationRecord.update({
          where: { id: verificationRecord.id },
          data: {
            status: VerificationStatus.FAILED,
            errorMessage: blockchainError instanceof Error ? blockchainError.message : 'Unknown blockchain error',
            verifiedAt: new Date()
          }
        });

        // Revert document status
        await documentService.updateDocumentStatus(documentId, DocumentStatus.PENDING);

        res.status(400).json({
          success: false,
          message: 'Blockchain verification failed',
          code: 'BLOCKCHAIN_VERIFICATION_FAILED',
          data: {
            verificationRecord: {
              id: verificationRecord.id,
              status: VerificationStatus.FAILED
            }
          }
        });
      }
    } catch (error) {
      logger.error('Start verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start verification',
        code: 'START_VERIFICATION_ERROR'
      });
    }
  }
);

/**
 * PUT /verification/records/:id/status
 * Update verification record status (for webhook callbacks)
 */
router.put('/records/:id/status',
  authenticate,
  authorize('AUDITOR'),
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const { id } = req.params;
      const { status, result, transactionHash, blockNumber, gasUsed } = req.body;
      
      const record = await db.verificationRecord.findUnique({
        where: { id },
        include: { document: true }
      });

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Verification record not found',
          code: 'RECORD_NOT_FOUND'
        });
      }

      // Only the verifier or admin can update
      if (record.verifierId !== authReq.user.userId && authReq.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      // Update verification record
      const updatedRecord = await db.verificationRecord.update({
        where: { id },
        data: {
          status: status as VerificationStatus,
          transactionHash: transactionHash || record.transactionHash,
          verifiedAt: [VerificationStatus.VERIFIED, VerificationStatus.FAILED].includes(status) 
            ? new Date() 
            : record.verifiedAt,
          blockNumber,
          gasUsed: gasUsed || record.gasUsed,
          errorMessage: result?.error || null
        }
      });

      // Update document status based on verification result
      if (status === VerificationStatus.VERIFIED) {
        await documentService.updateDocumentStatus(record.documentId, DocumentStatus.VERIFIED);
      } else if (status === VerificationStatus.FAILED) {
        await documentService.updateDocumentStatus(record.documentId, DocumentStatus.REJECTED);
      }

      return res.json({
        success: true,
        message: 'Verification status updated',
        data: { record: updatedRecord }
      });
    } catch (error) {
      logger.error('Update verification status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update verification status',
        code: 'UPDATE_STATUS_ERROR'
      });
    }
  }
);

/**
 * GET /verification/stats
 * Get verification statistics
 */
router.get('/stats',
  authenticate,
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const { userId, dateFrom, dateTo } = req.query;
      
      // Build base filter
      const where: any = {};
      
      if (userId) {
        if (userId !== authReq.user.userId && authReq.user.role !== 'ADMIN') {
          return res.status(403).json({
            success: false,
            message: 'Access denied',
            code: 'ACCESS_DENIED'
          });
        }
        where.verifierId = userId as string;
      } else if (authReq.user.role !== 'ADMIN' && authReq.user.role !== 'MODERATOR') {
          where.verifierId = authReq.user.userId;
      }
      
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
        if (dateTo) where.createdAt.lte = new Date(dateTo as string);
      }

      // Get statistics
      const [totalRecords, statusCounts, recentActivity] = await Promise.all([
        db.verificationRecord.count({ where }),
        db.verificationRecord.groupBy({
          by: ['status'],
          where,
          _count: { status: true }
        }),
        db.verificationRecord.findMany({
          where,
          include: {
            document: {
              select: {
                id: true,
                fileName: true,
                category: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ]);

      // Calculate average verification time for completed records
      const completedRecords = await db.verificationRecord.findMany({
        where: {
          ...where,
          verifiedAt: { not: null }
        },
        select: {
          createdAt: true,
          verifiedAt: true
        }
      });

      const avgVerificationTime = completedRecords.length > 0
        ? completedRecords.reduce((acc, record) => {
            const duration = record.verifiedAt!.getTime() - record.createdAt.getTime();
            return acc + duration;
          }, 0) / completedRecords.length
        : 0;

      const stats = {
        total: totalRecords,
        byStatus: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as Record<string, number>),
        averageVerificationTime: Math.round(avgVerificationTime / (1000 * 60)), // in minutes
        recentActivity
      };

      return res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('Get verification stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get verification statistics',
        code: 'STATS_ERROR'
      });
    }
  }
);

/**
 * GET /verification/document/:documentId/status
 * Get verification status for a specific document
 */
router.get('/document/:documentId/status',
  authenticate,
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const { documentId } = req.params;
      
      // Check if user can access this document
      const canAccess = await documentService.canUserAccessDocument(authReq.user.userId, documentId);
      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      const verificationRecords = await db.verificationRecord.findMany({
        where: { documentId },
        include: {
          verifier: {
            select: {
              id: true,
              walletAddress: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const document = await documentService.getDocumentById(documentId);
      
      return res.json({
        success: true,
        data: {
          documentStatus: document?.status,
          verificationRecords,
          latestVerification: verificationRecords[0] || null
        }
      });
    } catch (error) {
      logger.error('Get document verification status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get document verification status',
        code: 'GET_DOCUMENT_STATUS_ERROR'
      });
    }
  }
);

export default router;