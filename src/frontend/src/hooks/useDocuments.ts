import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESSES, SealGuardRegistryABI, FILECOIN_CALIBRATION_CHAIN_ID } from '../lib/contracts';
import { uploadToFilecoin } from '../lib/filecoin';
import { keccak256 } from 'viem';

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
  tags?: string[];
  originalFileName: string;
  mimeType: string;
  uploadedAt: string;
}

export interface UploadProgress {
  stage: 'preparing' | 'uploading' | 'registering' | 'completed' | 'error';
  progress: number;
  message: string;
}

export function useDocuments() {
  const { address, isConnected } = useAccount();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending: isWritePending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Get user's document IDs
  const { data: userDocumentIds, refetch: refetchDocumentIds } = useReadContract({
    address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
    abi: SealGuardRegistryABI,
    functionName: 'getUserDocuments',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Get total documents count for stats
  const { data: totalDocuments } = useReadContract({
    address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
    abi: SealGuardRegistryABI,
    functionName: 'getTotalDocuments',
  });

  // Fetch document details for each document ID
  useEffect(() => {
    if (userDocumentIds && Array.isArray(userDocumentIds) && userDocumentIds.length > 0) {
      fetchDocumentDetails(userDocumentIds as bigint[]);
    } else {
      setDocuments([]);
    }
  }, [userDocumentIds]);

  const fetchDocumentDetails = async (documentIds: bigint[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const documentPromises = documentIds.map(async (id) => {
        try {
          const response = await fetch(`/api/contract/getDocument?documentId=${id.toString()}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch document ${id}: ${response.statusText}`);
          }
          return response.json();
        } catch (err) {
          console.error(`Error fetching document ${id}:`, err);
          // Return a placeholder document with error state
          return {
            id: Number(id),
            filecoinCID: '',
            fileHash: '',
            proofHash: '',
            owner: address || '',
            timestamp: 0,
            lastVerified: 0,
            isVerified: false,
            metadata: JSON.stringify({ name: 'Failed to load', error: true }),
            fileSize: 0,
            documentType: 'unknown',
            lifecycle: 0,
            expiresAt: 0,
          };
        }
      });

      const documentsData = await Promise.all(documentPromises);
      const processedDocuments = documentsData.map((doc: any, index: number) => ({
        id: doc.id || Number(documentIds[index]),
        filecoinCID: doc.filecoinCID || '',
        fileHash: doc.fileHash || '',
        proofHash: doc.proofHash || '',
        owner: doc.owner || address || '',
        timestamp: Number(doc.timestamp) || 0,
        lastVerified: Number(doc.lastVerified) || 0,
        isVerified: Boolean(doc.isVerified),
        metadata: doc.metadata || '{}',
        fileSize: Number(doc.fileSize) || 0,
        documentType: doc.documentType || 'unknown',
        lifecycle: doc.lifecycle || 0,
        expiresAt: Number(doc.expiresAt) || 0,
      }));

      setDocuments(processedDocuments);
    } catch (err) {
      console.error('Error fetching document details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch document details');
      setDocuments([]); // Clear documents on error
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (
    file: File,
    documentType: string,
    description?: string,
    tags?: string[]
  ) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }

    // Validate file
    if (!file) {
      throw new Error('No file selected');
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      throw new Error('File size exceeds 100MB limit');
    }

    setError(null);
    setUploadProgress({
      stage: 'preparing',
      progress: 10,
      message: 'Preparing file for upload...',
    });

    try {
      // Calculate file hash
      setUploadProgress({
        stage: 'preparing',
        progress: 20,
        message: 'Calculating file hash...',
      });

      const fileBuffer = await file.arrayBuffer();
      const fileHash = keccak256(new Uint8Array(fileBuffer));

      setUploadProgress({
        stage: 'uploading',
        progress: 30,
        message: 'Uploading to Filecoin network...',
      });

      // Upload to Filecoin/IPFS with timeout
      let filecoinCID: string;
      try {
        const uploadPromise = uploadToFilecoin(file);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout after 5 minutes')), 5 * 60 * 1000)
        );
        filecoinCID = await Promise.race([uploadPromise, timeoutPromise]);
      } catch (uploadError) {
        throw new Error(`Failed to upload to Filecoin: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
      }

      setUploadProgress({
        stage: 'registering',
        progress: 70,
        message: 'Registering document on blockchain...',
      });

      // Prepare metadata
      const metadata: DocumentMetadata = {
        name: file.name,
        description,
        tags,
        originalFileName: file.name,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
      };

      // Register document on smart contract with error handling
      try {
        writeContract({
          address: CONTRACT_ADDRESSES[FILECOIN_CALIBRATION_CHAIN_ID].SealGuardRegistry,
          abi: SealGuardRegistryABI,
          functionName: 'registerDocument',
          args: [
            filecoinCID,
            fileHash,
            JSON.stringify(metadata),
            BigInt(file.size),
            documentType,
          ],
        });

        setUploadProgress({
          stage: 'completed',
          progress: 100,
          message: 'Document uploaded and registered successfully!',
        });

        // Refresh document list
        setTimeout(() => {
          refetchDocumentIds();
          setUploadProgress(null);
        }, 2000);

      } catch (contractError) {
        throw new Error(`Failed to register document on blockchain: ${contractError instanceof Error ? contractError.message : 'Transaction failed'}`);
      }

    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      setUploadProgress({
        stage: 'error',
        progress: 0,
        message: errorMessage,
      });
      
      // Clear error progress after 5 seconds
      setTimeout(() => {
        setUploadProgress(null);
      }, 5000);
      
      throw err; // Re-throw for component handling
    }
  };

  const getDocumentStats = () => {
    const verified = documents.filter(doc => doc.isVerified).length;
    const pending = documents.filter(doc => doc.lifecycle === 0 || doc.lifecycle === 1).length;
    const total = documents.length;

    return {
      total,
      verified,
      pending,
      successRate: total > 0 ? Math.round((verified / total) * 100) : 0,
    };
  };

  const getDocumentByHash = (hash: string) => {
    return documents.find(doc => doc.fileHash === hash);
  };

  const getDocumentsByType = (type: string) => {
    return documents.filter(doc => doc.documentType === type);
  };

  return {
    documents,
    loading: loading || isWritePending || isConfirming,
    uploadProgress,
    error,
    uploadDocument,
    getDocumentStats,
    getDocumentByHash,
    getDocumentsByType,
    refetchDocuments: refetchDocumentIds,
    totalDocuments: totalDocuments ? Number(totalDocuments) : 0,
    isTransactionConfirmed: isConfirmed,
  };
}