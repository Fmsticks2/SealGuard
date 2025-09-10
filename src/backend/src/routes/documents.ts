import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { getPostgresClient } from '../config/database';
import { validate, commonValidations, validateFileType, validateFileSize } from '../middleware/validation';
import { rateLimiter, uploadRateLimiter } from '../middleware/rateLimiter';
import { fileOperationLogger, auditLogger } from '../middleware/requestLogger';
import { verifyToken, requireDocumentOwnership, AuthenticatedRequest } from '../middleware/auth';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler';
import { SynapseService } from '../services/synapseService';
import { PDPService } from '../services/pdpService';

const router = Router();
const synapseService = new SynapseService();
const pdpService = new PDPService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_TEMP_DIR || './uploads/temp';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB default
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/zip',
      'application/x-zip-compressed',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError(`File type '${file.mimetype}' is not allowed`));
    }
  },
});

// Upload document
router.post('/upload',
  verifyToken,
  uploadRateLimiter,
  fileOperationLogger('upload'),
  auditLogger('upload', 'document'),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    let tempFilePath: string | undefined;
    
    try {
      if (!req.file) {
        throw new ValidationError('No file uploaded');
      }
      
      tempFilePath = req.file.path;
      const { description = '', tags = '[]' } = req.body;
      
      // Parse tags
      let parsedTags: string[] = [];
      try {
        parsedTags = JSON.parse(tags);
        if (!Array.isArray(parsedTags)) {
          throw new Error('Tags must be an array');
        }
      } catch (error) {
        throw new ValidationError('Invalid tags format');
      }
      
      // Calculate file hash
      const fileBuffer = await fs.readFile(tempFilePath);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      const client = getPostgresClient();
      
      // Check if file already exists for this user
      const existingDoc = await client.query(
        'SELECT id FROM documents WHERE user_id = $1 AND file_hash = $2',
        [req.user!.id, fileHash]
      );
      
      if (existingDoc.rows.length > 0) {
        throw new ConflictError('This file has already been uploaded');
      }
      
      // Store file on Filecoin via Synapse
      console.log('📤 Uploading file to Filecoin...');
      const filecoinResult = await synapseService.storeFile(fileBuffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        metadata: {
          uploadedBy: req.user!.id,
          uploadedAt: new Date().toISOString(),
          description,
          tags: parsedTags,
        },
      });
      
      // Save document metadata to database
      const documentResult = await client.query(
        `INSERT INTO documents (
          user_id, filename, original_filename, file_size, file_type, file_hash,
          filecoin_cid, filecoin_deal_id, storage_provider, description, tags,
          upload_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *`,
        [
          req.user!.id,
          req.file.filename,
          req.file.originalname,
          req.file.size,
          req.file.mimetype,
          fileHash,
          filecoinResult.cid,
          filecoinResult.dealId,
          filecoinResult.storageProvider,
          description,
          JSON.stringify(parsedTags),
          'completed',
        ]
      );
      
      const document = documentResult.rows[0];
      
      // Clean up temp file
      await fs.unlink(tempFilePath);
      tempFilePath = undefined;
      
      console.log('✅ File uploaded successfully:', {
        documentId: document.id,
        cid: filecoinResult.cid,
        dealId: filecoinResult.dealId,
      });
      
      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          document: {
            id: document.id,
            filename: document.original_filename,
            fileSize: document.file_size,
            fileType: document.file_type,
            fileHash: document.file_hash,
            filecoinCid: document.filecoin_cid,
            filecoinDealId: document.filecoin_deal_id,
            storageProvider: document.storage_provider,
            description: document.description,
            tags: JSON.parse(document.tags || '[]'),
            uploadStatus: document.upload_status,
            createdAt: document.created_at,
          },
          filecoin: {
            cid: filecoinResult.cid,
            dealId: filecoinResult.dealId,
            storageProvider: filecoinResult.storageProvider,
            estimatedCost: filecoinResult.estimatedCost,
          },
        },
      });
    } catch (error) {
      // Clean up temp file on error
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (cleanupError) {
          console.error('Failed to clean up temp file:', cleanupError);
        }
      }
      next(error);
    }
  }
);

// Get user's documents
router.get('/',
  verifyToken,
  rateLimiter,
  validate(commonValidations.pagination),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as string) || 'desc';
      const search = req.query.search as string;
      const tags = req.query.tags as string;
      
      const offset = (page - 1) * limit;
      
      const client = getPostgresClient();
      
      // Build query conditions
      const conditions = ['user_id = $1'];
      const values: any[] = [req.user!.id];
      let paramIndex = 2;
      
      if (search) {
        conditions.push(`(original_filename ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        values.push(`%${search}%`);
        paramIndex++;
      }
      
      if (tags) {
        const tagArray = tags.split(',').map(tag => tag.trim());
        conditions.push(`tags::jsonb ?| $${paramIndex}`);
        values.push(tagArray);
        paramIndex++;
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) FROM documents ${whereClause}`,
        values
      );
      const totalCount = parseInt(countResult.rows[0].count, 10);
      
      // Get documents
      const documentsResult = await client.query(
        `SELECT 
          id, original_filename, file_size, file_type, file_hash,
          filecoin_cid, filecoin_deal_id, storage_provider,
          description, tags, upload_status, verification_status,
          last_verified_at, created_at, updated_at
        FROM documents 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...values, limit, offset]
      );
      
      const documents = documentsResult.rows.map(doc => ({
        id: doc.id,
        filename: doc.original_filename,
        fileSize: doc.file_size,
        fileType: doc.file_type,
        fileHash: doc.file_hash,
        filecoinCid: doc.filecoin_cid,
        filecoinDealId: doc.filecoin_deal_id,
        storageProvider: doc.storage_provider,
        description: doc.description,
        tags: JSON.parse(doc.tags || '[]'),
        uploadStatus: doc.upload_status,
        verificationStatus: doc.verification_status,
        lastVerifiedAt: doc.last_verified_at,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
      }));
      
      res.json({
        success: true,
        data: {
          documents,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            hasNext: page * limit < totalCount,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get document by ID
router.get('/:documentId',
  verifyToken,
  rateLimiter,
  validate(commonValidations.documentId),
  requireDocumentOwnership,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;
      
      const client = getPostgresClient();
      
      const documentResult = await client.query(
        `SELECT 
          id, original_filename, file_size, file_type, file_hash,
          filecoin_cid, filecoin_deal_id, storage_provider,
          description, tags, upload_status, verification_status,
          last_verified_at, created_at, updated_at
        FROM documents 
        WHERE id = $1`,
        [documentId]
      );
      
      if (documentResult.rows.length === 0) {
        throw new NotFoundError('Document not found');
      }
      
      const doc = documentResult.rows[0];
      
      // Get verification history
      const verificationResult = await client.query(
        `SELECT 
          id, verification_type, status, challenge_count,
          proof_data, verified_at, error_message
        FROM verification_proofs 
        WHERE document_id = $1 
        ORDER BY verified_at DESC 
        LIMIT 10`,
        [documentId]
      );
      
      const document = {
        id: doc.id,
        filename: doc.original_filename,
        fileSize: doc.file_size,
        fileType: doc.file_type,
        fileHash: doc.file_hash,
        filecoinCid: doc.filecoin_cid,
        filecoinDealId: doc.filecoin_deal_id,
        storageProvider: doc.storage_provider,
        description: doc.description,
        tags: JSON.parse(doc.tags || '[]'),
        uploadStatus: doc.upload_status,
        verificationStatus: doc.verification_status,
        lastVerifiedAt: doc.last_verified_at,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        verificationHistory: verificationResult.rows.map(v => ({
          id: v.id,
          verificationType: v.verification_type,
          status: v.status,
          challengeCount: v.challenge_count,
          verifiedAt: v.verified_at,
          errorMessage: v.error_message,
        })),
      };
      
      res.json({
        success: true,
        data: { document },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Download document
router.get('/:documentId/download',
  verifyToken,
  rateLimiter,
  validate(commonValidations.documentId),
  requireDocumentOwnership,
  fileOperationLogger('download'),
  auditLogger('download', 'document'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;
      
      const client = getPostgresClient();
      
      const documentResult = await client.query(
        'SELECT original_filename, file_type, filecoin_cid FROM documents WHERE id = $1',
        [documentId]
      );
      
      if (documentResult.rows.length === 0) {
        throw new NotFoundError('Document not found');
      }
      
      const doc = documentResult.rows[0];
      
      // Retrieve file from Filecoin
      console.log('📥 Downloading file from Filecoin...');
      const fileData = await synapseService.retrieveFile(doc.filecoin_cid);
      
      // Set response headers
      res.setHeader('Content-Type', doc.file_type);
      res.setHeader('Content-Disposition', `attachment; filename="${doc.original_filename}"`);
      res.setHeader('Content-Length', fileData.length);
      
      res.send(fileData);
    } catch (error) {
      next(error);
    }
  }
);

// Update document metadata
router.put('/:documentId',
  verifyToken,
  rateLimiter,
  validate(commonValidations.documentId),
  requireDocumentOwnership,
  validate({
    body: [
      { field: 'description', required: false, type: 'string', maxLength: 1000 },
      { field: 'tags', required: false, type: 'array' },
    ],
  }),
  auditLogger('update', 'document'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;
      const { description, tags } = req.body;
      
      const client = getPostgresClient();
      
      // Build update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
      }
      
      if (tags !== undefined) {
        updates.push(`tags = $${paramIndex++}`);
        values.push(JSON.stringify(tags));
      }
      
      if (updates.length === 0) {
        throw new ValidationError('No fields to update');
      }
      
      updates.push(`updated_at = NOW()`);
      values.push(documentId);
      
      const query = `
        UPDATE documents 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING original_filename, description, tags, updated_at
      `;
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Document not found');
      }
      
      const doc = result.rows[0];
      
      res.json({
        success: true,
        message: 'Document updated successfully',
        data: {
          document: {
            id: documentId,
            filename: doc.original_filename,
            description: doc.description,
            tags: JSON.parse(doc.tags || '[]'),
            updatedAt: doc.updated_at,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete document
router.delete('/:documentId',
  verifyToken,
  rateLimiter,
  validate(commonValidations.documentId),
  requireDocumentOwnership,
  fileOperationLogger('delete'),
  auditLogger('delete', 'document'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;
      
      const client = getPostgresClient();
      
      // Get document info before deletion
      const documentResult = await client.query(
        'SELECT original_filename, filecoin_cid FROM documents WHERE id = $1',
        [documentId]
      );
      
      if (documentResult.rows.length === 0) {
        throw new NotFoundError('Document not found');
      }
      
      const doc = documentResult.rows[0];
      
      // Start transaction
      await client.query('BEGIN');
      
      try {
        // Delete verification proofs
        await client.query(
          'DELETE FROM verification_proofs WHERE document_id = $1',
          [documentId]
        );
        
        // Delete document record
        await client.query(
          'DELETE FROM documents WHERE id = $1',
          [documentId]
        );
        
        await client.query('COMMIT');
        
        // Note: In a production system, you might want to implement
        // a soft delete or archive the file instead of permanent deletion
        
        console.log('🗑️ Document deleted:', {
          documentId,
          filename: doc.original_filename,
          cid: doc.filecoin_cid,
        });
        
        res.json({
          success: true,
          message: 'Document deleted successfully',
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;