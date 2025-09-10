import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getPostgresClient } from '../config/database';
import { validate, commonValidations } from '../middleware/validation';
import { rateLimiter, strictRateLimiter } from '../middleware/rateLimiter';
import { securityLogger } from '../middleware/requestLogger';
import { generateToken, verifyRefreshToken, revokeRefreshToken, AuthenticatedRequest, verifyToken } from '../middleware/auth';
import { ValidationError, AuthenticationError, ConflictError } from '../middleware/errorHandler';

const router = Router();

// User registration
router.post('/register',
  strictRateLimiter,
  securityLogger('user_registration'),
  validate(commonValidations.userRegistration),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      const client = getPostgresClient();
      
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (existingUser.rows.length > 0) {
        throw new ConflictError('User with this email already exists');
      }
      
      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Create user
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id, email, first_name, last_name, role, created_at`,
        [email.toLowerCase(), hashedPassword, firstName, lastName, 'user', true]
      );
      
      const user = userResult.rows[0];
      
      // Generate tokens
      const accessToken = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });
      
      const refreshToken = crypto.randomBytes(64).toString('hex');
      
      // Store refresh token
      await client.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at, created_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 days', NOW())`,
        [user.id, refreshToken]
      );
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            createdAt: user.created_at,
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// User login
router.post('/login',
  strictRateLimiter,
  securityLogger('user_login'),
  validate(commonValidations.userLogin),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      
      const client = getPostgresClient();
      
      // Get user with password
      const userResult = await client.query(
        'SELECT id, email, password_hash, first_name, last_name, role, active FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (userResult.rows.length === 0) {
        throw new AuthenticationError('Invalid email or password');
      }
      
      const user = userResult.rows[0];
      
      if (!user.active) {
        throw new AuthenticationError('Account is deactivated');
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid email or password');
      }
      
      // Generate tokens
      const accessToken = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });
      
      const refreshToken = crypto.randomBytes(64).toString('hex');
      
      // Store refresh token
      await client.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at, created_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 days', NOW())`,
        [user.id, refreshToken]
      );
      
      // Update last login
      await client.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Refresh token
router.post('/refresh',
  rateLimiter,
  validate({
    body: [
      { field: 'refreshToken', required: true, type: 'string' },
    ],
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      
      // Verify refresh token
      const { userId } = await verifyRefreshToken(refreshToken);
      
      const client = getPostgresClient();
      
      // Get user
      const userResult = await client.query(
        'SELECT id, email, role, active FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0 || !userResult.rows[0].active) {
        throw new AuthenticationError('User not found or inactive');
      }
      
      const user = userResult.rows[0];
      
      // Generate new access token
      const accessToken = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });
      
      // Generate new refresh token
      const newRefreshToken = crypto.randomBytes(64).toString('hex');
      
      // Revoke old refresh token and store new one
      await client.query('BEGIN');
      
      try {
        await revokeRefreshToken(refreshToken);
        
        await client.query(
          `INSERT INTO refresh_tokens (user_id, token, expires_at, created_at)
           VALUES ($1, $2, NOW() + INTERVAL '30 days', NOW())`,
          [user.id, newRefreshToken]
        );
        
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: {
            accessToken,
            refreshToken: newRefreshToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Logout
router.post('/logout',
  verifyToken,
  validate({
    body: [
      { field: 'refreshToken', required: true, type: 'string' },
    ],
  }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      
      // Revoke refresh token
      await revokeRefreshToken(refreshToken);
      
      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get current user profile
router.get('/profile',
  verifyToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const client = getPostgresClient();
      
      const userResult = await client.query(
        'SELECT id, email, first_name, last_name, role, created_at, updated_at, last_login_at FROM users WHERE id = $1',
        [req.user!.id]
      );
      
      if (userResult.rows.length === 0) {
        throw new AuthenticationError('User not found');
      }
      
      const user = userResult.rows[0];
      
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            lastLoginAt: user.last_login_at,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update user profile
router.put('/profile',
  verifyToken,
  validate({
    body: [
      { field: 'firstName', required: false, type: 'string', minLength: 1, maxLength: 50 },
      { field: 'lastName', required: false, type: 'string', minLength: 1, maxLength: 50 },
    ],
  }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName } = req.body;
      
      const client = getPostgresClient();
      
      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (firstName !== undefined) {
        updates.push(`first_name = $${paramIndex++}`);
        values.push(firstName);
      }
      
      if (lastName !== undefined) {
        updates.push(`last_name = $${paramIndex++}`);
        values.push(lastName);
      }
      
      if (updates.length === 0) {
        throw new ValidationError('No fields to update');
      }
      
      updates.push(`updated_at = NOW()`);
      values.push(req.user!.id);
      
      const query = `
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, email, first_name, last_name, role, updated_at
      `;
      
      const result = await client.query(query, values);
      const user = result.rows[0];
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            updatedAt: user.updated_at,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Change password
router.put('/password',
  verifyToken,
  strictRateLimiter,
  securityLogger('password_change'),
  validate({
    body: [
      { field: 'currentPassword', required: true, type: 'string' },
      { field: 'newPassword', required: true, type: 'string', minLength: 8, maxLength: 128 },
    ],
  }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      const client = getPostgresClient();
      
      // Get current password hash
      const userResult = await client.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [req.user!.id]
      );
      
      if (userResult.rows.length === 0) {
        throw new AuthenticationError('User not found');
      }
      
      const user = userResult.rows[0];
      
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      
      if (!isCurrentPasswordValid) {
        throw new AuthenticationError('Current password is incorrect');
      }
      
      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedNewPassword, req.user!.id]
      );
      
      // Revoke all refresh tokens for this user
      await client.query(
        'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
        [req.user!.id]
      );
      
      res.json({
        success: true,
        message: 'Password changed successfully. Please log in again.',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;