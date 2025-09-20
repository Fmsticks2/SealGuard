import logger from '../utils/logger';
import { io } from '../app';

export interface BlockchainEvent {
  eventName: string;
  blockNumber: number;
  transactionHash: string;
  args: any;
  timestamp: Date;
}

export interface DocumentRegisteredEvent {
  documentId: string;
  owner: string;
  fileHash: string;
  documentType: string;
  timestamp: number;
}

export interface DocumentVerifiedEvent {
  documentId: string;
  verifier: string;
  isValid: boolean;
  timestamp: number;
}

export interface OwnershipTransferredEvent {
  documentId: string;
  previousOwner: string;
  newOwner: string;
  timestamp: number;
}

class BlockchainSyncService {
  /**
   * Process document registration event from blockchain
   */
  async processDocumentRegistered(event: DocumentRegisteredEvent): Promise<void> {
    try {
      logger.info(`Processing DocumentRegistered event for document ${event.documentId}`);

      // Document is now fully managed on blockchain - no database operations needed
      // All document data is stored on-chain and IPFS
      
      // Emit real-time event to frontend for the owner
      io.to(`wallet:${event.owner.toLowerCase()}`).emit('document:registered', {
        documentId: event.documentId,
        owner: event.owner,
        fileHash: event.fileHash,
        documentType: event.documentType,
        status: 'registered',
        timestamp: new Date(event.timestamp * 1000)
      });

      // Emit to all connected clients for global updates
      io.emit('blockchain:document-registered', {
        documentId: event.documentId,
        owner: event.owner,
        documentType: event.documentType,
        timestamp: new Date(event.timestamp * 1000)
      });

    } catch (error) {
      logger.error('Error processing DocumentRegistered event:', error);
      throw error;
    }
  }

  /**
   * Process document verification event from blockchain
   */
  async processDocumentVerified(event: DocumentVerifiedEvent): Promise<void> {
    try {
      logger.info(`Processing DocumentVerified event for document ${event.documentId}`);

      // Document verification is now fully managed on blockchain - no database operations needed
      // All verification data is stored on-chain
      
      const newStatus = event.isValid ? 'verified' : 'rejected';

      // Emit real-time events to document room
      io.to(`document:${event.documentId}`).emit('verification:completed', {
        documentId: event.documentId,
        isValid: event.isValid,
        verifier: event.verifier,
        status: newStatus,
        timestamp: new Date(event.timestamp * 1000)
      });

      // Global blockchain event
      io.emit('blockchain:document-verified', {
        documentId: event.documentId,
        isValid: event.isValid,
        verifier: event.verifier,
        timestamp: new Date(event.timestamp * 1000)
      });

    } catch (error) {
      logger.error('Error processing DocumentVerified event:', error);
      throw error;
    }
  }

  /**
   * Process ownership transfer event from blockchain
   */
  async processOwnershipTransferred(event: OwnershipTransferredEvent): Promise<void> {
    try {
      logger.info(`Processing OwnershipTransferred event for document ${event.documentId}`);

      // Ownership transfer is now fully managed on blockchain - no database operations needed
      // All ownership data is stored on-chain

      // Emit real-time events to wallet rooms
      io.to(`wallet:${event.previousOwner.toLowerCase()}`).emit('document:ownership-lost', {
        documentId: event.documentId,
        newOwner: event.newOwner,
        timestamp: new Date(event.timestamp * 1000)
      });

      io.to(`wallet:${event.newOwner.toLowerCase()}`).emit('document:ownership-gained', {
        documentId: event.documentId,
        previousOwner: event.previousOwner,
        timestamp: new Date(event.timestamp * 1000)
      });

      io.to(`document:${event.documentId}`).emit('ownership:transferred', {
        documentId: event.documentId,
        previousOwner: event.previousOwner,
        newOwner: event.newOwner,
        timestamp: new Date(event.timestamp * 1000)
      });

      // Global blockchain event
      io.emit('blockchain:ownership-transferred', {
        documentId: event.documentId,
        previousOwner: event.previousOwner,
        newOwner: event.newOwner,
        timestamp: new Date(event.timestamp * 1000)
      });

    } catch (error) {
      logger.error('Error processing OwnershipTransferred event:', error);
      throw error;
    }
  }

  /**
   * Process generic blockchain event
   */
  async processBlockchainEvent(event: BlockchainEvent): Promise<void> {
    try {
      logger.info(`Processing blockchain event: ${event.eventName}`);

      switch (event.eventName) {
        case 'DocumentRegistered':
          await this.processDocumentRegistered(event.args as DocumentRegisteredEvent);
          break;
        case 'DocumentVerified':
          await this.processDocumentVerified(event.args as DocumentVerifiedEvent);
          break;
        case 'OwnershipTransferred':
          await this.processOwnershipTransferred(event.args as OwnershipTransferredEvent);
          break;
        default:
          logger.warn(`Unknown event type: ${event.eventName}`);
      }

      // Emit generic blockchain event for monitoring
      io.emit('blockchain:event', {
        eventName: event.eventName,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        timestamp: event.timestamp
      });

    } catch (error) {
      logger.error(`Error processing blockchain event ${event.eventName}:`, error);
      throw error;
    }
  }

  /**
   * Get blockchain sync status
   */
  async getSyncStatus(): Promise<{
    lastProcessedBlock: number;
    pendingEvents: number;
    isHealthy: boolean;
  }> {
    // This would typically query a sync status table or cache
    return {
      lastProcessedBlock: 0, // Would be stored in database
      pendingEvents: 0, // Would be queried from event queue
      isHealthy: true // Would be determined by recent sync activity
    };
  }
}

export const blockchainSyncService = new BlockchainSyncService();
export default blockchainSyncService;