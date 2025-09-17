import { Response, NextFunction } from 'express';
// Removed enum imports - using string literals instead
import { AuthenticatedRequest } from './auth';
import logger from '../utils/logger';

/**
 * Authorization middleware factory
 * Creates middleware that checks if user has required role
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        logger.warn('Authorization failed: No user in request');
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      // Check if user has required role
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn(`Authorization failed: User ${req.user.userId} has role ${req.user.role}, required: ${allowedRoles.join(', ')}`);
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: allowedRoles,
          current: req.user.role
        });
      }

      // User is authorized
      next();
    } catch (error) {
      logger.error('Authorization middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };
};

/**
 * Check if user is admin
 */
export const requireAdmin = authorize('ADMIN');

/**
 * Check if user is admin or moderator
 */
export const requireModerator = authorize('ADMIN', 'MODERATOR');

/**
 * Check if user is authenticated (any role)
 */
export const requireAuth = authorize('ADMIN', 'MODERATOR', 'USER');

export default authorize;