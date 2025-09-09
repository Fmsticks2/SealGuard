import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getPostgresClient } from '../config/database';
import { AuthenticationError, AuthorizationError } from './errorHandler';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

// JWT token verification
export const verifyToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) {
      throw new AuthenticationError('Access token is required');
    }
    
    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }
    
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    
    // Get user from database
    const client = getPostgresClient();
    const userResult = await client.query(
      'SELECT id, email, role, created_at, updated_at FROM users WHERE id = $1 AND active = true',
      [decoded.userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new AuthenticationError('User not found or inactive');
    }
    
    const user = userResult.rows[0];
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token expired'));
    } else {
      next(error);
    }
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) {
      return next();
    }
    
    // Try to verify token, but don't fail if invalid
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      
      // Get user from database
      const client = getPostgresClient();
      const userResult = await client.query(
        'SELECT id, email, role, created_at, updated_at FROM users WHERE id = $1 AND active = true',
        [decoded.userId]
      );
      
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        };
      }
    } catch (error) {
      // Ignore token errors in optional auth
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Role-based authorization
export const requireRole = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AuthorizationError('Insufficient permissions'));
    }
    
    next();
  };
};

// Admin role check
export const requireAdmin = requireRole('admin');

// User role check (admin or user)
export const requireUser = requireRole(['admin', 'user']);

// API key authentication
export const verifyApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      throw new AuthenticationError('API key is required');
    }
    
    // Get API key from database
    const client = getPostgresClient();
    const apiKeyResult = await client.query(
      `SELECT ak.*, u.id as user_id, u.email, u.role 
       FROM api_keys ak 
       JOIN users u ON ak.user_id = u.id 
       WHERE ak.key_hash = $1 AND ak.active = true AND u.active = true`,
      [apiKey] // In production, you should hash the API key
    );
    
    if (apiKeyResult.rows.length === 0) {
      throw new AuthenticationError('Invalid API key');
    }
    
    const keyData = apiKeyResult.rows[0];
    
    // Check if API key is expired
    if (keyData.expires_at && new Date() > new Date(keyData.expires_at)) {
      throw new AuthenticationError('API key expired');
    }
    
    // Update last used timestamp
    await client.query(
      'UPDATE api_keys SET last_used_at = NOW(), usage_count = usage_count + 1 WHERE id = $1',
      [keyData.id]
    );
    
    // Set user context
    (req as AuthenticatedRequest).user = {
      id: keyData.user_id,
      email: keyData.email,
      role: keyData.role,
      createdAt: keyData.created_at,
      updatedAt: keyData.updated_at,
    };
    
    next();
  } catch (error) {
    next(error);
  }
};

// Resource ownership check
export const requireOwnership = (resourceIdParam: string = 'id', resourceTable: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new AuthenticationError('Authentication required'));
      }
      
      // Admin can access any resource
      if (req.user.role === 'admin') {
        return next();
      }
      
      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        return next(new Error(`Resource ID parameter '${resourceIdParam}' not found`));
      }
      
      // Check if user owns the resource
      const client = getPostgresClient();
      const result = await client.query(
        `SELECT id FROM ${resourceTable} WHERE id = $1 AND user_id = $2`,
        [resourceId, req.user.id]
      );
      
      if (result.rows.length === 0) {
        return next(new AuthorizationError('Access denied: You do not own this resource'));
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Document ownership check
export const requireDocumentOwnership = requireOwnership('documentId', 'documents');

// Generate JWT token
export const generateToken = (user: { id: string; email: string; role: string }): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  
  return jwt.sign(payload, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'sealguard',
    audience: 'sealguard-users',
  });
};

// Refresh token validation
export const verifyRefreshToken = async (refreshToken: string): Promise<{ userId: string }> => {
  const client = getPostgresClient();
  
  // Check if refresh token exists and is valid
  const result = await client.query(
    'SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW() AND revoked = false',
    [refreshToken]
  );
  
  if (result.rows.length === 0) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }
  
  return { userId: result.rows[0].user_id };
};

// Revoke refresh token
export const revokeRefreshToken = async (refreshToken: string): Promise<void> => {
  const client = getPostgresClient();
  
  await client.query(
    'UPDATE refresh_tokens SET revoked = true WHERE token = $1',
    [refreshToken]
  );
};

export type { AuthenticatedRequest };