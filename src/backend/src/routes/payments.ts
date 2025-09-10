import { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../config/database';
import { validate, commonValidations } from '../middleware/validation';
import { rateLimiter, paymentRateLimiter } from '../middleware/rateLimiter';
import { securityLogger, auditLogger } from '../middleware/requestLogger';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler';
import { FilecoinPayService } from '../services/filecoinPayService';
import { SynapseService } from '../services/synapseService';

const router = Router();
const filecoinPayService = new FilecoinPayService();
const synapseService = new SynapseService();

// Create payment for storage
router.post('/storage',
  verifyToken,
  paymentRateLimiter,
  securityLogger('create_storage_payment'),
  auditLogger('create_payment', 'storage'),
  validate({
    body: [
      { field: 'fileSize', required: true, type: 'number', min: 1 },
      { field: 'storageDuration', required: true, type: 'number', min: 1, max: 365 }, // days
      { field: 'currency', required: false, type: 'string', allowedValues: ['FIL', 'USD'] },
      { field: 'description', required: false, type: 'string', maxLength: 500 },
    ],
  }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { fileSize, storageDuration, currency = 'FIL', description } = req.body;
      
      // Calculate storage cost
      const costEstimate = await filecoinPayService.calculateStorageCost(
        fileSize,
        storageDuration
      );
      
      // Create payment
      const paymentData = {
        amount: costEstimate.totalCost,
        currency,
        description: description || `Storage payment for ${fileSize} bytes for ${storageDuration} days`,
        metadata: {
          type: 'storage',
          fileSize,
          storageDuration,
          costBreakdown: costEstimate,
          userId: req.user!.id,
        },
      };
      
      const payment = await filecoinPayService.createPayment(paymentData);
      
      // Save payment to database
      const pool = getPool();
    const client = await pool.connect();
      await client.query(
        `INSERT INTO payment_transactions (
          user_id, payment_id, payment_type, amount, currency,
          status, description, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          req.user!.id,
          payment.id,
          'storage',
          costEstimate.totalCost,
          currency,
          'pending',
          paymentData.description,
          JSON.stringify(paymentData.metadata),
        ]
      );
      
      res.status(201).json({
        success: true,
        message: 'Storage payment created successfully',
        data: {
          payment: {
            id: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            description: payment.description,
            paymentUrl: payment.paymentUrl,
            expiresAt: payment.expiresAt,
          },
          costBreakdown: costEstimate,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create payment for verification
router.post('/verification',
  verifyToken,
  paymentRateLimiter,
  securityLogger('create_verification_payment'),
  auditLogger('create_payment', 'verification'),
  validate({
    body: [
      { field: 'documentId', required: true, type: 'uuid' },
      { field: 'challengeCount', required: true, type: 'number', min: 1, max: 100 },
      { field: 'currency', required: false, type: 'string', allowedValues: ['FIL', 'USD'] },
      { field: 'description', required: false, type: 'string', maxLength: 500 },
    ],
  }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { documentId, challengeCount, currency = 'FIL', description } = req.body;
      
      const pool = getPool();
    const client = await pool.connect();
      
      // Verify document ownership
      const documentResult = await client.query(
        'SELECT id, original_filename FROM documents WHERE id = $1 AND user_id = $2',
        [documentId, req.user!.id]
      );
      
      if (documentResult.rows.length === 0) {
        throw new NotFoundError('Document not found');
      }
      
      const document = documentResult.rows[0];
      
      // Calculate verification cost
      const costEstimate = await filecoinPayService.calculateVerificationCost(
        challengeCount
      );
      
      // Create payment
      const paymentData = {
        amount: costEstimate.totalCost,
        currency,
        description: description || `PDP verification for ${document.original_filename} (${challengeCount} challenges)`,
        metadata: {
          type: 'verification',
          documentId,
          challengeCount,
          costBreakdown: costEstimate,
          userId: req.user!.id,
        },
      };
      
      const payment = await filecoinPayService.createPayment(paymentData);
      
      // Save payment to database
      await client.query(
        `INSERT INTO payment_transactions (
          user_id, payment_id, payment_type, amount, currency,
          status, description, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          req.user!.id,
          payment.id,
          'verification',
          costEstimate.totalCost,
          currency,
          'pending',
          paymentData.description,
          JSON.stringify(paymentData.metadata),
        ]
      );
      
      res.status(201).json({
        success: true,
        message: 'Verification payment created successfully',
        data: {
          payment: {
            id: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            description: payment.description,
            paymentUrl: payment.paymentUrl,
            expiresAt: payment.expiresAt,
          },
          costBreakdown: costEstimate,
          document: {
            id: document.id,
            filename: document.original_filename,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get payment status
router.get('/:paymentId/status',
  verifyToken,
  rateLimiter,
  validate({
    params: [
      { field: 'paymentId', required: true, type: 'string' },
    ],
  }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentId } = req.params;
      
      const pool = getPool();
    const client = await pool.connect();
      
      // Get payment from database
      const paymentResult = await client.query(
        `SELECT 
          payment_id, payment_type, amount, currency, status,
          description, metadata, created_at, updated_at
        FROM payment_transactions 
        WHERE payment_id = $1 AND user_id = $2`,
        [paymentId, req.user!.id]
      );
      
      if (paymentResult.rows.length === 0) {
        throw new NotFoundError('Payment not found');
      }
      
      const dbPayment = paymentResult.rows[0];
      
      // Get latest status from FilecoinPay
      const paymentStatus = await filecoinPayService.getPaymentStatus(paymentId);
      
      // Update status in database if changed
      if (paymentStatus.status !== dbPayment.status) {
        await client.query(
          'UPDATE payment_transactions SET status = $1, updated_at = NOW() WHERE payment_id = $2',
          [paymentStatus.status, paymentId]
        );
      }
      
      res.json({
        success: true,
        data: {
          payment: {
            id: paymentId,
            type: dbPayment.payment_type,
            amount: dbPayment.amount,
            currency: dbPayment.currency,
            status: paymentStatus.status,
            description: dbPayment.description,
            metadata: JSON.parse(dbPayment.metadata || '{}'),
            createdAt: dbPayment.created_at,
            updatedAt: dbPayment.updated_at,
            paidAt: paymentStatus.paidAt,
            transactionHash: paymentStatus.transactionHash,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get user's payment history
router.get('/history',
  verifyToken,
  rateLimiter,
  validate(commonValidations.pagination),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const paymentType = req.query.type as string;
      const status = req.query.status as string;
      const offset = (page - 1) * limit;
      
      const pool = getPool();
      const client = await pool.connect();
      
      // Build query conditions
      const conditions = ['user_id = $1'];
      const values: any[] = [req.user!.id];
      let paramIndex = 2;
      
      if (paymentType) {
        conditions.push(`payment_type = $${paramIndex}`);
        values.push(paymentType);
        paramIndex++;
      }
      
      if (status) {
        conditions.push(`status = $${paramIndex}`);
        values.push(status);
        paramIndex++;
      }
      
      const whereClause = `WHERE ${conditions.join(' AND ')}`;
      
      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) FROM payment_transactions ${whereClause}`,
        values
      );
      const totalCount = parseInt(countResult.rows[0].count, 10);
      
      // Get payments
      const paymentsResult = await client.query(
        `SELECT 
          payment_id, payment_type, amount, currency, status,
          description, metadata, created_at, updated_at
        FROM payment_transactions 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...values, limit, offset]
      );
      
      const payments = paymentsResult.rows.map(payment => ({
        id: payment.payment_id,
        type: payment.payment_type,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        description: payment.description,
        metadata: JSON.parse(payment.metadata || '{}'),
        createdAt: payment.created_at,
        updatedAt: payment.updated_at,
      }));
      
      res.json({
        success: true,
        data: {
          payments,
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

// Cancel payment
router.delete('/:paymentId',
  verifyToken,
  rateLimiter,
  validate({
    params: [
      { field: 'paymentId', required: true, type: 'string' },
    ],
  }),
  auditLogger('cancel_payment', 'payment'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentId } = req.params;
      
      const pool = getPool();
      const client = await pool.connect();
      
      // Get payment from database
      const paymentResult = await client.query(
        'SELECT payment_id, status FROM payment_transactions WHERE payment_id = $1 AND user_id = $2',
        [paymentId, req.user!.id]
      );
      
      if (paymentResult.rows.length === 0) {
        throw new NotFoundError('Payment not found');
      }
      
      const payment = paymentResult.rows[0];
      
      if (payment.status !== 'pending') {
        throw new ConflictError('Can only cancel pending payments');
      }
      
      // Cancel payment with FilecoinPay
      await filecoinPayService.cancelPayment(paymentId);
      
      // Update status in database
      await client.query(
        'UPDATE payment_transactions SET status = $1, updated_at = NOW() WHERE payment_id = $2',
        ['cancelled', paymentId]
      );
      
      res.json({
        success: true,
        message: 'Payment cancelled successfully',
        data: {
          paymentId,
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get cost estimates
router.post('/estimate',
  verifyToken,
  rateLimiter,
  validate({
    body: [
      { field: 'type', required: true, type: 'string', allowedValues: ['storage', 'verification'] },
      { field: 'fileSize', required: false, type: 'number', min: 1 },
      { field: 'storageDuration', required: false, type: 'number', min: 1, max: 365 },
      { field: 'challengeCount', required: false, type: 'number', min: 1, max: 100 },
    ],
  }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { type, fileSize, storageDuration, challengeCount } = req.body;
      
      let costEstimate;
      
      if (type === 'storage') {
        if (!fileSize || !storageDuration) {
          throw new ValidationError('fileSize and storageDuration are required for storage cost estimation');
        }
        costEstimate = await filecoinPayService.calculateStorageCost(fileSize, storageDuration);
      } else if (type === 'verification') {
        if (!challengeCount) {
          throw new ValidationError('challengeCount is required for verification cost estimation');
        }
        costEstimate = await filecoinPayService.calculateVerificationCost(challengeCount);
      }
      
      res.json({
        success: true,
        data: {
          type,
          costEstimate,
          currency: 'FIL',
          estimatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Webhook endpoint for payment status updates
router.post('/webhook',
  // Note: This endpoint should not require authentication as it's called by FilecoinPay
  validate({
    headers: [
      { field: 'x-filecoin-pay-signature', required: true, type: 'string' },
    ],
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['x-filecoin-pay-signature'] as string;
      const payload = req.body;
      
      // Verify webhook signature
      const isValid = await filecoinPayService.verifyWebhookSignature(payload, signature);
      
      if (!isValid) {
        throw new ValidationError('Invalid webhook signature');
      }
      
      // Process webhook
      await filecoinPayService.processWebhook(payload);
      
      res.json({
        success: true,
        message: 'Webhook processed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get payment statistics
router.get('/stats',
  verifyToken,
  rateLimiter,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const pool = getPool();
      const client = await pool.connect();
      
      // Get payment statistics
      const statsResult = await client.query(
        `SELECT 
          COUNT(*) as total_payments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_payments,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_spent,
          COUNT(CASE WHEN payment_type = 'storage' THEN 1 END) as storage_payments,
          COUNT(CASE WHEN payment_type = 'verification' THEN 1 END) as verification_payments,
          AVG(CASE WHEN status = 'completed' THEN amount END) as average_payment_amount
        FROM payment_transactions 
        WHERE user_id = $1`,
        [req.user!.id]
      );
      
      const stats = statsResult.rows[0];
      
      // Get recent payments
      const recentPayments = await client.query(
        `SELECT 
          payment_id, payment_type, amount, currency, status, created_at
        FROM payment_transactions 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 5`,
        [req.user!.id]
      );
      
      res.json({
        success: true,
        data: {
          summary: {
            totalPayments: parseInt(stats.total_payments, 10),
            completedPayments: parseInt(stats.completed_payments, 10),
            pendingPayments: parseInt(stats.pending_payments, 10),
            failedPayments: parseInt(stats.failed_payments, 10),
            cancelledPayments: parseInt(stats.cancelled_payments, 10),
            totalSpent: parseFloat(stats.total_spent || '0'),
            averagePaymentAmount: parseFloat(stats.average_payment_amount || '0'),
          },
          breakdown: {
            storagePayments: parseInt(stats.storage_payments, 10),
            verificationPayments: parseInt(stats.verification_payments, 10),
          },
          recentPayments: recentPayments.rows.map(payment => ({
            id: payment.payment_id,
            type: payment.payment_type,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            createdAt: payment.created_at,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
