import express, { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../config/database';
import { validate, commonValidations } from '../middleware/validation';
import { rateLimiter, strictRateLimiter } from '../middleware/rateLimiter';
import { auditLogger } from '../middleware/requestLogger';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler';
import { SynapseService } from '../services/synapseService';
import crypto from 'crypto';

const router = Router();
const synapseService = new SynapseService();

// Get storage pricing information
router.get('/pricing',
  verifyToken,
  rateLimiter,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { fileSize, duration = 365 } = req.query;
      
      if (!fileSize) {
        throw new ValidationError('File size is required');
      }
      
      const fileSizeBytes = parseInt(fileSize as string, 10);
      if (isNaN(fileSizeBytes) || fileSizeBytes <= 0) {
        throw new ValidationError('Invalid file size');
      }
      
      const durationDays = parseInt(duration as string, 10);
      if (isNaN(durationDays) || durationDays < 30 || durationDays > 1095) {
        throw new ValidationError('Duration must be between 30 and 1095 days');
      }
      
      // Get storage cost estimate from Synapse
      const costEstimate = await synapseService.estimateStorageCost(fileSizeBytes, durationDays);
      
      // Add platform fee (5% of storage cost)
      const platformFee = costEstimate.totalCost * 0.05;
      const totalCost = costEstimate.totalCost + platformFee;
      
      res.json({
        success: true,
        data: {
          fileSize: fileSizeBytes,
          duration: durationDays,
          storageCost: costEstimate.totalCost,
          platformFee,
          totalCost,
          currency: 'FIL',
          breakdown: {
            baseCost: costEstimate.baseCost,
            replicationCost: costEstimate.replicationCost,
            retrievalCost: costEstimate.retrievalCost,
            platformFee,
          },
          estimatedProviders: costEstimate.availableProviders,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create payment intent for document storage
router.post('/create-intent',
  verifyToken,
  strictRateLimiter,
  validate({
    body: [
      { field: 'documentId', required: true, type: 'uuid' },
      { field: 'amount', required: true, type: 'number', min: 0.001 },
      { field: 'duration', required: true, type: 'number', min: 30, max: 1095 },
    ],
  }),
  auditLogger('create_payment_intent', 'payment'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { documentId, amount, duration } = req.body;
      const userId = req.user!.id;
      
      const pool = getPool();
      const client = await pool.connect();
      
      // Verify document ownership
      const documentResult = await client.query(
        'SELECT id, original_filename, file_size, storage_status FROM documents WHERE id = $1 AND user_id = $2',
        [documentId, userId]
      );
      
      if (documentResult.rows.length === 0) {
        throw new NotFoundError('Document not found');
      }
      
      const document = documentResult.rows[0];
      
      // Check if document is already paid for
      if (document.storage_status === 'active') {
        throw new ConflictError('Document storage is already active');
      }
      
      // Generate payment intent
      const paymentIntentId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      
      // Store payment intent
      await client.query(
        `INSERT INTO payment_intents 
         (id, user_id, document_id, amount, currency, duration_days, status, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [paymentIntentId, userId, documentId, amount, 'FIL', duration, 'pending', expiresAt]
      );
      
      // Generate Filecoin Pay payment URL
      const paymentUrl = `https://pay.filecoin.io/pay?` + new URLSearchParams({
        to: process.env.FILECOIN_PAYMENT_ADDRESS || 'f1...',
        amount: amount.toString(),
        currency: 'FIL',
        reference: paymentIntentId,
        callback: `${process.env.API_BASE_URL}/api/payment/webhook`,
        success_url: `${process.env.FRONTEND_URL}/dashboard/documents?payment=success`,
        cancel_url: `${process.env.FRONTEND_URL}/dashboard/documents?payment=cancelled`,
      }).toString();
      
      res.json({
        success: true,
        data: {
          paymentIntentId,
          paymentUrl,
          amount,
          currency: 'FIL',
          expiresAt: expiresAt.toISOString(),
          document: {
            id: document.id,
            filename: document.original_filename,
            size: document.file_size,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get payment intent status
router.get('/intent/:paymentIntentId',
  verifyToken,
  rateLimiter,
  validate({
    params: [
      { field: 'paymentIntentId', required: true, type: 'uuid' },
    ],
  }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentIntentId } = req.params;
      const userId = req.user!.id;
      
      const pool = getPool();
      const client = await pool.connect();
      
      const result = await client.query(
        `SELECT 
          pi.id, pi.amount, pi.currency, pi.duration_days, pi.status, 
          pi.expires_at, pi.created_at, pi.completed_at,
          d.id as document_id, d.original_filename, d.file_size
         FROM payment_intents pi
         JOIN documents d ON pi.document_id = d.id
         WHERE pi.id = $1 AND pi.user_id = $2`,
        [paymentIntentId, userId]
      );
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Payment intent not found');
      }
      
      const paymentIntent = result.rows[0];
      
      res.json({
        success: true,
        data: {
          id: paymentIntent.id,
          amount: parseFloat(paymentIntent.amount),
          currency: paymentIntent.currency,
          duration: paymentIntent.duration_days,
          status: paymentIntent.status,
          expiresAt: paymentIntent.expires_at,
          createdAt: paymentIntent.created_at,
          completedAt: paymentIntent.completed_at,
          document: {
            id: paymentIntent.document_id,
            filename: paymentIntent.original_filename,
            size: paymentIntent.file_size,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Webhook endpoint for Filecoin Pay
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['x-filecoin-signature'] as string;
      const payload = req.body;
      
      // Verify webhook signature (implement based on Filecoin Pay docs)
      if (!verifyWebhookSignature(payload, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      const event = JSON.parse(payload.toString());
      const { type, data } = event;
      
      if (type === 'payment.completed') {
        await handlePaymentCompleted(data);
      } else if (type === 'payment.failed') {
        await handlePaymentFailed(data);
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
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
      const userId = req.user!.id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      const pool = getPool();
      const client = await pool.connect();
      
      const [paymentsResult, countResult] = await Promise.all([
        client.query(
          `SELECT 
            pi.id, pi.amount, pi.currency, pi.duration_days, pi.status,
            pi.created_at, pi.completed_at,
            d.id as document_id, d.original_filename, d.file_size
           FROM payment_intents pi
           JOIN documents d ON pi.document_id = d.id
           WHERE pi.user_id = $1
           ORDER BY pi.created_at DESC
           LIMIT $2 OFFSET $3`,
          [userId, limit, offset]
        ),
        client.query(
          'SELECT COUNT(*) FROM payment_intents WHERE user_id = $1',
          [userId]
        ),
      ]);
      
      const payments = paymentsResult.rows.map(row => ({
        id: row.id,
        amount: parseFloat(row.amount),
        currency: row.currency,
        duration: row.duration_days,
        status: row.status,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        document: {
          id: row.document_id,
          filename: row.original_filename,
          size: row.file_size,
        },
      }));
      
      const totalCount = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(totalCount / parseInt(limit as string));
      
      res.json({
        success: true,
        data: payments,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalCount,
          totalPages,
          hasNext: parseInt(page as string) < totalPages,
          hasPrev: parseInt(page as string) > 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Helper functions
function verifyWebhookSignature(payload: Buffer, signature: string): boolean {
  // Implement signature verification based on Filecoin Pay documentation
  const webhookSecret = process.env.FILECOIN_WEBHOOK_SECRET;
  if (!webhookSecret) return false;
  
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

async function handlePaymentCompleted(data: any) {
  const { reference: paymentIntentId, amount, transaction_hash } = data;
  
  const pool = getPool();
      const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update payment intent
    const paymentResult = await client.query(
      `UPDATE payment_intents 
       SET status = 'completed', completed_at = NOW(), transaction_hash = $2
       WHERE id = $1 AND status = 'pending'
       RETURNING document_id, user_id, duration_days`,
      [paymentIntentId, transaction_hash]
    );
    
    if (paymentResult.rows.length === 0) {
      throw new Error('Payment intent not found or already processed');
    }
    
    const { document_id, user_id, duration_days } = paymentResult.rows[0];
    
    // Update document storage status
    const expiresAt = new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000);
    await client.query(
      `UPDATE documents 
       SET storage_status = 'active', storage_expires_at = $2, updated_at = NOW()
       WHERE id = $1`,
      [document_id, expiresAt]
    );
    
    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
       VALUES ($1, 'payment_completed', 'document', $2, $3, NOW())`,
      [user_id, document_id, JSON.stringify({ paymentIntentId, amount, duration_days })]
    );
    
    await client.query('COMMIT');
    
    console.log(`Payment completed for document ${document_id}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error handling payment completion:', error);
    throw error;
  }
}

async function handlePaymentFailed(data: any) {
  const { reference: paymentIntentId, reason } = data;
  
  const pool = getPool();
      const client = await pool.connect();
  
  await client.query(
    `UPDATE payment_intents 
     SET status = 'failed', failure_reason = $2, updated_at = NOW()
     WHERE id = $1 AND status = 'pending'`,
    [paymentIntentId, reason]
  );
  
  console.log(`Payment failed for intent ${paymentIntentId}: ${reason}`);
}

export default router;
