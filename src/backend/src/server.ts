import dotenv from 'dotenv';
import app, { server } from './app';
import logger from './utils/logger';
import { eventMonitorService } from './services/eventMonitorService';

// Load environment variables
dotenv.config();
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Initialize blockchain event monitoring
    logger.info('🔗 Starting blockchain event monitoring...');
    await eventMonitorService.startMonitoring();
    logger.info('✅ Blockchain event monitoring started');

    // Start the server with WebSocket support
    server.listen(PORT, () => {
      logger.info(`🚀 SealGuard Backend Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api`);
      logger.info(`🌐 WebSocket server running on port ${PORT}`);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Stop blockchain event monitoring
          await eventMonitorService.stopMonitoring();
          logger.info('Blockchain event monitoring stopped');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;