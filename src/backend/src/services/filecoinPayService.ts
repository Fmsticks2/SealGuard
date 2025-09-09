import axios from 'axios';
import crypto from 'crypto';
import { getPool } from '../config/database';

interface PaymentRequest {
  amount: number;
  currency: string;
  description: string;
  userId: string;
  metadata?: any;
}

interface PaymentResult {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  transactionHash?: string;
  expiresAt: Date;
}

interface SubscriptionRequest {
  userId: string;
  planId: string;
  amount: number;
  interval: 'monthly' | 'yearly';
}

class FilecoinPayService {
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly webhookSecret: string;

  constructor() {
    this.apiKey = process.env.FILECOIN_PAY_API_KEY!;
    this.apiUrl = 'https://api.filecoinpay.com/v1';
    this.webhookSecret = process.env.FILECOIN_PAY_WEBHOOK_SECRET!;

    if (!this.apiKey) {
      throw new Error('FILECOIN_PAY_API_KEY is required');
    }
  }

  /**
   * Create a one-time payment request
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      console.log(`💳 Creating payment for user: ${request.userId}`);

      const response = await axios.post(
        `${this.apiUrl}/payments`,
        {
          amount: request.amount,
          currency: request.currency,
          description: request.description,
          metadata: {
            userId: request.userId,
            ...request.metadata,
          },
          webhook_url: `${process.env.API_URL}/api/payments/webhook`,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const payment = response.data;

      // Save payment transaction to database
      await this.savePaymentTransaction({
        userId: request.userId,
        transactionType: 'one_time',
        amount: request.amount,
        currency: request.currency,
        status: 'pending',
        filecoinPayId: payment.id,
        metadata: request.metadata,
      });

      console.log(`✅ Payment created successfully: ${payment.id}`);

      return {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        expiresAt: new Date(payment.expires_at),
      };
    } catch (error) {
      console.error('❌ Failed to create payment:', error);
      throw new Error(`Payment creation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(request: SubscriptionRequest): Promise<any> {
    try {
      console.log(`🔄 Creating subscription for user: ${request.userId}`);

      const response = await axios.post(
        `${this.apiUrl}/subscriptions`,
        {
          plan_id: request.planId,
          amount: request.amount,
          interval: request.interval,
          metadata: {
            userId: request.userId,
          },
          webhook_url: `${process.env.API_URL}/api/payments/webhook`,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const subscription = response.data;

      // Save subscription transaction to database
      await this.savePaymentTransaction({
        userId: request.userId,
        transactionType: 'subscription',
        amount: request.amount,
        currency: 'FIL',
        status: 'pending',
        filecoinPayId: subscription.id,
        metadata: {
          planId: request.planId,
          interval: request.interval,
        },
      });

      console.log(`✅ Subscription created successfully: ${subscription.id}`);

      return subscription;
    } catch (error) {
      console.error('❌ Failed to create subscription:', error);
      throw new Error(`Subscription creation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('❌ Failed to get payment status:', error);
      throw new Error(`Payment status check failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      await axios.post(
        `${this.apiUrl}/payments/${paymentId}/cancel`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      // Update payment status in database
      await this.updatePaymentStatus(paymentId, 'cancelled');

      console.log(`✅ Payment cancelled successfully: ${paymentId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to cancel payment:', error);
      throw new Error(`Payment cancellation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Process webhook from FilecoinPay
   */
  async processWebhook(payload: any, signature: string): Promise<void> {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(payload, signature)) {
        throw new Error('Invalid webhook signature');
      }

      const { event_type, data } = payload;

      console.log(`📨 Processing webhook: ${event_type}`);

      switch (event_type) {
        case 'payment.completed':
          await this.handlePaymentCompleted(data);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(data);
          break;
        case 'subscription.created':
          await this.handleSubscriptionCreated(data);
          break;
        case 'subscription.cancelled':
          await this.handleSubscriptionCancelled(data);
          break;
        default:
          console.log(`⚠️ Unhandled webhook event: ${event_type}`);
      }
    } catch (error) {
      console.error('❌ Failed to process webhook:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  private verifyWebhookSignature(payload: any, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Handle payment completed webhook
   */
  private async handlePaymentCompleted(data: any): Promise<void> {
    await this.updatePaymentStatus(data.id, 'completed', data.transaction_hash);
    
    // Additional logic for successful payment
    // e.g., activate user features, send confirmation email
    console.log(`✅ Payment completed: ${data.id}`);
  }

  /**
   * Handle payment failed webhook
   */
  private async handlePaymentFailed(data: any): Promise<void> {
    await this.updatePaymentStatus(data.id, 'failed');
    
    // Additional logic for failed payment
    // e.g., notify user, retry logic
    console.log(`❌ Payment failed: ${data.id}`);
  }

  /**
   * Handle subscription created webhook
   */
  private async handleSubscriptionCreated(data: any): Promise<void> {
    await this.updatePaymentStatus(data.id, 'active');
    
    // Additional logic for subscription activation
    console.log(`✅ Subscription created: ${data.id}`);
  }

  /**
   * Handle subscription cancelled webhook
   */
  private async handleSubscriptionCancelled(data: any): Promise<void> {
    await this.updatePaymentStatus(data.id, 'cancelled');
    
    // Additional logic for subscription cancellation
    console.log(`❌ Subscription cancelled: ${data.id}`);
  }

  /**
   * Save payment transaction to database
   */
  private async savePaymentTransaction(transaction: any): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query(
        `INSERT INTO payment_transactions 
         (user_id, transaction_type, amount, currency, status, filecoin_pay_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          transaction.userId,
          transaction.transactionType,
          transaction.amount,
          transaction.currency,
          transaction.status,
          transaction.filecoinPayId,
          JSON.stringify(transaction.metadata || {}),
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Update payment status in database
   */
  private async updatePaymentStatus(
    filecoinPayId: string,
    status: string,
    transactionHash?: string
  ): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query(
        `UPDATE payment_transactions 
         SET status = $1, transaction_hash = $2, updated_at = NOW()
         WHERE filecoin_pay_id = $3`,
        [status, transactionHash, filecoinPayId]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get user payment history
   */
  async getPaymentHistory(userId: string): Promise<any[]> {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT * FROM payment_transactions 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
      );
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate storage cost based on file size and duration
   */
  calculateStorageCost(fileSizeBytes: number, durationDays: number = 365): number {
    // Base cost: $0.01 per GB per month
    const baseCostPerGBPerMonth = 0.01;
    const fileSizeGB = fileSizeBytes / (1024 * 1024 * 1024);
    const durationMonths = durationDays / 30;
    
    return Math.max(0.001, fileSizeGB * baseCostPerGBPerMonth * durationMonths);
  }

  /**
   * Calculate verification cost
   */
  calculateVerificationCost(): number {
    // Fixed cost per verification
    return 0.001; // $0.001 per verification
  }
}

// Export singleton instance
export const filecoinPayService = new FilecoinPayService();
export default filecoinPayService;