import { Router, Request, Response } from 'express';
import multer from 'multer';
import { documentService } from '../services/documentService';
import { blockchainService } from '../services/blockchainService';
import { logger } from '../utils/logger';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
  withAuth
} from '../middleware/auth';
// Removed enum imports - using string literals instead
// import { createIPFSClient } from '../utils/ipfs';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  }
});

/**
 * POST /documents/upload
 * Upload a new document
 */
router.post('/upload',
  authenticate,
  upload.single('file'),
  async (req: Request, res: Response): Promise<Response | void> => {
    const authReq = req as AuthenticatedRequest;
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
          code: 'NO_FILE_UPLOADED'
        });
      }

      const { description, tags, category, isPublic, expiresAt } = req.body;
      
      // Calculate file checksum
      const checksum = documentService.calculateChecksum(req.file.buffer);
      
      // Check if document already exists
      const existingDoc = await documentService.getDocumentByIpfsHash(checksum);
      if (existingDoc) {
        return res.status(409).json({
          success: false,
          message: 'Document already exists',
          code: 'DOCUMENT_EXISTS',
          data: { documentId: existingDoc.id }
        });
      }

      // Mock IPFS upload for testing
      let ipfsHash: string;
      let ipfsUrl: string;
      
      // Use mock hash for development/testing
      ipfsHash = `mock_${checksum.substring(0, 16)}_${Date.now()}`;
      ipfsUrl = `https://mock-ipfs.sealguard.dev/${ipfsHash}`;
      logger.info(`Using mock IPFS hash for testing: ${ipfsHash}`);

      // Parse tags
      let parsedTags: string[] = [];
      if (tags) {
        try {
          parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        } catch (e) {
          parsedTags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : [];
        }
      }

      // Create document record
      const document = await documentService.createDocument({
        fileName: `${Date.now()}_${req.file.originalname}`,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        ipfsHash,
        ipfsUrl,
        description: description?.trim(),
        tags: parsedTags,
        category: category as string,
        isPublic: isPublic === 'true' || isPublic === true,
        uploaderId: authReq.user.userId,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      });

      if (!document) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create document record',
          code: 'DOCUMENT_CREATION_FAILED'
        });
      }

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: {
          document: {
            id: document.id,
            fileName: document.fileName,
            originalName: document.originalName,
            fileSize: document.fileSize,
            mimeType: document.mimeType,
            ipfsHash: document.ipfsHash,
            ipfsUrl: document.ipfsUrl,
            description: document.description,
            tags: document.tags,
            category: document.category,
            status: document.status,
            isPublic: document.isPublic,
            uploadedAt: document.uploadedAt
          }
        }
      });
    } catch (error) {
      logger.error('Document upload error:', error);
      return res.status(500).json({
        success: false,
        message: 'Document upload failed',
        code: 'UPLOAD_ERROR'
      });
    }
  }
);

/**
 * GET /documents
 * Get documents with filtering and pagination
 */
router.get('/',
  authenticate,
  withAuth(async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        status,
        isPublic,
        tags,
        search,
        dateFrom,
        dateTo,
        userId
      } = req.query;

      // Parse filters
      const filters: any = {};
      
      if (category) filters.category = category as string;
      if (status) filters.status = status as string;
      if (isPublic !== undefined) filters.isPublic = isPublic === 'true';
      if (search) filters.search = search as string;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (tags) {
        filters.tags = typeof tags === 'string' ? tags.split(',') : tags;
      }
      
      // If userId is specified and user is not admin, only allow own documents
      if (userId) {
        if (userId !== req.user.userId && req.user.role !== 'ADMIN') {
          return res.status(403).json({
            success: false,
            message: 'Access denied',
            code: 'ACCESS_DENIED'
          });
        }
        filters.uploaderId = userId as string;
      } else {
        // Default to user's own documents unless they're admin
        if (req.user.role !== 'ADMIN' && req.user.role !== 'MODERATOR') {
          filters.uploaderId = req.user.userId;
        }
      }

      const result = await documentService.searchDocuments(
        filters,
        parseInt(page as string),
        parseInt(limit as string),
        true
      );

      if (!result) {
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve documents',
          code: 'RETRIEVAL_FAILED'
        });
      }

      res.json({
        success: true,
        data: {
          documents: result.documents,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: result.total,
            pages: result.pages
          }
        }
      });
    } catch (error) {
      logger.error('Get documents error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get documents',
        code: 'GET_DOCUMENTS_ERROR'
      });
    }
  })
);

/**
 * GET /documents/public
 * Get public documents
 */
router.get('/public',
  async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const {
        page = 1,
        limit = 20,
        category
      } = req.query;

      const result = await documentService.getPublicDocuments(
        parseInt(page as string),
        parseInt(limit as string),
        category as string
      );

      if (!result) {
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve public documents',
          code: 'RETRIEVAL_FAILED'
        });
      }

      res.json({
        success: true,
        data: {
          documents: result.documents,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: result.total,
            pages: result.pages
          }
        }
      });
    } catch (error) {
      logger.error('Get public documents error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get public documents',
        code: 'GET_PUBLIC_DOCUMENTS_ERROR'
      });
    }
  }
);

/**
 * GET /documents/:id
 * Get document by ID
 */
router.get('/:id',
  authenticate,
  withAuth(async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      
      // Check if user can access this document
      const canAccess = await documentService.canUserAccessDocument(req.user.userId, id);
      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      const document = await documentService.getDocumentById(id, true);
      
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
          code: 'DOCUMENT_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: { document }
      });
    } catch (error) {
      logger.error('Get document error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get document',
        code: 'GET_DOCUMENT_ERROR'
      });
    }
  })
);

/**
 * PUT /documents/:id
 * Update document metadata
 */
router.put('/:id',
  authenticate,
  withAuth(async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { description, tags, category, isPublic, expiresAt } = req.body;
      
      // Check if user can access this document
      const canAccess = await documentService.canUserAccessDocument(req.user.userId, id);
      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      const updatedDocument = await documentService.updateDocument(id, {
        description: description?.trim(),
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : undefined,
        category: category as string,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      });

      if (!updatedDocument) {
        return res.status(400).json({
          success: false,
          message: 'Failed to update document',
          code: 'UPDATE_FAILED'
        });
      }

      res.json({
        success: true,
        message: 'Document updated successfully',
        data: { document: updatedDocument }
      });
    } catch (error) {
      logger.error('Update document error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update document',
        code: 'UPDATE_ERROR'
      });
    }
  })
);

/**
 * POST /documents/:id/verify
 * Verify document on blockchain
 */
router.post('/:id/verify',
  authenticate,
  authorize('AUDITOR'),
  withAuth(async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      
      const document = await documentService.getDocumentById(id);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
          code: 'DOCUMENT_NOT_FOUND'
        });
      }

      // Check if already verified
      if (document.status === 'VERIFIED') {
        return res.status(400).json({
          success: false,
          message: 'Document already verified',
          code: 'ALREADY_VERIFIED'
        });
      }

      // Update status to processing
      await documentService.updateDocumentStatus(id, 'PROCESSING');

      // Verify on blockchain
      const verificationResult = await blockchainService.verifyDocument(document.ipfsHash);
      
      // Process the result
      const success = await blockchainService.processVerificationResult(
        id,
        verificationResult,
        req.user.userId
      );

      if (success) {
        res.json({
          success: true,
          message: 'Document verification initiated',
          data: {
            transactionHash: verificationResult.transactionHash,
            verificationId: verificationResult.verificationId
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Verification failed',
          code: 'VERIFICATION_FAILED',
          error: verificationResult.error
        });
      }
    } catch (error) {
      logger.error('Document verification error:', error);
      return res.status(500).json({
        success: false,
        message: 'Verification failed',
        code: 'VERIFICATION_ERROR'
      });
    }
  })
);

/**
 * DELETE /documents/:id
 * Delete (archive) document
 */
router.delete('/:id',
  authenticate,
  withAuth(async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      
      // Check if user can access this document
      const canAccess = await documentService.canUserAccessDocument(req.user.userId, id);
      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      const success = await documentService.deleteDocument(id);
      
      if (!success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to delete document',
          code: 'DELETE_FAILED'
        });
      }

      res.json({
        success: true,
        message: 'Document archived successfully'
      });
    } catch (error) {
      logger.error('Delete document error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete document',
        code: 'DELETE_ERROR'
      });
    }
  })
);

/**
 * GET /documents/stats
 * Get document statistics
 */
router.get('/stats',
  authenticate,
  withAuth(async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const { userId } = req.query;
      
      // If userId is specified and user is not admin, only allow own stats
      let targetUserId: string | undefined;
      if (userId) {
        if (userId !== req.user.userId && req.user.role !== 'ADMIN') {
          return res.status(403).json({
            success: false,
            message: 'Access denied',
            code: 'ACCESS_DENIED'
          });
        }
        targetUserId = userId as string;
      } else if (req.user.role !== 'ADMIN') {
        targetUserId = req.user.userId;
      }

      const stats = await documentService.getDocumentStats(targetUserId);
      
      if (!stats) {
        return res.status(500).json({
          success: false,
          message: 'Failed to get statistics',
          code: 'STATS_FAILED'
        });
      }

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('Get document stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get document statistics',
        code: 'STATS_ERROR'
      });
    }
  })
);

export default router;