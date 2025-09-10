import { Router, Request, Response, NextFunction } from 'express';
import { rateLimiter } from '../middleware/rateLimiter';
import { ValidationError } from '../middleware/errorHandler';

const router = Router();

// Simple in-memory notification store (in production, use Redis or similar)
interface Notification {
  id: string;
  walletAddress: string;
  type: 'document_registered' | 'access_granted' | 'access_revoked' | 'verification_completed' | 'system';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

class NotificationService {
  private notifications: Map<string, Notification[]> = new Map();

  addNotification(walletAddress: string, notification: Omit<Notification, 'id' | 'walletAddress' | 'read' | 'createdAt'>) {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      id,
      walletAddress: walletAddress.toLowerCase(),
      read: false,
      createdAt: new Date(),
      ...notification
    };

    const userNotifications = this.notifications.get(walletAddress.toLowerCase()) || [];
    userNotifications.unshift(newNotification); // Add to beginning

    // Keep only last 100 notifications per user
    if (userNotifications.length > 100) {
      userNotifications.splice(100);
    }

    this.notifications.set(walletAddress.toLowerCase(), userNotifications);

    console.log(`📧 Notification added for ${walletAddress}:`, notification.title);
    return newNotification;
  }

  getNotifications(walletAddress: string, limit = 50, offset = 0): Notification[] {
    const userNotifications = this.notifications.get(walletAddress.toLowerCase()) || [];
    return userNotifications.slice(offset, offset + limit);
  }

  markAsRead(walletAddress: string, notificationId: string): boolean {
    const userNotifications = this.notifications.get(walletAddress.toLowerCase()) || [];
    const notification = userNotifications.find(n => n.id === notificationId);

    if (notification) {
      notification.read = true;
      return true;
    }

    return false;
  }

  markAllAsRead(walletAddress: string): number {
    const userNotifications = this.notifications.get(walletAddress.toLowerCase()) || [];
    let count = 0;

    userNotifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        count++;
      }
    });

    return count;
  }

  getUnreadCount(walletAddress: string): number {
    const userNotifications = this.notifications.get(walletAddress.toLowerCase()) || [];
    return userNotifications.filter(n => !n.read).length;
  }
}

const notificationService = new NotificationService();

// Get notifications for a wallet address
router.get('/:walletAddress',
  rateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { walletAddress } = req.params;
      const { limit = '50', offset = '0' } = req.query;

      if (!walletAddress) {
        throw new ValidationError('Wallet address is required');
      }

      const notifications = notificationService.getNotifications(
        walletAddress,
        parseInt(limit as string, 10),
        parseInt(offset as string, 10)
      );

      const unreadCount = notificationService.getUnreadCount(walletAddress);

      return res.status(200).json({
        success: true,
        data: {
          notifications,
          unreadCount,
          total: notifications.length
        }
      });

    } catch (error) {
      return next(error);
    }
  }
);

// Create a notification (for system use or webhook triggers)
router.post('/',
  rateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { walletAddress, type, title, message, data } = req.body;

      if (!walletAddress || !type || !title || !message) {
        throw new ValidationError('walletAddress, type, title, and message are required');
      }

      const validTypes = ['document_registered', 'access_granted', 'access_revoked', 'verification_completed', 'system'];
      if (!validTypes.includes(type)) {
        throw new ValidationError(`Invalid notification type. Must be one of: ${validTypes.join(', ')}`);
      }

      const notification = notificationService.addNotification(walletAddress, {
        type,
        title,
        message,
        data
      });

      return res.status(201).json({
        success: true,
        data: notification,
        message: 'Notification created successfully'
      });

    } catch (error) {
      return next(error);
    }
  }
);

// Mark notification as read
router.patch('/:walletAddress/:notificationId/read',
  rateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { walletAddress, notificationId } = req.params;

      if (!walletAddress || !notificationId) {
        throw new ValidationError('Wallet address and notification ID are required');
      }

      const success = notificationService.markAsRead(walletAddress, notificationId);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Notification marked as read'
      });

    } catch (error) {
      return next(error);
    }
  }
);

// Mark all notifications as read
router.patch('/:walletAddress/read-all',
  rateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { walletAddress } = req.params;

      if (!walletAddress) {
        throw new ValidationError('Wallet address is required');
      }

      const count = notificationService.markAllAsRead(walletAddress);

      return res.status(200).json({
        success: true,
        data: { markedCount: count },
        message: `${count} notifications marked as read`
      });

    } catch (error) {
      return next(error);
    }
  }
);

// Webhook endpoint for blockchain events (can be called by external services)
router.post('/webhook/blockchain-event',
  rateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventType, walletAddress, transactionHash, blockNumber, data } = req.body;

      if (!eventType || !walletAddress) {
        throw new ValidationError('eventType and walletAddress are required');
      }

      let title = 'Blockchain Event';
      let message = 'A blockchain event occurred';
      let notificationType: Notification['type'] = 'system';

      // Map blockchain events to user-friendly notifications
      switch (eventType) {
        case 'DocumentRegistered':
          title = 'Document Registered';
          message = 'Your document has been successfully registered on the blockchain';
          notificationType = 'document_registered';
          break;
        case 'AccessGranted':
          title = 'Access Granted';
          message = 'You have been granted access to a document';
          notificationType = 'access_granted';
          break;
        case 'AccessRevoked':
          title = 'Access Revoked';
          message = 'Your access to a document has been revoked';
          notificationType = 'access_revoked';
          break;
        case 'VerificationCompleted':
          title = 'Verification Completed';
          message = 'Document verification has been completed';
          notificationType = 'verification_completed';
          break;
      }

      const notification = notificationService.addNotification(walletAddress, {
        type: notificationType,
        title,
        message,
        data: {
          eventType,
          transactionHash,
          blockNumber,
          ...data
        }
      });

      return res.status(201).json({
        success: true,
        data: notification,
        message: 'Blockchain event notification created'
      });

    } catch (error) {
      return next(error);
    }
  }
);

export default router;
export { notificationService };
