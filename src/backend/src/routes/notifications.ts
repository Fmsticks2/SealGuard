import { Router, Response } from 'express';
import { logger } from '../utils/logger';
import {
  authenticate,
  AuthenticatedRequest,
  withAuth
} from '../middleware/auth';

import { EventEmitter } from 'events';

const router = Router();

// Event emitter for real-time notifications
export const notificationEmitter = new EventEmitter();

// In-memory notification storage (replace with Redis or external service in production)
const notificationStore = new Map<string, any[]>();

/**
 * Notification Service - Contract-only mode
 */
export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification({
    userId,
    type,
    title,
    message,
    priority = 'MEDIUM',
    metadata = {},
    actionUrl
  }: {
    userId: string;
    type: string;
    title: string;
    message: string;
    priority?: string;
    metadata?: any;
    actionUrl?: string;
  }) {
    try {
      const notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type,
        title,
        message,
        priority,
        metadata,
        actionUrl,
        isRead: false,
        createdAt: new Date().toISOString()
      };

      // Store in memory
      if (!notificationStore.has(userId)) {
        notificationStore.set(userId, []);
      }
      notificationStore.get(userId)!.push(notification);

      // Emit real-time notification
      notificationEmitter.emit('notification', {
        userId,
        notification
      });

      logger.info(`Notification created for user ${userId}: ${title}`);
      return notification;
    } catch (error) {
      logger.error('Failed to create notification:', error);
      return null;
    }
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(userId: string, limit: number = 50) {
    try {
      const userNotifications = notificationStore.get(userId) || [];
      return userNotifications
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    } catch (error) {
      logger.error('Failed to get user notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    try {
      const userNotifications = notificationStore.get(userId) || [];
      const notification = userNotifications.find(n => n.id === notificationId);
      
      if (notification) {
        notification.isRead = true;
        notification.readAt = new Date().toISOString();
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    try {
      const userNotifications = notificationStore.get(userId) || [];
      let count = 0;
      
      userNotifications.forEach(notification => {
        if (!notification.isRead) {
          notification.isRead = true;
          notification.readAt = new Date().toISOString();
          count++;
        }
      });
      
      return count;
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      return 0;
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string) {
    try {
      const userNotifications = notificationStore.get(userId) || [];
      return userNotifications.filter(n => !n.isRead).length;
    } catch (error) {
      logger.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Clean up old notifications (older than specified days)
   */
  static async cleanupOldNotifications(daysOld: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      let totalCleaned = 0;

      for (const [userId, notifications] of notificationStore.entries()) {
        const filtered = notifications.filter(n => 
          new Date(n.createdAt) > cutoffDate
        );
        const cleaned = notifications.length - filtered.length;
        totalCleaned += cleaned;
        notificationStore.set(userId, filtered);
      }

      logger.info(`Cleaned up ${totalCleaned} old notifications`);
      return totalCleaned;
    } catch (error) {
      logger.error('Failed to cleanup old notifications:', error);
      return 0;
    }
  }
}

/**
 * Routes
 */

// Get user notifications
router.get('/',
  authenticate,
  withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.address;
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await NotificationService.getUserNotifications(userId, limit);
      
      res.json({
        success: true,
        data: notifications
      });
    } catch (error) {
      logger.error('Failed to fetch notifications:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications'
      });
    }
  })
);

// Get unread notification count
router.get('/unread',
  authenticate,
  withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.address;
      const count = await NotificationService.getUnreadCount(userId);
      
      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      logger.error('Failed to get unread count:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get unread count'
      });
    }
  })
);

// Mark notification as read
router.put('/:id/read',
  authenticate,
  withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.address;
      const notificationId = req.params.id;
      
      const success = await NotificationService.markAsRead(notificationId, userId);
      
      if (success) {
        res.json({
          success: true,
          message: 'Notification marked as read'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read'
      });
    }
  })
);

// Mark all notifications as read
router.put('/read-all',
  authenticate,
  withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.address;
      const count = await NotificationService.markAllAsRead(userId);
      
      res.json({
        success: true,
        message: `Marked ${count} notifications as read`
      });
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark all notifications as read'
      });
    }
  })
);

export default router;
