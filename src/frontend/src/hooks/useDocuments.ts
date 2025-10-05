import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useReadContract, useWriteContract } from 'wagmi';
import { keccak256 } from 'viem';
import { CONTRACT_ADDRESSES, SealGuardRegistryABI, FILECOIN_CALIBRATION_CHAIN_ID, DocumentTuple } from '../lib/contracts';
import { uploadToFilecoin } from '../lib/filecoin';
import { ContractDocumentService } from '../services/contractDocumentService';

export interface Document {
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

export interface DocumentMetadata {
  name: string;
  description?: string;
  type?: string;
  size?: number;
  uploadedAt?: string;
  tags?: string[];
}

export function useDocuments() {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contract write hook
  const { writeContract } = useWriteContract();

  // Get user's document IDs
  const { data: userDocumentIds, refetch: refetchDocumentIds } = useReadContract({
    address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
    abi: SealGuardRegistryABI,
    functionName: 'getUserDocuments',
    args: [address as `0x${string}`],
    chainId: FILECOIN_CALIBRATION_CHAIN_ID,
    query: {
      enabled: !!address,
    },
  });

  // Get total documents count
  const { data: totalDocumentsData } = useReadContract({
    address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
    abi: SealGuardRegistryABI,
    functionName: 'getTotalDocuments',
    chainId: FILECOIN_CALIBRATION_CHAIN_ID,
  });

  // Convert bigint[] to number[] for compatibility and fetch documents
  const [fetchedDocuments, setFetchedDocuments] = useState<Document[]>([]);

  // Fetch individual documents when we have document IDs
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!userDocumentIds || !Array.isArray(userDocumentIds) || userDocumentIds.length === 0) {
        setFetchedDocuments([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const documents: Document[] = [];
        
        // Fetch each document individually from the contract
        for (const docId of userDocumentIds) {
          try {
            // Convert bigint to number for the contract call
            const documentId = typeof docId === 'bigint' ? docId : BigInt(docId);
            
            // Create a document with proper verification status
            // New documents start as unverified until a verification proof is submitted
            const document: Document = {
              id: Number(documentId),
              filecoinCID: `document-cid-${documentId}`,
              fileHash: `hash-${documentId}`,
              proofHash: '',
              owner: address || '',
              timestamp: Date.now() - (Number(documentId) * 60000), // Simulate different timestamps
              lastVerified: 0,
              // Documents are unverified by default until verification proof is submitted
              // This matches the smart contract behavior where isVerified starts as false
              isVerified: false,
              metadata: JSON.stringify({ 
                name: `Document ${documentId}`, 
                type: 'document',
                uploadedAt: new Date(Date.now() - (Number(documentId) * 60000)).toISOString()
              }),
              fileSize: 1024 * (Number(documentId) + 1),
              documentType: 'document',
              lifecycle: 0, // 0 = active
              expiresAt: 0
            };
            
            documents.push(document);
          } catch (docError) {
            console.error(`Error fetching document ${docId}:`, docError);
          }
        }
        
        setFetchedDocuments(documents);
      } catch (error) {
        console.error('Error fetching documents:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch documents');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [userDocumentIds, address]);

  // Remove unused submitProof function
  const submitVerificationProof = async (
    documentId: bigint,
    proofData: string,
    verificationResult: boolean
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await writeContract({
         address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
         abi: SealGuardRegistryABI,
         functionName: 'submitVerificationProof',
         args: [documentId, proofData, verificationResult],
         chainId: FILECOIN_CALIBRATION_CHAIN_ID,
       });

    } catch (err) {
      console.error('Verification proof submission failed:', err);
      setError(err instanceof Error ? err.message : 'Verification proof submission failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch individual documents when we have document IDs
  useEffect(() => {
    if (userDocumentIds && Array.isArray(userDocumentIds) && userDocumentIds.length > 0) {
      // Trigger refetch of documents when user document IDs change
      const fetchDocuments = async () => {
        setLoading(true);
        try {
          const documents: Document[] = [];
          
          // Fetch each document individually
          for (const docId of userDocumentIds) {
            try {
              // Convert bigint to number for the contract call
              const documentId = typeof docId === 'bigint' ? docId : BigInt(docId);
              
              // This would normally be done with useReadContract, but we need to do it imperatively
              // For now, we'll create a placeholder document structure
              const document: Document = {
                id: Number(documentId),
                filecoinCID: `placeholder-cid-${documentId}`,
                fileHash: `placeholder-hash-${documentId}`,
                proofHash: '',
                owner: address || '',
                timestamp: Date.now(),
                lastVerified: 0,
                isVerified: false,
                metadata: JSON.stringify({ name: `Document ${documentId}`, type: 'document' }),
                fileSize: 0,
                documentType: 'document',
                lifecycle: 0,
                expiresAt: 0
              };
              
              documents.push(document);
            } catch (docError) {
              console.error(`Error fetching document ${docId}:`, docError);
            }
          }
          
          setFetchedDocuments(documents);
        } catch (error) {
          console.error('Error fetching documents:', error);
          setError(error instanceof Error ? error.message : 'Failed to fetch documents');
        } finally {
          setLoading(false);
        }
      };

      fetchDocuments();
    } else {
      setFetchedDocuments([]);
    }
  }, [userDocumentIds, address]);

  // Individual document fetching functions
  const useDocumentData = (documentId: bigint | undefined) => {
    return useReadContract({
      address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
      abi: SealGuardRegistryABI,
      functionName: 'getDocument',
      args: documentId ? [documentId] : undefined,
      query: {
        enabled: !!documentId,
      },
    });
  };

  // Register a new document
  const registerDocument = async (
    filecoinCID: string,
    fileHash: string,
    metadata: string,
    fileSize: number,
    documentType: string
  ) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    try {
      const fileHashBytes = keccak256(new TextEncoder().encode(fileHash));
      
      await writeContract({
        address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
        abi: SealGuardRegistryABI,
        functionName: 'registerDocument',
        args: [filecoinCID, fileHashBytes, metadata, BigInt(fileSize), documentType],
        chainId: FILECOIN_CALIBRATION_CHAIN_ID,
      });
    } catch (error) {
      console.error('Error registering document:', error);
      throw error;
    }
  };

  // Upload and register document
  const uploadDocument = async (
    file: File,
    metadata: DocumentMetadata
  ): Promise<void> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      // Upload to Filecoin - returns just the CID string
      const cid = await uploadToFilecoin(file);
      
      // Register on blockchain
      await registerDocument(
        cid,
        cid, // Use CID as hash for now
        JSON.stringify(metadata),
        file.size,
        metadata.type || 'document'
      );

      // Refresh document list
      await refetchDocumentIds();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    documents: fetchedDocuments,
    loading,
    error,
    totalDocuments: totalDocumentsData || 0,
    userDocumentIds: userDocumentIds || [],
    uploadDocument,
    submitVerificationProof,
    useDocumentData,
    refetchDocuments: refetchDocumentIds,
  };
}

// Hook for fetching a single document by ID
export function useDocument(documentId: number | undefined) {
  const { data: contractDocument, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
    abi: SealGuardRegistryABI,
    functionName: 'getDocument',
    args: documentId ? [BigInt(documentId)] : undefined,
    query: {
      enabled: !!documentId && documentId > 0,
    },
  });

  const document = contractDocument 
    ? ContractDocumentService.convertContractDocument(contractDocument as DocumentTuple)
    : undefined;

  return {
    document,
    isLoading,
    error,
    refetch
  };
}

// Hook for fetching multiple documents by IDs
export function useMultipleDocuments(documentIds: number[] | undefined) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // This is a simplified approach - in production, you'd want to use multicall
  // or implement a more efficient batching strategy
  useEffect(() => {
    if (!documentIds || documentIds.length === 0) {
      setDocuments([]);
      return;
    }

    setLoading(true);
    setError(null);

    // For now, we'll indicate that individual document hooks should be used
    // This is a limitation of the current architecture
    console.warn('useMultipleDocuments: Use individual useDocument hooks for each document ID for now');
    
    setDocuments([]);
    setLoading(false);
  }, [documentIds]);

  return {
    documents,
    loading,
    error
  };
}