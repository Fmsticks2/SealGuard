import { Router, Request, Response } from 'express';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';
import {
  authenticate,
  authorize,
  authRateLimit,
  validateWalletAddress,
  logAuthEvent,
  AuthenticatedRequest,
  withAuth
} from '../middleware/auth';
// Removed enum imports - using string literals instead

const router = Router();

/**
 * POST /auth/nonce
 * Generate a nonce for wallet signature
 */
router.post('/nonce', 
  authRateLimit(10, 5 * 60 * 1000), // 10 requests per 5 minutes
  validateWalletAddress,
  logAuthEvent('NONCE_REQUEST'),
  async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { walletAddress } = req.body;
      
      const nonce = authService.generateNonce();
      const message = authService.createSignatureMessage(walletAddress, nonce);
      
      res.json({
        success: true,
        data: {
          nonce,
          message,
          walletAddress: walletAddress.toLowerCase()
        }
      });
    } catch (error) {
      logger.error('Generate nonce error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate nonce',
        code: 'NONCE_GENERATION_FAILED'
      });
    }
  }
);

/**
 * POST /auth/register
 * Register a new user with wallet signature
 */
router.post('/register',
  authRateLimit(3, 15 * 60 * 1000), // 3 attempts per 15 minutes
  validateWalletAddress,
  logAuthEvent('REGISTER_ATTEMPT'),
  async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { walletAddress, signature, message, email, name } = req.body;
      
      // Validate required fields
      if (!signature || !message) {
        return res.status(400).json({
          success: false,
          message: 'Signature and message are required',
          code: 'MISSING_SIGNATURE_DATA'
        });
      }
      
      // Validate email format if provided
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
          code: 'INVALID_EMAIL_FORMAT'
        });
      }
      
      const result = await authService.register({
        walletAddress,
        signature,
        message,
        email,
        name
      });
      
      if (!result) {
        return res.status(400).json({
          success: false,
          message: 'Registration failed. Invalid signature or user already exists.',
          code: 'REGISTRATION_FAILED'
        });
      }
      
      const { user, token } = result;
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            walletAddress: user.walletAddress,
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt
          },
          token
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Registration failed',
        code: 'REGISTRATION_ERROR'
      });
    }
  }
);

/**
 * POST /auth/login
 * Login user with wallet signature
 */
router.post('/login',
  authRateLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  validateWalletAddress,
  logAuthEvent('LOGIN_ATTEMPT'),
  async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { walletAddress, signature, message } = req.body;
      
      // Validate required fields
      if (!signature || !message) {
        return res.status(400).json({
          success: false,
          message: 'Signature and message are required',
          code: 'MISSING_SIGNATURE_DATA'
        });
      }
      
      const result = await authService.login({
        walletAddress,
        signature,
        message
      });
      
      if (!result) {
        return res.status(401).json({
          success: false,
          message: 'Login failed. Invalid signature or user not found.',
          code: 'LOGIN_FAILED'
        });
      }
      
      const { user, token } = result;
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            walletAddress: user.walletAddress,
            email: user.email,
            name: user.name,
            role: user.role,
            lastLoginAt: user.lastLoginAt
          },
          token
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Login failed',
        code: 'LOGIN_ERROR'
      });
    }
  }
);

/**
 * GET /auth/me
 * Get current user profile
 */
router.get('/me',
  authenticate,
  withAuth(async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const user = await authService.getUserById(req.user.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }
      
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            walletAddress: user.walletAddress,
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt
          }
        }
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get user profile',
        code: 'PROFILE_ERROR'
      });
    }
  })
);

/**
 * PUT /auth/profile
 * Update user profile
 */
router.put('/profile',
  authenticate,
  withAuth(async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const { name, email } = req.body;
      
      // Validate email format if provided
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
          code: 'INVALID_EMAIL_FORMAT'
        });
      }
      
      const updatedUser = await authService.updateUser(req.user.userId, {
        name: name?.trim(),
        email: email?.trim()
      });
      
      if (!updatedUser) {
        return res.status(400).json({
          success: false,
          message: 'Failed to update profile',
          code: 'UPDATE_FAILED'
        });
      }
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: updatedUser.id,
            walletAddress: updatedUser.walletAddress,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
            updatedAt: updatedUser.updatedAt
          }
        }
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        code: 'UPDATE_ERROR'
      });
    }
  })
);

/**
 * POST /auth/verify-token
 * Verify if token is valid
 */
router.post('/verify-token',
  async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token is required',
          code: 'TOKEN_REQUIRED'
        });
      }
      
      const payload = authService.verifyToken(token);
      
      if (!payload) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
          code: 'TOKEN_INVALID'
        });
      }
      
      // Check if user still exists and is active
      const user = await authService.getUserById(payload.userId);
      
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account not found or inactive',
          code: 'USER_INACTIVE'
        });
      }
      
      res.json({
        success: true,
        message: 'Token is valid',
        data: {
          userId: payload.userId,
          walletAddress: payload.walletAddress,
          role: payload.role,
          exp: payload.exp
        }
      });
    } catch (error) {
      logger.error('Token verification error:', error);
      return res.status(500).json({
        success: false,
        message: 'Token verification failed',
        code: 'VERIFICATION_ERROR'
      });
    }
  }
);

/**
 * DELETE /auth/account
 * Deactivate user account
 */
router.delete('/account',
  authenticate,
  withAuth(async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const success = await authService.deactivateUser(req.user.userId);
      
      if (!success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to deactivate account',
          code: 'DEACTIVATION_FAILED'
        });
      }
      
      res.json({
        success: true,
        message: 'Account deactivated successfully'
      });
    } catch (error) {
      logger.error('Account deactivation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to deactivate account',
        code: 'DEACTIVATION_ERROR'
      });
    }
  })
);

/**
 * GET /auth/users (Admin only)
 * Get all users
 */
router.get('/users',
  authenticate,
  authorize('admin'),
  withAuth(async (_req: AuthenticatedRequest, res: Response) => {
    try {
      // This would typically use a user service, but for now we'll use the auth service
      // In a real implementation, you'd want pagination and filtering
      return res.json({
        success: true,
        message: 'Users endpoint - implement user listing service',
        data: []
      });
    } catch (error) {
      logger.error('Get users error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get users',
        code: 'GET_USERS_ERROR'
      });
    }
  })
);

export default router;