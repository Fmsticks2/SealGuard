import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3Auth } from './useWeb3Auth';

// Contract ABIs (simplified for this example)
const REGISTRY_ABI = [
  'function registerDocument(string filecoinCid, string metadata) returns (uint256)',
  'function verifyDocument(uint256 documentId, string proof) returns (bool)',
  'function getDocument(uint256 documentId) view returns (tuple(uint256 id, address owner, string filecoinCid, string metadata, uint256 timestamp, bool isActive))',
  'function getUserDocuments(address user) view returns (uint256[])',
  'function transferOwnership(uint256 documentId, address newOwner)',
  'event DocumentRegistered(uint256 indexed documentId, address indexed owner, string filecoinCid)'
];

const ACCESS_CONTROL_ABI = [
  'function grantAccess(uint256 documentId, address user, uint8 permission)',
  'function revokeAccess(uint256 documentId, address user)',
  'function checkAccess(uint256 documentId, address user) view returns (tuple(bool hasAccess, uint8 permission))'
];

// Contract addresses (should be from environment variables)
const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_CONTRACT || '0x0000000000000000000000000000000000000000';
const ACCESS_CONTROL_ADDRESS = process.env.NEXT_PUBLIC_ACCESS_CONTROL_CONTRACT || '0x0000000000000000000000000000000000000000';

interface DocumentInfo {
  id: string;
  owner: string;
  filecoinCid: string;
  metadata: string;
  timestamp: number;
  isActive: boolean;
}

interface AccessPermission {
  hasAccess: boolean;
  permission: number;
}

interface UseContractReturn {
  // State
  isLoading: boolean;
  error: string | null;
  
  // Document operations
  registerDocument: (filecoinCid: string, metadata: string) => Promise<string | null>;
  verifyDocument: (documentId: string, proof: string) => Promise<boolean>;
  getDocument: (documentId: string) => Promise<DocumentInfo | null>;
  getUserDocuments: (userAddress?: string) => Promise<DocumentInfo[]>;
  transferOwnership: (documentId: string, newOwner: string) => Promise<boolean>;
  
  // Access control
  grantAccess: (documentId: string, user: string, permission: number) => Promise<boolean>;
  revokeAccess: (documentId: string, user: string) => Promise<boolean>;
  checkAccess: (documentId: string, user: string) => Promise<AccessPermission | null>;
  
  // Utilities
  clearError: () => void;
}

export const useContract = (): UseContractReturn => {
  const { signer, isAuthenticated, user } = useWeb3Auth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRegistryContract = useCallback(() => {
    if (!signer) throw new Error('No signer available');
    return new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
  }, [signer]);

  const getAccessControlContract = useCallback(() => {
    if (!signer) throw new Error('No signer available');
    return new ethers.Contract(ACCESS_CONTROL_ADDRESS, ACCESS_CONTROL_ABI, signer);
  }, [signer]);

  const registerDocument = useCallback(async (filecoinCid: string, metadata: string): Promise<string | null> => {
    if (!isAuthenticated) {
      setError('Please connect your wallet first');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contract = getRegistryContract();
      const tx = await contract.registerDocument(filecoinCid, metadata);
      const receipt = await tx.wait();
      
      // Extract document ID from event logs
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'DocumentRegistered';
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = contract.interface.parseLog(event);
        return parsed?.args.documentId.toString();
      }
      
      return null;
    } catch (error: any) {
      console.error('Failed to register document:', error);
      setError(error.message || 'Failed to register document');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getRegistryContract]);

  const verifyDocument = useCallback(async (documentId: string, proof: string): Promise<boolean> => {
    if (!isAuthenticated) {
      setError('Please connect your wallet first');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contract = getRegistryContract();
      const isValid = await contract.verifyDocument(documentId, proof);
      return isValid;
    } catch (error: any) {
      console.error('Failed to verify document:', error);
      setError(error.message || 'Failed to verify document');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getRegistryContract]);

  const getDocument = useCallback(async (documentId: string): Promise<DocumentInfo | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const contract = getRegistryContract();
      const result = await contract.getDocument(documentId);
      
      return {
        id: result.id.toString(),
        owner: result.owner,
        filecoinCid: result.filecoinCid,
        metadata: result.metadata,
        timestamp: Number(result.timestamp),
        isActive: result.isActive
      };
    } catch (error: any) {
      console.error('Failed to get document:', error);
      setError(error.message || 'Failed to get document');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getRegistryContract]);

  const getUserDocuments = useCallback(async (userAddress?: string): Promise<DocumentInfo[]> => {
    const address = userAddress || user?.address;
    if (!address) {
      setError('No user address provided');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const contract = getRegistryContract();
      const documentIds = await contract.getUserDocuments(address);
      
      const documents: DocumentInfo[] = [];
      for (const id of documentIds) {
        try {
          const doc = await getDocument(id.toString());
          if (doc) documents.push(doc);
        } catch (error) {
          console.error(`Failed to get document ${id}:`, error);
        }
      }
      
      return documents;
    } catch (error: any) {
      console.error('Failed to get user documents:', error);
      setError(error.message || 'Failed to get user documents');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user, getRegistryContract, getDocument]);

  const transferOwnership = useCallback(async (documentId: string, newOwner: string): Promise<boolean> => {
    if (!isAuthenticated) {
      setError('Please connect your wallet first');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contract = getRegistryContract();
      const tx = await contract.transferOwnership(documentId, newOwner);
      await tx.wait();
      return true;
    } catch (error: any) {
      console.error('Failed to transfer ownership:', error);
      setError(error.message || 'Failed to transfer ownership');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getRegistryContract]);

  const grantAccess = useCallback(async (documentId: string, user: string, permission: number): Promise<boolean> => {
    if (!isAuthenticated) {
      setError('Please connect your wallet first');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contract = getAccessControlContract();
      const tx = await contract.grantAccess(documentId, user, permission);
      await tx.wait();
      return true;
    } catch (error: any) {
      console.error('Failed to grant access:', error);
      setError(error.message || 'Failed to grant access');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getAccessControlContract]);

  const revokeAccess = useCallback(async (documentId: string, user: string): Promise<boolean> => {
    if (!isAuthenticated) {
      setError('Please connect your wallet first');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contract = getAccessControlContract();
      const tx = await contract.revokeAccess(documentId, user);
      await tx.wait();
      return true;
    } catch (error: any) {
      console.error('Failed to revoke access:', error);
      setError(error.message || 'Failed to revoke access');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getAccessControlContract]);

  const checkAccess = useCallback(async (documentId: string, user: string): Promise<AccessPermission | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const contract = getAccessControlContract();
      const result = await contract.checkAccess(documentId, user);
      
      return {
        hasAccess: result.hasAccess,
        permission: Number(result.permission)
      };
    } catch (error: any) {
      console.error('Failed to check access:', error);
      setError(error.message || 'Failed to check access');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getAccessControlContract]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    
    // Document operations
    registerDocument,
    verifyDocument,
    getDocument,
    getUserDocuments,
    transferOwnership,
    
    // Access control
    grantAccess,
    revokeAccess,
    checkAccess,
    
    // Utilities
    clearError
  };
};

export default useContract;