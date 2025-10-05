import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESSES, SealGuardRegistryABI, FILECOIN_CALIBRATION_CHAIN_ID } from '../lib/contracts';
import { parseEventLogs } from 'viem';

export interface ContractError {
  message: string;
  code?: string;
  details?: any;
}

export interface TransactionStatus {
  hash?: string;
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  error?: ContractError;
}

export function useContract() {
  const { address, isConnected } = useAccount();
  const [error, setError] = useState<ContractError | null>(null);
  const publicClient = usePublicClient();

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: receiptError } = useWaitForTransactionReceipt({
    hash,
  });

  // Clear errors when wallet connection changes
  useEffect(() => {
    setError(null);
  }, [isConnected, address]);

  // Handle write errors
  useEffect(() => {
    if (writeError) {
      setError({
        message: writeError.message || 'Transaction failed',
        details: writeError,
      });
    }
  }, [writeError]);

  // Handle receipt errors
  useEffect(() => {
    if (receiptError) {
      setError({
        message: receiptError.message || 'Transaction confirmation failed',
        details: receiptError,
      });
    }
  }, [receiptError]);

  const registerDocument = async (
    filecoinCID: string,
    fileHash: string,
    metadata: string,
    fileSize: bigint,
    documentType: string
  ) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    // Validate inputs
    if (!filecoinCID || !fileHash || !metadata || !documentType) {
      throw new Error('Missing required document information');
    }

    if (fileSize <= 0) {
      throw new Error('Invalid file size');
    }

    setError(null);

    try {
      writeContract({
        address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
        abi: SealGuardRegistryABI,
        functionName: 'registerDocument',
        args: [filecoinCID, fileHash, metadata, fileSize, documentType],
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to register document';
      const error: ContractError = {
        message: errorMessage,
        code: err.code,
        details: err,
      };
      setError(error);
      throw error;
    }
  };

  const submitVerificationProof = async (
    documentId: bigint,
    proofHash: string,
    proofData: string,
    isValid: boolean
  ) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    // Validate inputs
    if (!documentId || documentId <= 0) {
      throw new Error('Invalid document ID');
    }

    if (!proofHash || !proofData) {
      throw new Error('Missing proof information');
    }

    setError(null);

    try {
      writeContract({
        address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
        abi: SealGuardRegistryABI,
        functionName: 'submitVerificationProof',
        args: [documentId, proofHash, proofData, isValid],
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to submit verification proof';
      const error: ContractError = {
        message: errorMessage,
        code: err.code,
        details: err,
      };
      setError(error);
      throw error;
    }
  };

  const transferDocumentOwnership = async (documentId: bigint, newOwner: string) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    // Validate inputs
    if (!documentId || documentId <= 0) {
      throw new Error('Invalid document ID');
    }

    if (!newOwner || !/^0x[a-fA-F0-9]{40}$/.test(newOwner)) {
      throw new Error('Invalid new owner address');
    }

    if (newOwner.toLowerCase() === address.toLowerCase()) {
      throw new Error('Cannot transfer to the same address');
    }

    setError(null);

    try {
      writeContract({
        address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
        abi: SealGuardRegistryABI,
        functionName: 'transferDocumentOwnership',
        args: [documentId, newOwner],
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to transfer document ownership';
      const error: ContractError = {
        message: errorMessage,
        code: err.code,
        details: err,
      };
      setError(error);
      throw error;
    }
  };

  // Get transaction events after confirmation
  const getTransactionEvents = async (txHash: string) => {
    if (!publicClient) return [];

    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
      
      const logs = parseEventLogs({
        abi: SealGuardRegistryABI,
        logs: receipt.logs,
      });

      return logs;
    } catch (err) {
      console.error('Failed to parse transaction events:', err);
      return [];
    }
  };

  // Get document ID from registration transaction
  const getDocumentIdFromTransaction = async (txHash: string): Promise<number | null> => {
    try {
      const events = await getTransactionEvents(txHash);
      const registrationEvent = events.find(event => event.eventName === 'DocumentRegistered');
      
      if (registrationEvent && registrationEvent.args) {
        return Number((registrationEvent.args as any).documentId);
      }
      
      return null;
    } catch (err) {
      console.error('Failed to get document ID from transaction:', err);
      return null;
    }
  };

  const transactionStatus: TransactionStatus = {
    hash: hash,
    isPending,
    isConfirming,
    isConfirmed,
    error: error || undefined,
  };

  const clearError = () => setError(null);

  return {
    // Contract write functions
    registerDocument,
    submitVerificationProof,
    transferDocumentOwnership,
    
    // Transaction status
    transactionStatus,
    
    // Utility functions
    getTransactionEvents,
    getDocumentIdFromTransaction,
    
    // Error handling
    error,
    clearError,
    
    // Connection status
    isConnected,
    address,
  };
}

// Hook for reading contract data
export function useContractRead() {
  const { address, isConnected } = useAccount();

  // Get user's documents
  const { 
    data: userDocumentIds, 
    isLoading: isLoadingUserDocs,
    refetch: refetchUserDocs,
    error: userDocsError 
  } = useReadContract({
    address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
    abi: SealGuardRegistryABI,
    functionName: 'getUserDocuments',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Get total documents count
  const { 
    data: totalDocuments, 
    isLoading: isLoadingTotal,
    refetch: refetchTotal 
  } = useReadContract({
    address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
    abi: SealGuardRegistryABI,
    functionName: 'getTotalDocuments',
  });

  // Function to get a specific document
  const getDocument = (documentId: bigint) => {
    return useReadContract({
      address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
      abi: SealGuardRegistryABI,
      functionName: 'getDocument',
      args: [documentId],
      query: {
        enabled: !!documentId,
      },
    });
  };

  // Function to get document proofs
  const getLatestProof = (documentId: bigint) => {
    return useReadContract({
      address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
      abi: SealGuardRegistryABI,
      functionName: 'getLatestProof',
      args: [documentId],
      query: {
        enabled: !!documentId,
      },
    });
  };

  return {
    // User data
    userDocumentIds: userDocumentIds as bigint[] | undefined,
    isLoadingUserDocs,
    refetchUserDocs,
    userDocsError,
    
    // Global data
    totalDocuments: totalDocuments ? Number(totalDocuments) : 0,
    isLoadingTotal,
    refetchTotal,
    
    // Document queries
    getDocument,
    getLatestProof,
    
    // Connection status
    isConnected,
    address,
  };
}