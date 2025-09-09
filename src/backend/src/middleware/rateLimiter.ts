import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../config/database';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

class RateLimiter {
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      message: 'Too many requests, please try again later',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req: Request) => req.ip,
      ...options,
    };
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = this.options.keyGenerator!(req);
        const redisKey = `rate_limit:${key}`;
        
        // Get Redis client
        const redis = getRedisClient();
        
        // Get current count
        const current = await redis.get(redisKey);
        const count = current ? parseInt(current, 10) : 0;
        
        // Check if limit exceeded
        if (count >= this.options.maxRequests) {
          res.status(429).json({
            error: {
              message: this.options.message,
              code: 'RATE_LIMIT_EXCEEDED',
              statusCode: 429,
              retryAfter: Math.ceil(this.options.windowMs / 1000),
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
        
        // Increment counter
        const newCount = count + 1;
        await redis.setex(redisKey, Math.ceil(this.options.windowMs / 1000), newCount.toString());
        
        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': this.options.maxRequests.toString(),
          'X-RateLimit-Remaining': Math.max(0, this.options.maxRequests - newCount).toString(),
          'X-RateLimit-Reset': new Date(Date.now() + this.options.windowMs).toISOString(),
        });
        
        next();
      } catch (error) {
        console.error('Rate limiter error:', error);
        // If Redis is down, allow the request to proceed
        next();
      }
    };
  }
}

// Default rate limiter
export const rateLimiter = new RateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: 'Too many requests from this IP, please try again later',
}).middleware();

// Strict rate limiter for sensitive endpoints
export const strictRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  message: 'Too many attempts, please try again later',
}).middleware();

// Upload rate limiter
export const uploadRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50,
  message: 'Upload limit exceeded, please try again later',
  keyGenerator: (req: Request) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    return (req as any).user?.id || req.ip;
  },
}).middleware();

// Payment rate limiter
export const paymentRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
  message: 'Payment attempt limit exceeded, please try again later',
  keyGenerator: (req: Request) => {
    return (req as any).user?.id || req.ip;
  },
}).middleware();

// API key rate limiter
export const apiKeyRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 1000,
  message: 'API rate limit exceeded',
  keyGenerator: (req: Request) => {
    const apiKey = req.headers['x-api-key'] as string;
    return apiKey || req.ip;
  },
}).middleware();

export default RateLimiter;