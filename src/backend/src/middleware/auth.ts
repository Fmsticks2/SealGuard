import { Request, Response, NextFunction } from 'express';
import { authService, AuthTokenPayload } from '../services/authService';
import { logger } from '../utils/logger';
// Removed enum imports - using string literals instead

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

// Use intersection type for better compatibility
export type AuthenticatedRequest = Request & {
  user: AuthTokenPayload;
};

// Type assertion helper for authenticated routes
export type AuthenticatedHandler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void>;

/**
 * Extract token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer token" and "token" formats
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return authHeader;
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'TOKEN_MISSING'
      });
      return;
    }

    const payload = authService.verifyToken(token);
    
    if (!payload) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
      return;
    }

    // Verify user still exists and is active
    const user = await authService.getUserById(payload.userId);
    
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: 'User account not found or inactive',
        code: 'USER_INACTIVE'
      });
      return;
    }

    // Attach user payload to request
    req.user = payload;
    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (requiredRole: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const user = await authService.getUserById(req.user.userId);
      
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      if (!authService.hasRole(user, requiredRole)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: requiredRole,
          current: user.role
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Authorization middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization error',
        code: 'AUTH_ERROR'
      });
    }
  };
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (token) {
      const payload = authService.verifyToken(token);
      
      if (payload) {
        const user = await authService.getUserById(payload.userId);
        
        if (user && user.isActive) {
          req.user = payload;
        }
      }
    }
    
    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    // Don't fail the request, just continue without user
    next();
  }
};

/**
 * Middleware to check if user owns the resource or has admin privileges
 */
export const authorizeOwnerOrAdmin = (userIdParam = 'userId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const targetUserId = req.params[userIdParam] || req.body[userIdParam];
      const currentUser = await authService.getUserById(req.user.userId);
      
      if (!currentUser) {
        res.status(401).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      // Allow if user is accessing their own resource
      if (req.user.userId === targetUserId) {
        next();
        return;
      }

      // Allow if user has admin or moderator role
      if (authService.hasRole(currentUser, 'MODERATOR')) {
        next();
        return;
      }

      res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.',
        code: 'ACCESS_DENIED'
      });
    } catch (error) {
      logger.error('Owner/Admin authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization error',
        code: 'AUTH_ERROR'
      });
    }
  };
};

/**
 * Rate limiting middleware for authentication endpoints
 */
export const authRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    const clientAttempts = attempts.get(clientId);
    
    if (!clientAttempts || now > clientAttempts.resetTime) {
      // Reset or initialize attempts
      attempts.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }
    
    if (clientAttempts.count >= maxAttempts) {
      const resetIn = Math.ceil((clientAttempts.resetTime - now) / 1000);
      res.status(429).json({
        success: false,
        message: 'Too many authentication attempts',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: resetIn
      });
      return;
    }
    
    clientAttempts.count++;
    next();
  };
};

/**
 * Middleware to validate wallet address format
 */
export const validateWalletAddress = (req: Request, res: Response, next: NextFunction): void => {
  const { walletAddress } = req.body;
  
  if (!walletAddress) {
    res.status(400).json({
      success: false,
      message: 'Wallet address is required',
      code: 'WALLET_ADDRESS_REQUIRED'
    });
    return;
  }
  
  // Basic Ethereum address validation
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  
  if (!addressRegex.test(walletAddress)) {
    res.status(400).json({
      success: false,
      message: 'Invalid wallet address format',
      code: 'INVALID_WALLET_ADDRESS'
    });
    return;
  }
  
  next();
};

/**
 * Middleware to log authentication events
 */
export const logAuthEvent = (event: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalSend = res.send;
    
    res.send = function(data) {
      const responseData = typeof data === 'string' ? JSON.parse(data) : data;
      
      logger.info(`Auth Event: ${event}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        walletAddress: req.body?.walletAddress,
        success: responseData?.success,
        userId: req.user?.userId
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};