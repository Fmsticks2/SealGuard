import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES, SealGuardRegistryABI, FILECOIN_CALIBRATION_CHAIN_ID, DocumentTuple } from '../lib/contracts';

// Real document service that fetches actual data from the smart contract
export interface ContractDocument {
  id: number;
  filecoinCID: string;
  fileHash: string;
  proofHash: string;
  owner: string;
  timestamp: number;
  lastVerified: number;
  isVerified: boolean;
  metadata: string;
  fileSize: number;
  documentType: string;
  lifecycle: number;
  expiresAt: number;
}

// Contract service class for document operations
export class ContractDocumentService {
  /**
   * Fetch actual document data from the smart contract
   * Replaces the backend /api/contract/getDocument endpoint
   */
  static async getDocument(documentId: string | number): Promise<ContractDocument> {
    if (!documentId) {
      throw new Error('Document ID is required');
    }

    const id = typeof documentId === 'string' ? parseInt(documentId) : documentId;

    try {
      // This will be called from a React component with wagmi hooks
      // For now, we'll throw an error to indicate this needs to be called from a hook context
      throw new Error('ContractDocumentService.getDocument must be called from a React component with wagmi hooks. Use useContractDocument hook instead.');
    } catch (error) {
      console.error(`Error fetching document ${id}:`, error);
      throw new Error(`Failed to fetch document ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert contract tuple to our document interface
   */
  static convertContractDocument(contractDoc: DocumentTuple): ContractDocument {
    return {
      id: Number(contractDoc.id),
      filecoinCID: contractDoc.filecoinCID,
      fileHash: contractDoc.fileHash,
      proofHash: contractDoc.proofHash,
      owner: contractDoc.owner,
      timestamp: Number(contractDoc.timestamp),
      lastVerified: Number(contractDoc.lastVerified),
      isVerified: contractDoc.isVerified,
      metadata: contractDoc.metadata,
      fileSize: Number(contractDoc.fileSize),
      documentType: contractDoc.documentType,
      lifecycle: contractDoc.lifecycle,
      expiresAt: Number(contractDoc.expiresAt)
    };
  }

  /**
   * Health check equivalent
   */
  static getHealth(): { status: string; timestamp: string } {
    return {
      status: 'OK - Contract Service',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Custom hook to fetch a single document from the contract
 */
export function useContractDocument(documentId: string | number | undefined) {
  const id = documentId ? (typeof documentId === 'string' ? parseInt(documentId) : documentId) : undefined;

  const { data: contractDocument, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
    abi: SealGuardRegistryABI,
    functionName: 'getDocument',
    args: id !== undefined ? [BigInt(id)] : undefined,
    query: {
      enabled: id !== undefined && id > 0,
    },
  });

  const document = contractDocument ? ContractDocumentService.convertContractDocument(contractDocument as DocumentTuple) : undefined;

  return {
    document,
    isLoading,
    error,
    refetch
  };
}

/**
 * Custom hook to fetch multiple documents from the contract
 */
export function useContractDocuments(documentIds: (string | number)[] | undefined) {
  const ids = documentIds?.map(id => typeof id === 'string' ? parseInt(id) : id).filter(id => id > 0);

  // We'll need to make multiple contract calls for each document
  // This is a simplified version - in production, you might want to batch these calls
  const documentQueries = ids?.map(id => ({
    address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
    abi: SealGuardRegistryABI,
    functionName: 'getDocument',
    args: [BigInt(id)],
  })) || [];

  // Note: This would require a multicall implementation for efficiency
  // For now, we'll return a structure that indicates this needs individual calls
  return {
    documentQueries,
    isLoading: false,
    error: null,
    documents: []
  };
}

/**
 * Custom hook to fetch user's document IDs from the contract
 */
export function useUserDocumentIds(userAddress: string | undefined) {
  const { data: documentIds, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
    abi: SealGuardRegistryABI,
    functionName: 'getUserDocuments',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  const ids = documentIds ? (documentIds as bigint[]).map(id => Number(id)) : [];

  return {
    documentIds: ids,
    isLoading,
    error,
    refetch
  };
}

/**
 * Custom hook to get total documents count
 */
export function useTotalDocuments() {
  const { data: totalDocuments, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
    abi: SealGuardRegistryABI,
    functionName: 'getTotalDocuments',
  });

  return {
    totalDocuments: totalDocuments ? Number(totalDocuments) : 0,
    isLoading,
    error
  };
}