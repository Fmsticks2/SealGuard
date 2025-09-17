import { EventEmitter } from 'events';

export interface BlockchainEvent {
  type: string;
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  data: any;
}

export interface EventSubscription {
  eventType: string;
  callback: (event: BlockchainEvent) => void;
  filter?: (event: BlockchainEvent) => boolean;
}

class EventSubscriptionService extends EventEmitter {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private wsUrl: string;

  constructor() {
    super();
    this.wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';
    this.connect();
  }

  private connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('Connected to blockchain event stream');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'blockchain_event') {
            this.handleBlockchainEvent(message.event);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Disconnected from blockchain event stream');
        this.isConnecting = false;
        this.emit('disconnected');
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.emit('error', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.handleReconnect();
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleBlockchainEvent(event: BlockchainEvent): void {
    console.log('Received blockchain event:', event);
    
    // Emit general event
    this.emit('blockchainEvent', event);
    
    // Emit specific event type
    this.emit(event.type, event);
    
    // Process subscriptions
    const subscriptions = this.subscriptions.get(event.type) || [];
    subscriptions.forEach(subscription => {
      try {
        if (!subscription.filter || subscription.filter(event)) {
          subscription.callback(event);
        }
      } catch (error) {
        console.error('Error in event subscription callback:', error);
      }
    });
  }

  public subscribe(
    eventType: string,
    callback: (event: BlockchainEvent) => void,
    filter?: (event: BlockchainEvent) => boolean
  ): () => void {
    const subscription: EventSubscription = {
      eventType,
      callback,
      filter
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    
    this.subscriptions.get(eventType)!.push(subscription);

    // Return unsubscribe function
    return () => {
      const subscriptions = this.subscriptions.get(eventType);
      if (subscriptions) {
        const index = subscriptions.indexOf(subscription);
        if (index > -1) {
          subscriptions.splice(index, 1);
        }
      }
    };
  }

  public subscribeToDocumentEvents(
    documentId: string,
    callback: (event: BlockchainEvent) => void
  ): () => void {
    const unsubscribeFunctions: (() => void)[] = [];

    // Subscribe to all document-related events
    const documentEventTypes = [
      'DocumentRegistered',
      'DocumentVerified',
      'OwnershipTransferred',
      'AccessGranted',
      'AccessRevoked'
    ];

    documentEventTypes.forEach(eventType => {
      const unsubscribe = this.subscribe(
        eventType,
        callback,
        (event) => event.data.documentId === documentId
      );
      unsubscribeFunctions.push(unsubscribe);
    });

    // Return function to unsubscribe from all
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }

  public subscribeToUserEvents(
    userAddress: string,
    callback: (event: BlockchainEvent) => void
  ): () => void {
    const unsubscribeFunctions: (() => void)[] = [];

    // Subscribe to events where user is involved
    const userEventTypes = [
      'DocumentRegistered',
      'DocumentVerified',
      'OwnershipTransferred',
      'AccessGranted',
      'AccessRevoked',
      'OrganizationJoined',
      'OrganizationLeft'
    ];

    userEventTypes.forEach(eventType => {
      const unsubscribe = this.subscribe(
        eventType,
        callback,
        (event) => this.isUserInvolvedInEvent(event, userAddress)
      );
      unsubscribeFunctions.push(unsubscribe);
    });

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }

  private isUserInvolvedInEvent(event: BlockchainEvent, userAddress: string): boolean {
    const data = event.data;
    const lowerUserAddress = userAddress.toLowerCase();

    switch (event.type) {
      case 'DocumentRegistered':
        return data.owner?.toLowerCase() === lowerUserAddress;
      case 'DocumentVerified':
        return data.verifier?.toLowerCase() === lowerUserAddress;
      case 'OwnershipTransferred':
        return data.previousOwner?.toLowerCase() === lowerUserAddress ||
               data.newOwner?.toLowerCase() === lowerUserAddress;
      case 'AccessGranted':
      case 'AccessRevoked':
        return data.grantee?.toLowerCase() === lowerUserAddress ||
               data.grantor?.toLowerCase() === lowerUserAddress ||
               data.revoker?.toLowerCase() === lowerUserAddress;
      case 'OrganizationJoined':
      case 'OrganizationLeft':
        return data.member?.toLowerCase() === lowerUserAddress;
      default:
        return false;
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public getConnectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'closed';
      default:
        return 'unknown';
    }
  }
}

// Create singleton instance
export const eventSubscriptionService = new EventSubscriptionService();
export default eventSubscriptionService;