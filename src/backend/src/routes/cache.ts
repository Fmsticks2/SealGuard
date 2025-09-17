import { Router, Request, Response } from 'express';
import { enhancedBlockchainService } from '../services/enhancedBlockchainService';
import { blockchainCache } from '../services/blockchainCacheService';
import logger from '../utils/logger';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * Get cache statistics
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const stats = enhancedBlockchainService.getCacheStats();
    
    res.json({
      success: true,
      data: {
        cache: stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get cache stats', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache statistics'
    });
  }
});

/**
 * Clear cache (admin only)
 */
router.delete('/clear', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    enhancedBlockchainService.clearCache();
    
    logger.info('Cache cleared by admin', { adminId: user.id });
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    logger.error('Failed to clear cache', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

/**
 * Warm up cache (admin only)
 */
router.post('/warmup', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    await enhancedBlockchainService.warmUpCache();
    
    logger.info('Cache warmed up by admin', { adminId: user.id });
    
    res.json({
      success: true,
      message: 'Cache warmed up successfully'
    });
  } catch (error) {
    logger.error('Failed to warm up cache', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to warm up cache'
    });
  }
});

/**
 * Force sync database with blockchain (admin only)
 */
router.post('/sync', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    await enhancedBlockchainService.syncDatabaseWithBlockchain();
    
    logger.info('Database sync triggered by admin', { adminId: user.id });
    
    res.json({
      success: true,
      message: 'Database sync completed successfully'
    });
  } catch (error) {
    logger.error('Failed to sync database', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to sync database with blockchain'
    });
  }
});

/**
 * Invalidate cache by pattern (admin only)
 */
router.delete('/invalidate', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { pattern } = req.body;
    
    if (!pattern || typeof pattern !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Pattern is required and must be a string'
      });
    }

    const invalidatedCount = blockchainCache.invalidateByPattern(pattern);
    
    logger.info('Cache invalidated by pattern', { 
      pattern, 
      count: invalidatedCount, 
      adminId: user.id 
    });
    
    res.json({
      success: true,
      message: `Invalidated ${invalidatedCount} cache entries`,
      data: {
        pattern,
        invalidatedCount
      }
    });
  } catch (error) {
    logger.error('Failed to invalidate cache by pattern', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate cache entries'
    });
  }
});

/**
 * Get cache health metrics
 */
router.get('/health', authenticateToken, async (req: Request, res: Response) => {
  try {
    const stats = enhancedBlockchainService.getCacheStats();
    
    // Calculate health metrics
    const utilizationPercent = (stats.size / stats.maxSize) * 100;
    const isHealthy = utilizationPercent < 90; // Consider unhealthy if > 90% full
    
    const health = {
      status: isHealthy ? 'healthy' : 'warning',
      utilization: {
        current: stats.size,
        max: stats.maxSize,
        percent: Math.round(utilizationPercent * 100) / 100
      },
      blockInfo: {
        currentBlock: stats.currentBlockNumber,
        maxBlockAge: stats.maxBlockAge
      },
      config: {
        ttl: stats.ttl,
        maxBlockAge: stats.maxBlockAge
      },
      recommendations: []
    };

    // Add recommendations based on health
    if (utilizationPercent > 80) {
      health.recommendations.push('Consider increasing cache size or reducing TTL');
    }
    
    if (stats.currentBlockNumber === 0) {
      health.recommendations.push('Block number tracking not initialized');
    }

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Failed to get cache health', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache health metrics'
    });
  }
});

export default router;