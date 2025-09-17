import { ethers } from 'ethers';
import { blockchainService } from './blockchainService';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { WebSocketServer } from 'ws';
import { blockchainSyncService } from './blockchainSyncService';
import { blockchainCache, BlockchainCacheService } from './blockchainCacheService';

export interface BlockchainEvent {
  type: string;
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  data: any;
}

export interface EventHandler {
  (event: BlockchainEvent): Promise<void>;
}

class EventMonitorService {
  private provider: ethers.JsonRpcProvider;
  private registryContract: ethers.Contract;
  private accessControlContract: ethers.Contract;
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private isMonitoring: boolean = false;
  private wsServer?: WebSocketServer;
  private lastProcessedBlock: number = 0;
  private blockUpdateInterval?: NodeJS.Timeout;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      process.env.FILECOIN_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1'
    );
    
    // Initialize contracts for event listening
    this.initializeContracts();
    this.setupDefaultHandlers();
    
    // Initialize block number tracking
    this.updateCurrentBlock();
    
    // Update block number every 30 seconds
    this.blockUpdateInterval = setInterval(() => this.updateCurrentBlock(), 30000);
  }

  private initializeContracts(): void {
    const registryABI = [
      'event DocumentRegistered(uint256 indexed documentId, address indexed owner, string filecoinCID, bytes32 fileHash)',
      'event DocumentVerified(uint256 indexed documentId, address indexed verifier, bytes32 proofHash, bool isValid)',
      'event OwnershipTransferred(uint256 indexed documentId, address indexed previousOwner, address indexed newOwner)'
    ];

    const accessControlABI = [
      'event AccessGranted(uint256 indexed documentId, address indexed grantee, address indexed grantor, uint256 expiresAt)',
      'event AccessRevoked(uint256 indexed documentId, address indexed grantee, address indexed revoker)',
      'event OrganizationJoined(string indexed organizationId, address indexed member, string role)',
      'event OrganizationLeft(string indexed organizationId, address indexed member)'
    ];

    // Get contract addresses from blockchain service
    const addresses = (blockchainService as any).contractAddresses;
    
    this.registryContract = new ethers.Contract(
      addresses.registry,
      registryABI,
      this.provider
    );

    this.accessControlContract = new ethers.Contract(
      addresses.accessControl,
      accessControlABI,
      this.provider
    );
  }

  private setupDefaultHandlers(): void {
    // Document Registry Events
    this.registerHandler('DocumentRegistered', this.handleDocumentRegistered.bind(this));
    this.registerHandler('DocumentVerified', this.handleDocumentVerified.bind(this));
    this.registerHandler('OwnershipTransferred', this.handleOwnershipTransferred.bind(this));

    // Access Control Events
    this.registerHandler('AccessGranted', this.handleAccessGranted.bind(this));
    this.registerHandler('AccessRevoked', this.handleAccessRevoked.bind(this));
    this.registerHandler('OrganizationJoined', this.handleOrganizationJoined.bind(this));
    this.registerHandler('OrganizationLeft', this.handleOrganizationLeft.bind(this));
  }

  public registerHandler(eventType: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      logger.warn('Event monitoring is already running');
      return;
    }

    try {
      // Get the last processed block from database or start from current block
      this.lastProcessedBlock = await this.getLastProcessedBlock();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start WebSocket server for real-time updates
      this.startWebSocketServer();
      
      // Process historical events if needed
      await this.processHistoricalEvents();
      
      this.isMonitoring = true;
      logger.info('Event monitoring started successfully');
    } catch (error) {
      logger.error('Failed to start event monitoring:', error);
      throw error;
    }
  }

  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    // Remove all event listeners
    this.registryContract.removeAllListeners();
    this.accessControlContract.removeAllListeners();
    
    // Close WebSocket server
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    // Clear block update interval
    if (this.blockUpdateInterval) {
      clearInterval(this.blockUpdateInterval);
    }
    
    this.isMonitoring = false;
    logger.info('Event monitoring stopped');
  }

  private setupEventListeners(): void {
    // Registry contract events
    this.registryContract.on('DocumentRegistered', async (...args) => {
      await this.processEvent('DocumentRegistered', args);
    });

    this.registryContract.on('DocumentVerified', async (...args) => {
      await this.processEvent('DocumentVerified', args);
    });

    this.registryContract.on('OwnershipTransferred', async (...args) => {
      await this.processEvent('OwnershipTransferred', args);
    });

    // Access control contract events
    this.accessControlContract.on('AccessGranted', async (...args) => {
      await this.processEvent('AccessGranted', args);
    });

    this.accessControlContract.on('AccessRevoked', async (...args) => {
      await this.processEvent('AccessRevoked', args);
    });

    this.accessControlContract.on('OrganizationJoined', async (...args) => {
      await this.processEvent('OrganizationJoined', args);
    });

    this.accessControlContract.on('OrganizationLeft', async (...args) => {
      await this.processEvent('OrganizationLeft', args);
    });
  }

  private async processEvent(eventType: string, args: any[]): Promise<void> {
    try {
      const event = args[args.length - 1]; // Last argument is the event object
      
      const blockchainEvent: BlockchainEvent = {
        type: eventType,
        contractAddress: event.address,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: Date.now(),
        data: this.parseEventData(eventType, args)
      };

      // Process event through blockchain sync service
      await blockchainSyncService.processBlockchainEvent({
        eventName: eventType,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        args: blockchainEvent.data,
        timestamp: new Date()
      });

      // Update cache with current block number
      if (event.blockNumber > this.lastProcessedBlock) {
        this.lastProcessedBlock = event.blockNumber;
        blockchainCache.updateBlockNumber(event.blockNumber);
      }

      // Invalidate relevant cache entries based on event type
      this.invalidateRelevantCache(eventType, blockchainEvent.data);

      // Execute all registered handlers for this event type
      const handlers = this.eventHandlers.get(eventType) || [];
      await Promise.all(handlers.map(handler => handler(blockchainEvent)));

      // Broadcast to WebSocket clients
      this.broadcastEvent(blockchainEvent);

      // Update last processed block
      await this.updateLastProcessedBlock(event.blockNumber);
      
      logger.info(`Processed ${eventType} event:`, blockchainEvent.data);
    } catch (error) {
      logger.error(`Error processing ${eventType} event:`, error);
    }
  }

  private parseEventData(eventType: string, args: any[]): any {
    switch (eventType) {
      case 'DocumentRegistered':
        return {
          documentId: args[0].toString(),
          owner: args[1],
          filecoinCID: args[2],
          fileHash: args[3]
        };
      case 'DocumentVerified':
        return {
          documentId: args[0].toString(),
          verifier: args[1],
          proofHash: args[2],
          isValid: args[3]
        };
      case 'OwnershipTransferred':
        return {
          documentId: args[0].toString(),
          previousOwner: args[1],
          newOwner: args[2]
        };
      case 'AccessGranted':
        return {
          documentId: args[0].toString(),
          grantee: args[1],
          grantor: args[2],
          expiresAt: args[3].toString()
        };
      case 'AccessRevoked':
        return {
          documentId: args[0].toString(),
          grantee: args[1],
          revoker: args[2]
        };
      case 'OrganizationJoined':
        return {
          organizationId: args[0],
          member: args[1],
          role: args[2]
        };
      case 'OrganizationLeft':
        return {
          organizationId: args[0],
          member: args[1]
        };
      default:
        return args;
    }
  }

  // Event Handlers
  private async handleDocumentRegistered(event: BlockchainEvent): Promise<void> {
    const { documentId, owner, filecoinCID, fileHash } = event.data;
    
    try {
      // Update database with blockchain registration
      await db.document.update({
        where: { id: documentId },
        data: {
          blockchainTxHash: event.transactionHash,
          blockNumber: event.blockNumber,
          status: 'REGISTERED',
          updatedAt: new Date()
        }
      });
      
      logger.info(`Document ${documentId} registered on blockchain`);
    } catch (error) {
      logger.error(`Failed to update document ${documentId}:`, error);
    }
  }

  private async handleDocumentVerified(event: BlockchainEvent): Promise<void> {
    const { documentId, verifier, proofHash, isValid } = event.data;
    
    try {
      // Update verification record
      await db.verificationRecord.create({
        data: {
          documentId,
          verifierId: verifier,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          proofHash,
          status: isValid ? 'VERIFIED' : 'REJECTED',
          verifiedAt: new Date()
        } as any
      });

      // Update document status
      await db.document.update({
        where: { id: documentId },
        data: {
          status: isValid ? 'VERIFIED' : 'REJECTED',
          lastVerified: new Date()
        }
      });
      
      logger.info(`Document ${documentId} verification updated: ${isValid ? 'VERIFIED' : 'REJECTED'}`);
    } catch (error) {
      logger.error(`Failed to update verification for document ${documentId}:`, error);
    }
  }

  private async handleOwnershipTransferred(event: BlockchainEvent): Promise<void> {
    const { documentId, previousOwner, newOwner } = event.data;
    
    try {
      // Update document ownership
      await db.document.update({
        where: { id: documentId },
        data: {
          ownerId: newOwner,
          updatedAt: new Date()
        }
      });
      
      logger.info(`Document ${documentId} ownership transferred from ${previousOwner} to ${newOwner}`);
    } catch (error) {
      logger.error(`Failed to update ownership for document ${documentId}:`, error);
    }
  }

  private async handleAccessGranted(event: BlockchainEvent): Promise<void> {
    const { documentId, grantee, grantor, expiresAt } = event.data;
    
    try {
      // Record access grant in database
      await db.documentAccess.create({
        data: {
          documentId,
          userId: grantee,
          grantedBy: grantor,
          expiresAt: new Date(parseInt(expiresAt) * 1000),
          createdAt: new Date()
        } as any
      });
      
      logger.info(`Access granted for document ${documentId} to ${grantee}`);
    } catch (error) {
      logger.error(`Failed to record access grant for document ${documentId}:`, error);
    }
  }

  private async handleAccessRevoked(event: BlockchainEvent): Promise<void> {
    const { documentId, grantee, revoker } = event.data;
    
    try {
      // Update access record
      await db.documentAccess.updateMany({
        where: {
          documentId,
          userId: grantee,
          isActive: true
        },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedBy: revoker
        }
      });
      
      logger.info(`Access revoked for document ${documentId} from ${grantee}`);
    } catch (error) {
      logger.error(`Failed to revoke access for document ${documentId}:`, error);
    }
  }

  private async handleOrganizationJoined(event: BlockchainEvent): Promise<void> {
    const { organizationId, member, role } = event.data;
    
    try {
      // Record organization membership
      await db.organizationMember.create({
        data: {
          organizationId,
          userId: member,
          role,
          joinedAt: new Date()
        } as any
      });
      
      logger.info(`User ${member} joined organization ${organizationId} as ${role}`);
    } catch (error) {
      logger.error(`Failed to record organization join:`, error);
    }
  }

  private async handleOrganizationLeft(event: BlockchainEvent): Promise<void> {
    const { organizationId, member } = event.data;
    
    try {
      // Update organization membership
      await db.organizationMember.updateMany({
        where: {
          organizationId,
          userId: member,
          isActive: true
        },
        data: {
          isActive: false,
          leftAt: new Date()
        }
      });
      
      logger.info(`User ${member} left organization ${organizationId}`);
    } catch (error) {
      logger.error(`Failed to record organization leave:`, error);
    }
  }

  private startWebSocketServer(): void {
    const port = parseInt(process.env.WS_PORT || '8080');
    this.wsServer = new WebSocketServer({ port });
    
    this.wsServer.on('connection', (ws) => {
      logger.info('New WebSocket client connected');
      
      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
      });
    });
    
    logger.info(`WebSocket server started on port ${port}`);
  }

  private broadcastEvent(event: BlockchainEvent): void {
    if (!this.wsServer) return;
    
    const message = JSON.stringify({
      type: 'blockchain_event',
      event
    });
    
    this.wsServer.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  private async getLastProcessedBlock(): Promise<number> {
    try {
      // Get from database or use current block number
      const currentBlock = await this.provider.getBlockNumber();
      return currentBlock - 100; // Start from 100 blocks ago to catch any missed events
    } catch (error) {
      logger.error('Failed to get last processed block:', error);
      return 0;
    }
  }

  private async updateLastProcessedBlock(blockNumber: number): Promise<void> {
    if (blockNumber > this.lastProcessedBlock) {
      this.lastProcessedBlock = blockNumber;
      // Could store this in database for persistence
    }
  }

  private async processHistoricalEvents(): Promise<void> {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(this.lastProcessedBlock, currentBlock - 1000); // Last 1000 blocks
      
      logger.info(`Processing historical events from block ${fromBlock} to ${currentBlock}`);
      
      // Process registry events
      const registryEvents = await this.registryContract.queryFilter('*', fromBlock, currentBlock);
      for (const event of registryEvents) {
        await this.processHistoricalEvent(event);
      }
      
      // Process access control events
      const accessEvents = await this.accessControlContract.queryFilter('*', fromBlock, currentBlock);
      for (const event of accessEvents) {
        await this.processHistoricalEvent(event);
      }
      
      logger.info(`Processed ${registryEvents.length + accessEvents.length} historical events`);
    } catch (error) {
      logger.error('Failed to process historical events:', error);
    }
  }

  private async processHistoricalEvent(event: any): Promise<void> {
    try {
      const blockchainEvent: BlockchainEvent = {
        type: event.event || 'Unknown',
        contractAddress: event.address,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: Date.now(),
        data: event.args ? Object.values(event.args) : []
      };

      const handlers = this.eventHandlers.get(blockchainEvent.type) || [];
      await Promise.all(handlers.map(handler => handler(blockchainEvent)));
    } catch (error) {
      logger.error('Error processing historical event:', error);
    }
  }

  public async getEventHistory(eventType?: string, limit: number = 100): Promise<BlockchainEvent[]> {
    // This would typically query a database of stored events
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Update current block number for cache management
   */
  private async updateCurrentBlock(): Promise<void> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      if (blockNumber > this.lastProcessedBlock) {
        this.lastProcessedBlock = blockNumber;
        blockchainCache.updateBlockNumber(blockNumber);
      }
    } catch (error) {
      logger.error('Failed to update current block number:', error);
    }
  }

  /**
   * Invalidate relevant cache entries based on event type
   */
  private invalidateRelevantCache(eventType: string, eventData: any): void {
    try {
      switch (eventType) {
        case 'DocumentRegistered':
        case 'DocumentVerified':
        case 'OwnershipTransferred':
          if (eventData.documentId) {
            const documentKey = BlockchainCacheService.generateDocumentKey(eventData.documentId);
            blockchainCache.delete(documentKey);
          }
          break;
          
        case 'AccessGranted':
        case 'AccessRevoked':
          if (eventData.documentId && eventData.grantee) {
            const accessKey = `access:${eventData.documentId}:${eventData.grantee}`;
            blockchainCache.delete(accessKey);
            // Also invalidate document cache as access affects document data
            const documentKey = BlockchainCacheService.generateDocumentKey(eventData.documentId);
            blockchainCache.delete(documentKey);
          }
          break;
          
        case 'OrganizationJoined':
        case 'OrganizationLeft':
          if (eventData.organizationId && eventData.member) {
            const orgKey = `organization:${eventData.organizationId}`;
            const memberKey = `member:${eventData.member}`;
            blockchainCache.delete(orgKey);
            blockchainCache.delete(memberKey);
          }
          break;
          
        default:
          // For unknown events, invalidate contract-related cache
          const contractAddress = (this.registryContract?.target || this.accessControlContract?.target) as string;
          if (contractAddress) {
            blockchainCache.invalidateByPattern(`contract:${contractAddress}`);
          }
      }
    } catch (error) {
      logger.error('Failed to invalidate cache:', { eventType, error });
    }
  }

  public isRunning(): boolean {
    return this.isMonitoring;
  }
}

export const eventMonitorService = new EventMonitorService();
export default eventMonitorService;