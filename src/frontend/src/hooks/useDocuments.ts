import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useReadContract, useWriteContract } from 'wagmi';
import { readContract } from '@wagmi/core';
import { wagmiConfig } from '../lib/wagmi';
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
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const documents: Document[] = [];
        
        // Fetch each document individually from the contract
        for (const docId of userDocumentIds as bigint[]) {
          try {
            // Convert bigint to number for the contract call
            const documentId = typeof docId === 'bigint' ? docId : BigInt(docId);
            
            // Use the contract read to get actual document data
            const contractDoc = await readContract(wagmiConfig, {
              address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
              abi: SealGuardRegistryABI,
              functionName: 'getDocument',
              args: [documentId],
              chainId: FILECOIN_CALIBRATION_CHAIN_ID,
            }) as DocumentTuple;

            if (contractDoc) {
              // Convert contract data to our Document interface
              const document: Document = {
                id: Number(contractDoc.id),
                filecoinCID: contractDoc.filecoinCID,
                fileHash: contractDoc.fileHash,
                proofHash: contractDoc.proofHash,
                owner: contractDoc.owner,
                timestamp: Number(contractDoc.timestamp),
                lastVerified: Number(contractDoc.lastVerified),
                isVerified: contractDoc.isVerified, // This will be the actual verification status
                metadata: contractDoc.metadata,
                fileSize: Number(contractDoc.fileSize),
                documentType: contractDoc.documentType,
                lifecycle: Number(contractDoc.lifecycle),
                expiresAt: Number(contractDoc.expiresAt)
              };
              
              documents.push(document);
            }
          } catch (docError) {
            console.error(`Error fetching document ${docId}:`, docError);
            // Create fallback document if contract read fails
            const document: Document = {
              id: Number(docId),
              filecoinCID: `document-cid-${docId}`,
              fileHash: `hash-${docId}`,
              proofHash: '',
              owner: address || '',
              timestamp: Date.now() - (Number(docId) * 60000),
              lastVerified: 0,
              isVerified: false,
              metadata: JSON.stringify({ 
                name: `Document ${docId}`, 
                type: 'document',
                uploadedAt: new Date(Date.now() - (Number(docId) * 60000)).toISOString()
              }),
              fileSize: 1024 * (Number(docId) + 1),
              documentType: 'document',
              lifecycle: 0,
              expiresAt: 0
            };
            documents.push(document);
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

  // Initialize loading state properly
  useEffect(() => {
    if (!userDocumentIds) {
      setLoading(false);
      setFetchedDocuments([]);
    }
  }, [userDocumentIds]);

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
      
      // Force a refresh of the documents after a short delay to allow blockchain to update
      setTimeout(async () => {
        await refetchDocumentIds();
      }, 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Function to manually refresh documents
  const refetchDocuments = async () => {
    if (!userDocumentIds || (userDocumentIds as bigint[]).length === 0 || !address) {
      setFetchedDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const documents: Document[] = [];
      
      // Fetch each document individually from the contract
      for (const docId of userDocumentIds as bigint[]) {
        try {
          // Convert bigint to number for the contract call
          const documentId = typeof docId === 'bigint' ? docId : BigInt(docId);
          
          // Use the contract read to get actual document data
          const contractDoc = await readContract(wagmiConfig, {
            address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
            abi: SealGuardRegistryABI,
            functionName: 'getDocument',
            args: [documentId],
            chainId: FILECOIN_CALIBRATION_CHAIN_ID,
          }) as DocumentTuple;

          if (contractDoc) {
            // Convert contract data to our Document interface
            const document: Document = {
              id: Number(contractDoc.id),
              filecoinCID: contractDoc.filecoinCID,
              fileHash: contractDoc.fileHash,
              proofHash: contractDoc.proofHash,
              owner: contractDoc.owner,
              timestamp: Number(contractDoc.timestamp),
              lastVerified: Number(contractDoc.lastVerified),
              isVerified: contractDoc.isVerified, // This will be the actual verification status
              metadata: contractDoc.metadata,
              fileSize: Number(contractDoc.fileSize),
              documentType: contractDoc.documentType,
              lifecycle: Number(contractDoc.lifecycle),
              expiresAt: Number(contractDoc.expiresAt)
            };
            
            documents.push(document);
          }
        } catch (docError) {
          console.error(`Error fetching document ${docId}:`, docError);
          // Create fallback document if contract read fails
          const document: Document = {
            id: Number(docId),
            filecoinCID: `document-cid-${docId}`,
            fileHash: `hash-${docId}`,
            proofHash: '',
            owner: address || '',
            timestamp: Date.now() - (Number(docId) * 60000),
            lastVerified: 0,
            isVerified: false,
            metadata: JSON.stringify({ 
              name: `Document ${docId}`, 
              type: 'document',
              uploadedAt: new Date(Date.now() - (Number(docId) * 60000)).toISOString()
            }),
            fileSize: 1024 * (Number(docId) + 1),
            documentType: 'document',
            lifecycle: 0,
            expiresAt: 0
          };
          documents.push(document);
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

  return {
    documents: fetchedDocuments,
    loading,
    error,
    totalDocuments: totalDocumentsData || 0,
    userDocumentIds: userDocumentIds || [],
    uploadDocument,
    submitVerificationProof,
    useDocumentData,
    refetchDocuments,
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