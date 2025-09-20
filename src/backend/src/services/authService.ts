import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';

export interface User {
  id: string;
  walletAddress: string;
  role: string;
  name?: string;
  email?: string;
  isActive: boolean;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

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

// In-memory user storage (replace with Redis or external service in production)
const userStore = new Map<string, User>();
const walletToUserMap = new Map<string, string>();

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
   * Register a new user
   */
  async register(registerData: RegisterRequest): Promise<{ user: User; token: string } | null> {
    try {
      const { walletAddress, signature, message, email, name } = registerData;
      
      // Verify signature
      const isValidSignature = await this.verifyWalletSignature(walletAddress, message, signature);
      if (!isValidSignature) {
        logger.warn(`Invalid signature for wallet: ${walletAddress}`);
        return null;
      }

      // Check if user already exists
      const normalizedAddress = walletAddress.toLowerCase();
      if (walletToUserMap.has(normalizedAddress)) {
        logger.warn(`User already exists for wallet: ${walletAddress}`);
        return null;
      }

      // Create new user
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();
      
      const user: User = {
        id: userId,
        walletAddress: normalizedAddress,
        role: 'USER',
        name,
        email,
        isActive: true,
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now
      };

      // Store user
      userStore.set(userId, user);
      walletToUserMap.set(normalizedAddress, userId);

      // Generate token
      const token = this.generateToken({
        userId: user.id,
        walletAddress: user.walletAddress,
        role: user.role
      });

      logger.info(`User registered successfully: ${walletAddress}`);
      return { user, token };
    } catch (error) {
      logger.error('Registration failed:', error);
      return null;
    }
  }

  /**
   * Login user
   */
  async login(loginData: LoginRequest): Promise<{ user: User; token: string } | null> {
    try {
      const { walletAddress, signature, message } = loginData;
      
      // Verify signature
      const isValidSignature = await this.verifyWalletSignature(walletAddress, message, signature);
      if (!isValidSignature) {
        logger.warn(`Invalid signature for wallet: ${walletAddress}`);
        return null;
      }

      // Find user
      const normalizedAddress = walletAddress.toLowerCase();
      const userId = walletToUserMap.get(normalizedAddress);
      if (!userId) {
        logger.warn(`User not found for wallet: ${walletAddress}`);
        return null;
      }

      const user = userStore.get(userId);
      if (!user || !user.isActive) {
        logger.warn(`User inactive or not found: ${walletAddress}`);
        return null;
      }

      // Update last login
      user.lastLoginAt = new Date();
      user.updatedAt = new Date();
      userStore.set(userId, user);

      // Generate token
      const token = this.generateToken({
        userId: user.id,
        walletAddress: user.walletAddress,
        role: user.role
      });

      logger.info(`User logged in successfully: ${walletAddress}`);
      return { user, token };
    } catch (error) {
      logger.error('Login failed:', error);
      return null;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      return userStore.get(userId) || null;
    } catch (error) {
      logger.error('Failed to get user by ID:', error);
      return null;
    }
  }

  /**
   * Get user by wallet address
   */
  async getUserByWallet(walletAddress: string): Promise<User | null> {
    try {
      const normalizedAddress = walletAddress.toLowerCase();
      const userId = walletToUserMap.get(normalizedAddress);
      if (!userId) return null;
      
      return userStore.get(userId) || null;
    } catch (error) {
      logger.error('Failed to get user by wallet:', error);
      return null;
    }
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updateData: Partial<Pick<User, 'name' | 'email'>>): Promise<User | null> {
    try {
      const user = userStore.get(userId);
      if (!user) return null;

      const updatedUser = {
        ...user,
        ...updateData,
        updatedAt: new Date()
      };

      userStore.set(userId, updatedUser);
      return updatedUser;
    } catch (error) {
      logger.error('Failed to update user:', error);
      return null;
    }
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId: string): Promise<boolean> {
    try {
      const user = userStore.get(userId);
      if (!user) return false;

      user.isActive = false;
      user.updatedAt = new Date();
      userStore.set(userId, user);
      
      return true;
    } catch (error) {
      logger.error('Failed to deactivate user:', error);
      return false;
    }
  }

  /**
   * Check if user has required role
   */
  hasRole(user: User, requiredRole: string): boolean {
    const roleHierarchy = {
      'SUPER_ADMIN': 4,
      'ADMIN': 3,
      'MODERATOR': 2,
      'USER': 1
    };
    
    const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
    
    return userLevel >= requiredLevel;
  }

  /**
   * Get all users (for admin)
   */
  async getAllUsers(): Promise<User[]> {
    try {
      return Array.from(userStore.values());
    } catch (error) {
      logger.error('Failed to get all users:', error);
      return [];
    }
  }
}

export const authService = new AuthService();
export default authService;