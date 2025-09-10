import { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../config/database';
import { validate, commonValidations } from '../middleware/validation';
import { rateLimiter, strictRateLimiter } from '../middleware/rateLimiter';
import { auditLogger } from '../middleware/requestLogger';
import { verifyToken, requireDocumentOwnership, AuthenticatedRequest } from '../middleware/auth';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler';
import { PDPService } from '../services/pdpService';
import { SynapseService } from '../services/synapseService';

const router = Router();
const pdpService = new PDPService();
const synapseService = new SynapseService();

// Start PDP verification for a document
router.post('/pdp/:documentId',
  verifyToken,
  strictRateLimiter,
  validate(commonValidations.documentId),
  requireDocumentOwnership,
  validate(commonValidations.pdpVerification),
  auditLogger('start_pdp_verification', 'document'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;
      const { challengeCount = 10 } = req.body;
      
      const pool = getPool();
      const client = await pool.connect();
      
      // Get document info
      const documentResult = await client.query(
        `SELECT 
          id, original_filename, file_hash, filecoin_cid, 
          verification_status, last_verified_at
        FROM documents 
        WHERE id = $1`,
        [documentId]
      );
      
      if (documentResult.rows.length === 0) {
        throw new NotFoundError('Document not found');
      }
      
      const document = documentResult.rows[0];
      
      // Check if verification is already in progress
      const ongoingVerification = await client.query(
        `SELECT id FROM verification_proofs 
         WHERE document_id = $1 AND status = 'pending' 
         ORDER BY created_at DESC LIMIT 1`,
        [documentId]
      );
      
      if (ongoingVerification.rows.length > 0) {
        throw new ConflictError('Verification already in progress for this document');
      }
      
      console.log('🔍 Starting PDP verification:', {
        documentId,
        filename: document.original_filename,
        challengeCount,
      });
      
      // Start verification process
      const verificationResult = await pdpService.generateProof(
        documentId,
        document.filecoin_cid,
        challengeCount
      );
      
      res.json({
        success: true,
        message: 'PDP verification started successfully',
        data: {
          verificationId: verificationResult.verificationId,
          documentId,
          challengeCount,
          status: 'pending',
          startedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get verification status
router.get('/pdp/:documentId/status',
  verifyToken,
  rateLimiter,
  validate(commonValidations.documentId),
  requireDocumentOwnership,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;
      
      const pool = getPool();
      const client = await pool.connect();
      
      // Get latest verification
      const verificationResult = await client.query(
        `SELECT 
          id, verification_type, status, challenge_count,
          proof_data, verified_at, error_message, created_at
        FROM verification_proofs 
        WHERE document_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1`,
        [documentId]
      );
      
      if (verificationResult.rows.length === 0) {
        return res.json({
          success: true,
          data: {
            documentId,
            status: 'not_verified',
            message: 'No verification found for this document',
          },
        });
      }
      
      const verification = verificationResult.rows[0];
      
      res.json({
        success: true,
        data: {
          verificationId: verification.id,
          documentId,
          verificationType: verification.verification_type,
          status: verification.status,
          challengeCount: verification.challenge_count,
          verifiedAt: verification.verified_at,
          createdAt: verification.created_at,
          errorMessage: verification.error_message,
          proofSummary: verification.proof_data ? {
            challengesGenerated: verification.proof_data.challenges?.length || 0,
            proofsVerified: verification.proof_data.verifiedProofs?.length || 0,
            merkleRoot: verification.proof_data.merkleRoot,
          } : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get verification history for a document
router.get('/pdp/:documentId/history',
  verifyToken,
  rateLimiter,
  validate(commonValidations.documentId),
  requireDocumentOwnership,
  validate(commonValidations.pagination),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;
      
      const pool = getPool();
      const client = await pool.connect();
      
      // Get total count
      const countResult = await client.query(
        'SELECT COUNT(*) FROM verification_proofs WHERE document_id = $1',
        [documentId]
      );
      const totalCount = parseInt(countResult.rows[0].count, 10);
      
      // Get verification history
      const historyResult = await client.query(
        `SELECT 
          id, verification_type, status, challenge_count,
          verified_at, error_message, created_at
        FROM verification_proofs 
        WHERE document_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3`,
        [documentId, limit, offset]
      );
      
      const verifications = historyResult.rows.map(v => ({
        id: v.id,
        verificationType: v.verification_type,
        status: v.status,
        challengeCount: v.challenge_count,
        verifiedAt: v.verified_at,
        createdAt: v.created_at,
        errorMessage: v.error_message,
      }));
      
      res.json({
        success: true,
        data: {
          documentId,
          verifications,
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

// Verify PDP proof
router.post('/pdp/:documentId/verify',
  verifyToken,
  strictRateLimiter,
  validate(commonValidations.documentId),
  requireDocumentOwnership,
  validate({
    body: [
      { field: 'verificationId', required: true, type: 'uuid' },
      { field: 'proofData', required: true, type: 'object' },
    ],
  }),
  auditLogger('verify_pdp_proof', 'document'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;
      const { verificationId, proofData } = req.body;
      
      const pool = getPool();
      const client = await pool.connect();
      
      // Get verification record
      const verificationResult = await client.query(
        `SELECT id, status, challenge_count FROM verification_proofs 
         WHERE id = $1 AND document_id = $2`,
        [verificationId, documentId]
      );
      
      if (verificationResult.rows.length === 0) {
        throw new NotFoundError('Verification not found');
      }
      
      const verification = verificationResult.rows[0];
      
      if (verification.status !== 'pending') {
        throw new ConflictError('Verification is not in pending status');
      }
      
      console.log('✅ Verifying PDP proof:', {
        verificationId,
        documentId,
        challengeCount: verification.challenge_count,
      });
      
      // Verify the proof
      const verifyResult = await pdpService.verifyProof(
        verificationId,
        proofData
      );
      
      res.json({
        success: true,
        message: 'PDP proof verification completed',
        data: {
          verificationId,
          documentId,
          status: verifyResult.isValid ? 'verified' : 'failed',
          isValid: verifyResult.isValid,
          verifiedAt: new Date().toISOString(),
          proofSummary: {
            challengesVerified: verifyResult.challengesVerified,
            totalChallenges: verification.challenge_count,
            successRate: verifyResult.successRate,
            merkleRoot: verifyResult.merkleRoot,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get verification statistics for user
router.get('/stats',
  verifyToken,
  rateLimiter,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const pool = getPool();
      const client = await pool.connect();
      
      // Get document and verification stats
      const statsResult = await client.query(
        `SELECT 
          COUNT(DISTINCT d.id) as total_documents,
          COUNT(DISTINCT CASE WHEN d.verification_status = 'verified' THEN d.id END) as verified_documents,
          COUNT(DISTINCT CASE WHEN d.verification_status = 'failed' THEN d.id END) as failed_documents,
          COUNT(DISTINCT CASE WHEN d.verification_status = 'pending' THEN d.id END) as pending_documents,
          COUNT(vp.id) as total_verifications,
          COUNT(CASE WHEN vp.status = 'verified' THEN 1 END) as successful_verifications,
          COUNT(CASE WHEN vp.status = 'failed' THEN 1 END) as failed_verifications,
          AVG(CASE WHEN vp.status = 'verified' THEN vp.challenge_count END) as avg_challenge_count
        FROM documents d
        LEFT JOIN verification_proofs vp ON d.id = vp.document_id
        WHERE d.user_id = $1`,
        [req.user!.id]
      );
      
      const stats = statsResult.rows[0];
      
      // Get recent verification activity
      const recentActivity = await client.query(
        `SELECT 
          vp.id, vp.status, vp.verified_at, vp.created_at,
          d.original_filename
        FROM verification_proofs vp
        JOIN documents d ON vp.document_id = d.id
        WHERE d.user_id = $1
        ORDER BY vp.created_at DESC
        LIMIT 10`,
        [req.user!.id]
      );
      
      // Calculate verification success rate
      const totalVerifications = parseInt(stats.total_verifications, 10);
      const successfulVerifications = parseInt(stats.successful_verifications, 10);
      const successRate = totalVerifications > 0 
        ? (successfulVerifications / totalVerifications) * 100 
        : 0;
      
      res.json({
        success: true,
        data: {
          documents: {
            total: parseInt(stats.total_documents, 10),
            verified: parseInt(stats.verified_documents, 10),
            failed: parseInt(stats.failed_documents, 10),
            pending: parseInt(stats.pending_documents, 10),
          },
          verifications: {
            total: totalVerifications,
            successful: successfulVerifications,
            failed: parseInt(stats.failed_verifications, 10),
            successRate: Math.round(successRate * 100) / 100,
            averageChallengeCount: stats.avg_challenge_count 
              ? Math.round(parseFloat(stats.avg_challenge_count) * 100) / 100 
              : 0,
          },
          recentActivity: recentActivity.rows.map(activity => ({
            verificationId: activity.id,
            filename: activity.original_filename,
            status: activity.status,
            verifiedAt: activity.verified_at,
            createdAt: activity.created_at,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get network verification statistics
router.get('/network-stats',
  verifyToken,
  rateLimiter,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Get Synapse network stats
      const networkStats = await synapseService.getNetworkStats();
      
      const pool = getPool();
      const client = await pool.connect();
      
      // Get platform-wide verification stats
      const platformStats = await client.query(
        `SELECT 
          COUNT(DISTINCT d.id) as total_documents,
          COUNT(vp.id) as total_verifications,
          COUNT(CASE WHEN vp.status = 'verified' THEN 1 END) as successful_verifications,
          AVG(CASE WHEN vp.status = 'verified' THEN vp.challenge_count END) as avg_challenge_count,
          COUNT(DISTINCT d.user_id) as active_users
        FROM documents d
        LEFT JOIN verification_proofs vp ON d.id = vp.document_id
        WHERE d.created_at >= NOW() - INTERVAL '30 days'`
      );
      
      const stats = platformStats.rows[0];
      const totalVerifications = parseInt(stats.total_verifications, 10);
      const successfulVerifications = parseInt(stats.successful_verifications, 10);
      const platformSuccessRate = totalVerifications > 0 
        ? (successfulVerifications / totalVerifications) * 100 
        : 0;
      
      res.json({
        success: true,
        data: {
          network: {
            totalStorageProviders: networkStats.storageProviders || 0,
            totalStorageCapacity: networkStats.totalCapacity || '0 TB',
            averageRetrievalTime: networkStats.averageRetrievalTime || '0ms',
            networkHealth: networkStats.networkHealth || 'unknown',
          },
          platform: {
            totalDocuments: parseInt(stats.total_documents, 10),
            totalVerifications: totalVerifications,
            successRate: Math.round(platformSuccessRate * 100) / 100,
            averageChallengeCount: stats.avg_challenge_count 
              ? Math.round(parseFloat(stats.avg_challenge_count) * 100) / 100 
              : 0,
            activeUsers: parseInt(stats.active_users, 10),
          },
          period: 'Last 30 days',
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Cancel ongoing verification
router.delete('/pdp/:documentId/:verificationId',
  verifyToken,
  rateLimiter,
  validate(commonValidations.documentId),
  requireDocumentOwnership,
  validate({
    params: [
      { field: 'verificationId', required: true, type: 'uuid' },
    ],
  }),
  auditLogger('cancel_verification', 'document'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { documentId, verificationId } = req.params;
      
      const pool = getPool();
      const client = await pool.connect();
      
      // Check if verification exists and is pending
      const verificationResult = await client.query(
        `SELECT id, status FROM verification_proofs 
         WHERE id = $1 AND document_id = $2`,
        [verificationId, documentId]
      );
      
      if (verificationResult.rows.length === 0) {
        throw new NotFoundError('Verification not found');
      }
      
      const verification = verificationResult.rows[0];
      
      if (verification.status !== 'pending') {
        throw new ConflictError('Can only cancel pending verifications');
      }
      
      // Update verification status to cancelled
      await client.query(
        `UPDATE verification_proofs 
         SET status = 'cancelled', updated_at = NOW() 
         WHERE id = $1`,
        [verificationId]
      );
      
      console.log('❌ Verification cancelled:', {
        verificationId,
        documentId,
      });
      
      res.json({
        success: true,
        message: 'Verification cancelled successfully',
        data: {
          verificationId,
          documentId,
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
