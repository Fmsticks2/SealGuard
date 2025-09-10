import { Contract, BrowserProvider, JsonRpcSigner, formatEther, parseEther } from 'ethers';
import { web3AuthService } from './web3AuthService';

// Contract ABIs (simplified for key functions)
const REGISTRY_ABI = [
  'function registerDocument(string memory filecoinCID, bytes32 fileHash, string memory metadata, uint256 fileSize, string memory documentType) external returns (uint256)',
  'function submitVerificationProof(uint256 documentId, bytes32 proofHash, string memory proofData, bool isValid) external',
  'function transferDocumentOwnership(uint256 documentId, address newOwner) external',
  'function getDocument(uint256 documentId) external view returns (tuple(uint256 id, string filecoinCID, bytes32 fileHash, bytes32 proofHash, address owner, uint256 timestamp, uint256 lastVerified, bool isVerified, string metadata, uint256 fileSize, string documentType))',
  'function getUserDocuments(address user) external view returns (uint256[])',
  'function getDocumentProofs(uint256 documentId) external view returns (tuple(uint256 documentId, bytes32 proofHash, uint256 timestamp, address verifier, bool isValid, string proofData)[])',
  'function getTotalDocuments() external view returns (uint256)',
  'function documentExistsByHash(bytes32 fileHash) external view returns (bool)',
  'function getDocumentIdByHash(bytes32 fileHash) external view returns (uint256)',
  'event DocumentRegistered(uint256 indexed documentId, address indexed owner, string filecoinCID, bytes32 fileHash)',
  'event DocumentVerified(uint256 indexed documentId, address indexed verifier, bytes32 proofHash, bool isValid)',
  'event OwnershipTransferred(uint256 indexed documentId, address indexed previousOwner, address indexed newOwner)'
];

const ACCESS_CONTROL_ABI = [
  'function grantDocumentAccess(uint256 documentId, address grantee, uint256 expiresAt, bool canRead, bool canVerify, bool canTransfer) external',
  'function revokeDocumentAccess(uint256 documentId, address grantee) external',
  'function hasReadAccess(uint256 documentId, address user) external view returns (bool)',
  'function hasVerifyAccess(uint256 documentId, address user) external view returns (bool)',
  'function hasTransferAccess(uint256 documentId, address user) external view returns (bool)',
  'function joinOrganization(string memory organizationId, string memory role) external',
  'function leaveOrganization(string memory organizationId) external',
  'function getOrganizationMembers(string memory organizationId) external view returns (address[])',
  'function getUserOrganizations(address user) external view returns (string[])',
  'function getDocumentAccessList(uint256 documentId) external view returns (address[])',
  'function getAccessPermission(uint256 documentId, address user) external view returns (tuple(uint256 documentId, address grantee, address grantor, uint256 expiresAt, bool canRead, bool canVerify, bool canTransfer, uint256 grantedAt, bool isActive))',
  'event AccessGranted(uint256 indexed documentId, address indexed grantee, address indexed grantor, uint256 expiresAt)',
  'event AccessRevoked(uint256 indexed documentId, address indexed grantee, address indexed revoker)',
  'event OrganizationJoined(string indexed organizationId, address indexed member, string role)',
  'event OrganizationLeft(string indexed organizationId, address indexed member)'
];

// Contract addresses (will be loaded from deployment files)
interface ContractAddresses {
  registry: string;
  accessControl: string;
}

// Document interface
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
}

// Verification proof interface
export interface VerificationProof {
  documentId: number;
  proofHash: string;
  timestamp: number;
  verifier: string;
  isValid: boolean;
  proofData: string;
}

// Access permission interface
export interface AccessPermission {
  documentId: number;
  grantee: string;
  grantor: string;
  expiresAt: number;
  canRead: boolean;
  canVerify: boolean;
  canTransfer: boolean;
  grantedAt: number;
  isActive: boolean;
}

class ContractService {
  private registryContract: Contract | null = null;
  private accessControlContract: Contract | null = null;
  private contractAddresses: ContractAddresses | null = null;

  constructor() {
    this.loadContractAddresses();
  }

  private async loadContractAddresses() {
    try {
      // In production, this would load from a config file or environment
      // For now, we'll use placeholder addresses
      this.contractAddresses = {
        registry: process.env.REACT_APP_REGISTRY_CONTRACT || '0x0000000000000000000000000000000000000000',
        accessControl: process.env.REACT_APP_ACCESS_CONTROL_CONTRACT || '0x0000000000000000000000000000000000000000'
      };
      
      await this.initializeContracts();
    } catch (error) {
      console.error('Error loading contract addresses:', error);
    }
  }

  private async initializeContracts() {
    const provider = web3AuthService.getProvider();
    const signer = web3AuthService.getSigner();
    
    if (!provider || !this.contractAddresses) return;

    try {
      // Initialize contracts with provider (read-only)
      this.registryContract = new Contract(
        this.contractAddresses.registry,
        REGISTRY_ABI,
        provider
      );
      
      this.accessControlContract = new Contract(
        this.contractAddresses.accessControl,
        ACCESS_CONTROL_ABI,
        provider
      );

      // If signer is available, connect contracts for write operations
      if (signer) {
        this.registryContract = this.registryContract.connect(signer);
        this.accessControlContract = this.accessControlContract.connect(signer);
      }
    } catch (error) {
      console.error('Error initializing contracts:', error);
    }
  }

  async ensureContractsInitialized(): Promise<boolean> {
    if (!this.registryContract || !this.accessControlContract) {
      await this.initializeContracts();
    }
    return !!(this.registryContract && this.accessControlContract);
  }

  // Document Registry Functions
  async registerDocument(
    filecoinCID: string,
    fileHash: string,
    metadata: object,
    fileSize: number,
    documentType: string
  ): Promise<{ success: boolean; documentId?: number; transactionHash?: string; error?: string }> {
    try {
      if (!await this.ensureContractsInitialized()) {
        throw new Error('Contracts not initialized');
      }

      if (!web3AuthService.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      const metadataString = JSON.stringify(metadata);
      const fileHashBytes = `0x${fileHash}`;

      const tx = await this.registryContract!.registerDocument(
        filecoinCID,
        fileHashBytes,
        metadataString,
        fileSize,
        documentType
      );

      const receipt = await tx.wait();
      
      // Extract document ID from event logs
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.registryContract!.interface.parseLog(log);
          return parsed?.name === 'DocumentRegistered';
        } catch {
          return false;
        }
      });

      let documentId;
      if (event) {
        const parsed = this.registryContract!.interface.parseLog(event);
        documentId = Number(parsed?.args?.documentId);
      }

      return {
        success: true,
        documentId,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Error registering document:', error);
      return {
        success: false,
        error: error.message || 'Failed to register document'
      };
    }
  }

  async submitVerificationProof(
    documentId: number,
    proofHash: string,
    proofData: object,
    isValid: boolean
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!await this.ensureContractsInitialized()) {
        throw new Error('Contracts not initialized');
      }

      if (!web3AuthService.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      const proofDataString = JSON.stringify(proofData);
      const proofHashBytes = `0x${proofHash}`;

      const tx = await this.registryContract!.submitVerificationProof(
        documentId,
        proofHashBytes,
        proofDataString,
        isValid
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Error submitting verification proof:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit verification proof'
      };
    }
  }

  async transferDocumentOwnership(
    documentId: number,
    newOwner: string
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!await this.ensureContractsInitialized()) {
        throw new Error('Contracts not initialized');
      }

      if (!web3AuthService.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      const tx = await this.registryContract!.transferDocumentOwnership(
        documentId,
        newOwner
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Error transferring document ownership:', error);
      return {
        success: false,
        error: error.message || 'Failed to transfer document ownership'
      };
    }
  }

  async getDocument(documentId: number): Promise<Document | null> {
    try {
      if (!await this.ensureContractsInitialized()) {
        throw new Error('Contracts not initialized');
      }

      const result = await this.registryContract!.getDocument(documentId);
      
      return {
        id: Number(result.id),
        filecoinCID: result.filecoinCID,
        fileHash: result.fileHash,
        proofHash: result.proofHash,
        owner: result.owner,
        timestamp: Number(result.timestamp),
        lastVerified: Number(result.lastVerified),
        isVerified: result.isVerified,
        metadata: result.metadata,
        fileSize: Number(result.fileSize),
        documentType: result.documentType
      };
    } catch (error) {
      console.error('Error getting document:', error);
      return null;
    }
  }

  async getUserDocuments(userAddress?: string): Promise<number[]> {
    try {
      if (!await this.ensureContractsInitialized()) {
        throw new Error('Contracts not initialized');
      }

      const address = userAddress || web3AuthService.getCurrentUser()?.address;
      if (!address) {
        throw new Error('No user address provided');
      }

      const result = await this.registryContract!.getUserDocuments(address);
      return result.map((id: any) => Number(id));
    } catch (error) {
      console.error('Error getting user documents:', error);
      return [];
    }
  }

  async getDocumentProofs(documentId: number): Promise<VerificationProof[]> {
    try {
      if (!await this.ensureContractsInitialized()) {
        throw new Error('Contracts not initialized');
      }

      const result = await this.registryContract!.getDocumentProofs(documentId);
      
      return result.map((proof: any) => ({
        documentId: Number(proof.documentId),
        proofHash: proof.proofHash,
        timestamp: Number(proof.timestamp),
        verifier: proof.verifier,
        isValid: proof.isValid,
        proofData: proof.proofData
      }));
    } catch (error) {
      console.error('Error getting document proofs:', error);
      return [];
    }
  }

  async getTotalDocuments(): Promise<number> {
    try {
      if (!await this.ensureContractsInitialized()) {
        throw new Error('Contracts not initialized');
      }

      const result = await this.registryContract!.getTotalDocuments();
      return Number(result);
    } catch (error) {
      console.error('Error getting total documents:', error);
      return 0;
    }
  }

  async documentExistsByHash(fileHash: string): Promise<boolean> {
    try {
      if (!await this.ensureContractsInitialized()) {
        throw new Error('Contracts not initialized');
      }

      const fileHashBytes = `0x${fileHash}`;
      return await this.registryContract!.documentExistsByHash(fileHashBytes);
    } catch (error) {
      console.error('Error checking document existence:', error);
      return false;
    }
  }

  // Access Control Functions
  async grantDocumentAccess(
    documentId: number,
    grantee: string,
    expiresAt: number,
    permissions: { canRead: boolean; canVerify: boolean; canTransfer: boolean }
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!await this.ensureContractsInitialized()) {
        throw new Error('Contracts not initialized');
      }

      if (!web3AuthService.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      const tx = await this.accessControlContract!.grantDocumentAccess(
        documentId,
        grantee,
        expiresAt,
        permissions.canRead,
        permissions.canVerify,
        permissions.canTransfer
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Error granting document access:', error);
      return {
        success: false,
        error: error.message || 'Failed to grant document access'
      };
    }
  }

  async revokeDocumentAccess(
    documentId: number,
    grantee: string
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!await this.ensureContractsInitialized()) {
        throw new Error('Contracts not initialized');
      }

      if (!web3AuthService.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      const tx = await this.accessControlContract!.revokeDocumentAccess(
        documentId,
        grantee
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Error revoking document access:', error);
      return {
        success: false,
        error: error.message || 'Failed to revoke document access'
      };
    }
  }

  async hasReadAccess(documentId: number, userAddress?: string): Promise<boolean> {
    try {
      if (!await this.ensureContractsInitialized()) {
        throw new Error('Contracts not initialized');
      }

      const address = userAddress || web3AuthService.getCurrentUser()?.address;
      if (!address) return false;

      return await this.accessControlContract!.hasReadAccess(documentId, address);
    } catch (error) {
      console.error('Error checking read access:', error);
      return false;
    }
  }

  async hasVerifyAccess(documentId: number, userAddress?: string): Promise<boolean> {
    try {
      if (!await this.ensureContractsInitialized()) {
        throw new Error('Contracts not initialized');
      }

      const address = userAddress || web3AuthService.getCurrentUser()?.address;
      if (!address) return false;

      return await this.accessControlContract!.hasVerifyAccess(documentId, address);
    } catch (error) {
      console.error('Error checking verify access:', error);
      return false;
    }
  }

  async hasTransferAccess(documentId: number, userAddress?: string): Promise<boolean> {
    try {
      if (!await this.ensureContractsInitialized()) {
        throw new Error('Contracts not initialized');
      }

      const address = userAddress || web3AuthService.getCurrentUser()?.address;
      if (!address) return false;

      return await this.accessControlContract!.hasTransferAccess(documentId, address);
    } catch (error) {
      console.error('Error checking transfer access:', error);
      return false;
    }
  }

  // Utility functions
  getContractAddresses(): ContractAddresses | null {
    return this.contractAddresses;
  }

  async getTransactionReceipt(txHash: string) {
    const provider = web3AuthService.getProvider();
    if (!provider) return null;
    
    try {
      return await provider.getTransactionReceipt(txHash);
    } catch (error) {
      console.error('Error getting transaction receipt:', error);
      return null;
    }
  }

  async waitForTransaction(txHash: string, confirmations: number = 1) {
    const provider = web3AuthService.getProvider();
    if (!provider) return null;
    
    try {
      return await provider.waitForTransaction(txHash, confirmations);
    } catch (error) {
      console.error('Error waiting for transaction:', error);
      return null;
    }
  }
}

// Export singleton instance
export const contractService = new ContractService();
export default contractService;