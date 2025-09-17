import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { User } from '@prisma/client';

export interface AuthTokenPayload {
  userId: string;
  walletAddress: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  walletAddress: string;
  signature: string;
  message: string;
  nonce?: string;
}

export interface RegisterRequest {
  walletAddress: string;
  signature: string;
  message: string;
  email?: string;
  name?: string;
}

class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
    
    if (!process.env.JWT_SECRET) {
      logger.warn('JWT_SECRET not set in environment variables. Using default (not secure for production)');
    }
  }

  /**
   * Generate a nonce for wallet signature verification
   */
  generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Create a message for wallet signature
   */
  createSignatureMessage(walletAddress: string, nonce: string): string {
    return `Welcome to SealGuard!\n\nPlease sign this message to authenticate your wallet.\n\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;
  }

  /**
   * Verify wallet signature
   */
  async verifyWalletSignature(walletAddress: string, message: string, signature: string): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
    } catch (error) {
      logger.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Generate JWT token
   */
  generateToken(payload: Omit<AuthTokenPayload, 'iat' | 'exp'>): string {
    return (jwt.sign as any)(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): AuthTokenPayload | null {
    try {
      return jwt.verify(token, this.JWT_SECRET) as AuthTokenPayload;
    } catch (error) {
      logger.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Register a new user with wallet authentication
   */
  async register(registerData: RegisterRequest): Promise<{ user: User; token: string } | null> {
    try {
      const { walletAddress, signature, message, email, name } = registerData;

      // Verify signature
      const isValidSignature = await this.verifyWalletSignature(walletAddress, message, signature);
      if (!isValidSignature) {
        logger.warn(`Invalid signature for wallet registration: ${walletAddress}`);
        return null;
      }

      // Check if user already exists
      const existingUser = await db.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
      });

      if (existingUser) {
        logger.warn(`User already exists with wallet: ${walletAddress}`);
        return null;
      }

      // Create new user
      const user = await db.user.create({
        data: {
          walletAddress: walletAddress.toLowerCase(),
          email: email ? email.toLowerCase() : null,
          name: name || null,
          role: 'USER',
          isActive: true,
          lastLoginAt: new Date(),
        } as any,
      });

      // Generate token
      const token = this.generateToken({
        userId: user.id,
        walletAddress: user.walletAddress,
        role: user.role,
      });

      logger.info(`New user registered: ${user.id} (${walletAddress})`);
      return { user, token };
    } catch (error) {
      logger.error('User registration failed:', error);
      return null;
    }
  }

  /**
   * Login user with wallet authentication
   */
  async login(loginData: LoginRequest): Promise<{ user: User; token: string } | null> {
    try {
      const { walletAddress, signature, message } = loginData;

      // Verify signature
      const isValidSignature = await this.verifyWalletSignature(walletAddress, message, signature);
      if (!isValidSignature) {
        logger.warn(`Invalid signature for wallet login: ${walletAddress}`);
        return null;
      }

      // Find user
      const user = await db.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
      });

      if (!user) {
        logger.warn(`User not found for wallet: ${walletAddress}`);
        return null;
      }

      if (!user.isActive) {
        logger.warn(`Inactive user attempted login: ${user.id}`);
        return null;
      }

      // Update last login
      const updatedUser = await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate token
      const token = this.generateToken({
        userId: user.id,
        walletAddress: user.walletAddress,
        role: user.role,
      });

      logger.info(`User logged in: ${user.id} (${walletAddress})`);
      return { user: updatedUser, token };
    } catch (error) {
      logger.error('User login failed:', error);
      return null;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      return await db.user.findUnique({
        where: { id: userId },
      });
    } catch (error) {
      logger.error('Get user by ID failed:', error);
      return null;
    }
  }

  /**
   * Get user by wallet address
   */
  async getUserByWallet(walletAddress: string): Promise<User | null> {
    try {
      return await db.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
      });
    } catch (error) {
      logger.error('Get user by wallet failed:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, updateData: Partial<Pick<User, 'name' | 'email'>>): Promise<User | null> {
    try {
      return await db.user.update({
        where: { id: userId },
        data: {
          ...updateData,
          email: updateData.email ? updateData.email.toLowerCase() : undefined,
          updatedAt: new Date(),
        } as any,
      });
    } catch (error) {
      logger.error('Update user failed:', error);
      return null;
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: string): Promise<boolean> {
    try {
      await db.user.update({
        where: { id: userId },
        data: { isActive: false },
      });
      return true;
    } catch (error) {
      logger.error('Deactivate user failed:', error);
      return false;
    }
  }

  /**
   * Check if user has required role
   */
  hasRole(user: User, requiredRole: string): boolean {
    const roleHierarchy: { [key: string]: number } = {
      'USER': 1,
      'AUDITOR': 2,
      'MODERATOR': 3,
      'ADMIN': 4,
    };

    return (roleHierarchy[user.role] || 0) >= (roleHierarchy[requiredRole] || 0);
  }
}

export const authService = new AuthService();
export default authService;