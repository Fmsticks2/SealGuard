import { LRUCache } from 'lru-cache';
import logger from '../utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  blockNumber?: number;
}

interface BlockchainCacheOptions {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
  maxBlockAge?: number; // Maximum block age for cache invalidation
}

export class BlockchainCacheService {
  private cache: LRUCache<string, CacheEntry<any>>;
  private readonly ttl: number;
  private readonly maxBlockAge: number;
  private currentBlockNumber: number = 0;

  constructor(options: BlockchainCacheOptions = {}) {
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxBlockAge = options.maxBlockAge || 100; // 100 blocks default
    
    this.cache = new LRUCache({
      max: options.maxSize || 1000,
      ttl: this.ttl,
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    logger.info('Blockchain cache service initialized', {
      maxSize: options.maxSize || 1000,
      ttl: this.ttl,
      maxBlockAge: this.maxBlockAge
    });
  }

  /**
   * Update current block number for cache invalidation
   */
  updateBlockNumber(blockNumber: number): void {
    if (blockNumber > this.currentBlockNumber) {
      this.currentBlockNumber = blockNumber;
      this.invalidateOldEntries();
    }
  }

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry is too old based on block number
    if (entry.blockNumber && this.currentBlockNumber > 0) {
      const blockAge = this.currentBlockNumber - entry.blockNumber;
      if (blockAge > this.maxBlockAge) {
        this.cache.delete(key);
        logger.debug('Cache entry invalidated due to block age', { key, blockAge });
        return null;
      }
    }

    // Check timestamp-based expiration
    const age = Date.now() - entry.timestamp;
    if (age > this.ttl) {
      this.cache.delete(key);
      logger.debug('Cache entry expired', { key, age });
      return null;
    }

    logger.debug('Cache hit', { key });
    return entry.data;
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, blockNumber?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      blockNumber: blockNumber || this.currentBlockNumber
    };

    this.cache.set(key, entry);
    logger.debug('Cache entry set', { key, blockNumber });
  }

  /**
   * Delete cached data
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug('Cache entry deleted', { key });
    }
    return deleted;
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      currentBlockNumber: this.currentBlockNumber,
      ttl: this.ttl,
      maxBlockAge: this.maxBlockAge
    };
  }

  /**
   * Generate cache key for contract calls
   */
  static generateContractKey(contractAddress: string, method: string, ...args: any[]): string {
    const argsHash = JSON.stringify(args);
    return `contract:${contractAddress}:${method}:${argsHash}`;
  }

  /**
   * Generate cache key for document data
   */
  static generateDocumentKey(documentId: string): string {
    return `document:${documentId}`;
  }

  /**
   * Generate cache key for user data
   */
  static generateUserKey(userAddress: string): string {
    return `user:${userAddress}`;
  }

  /**
   * Generate cache key for verification data
   */
  static generateVerificationKey(documentId: string, verifierId: string): string {
    return `verification:${documentId}:${verifierId}`;
  }

  /**
   * Invalidate entries that are too old based on block number
   */
  private invalidateOldEntries(): void {
    let invalidatedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.blockNumber && this.currentBlockNumber > 0) {
        const blockAge = this.currentBlockNumber - entry.blockNumber;
        if (blockAge > this.maxBlockAge) {
          this.cache.delete(key);
          invalidatedCount++;
        }
      }
    }

    if (invalidatedCount > 0) {
      logger.info('Invalidated old cache entries', { 
        count: invalidatedCount, 
        currentBlock: this.currentBlockNumber 
      });
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidateByPattern(pattern: string): number {
    let invalidatedCount = 0;
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    logger.info('Invalidated cache entries by pattern', { pattern, count: invalidatedCount });
    return invalidatedCount;
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(warmUpFunction: () => Promise<void>): Promise<void> {
    try {
      logger.info('Starting cache warm-up');
      await warmUpFunction();
      logger.info('Cache warm-up completed');
    } catch (error) {
      logger.error('Cache warm-up failed', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const blockchainCache = new BlockchainCacheService({
  maxSize: 2000,
  ttl: 10 * 60 * 1000, // 10 minutes
  maxBlockAge: 50 // 50 blocks
});