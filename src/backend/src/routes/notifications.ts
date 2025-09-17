import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import {
  authenticate,
  AuthenticatedRequest
} from '../middleware/auth';
import { authorize } from '../middleware/authorize';
// Removed enum imports - using string literals instead
import { db } from '../config/database';
import { EventEmitter } from 'events';

const router = Router();

// Event emitter for real-time notifications
export const notificationEmitter = new EventEmitter();

/**
 * Notification Service
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
      const notification = await db.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          priority,
          metadata,
          actionUrl,
          isRead: false
        },
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true,
              username: true
            }
          }
        }
      });

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
   * Create bulk notifications
   */
  static async createBulkNotifications(notifications: Array<{
    userId: string;
    type: string;
    title: string;
    message: string;
    priority?: string;
    metadata?: any;
    actionUrl?: string;
  }>) {
    try {
      const createdNotifications = await db.notification.createMany({
        data: notifications.map(notif => ({
          ...notif,
          priority: notif.priority || NotificationPriority.MEDIUM,
          metadata: notif.metadata || {},
          isRead: false
        }))
      });

      // Emit bulk notification event
      notificationEmitter.emit('bulk_notification', {
        count: createdNotifications.count,
        userIds: notifications.map(n => n.userId)
      });

      logger.info(`Created ${createdNotifications.count} bulk notifications`);
      return createdNotifications;
    } catch (error) {
      logger.error('Failed to create bulk notifications:', error);
      return null;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await db.notification.updateMany({
        where: {
          id: notificationId,
          userId
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return notification.count > 0;
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
      const result = await db.notification.updateMany({
        where: {
          userId,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      return 0;
    }
  }

  /**
   * Delete old notifications
   */
  static async cleanupOldNotifications(daysOld: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await db.notification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          },
          isRead: true
        }
      });

      logger.info(`Cleaned up ${result.count} old notifications`);
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup old notifications:', error);
      return 0;
    }
  }
}

/**
 * GET /notifications
 * Get user notifications with filtering and pagination
 */
router.get('/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        priority,
        isRead,
        dateFrom,
        dateTo
      } = req.query;

      // Build filters
      const where: any = {
        userId: req.user.userId
      };
      
      if (type) where.type = type as NotificationType;
      if (priority) where.priority = priority as NotificationPriority;
      if (isRead !== undefined) where.isRead = isRead === 'true';
      
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
        if (dateTo) where.createdAt.lte = new Date(dateTo as string);
      }

      const [notifications, total, unreadCount] = await Promise.all([
        db.notification.findMany({
          where,
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
          skip: (parseInt(page as string) - 1) * parseInt(limit as string),
          take: parseInt(limit as string)
        }),
        db.notification.count({ where }),
        db.notification.count({
          where: {
            userId: req.user.userId,
            isRead: false
          }
        })
      ]);

      const pages = Math.ceil(total / parseInt(limit as string));

      res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            pages
          },
          unreadCount
        }
      });
    } catch (error) {
      logger.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notifications',
        code: 'GET_NOTIFICATIONS_ERROR'
      });
    }
  }
);

/**
 * GET /notifications/unread
 * Get unread notifications count
 */
router.get('/unread',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const unreadCount = await db.notification.count({
        where: {
          userId: req.user.userId,
          isRead: false
        }
      });

      res.json({
        success: true,
        data: { unreadCount }
      });
    } catch (error) {
      logger.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread count',
        code: 'GET_UNREAD_COUNT_ERROR'
      });
    }
  }
);

/**
 * PUT /notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      const success = await NotificationService.markAsRead(id, req.user.userId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
          code: 'NOTIFICATION_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      logger.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        code: 'MARK_READ_ERROR'
      });
    }
  }
);

/**
 * PUT /notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const count = await NotificationService.markAllAsRead(req.user.userId);
      
      res.json({
        success: true,
        message: `Marked ${count} notifications as read`,
        data: { count }
      });
    } catch (error) {
      logger.error('Mark all notifications as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read',
        code: 'MARK_ALL_READ_ERROR'
      });
    }
  }
);

/**
 * POST /notifications/send
 * Send notification (Admin only)
 */
router.post('/send',
  authenticate,
  authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        userIds,
        type,
        title,
        message,
        priority = NotificationPriority.MEDIUM,
        metadata = {},
        actionUrl,
        sendToAll = false
      } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Title and message are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      let targetUserIds: string[] = [];

      if (sendToAll) {
        // Get all active users
        const users = await db.user.findMany({
          where: { isActive: true },
          select: { id: true }
        });
        targetUserIds = users.map(user => user.id);
      } else if (userIds && Array.isArray(userIds)) {
        targetUserIds = userIds;
      } else {
        return res.status(400).json({
          success: false,
          message: 'User IDs are required when not sending to all',
          code: 'MISSING_USER_IDS'
        });
      }

      // Create notifications
      const notifications = targetUserIds.map(userId => ({
        userId,
        type: type as NotificationType,
        title,
        message,
        priority: priority as NotificationPriority,
        metadata,
        actionUrl
      }));

      const result = await NotificationService.createBulkNotifications(notifications);
      
      if (!result) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send notifications',
          code: 'SEND_FAILED'
        });
      }

      res.status(201).json({
        success: true,
        message: `Sent ${result.count} notifications`,
        data: { count: result.count }
      });
    } catch (error) {
      logger.error('Send notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send notification',
        code: 'SEND_NOTIFICATION_ERROR'
      });
    }
  }
);

export default router;
export { NotificationService };
