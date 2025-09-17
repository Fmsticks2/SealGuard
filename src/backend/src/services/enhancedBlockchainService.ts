import { ethers } from 'ethers';
import logger from '../utils/logger';
import { blockchainCache, BlockchainCacheService } from './blockchainCacheService';
import { Document } from '../models/Document';
import { User } from '../models/User';

interface ContractCallOptions {
  useCache?: boolean;
  cacheTtl?: number;
  forceRefresh?: boolean;
}

interface BatchCallResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  fromCache?: boolean;
}

export class EnhancedBlockchainService {
  private provider: ethers.JsonRpcProvider;
  private registryContract: ethers.Contract | null = null;
  private accessControlContract: ethers.Contract | null = null;
  private batchCallQueue: Map<string, Promise<any>> = new Map();

  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL!);
    this.initializeContracts();
  }

  private async initializeContracts(): Promise<void> {
    try {
      // Initialize contracts with ABI (you'll need to import actual ABIs)
      const registryABI = []; // Import your registry contract ABI
      const accessControlABI = []; // Import your access control contract ABI

      this.registryContract = new ethers.Contract(
        process.env.REGISTRY_CONTRACT_ADDRESS!,
        registryABI,
        this.provider
      );

      this.accessControlContract = new ethers.Contract(
        process.env.ACCESS_CONTROL_CONTRACT_ADDRESS!,
        accessControlABI,
        this.provider
      );

      logger.info('Enhanced blockchain service initialized');
    } catch (error) {
      logger.error('Failed to initialize enhanced blockchain service', { error });
      throw error;
    }
  }

  /**
   * Get document from blockchain with caching
   */
  async getDocument(documentId: string, options: ContractCallOptions = {}): Promise<any> {
    const { useCache = true, forceRefresh = false } = options;
    const cacheKey = BlockchainCacheService.generateDocumentKey(documentId);

    // Check cache first
    if (useCache && !forceRefresh) {
      const cached = blockchainCache.get(cacheKey);
      if (cached) {
        logger.debug('Document retrieved from cache', { documentId });
        return cached;
      }
    }

    try {
      // Prevent duplicate calls
      const existingCall = this.batchCallQueue.get(cacheKey);
      if (existingCall) {
        return await existingCall;
      }

      // Make blockchain call
      const callPromise = this.registryContract!.getDocument(documentId);
      this.batchCallQueue.set(cacheKey, callPromise);

      const result = await callPromise;
      this.batchCallQueue.delete(cacheKey);

      // Cache the result
      if (useCache) {
        blockchainCache.set(cacheKey, result);
      }

      logger.debug('Document retrieved from blockchain', { documentId });
      return result;
    } catch (error) {
      this.batchCallQueue.delete(cacheKey);
      logger.error('Failed to get document from blockchain', { documentId, error });
      throw error;
    }
  }

  /**
   * Get user data from blockchain with caching
   */
  async getUser(userAddress: string, options: ContractCallOptions = {}): Promise<any> {
    const { useCache = true, forceRefresh = false } = options;
    const cacheKey = BlockchainCacheService.generateUserKey(userAddress);

    if (useCache && !forceRefresh) {
      const cached = blockchainCache.get(cacheKey);
      if (cached) {
        logger.debug('User retrieved from cache', { userAddress });
        return cached;
      }
    }

    try {
      const existingCall = this.batchCallQueue.get(cacheKey);
      if (existingCall) {
        return await existingCall;
      }

      const callPromise = this.accessControlContract!.getUser(userAddress);
      this.batchCallQueue.set(cacheKey, callPromise);

      const result = await callPromise;
      this.batchCallQueue.delete(cacheKey);

      if (useCache) {
        blockchainCache.set(cacheKey, result);
      }

      logger.debug('User retrieved from blockchain', { userAddress });
      return result;
    } catch (error) {
      this.batchCallQueue.delete(cacheKey);
      logger.error('Failed to get user from blockchain', { userAddress, error });
      throw error;
    }
  }

  /**
   * Get verification status with caching
   */
  async getVerificationStatus(
    documentId: string, 
    verifierId: string, 
    options: ContractCallOptions = {}
  ): Promise<any> {
    const { useCache = true, forceRefresh = false } = options;
    const cacheKey = BlockchainCacheService.generateVerificationKey(documentId, verifierId);

    if (useCache && !forceRefresh) {
      const cached = blockchainCache.get(cacheKey);
      if (cached) {
        logger.debug('Verification status retrieved from cache', { documentId, verifierId });
        return cached;
      }
    }

    try {
      const existingCall = this.batchCallQueue.get(cacheKey);
      if (existingCall) {
        return await existingCall;
      }

      const callPromise = this.registryContract!.getVerificationStatus(documentId, verifierId);
      this.batchCallQueue.set(cacheKey, callPromise);

      const result = await callPromise;
      this.batchCallQueue.delete(cacheKey);

      if (useCache) {
        blockchainCache.set(cacheKey, result);
      }

      logger.debug('Verification status retrieved from blockchain', { documentId, verifierId });
      return result;
    } catch (error) {
      this.batchCallQueue.delete(cacheKey);
      logger.error('Failed to get verification status from blockchain', { documentId, verifierId, error });
      throw error;
    }
  }

  /**
   * Batch get multiple documents with caching
   */
  async batchGetDocuments(
    documentIds: string[], 
    options: ContractCallOptions = {}
  ): Promise<BatchCallResult<any>[]> {
    const { useCache = true, forceRefresh = false } = options;
    const results: BatchCallResult<any>[] = [];
    const uncachedIds: string[] = [];

    // Check cache for each document
    for (const documentId of documentIds) {
      const cacheKey = BlockchainCacheService.generateDocumentKey(documentId);
      
      if (useCache && !forceRefresh) {
        const cached = blockchainCache.get(cacheKey);
        if (cached) {
          results.push({ success: true, data: cached, fromCache: true });
          continue;
        }
      }
      
      uncachedIds.push(documentId);
    }

    // Batch call for uncached documents
    if (uncachedIds.length > 0) {
      try {
        const batchPromises = uncachedIds.map(async (documentId) => {
          try {
            const result = await this.getDocument(documentId, { useCache: false });
            return { success: true, data: result, documentId };
          } catch (error) {
            return { 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error',
              documentId 
            };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
            
            // Cache successful results
            if (result.value.success && useCache) {
              const cacheKey = BlockchainCacheService.generateDocumentKey(uncachedIds[index]);
              blockchainCache.set(cacheKey, result.value.data);
            }
          } else {
            results.push({ 
              success: false, 
              error: result.reason?.message || 'Batch call failed' 
            });
          }
        });
      } catch (error) {
        logger.error('Batch document retrieval failed', { error, uncachedIds });
        
        // Add error results for uncached documents
        uncachedIds.forEach(() => {
          results.push({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Batch call failed' 
          });
        });
      }
    }

    logger.info('Batch document retrieval completed', {
      total: documentIds.length,
      cached: results.filter(r => r.fromCache).length,
      successful: results.filter(r => r.success).length
    });

    return results;
  }

  /**
   * Sync database with blockchain data using cache
   */
  async syncDatabaseWithBlockchain(): Promise<void> {
    try {
      logger.info('Starting database sync with blockchain');

      // Get all documents from database
      const documents = await Document.findAll();
      const users = await User.findAll();

      // Batch sync documents
      const documentResults = await this.batchGetDocuments(
        documents.map(d => d.id),
        { useCache: true, forceRefresh: false }
      );

      let syncedDocuments = 0;
      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        const blockchainResult = documentResults[i];

        if (blockchainResult.success && blockchainResult.data) {
          // Update document with blockchain data
          const blockchainData = blockchainResult.data;
          
          if (document.status !== blockchainData.status || 
              document.lifecycle !== blockchainData.lifecycle) {
            await document.update({
              status: blockchainData.status,
              lifecycle: blockchainData.lifecycle,
              updatedAt: new Date()
            });
            syncedDocuments++;
          }
        }
      }

      // Batch sync users
      let syncedUsers = 0;
      for (const user of users) {
        try {
          const blockchainUser = await this.getUser(user.walletAddress, { useCache: true });
          
          if (blockchainUser && user.role !== blockchainUser.role) {
            await user.update({
              role: blockchainUser.role,
              updatedAt: new Date()
            });
            syncedUsers++;
          }
        } catch (error) {
          logger.warn('Failed to sync user', { userId: user.id, error });
        }
      }

      logger.info('Database sync completed', {
        documentsProcessed: documents.length,
        documentsSynced: syncedDocuments,
        usersProcessed: users.length,
        usersSynced: syncedUsers
      });
    } catch (error) {
      logger.error('Database sync failed', { error });
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return blockchainCache.getStats();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    blockchainCache.clear();
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache(): Promise<void> {
    await blockchainCache.warmUp(async () => {
      try {
        // Pre-load recent documents
        const recentDocuments = await Document.findAll({
          limit: 100,
          order: [['createdAt', 'DESC']]
        });

        // Pre-load active users
        const activeUsers = await User.findAll({
          limit: 50,
          order: [['lastLoginAt', 'DESC']]
        });

        // Batch load document data
        if (recentDocuments.length > 0) {
          await this.batchGetDocuments(
            recentDocuments.map(d => d.id),
            { useCache: true, forceRefresh: false }
          );
        }

        // Load user data
        for (const user of activeUsers) {
          try {
            await this.getUser(user.walletAddress, { useCache: true });
          } catch (error) {
            logger.warn('Failed to warm up cache for user', { userId: user.id });
          }
        }

        logger.info('Cache warm-up completed', {
          documentsLoaded: recentDocuments.length,
          usersLoaded: activeUsers.length
        });
      } catch (error) {
        logger.error('Cache warm-up failed', { error });
        throw error;
      }
    });
  }
}

// Export singleton instance
export const enhancedBlockchainService = new EnhancedBlockchainService();