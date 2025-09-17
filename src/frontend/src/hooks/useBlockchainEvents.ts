import { useEffect, useCallback, useRef, useState } from 'react';
import { eventSubscriptionService, BlockchainEvent } from '../services/eventSubscriptionService';

export interface UseBlockchainEventsOptions {
  eventTypes?: string[];
  documentId?: string;
  userAddress?: string;
  filter?: (event: BlockchainEvent) => boolean;
  onEvent?: (event: BlockchainEvent) => void;
}

export interface BlockchainEventState {
  events: BlockchainEvent[];
  lastEvent: BlockchainEvent | null;
  isConnected: boolean;
  connectionState: string;
}

export function useBlockchainEvents(options: UseBlockchainEventsOptions = {}) {
  const [state, setState] = useState<BlockchainEventState>({
    events: [],
    lastEvent: null,
    isConnected: eventSubscriptionService.isConnected(),
    connectionState: eventSubscriptionService.getConnectionState()
  });

  const unsubscribeRef = useRef<(() => void)[]>([]);
  const maxEvents = 100; // Keep only last 100 events in memory

  const handleEvent = useCallback((event: BlockchainEvent) => {
    setState(prevState => {
      const newEvents = [event, ...prevState.events].slice(0, maxEvents);
      return {
        ...prevState,
        events: newEvents,
        lastEvent: event
      };
    });

    // Call custom event handler if provided
    if (options.onEvent) {
      options.onEvent(event);
    }
  }, [options.onEvent]);

  const updateConnectionState = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      isConnected: eventSubscriptionService.isConnected(),
      connectionState: eventSubscriptionService.getConnectionState()
    }));
  }, []);

  useEffect(() => {
    // Clear previous subscriptions
    unsubscribeRef.current.forEach(unsubscribe => unsubscribe());
    unsubscribeRef.current = [];

    // Set up connection state listeners
    eventSubscriptionService.on('connected', updateConnectionState);
    eventSubscriptionService.on('disconnected', updateConnectionState);
    eventSubscriptionService.on('error', updateConnectionState);

    // Subscribe based on options
    if (options.documentId) {
      // Subscribe to document-specific events
      const unsubscribe = eventSubscriptionService.subscribeToDocumentEvents(
        options.documentId,
        handleEvent
      );
      unsubscribeRef.current.push(unsubscribe);
    } else if (options.userAddress) {
      // Subscribe to user-specific events
      const unsubscribe = eventSubscriptionService.subscribeToUserEvents(
        options.userAddress,
        handleEvent
      );
      unsubscribeRef.current.push(unsubscribe);
    } else if (options.eventTypes) {
      // Subscribe to specific event types
      options.eventTypes.forEach(eventType => {
        const unsubscribe = eventSubscriptionService.subscribe(
          eventType,
          handleEvent,
          options.filter
        );
        unsubscribeRef.current.push(unsubscribe);
      });
    } else {
      // Subscribe to all events
      const unsubscribe = eventSubscriptionService.subscribe(
        '*',
        handleEvent,
        options.filter
      );
      unsubscribeRef.current.push(unsubscribe);
    }

    // Cleanup function
    return () => {
      unsubscribeRef.current.forEach(unsubscribe => unsubscribe());
      eventSubscriptionService.off('connected', updateConnectionState);
      eventSubscriptionService.off('disconnected', updateConnectionState);
      eventSubscriptionService.off('error', updateConnectionState);
    };
  }, [options.documentId, options.userAddress, options.eventTypes, options.filter, handleEvent, updateConnectionState]);

  const clearEvents = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      events: [],
      lastEvent: null
    }));
  }, []);

  const getEventsByType = useCallback((eventType: string) => {
    return state.events.filter(event => event.type === eventType);
  }, [state.events]);

  const getEventsByDocument = useCallback((documentId: string) => {
    return state.events.filter(event => event.data.documentId === documentId);
  }, [state.events]);

  return {
    ...state,
    clearEvents,
    getEventsByType,
    getEventsByDocument
  };
}

// Specialized hooks for common use cases
export function useDocumentEvents(documentId: string, onEvent?: (event: BlockchainEvent) => void) {
  return useBlockchainEvents({ documentId, onEvent });
}

export function useUserEvents(userAddress: string, onEvent?: (event: BlockchainEvent) => void) {
  return useBlockchainEvents({ userAddress, onEvent });
}

export function useVerificationEvents(onEvent?: (event: BlockchainEvent) => void) {
  return useBlockchainEvents({ 
    eventTypes: ['DocumentVerified'], 
    onEvent 
  });
}

export function useAccessControlEvents(onEvent?: (event: BlockchainEvent) => void) {
  return useBlockchainEvents({ 
    eventTypes: ['AccessGranted', 'AccessRevoked'], 
    onEvent 
  });
}

export function useOrganizationEvents(organizationId?: string, onEvent?: (event: BlockchainEvent) => void) {
  return useBlockchainEvents({ 
    eventTypes: ['OrganizationJoined', 'OrganizationLeft'],
    filter: organizationId ? (event) => event.data.organizationId === organizationId : undefined,
    onEvent 
  });
}