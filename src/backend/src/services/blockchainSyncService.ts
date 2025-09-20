import { Document } from '../models/Document';
import { User } from '../models/User';
import { VerificationProof } from '../models/VerificationProof';
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

      // Find the user by wallet address
      const user = await User.findOne({ walletAddress: event.owner.toLowerCase() });
      if (!user) {
        logger.warn(`User not found for wallet address: ${event.owner}`);
        return;
      }

      // Check if document already exists
      const existingDoc = await Document.findOne({ 
        blockchainId: event.documentId 
      });

      if (existingDoc) {
        logger.info(`Document ${event.documentId} already exists in database`);
        return;
      }

      // Create new document record
      const document = new Document({
        title: `Document ${event.documentId}`,
        description: 'Document registered via blockchain',
        fileHash: event.fileHash,
        blockchainId: event.documentId,
        documentType: event.documentType,
        owner: user._id,
        status: 'pending',
        lifecycle: 'PENDING',
        registeredAt: new Date(event.timestamp * 1000),
        metadata: {
          blockchainRegistered: true,
          registrationTxHash: event.documentId // This would be the transaction hash
        }
      });

      await document.save();
      logger.info(`Document ${event.documentId} saved to database`);

      // Emit real-time event to frontend
      io.to(`user:${user._id}`).emit('document:registered', {
        documentId: document._id,
        blockchainId: event.documentId,
        status: 'pending',
        lifecycle: 'PENDING',
        timestamp: new Date()
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

      // Find the document by blockchain ID
      const document = await Document.findOne({ 
        blockchainId: event.documentId 
      }).populate('owner');

      if (!document) {
        logger.warn(`Document not found for blockchain ID: ${event.documentId}`);
        return;
      }

      // Find the verifier
      const verifier = await User.findOne({ 
        walletAddress: event.verifier.toLowerCase() 
      });

      // Update document status and lifecycle
      const newStatus = event.isValid ? 'verified' : 'rejected';
      const newLifecycle = event.isValid ? 'ACTIVE' : 'REJECTED';

      document.status = newStatus;
      document.lifecycle = newLifecycle;
      document.verifiedAt = new Date(event.timestamp * 1000);
      
      if (verifier) {
        document.verifiedBy = verifier._id;
      }

      await document.save();

      // Create verification proof record
      const verificationProof = new VerificationProof({
        document: document._id,
        verifier: verifier?._id,
        verifierAddress: event.verifier,
        isValid: event.isValid,
        verificationDate: new Date(event.timestamp * 1000),
        blockchainProof: {
          transactionHash: event.documentId, // This would be the actual tx hash
          blockNumber: 0, // Would be provided in the event
          verified: true
        }
      });

      await verificationProof.save();
      logger.info(`Verification proof saved for document ${event.documentId}`);

      // Emit real-time events
      if (document.owner) {
        io.to(`user:${document.owner._id || document.owner}`).emit('document:verified', {
          documentId: document._id,
          blockchainId: event.documentId,
          status: newStatus,
          lifecycle: newLifecycle,
          isValid: event.isValid,
          verifier: event.verifier,
          timestamp: new Date(event.timestamp * 1000)
        });
      }

      io.to(`document:${document._id}`).emit('verification:completed', {
        documentId: document._id,
        isValid: event.isValid,
        verifier: event.verifier,
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

      // Find the document
      const document = await Document.findOne({ 
        blockchainId: event.documentId 
      });

      if (!document) {
        logger.warn(`Document not found for blockchain ID: ${event.documentId}`);
        return;
      }

      // Find the new owner
      const newOwner = await User.findOne({ 
        walletAddress: event.newOwner.toLowerCase() 
      });

      if (!newOwner) {
        logger.warn(`New owner not found for wallet address: ${event.newOwner}`);
        return;
      }

      const previousOwnerId = document.owner;
      
      // Update document ownership
      document.owner = newOwner._id;
      document.transferHistory = document.transferHistory || [];
      document.transferHistory.push({
        from: event.previousOwner,
        to: event.newOwner,
        timestamp: new Date(event.timestamp * 1000),
        transactionHash: event.documentId // Would be actual tx hash
      });

      await document.save();
      logger.info(`Ownership transferred for document ${event.documentId}`);

      // Emit real-time events
      if (previousOwnerId) {
        io.to(`user:${previousOwnerId}`).emit('document:ownership-lost', {
          documentId: document._id,
          blockchainId: event.documentId,
          newOwner: event.newOwner,
          timestamp: new Date(event.timestamp * 1000)
        });
      }

      io.to(`user:${newOwner._id}`).emit('document:ownership-gained', {
        documentId: document._id,
        blockchainId: event.documentId,
        previousOwner: event.previousOwner,
        timestamp: new Date(event.timestamp * 1000)
      });

      io.to(`document:${document._id}`).emit('ownership:transferred', {
        documentId: document._id,
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