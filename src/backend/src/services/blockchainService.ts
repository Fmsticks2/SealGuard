import { ethers } from 'ethers';
import { logger } from '../utils/logger';
// VerificationStatus enum values: 'PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'
import fs from 'fs';
import path from 'path';

// Contract ABIs (simplified for key functions)
const SEALGUARD_REGISTRY_ABI = [
  'function verifyDocument(string memory ipfsHash, bytes32 documentHash) external returns (uint256)',
  'function getVerificationRecord(uint256 verificationId) external view returns (tuple(string ipfsHash, bytes32 documentHash, address verifier, uint256 timestamp, bool isValid))',
  'function isDocumentVerified(string memory ipfsHash) external view returns (bool)',
  'function getDocumentVerifications(string memory ipfsHash) external view returns (uint256[])',
  'event DocumentVerified(uint256 indexed verificationId, string indexed ipfsHash, bytes32 documentHash, address indexed verifier, uint256 timestamp)'
];

const SEALGUARD_ACCESS_CONTROL_ABI = [
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function grantRole(bytes32 role, address account) external',
  'function revokeRole(bytes32 role, address account) external',
  'function VERIFIER_ROLE() external view returns (bytes32)',
  'function ADMIN_ROLE() external view returns (bytes32)'
];

export interface ContractAddresses {
  registry: string;
  accessControl: string;
}

export interface VerificationResult {
  success: boolean;
  transactionHash?: string;
  verificationId?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
}

export interface OnChainVerification {
  verificationId: string;
  ipfsHash: string;
  documentHash: string;
  verifier: string;
  timestamp: number;
  isValid: boolean;
}

class BlockchainService {
  private provider!: ethers.JsonRpcProvider;
  private registryContract: any;
  private accessControlContract: any;
  private contractAddresses: ContractAddresses = { registry: '', accessControl: '' };
  private adminWallet?: ethers.Wallet;

  constructor() {
    this.initializeProvider();
    this.loadContractAddresses();
    this.initializeContracts();
    this.initializeAdminWallet();
  }

  private initializeProvider(): void {
    const rpcUrl = process.env.FILECOIN_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    logger.info('Blockchain provider initialized');
  }

  private loadContractAddresses(): void {
    try {
      const deploymentPath = path.join(process.cwd(), '../../contracts/deployments/filecoinCalibration.json');
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      
      this.contractAddresses = {
        registry: deployment.contracts.SealGuardRegistry.address,
        accessControl: deployment.contracts.SealGuardAccessControl.address,
      };
      
      logger.info('Contract addresses loaded:', this.contractAddresses);
    } catch (error) {
      logger.error('Failed to load contract addresses:', error);
      throw new Error('Contract deployment file not found or invalid');
    }
  }

  private initializeContracts(): void {
    this.registryContract = new ethers.Contract(
      this.contractAddresses.registry,
      SEALGUARD_REGISTRY_ABI,
      this.provider
    );

    this.accessControlContract = new ethers.Contract(
      this.contractAddresses.accessControl,
      SEALGUARD_ACCESS_CONTROL_ABI,
      this.provider
    );

    logger.info('Smart contracts initialized');
  }

  private initializeAdminWallet(): void {
    const privateKey = process.env.ADMIN_PRIVATE_KEY;
    if (privateKey) {
      this.adminWallet = new ethers.Wallet(privateKey, this.provider);
      logger.info('Admin wallet initialized');
    } else {
      logger.warn('Admin private key not provided. Some functions will be limited.');
    }
  }

  /**
   * Calculate document hash from IPFS hash
   */
  calculateDocumentHash(ipfsHash: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(ipfsHash));
  }

  /**
   * Verify a document on the blockchain
   */
  async verifyDocument(ipfsHash: string, verifierPrivateKey?: string): Promise<VerificationResult> {
    try {
      const wallet = verifierPrivateKey 
        ? new ethers.Wallet(verifierPrivateKey, this.provider)
        : this.adminWallet;

      if (!wallet) {
        return {
          success: false,
          error: 'No wallet available for verification'
        };
      }

      const documentHash = this.calculateDocumentHash(ipfsHash);
      const contractWithSigner = this.registryContract.connect(wallet);

      // Estimate gas
      const gasEstimate = await (contractWithSigner as any).verifyDocument.estimateGas(ipfsHash, documentHash);
      const gasLimit = gasEstimate * 120n / 100n; // Add 20% buffer

      // Send transaction
      const tx = await (contractWithSigner as any).verifyDocument(ipfsHash, documentHash, {
        gasLimit,
      });

      logger.info(`Verification transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (!receipt) {
        return {
          success: false,
          error: 'Transaction receipt not available'
        };
      }

      // Parse logs to get verification ID
      let verificationId: string | undefined;
      for (const log of receipt.logs) {
        try {
          const parsed = this.registryContract.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          
          if (parsed && parsed.name === 'DocumentVerified') {
            verificationId = parsed.args.verificationId.toString();
            break;
          }
        } catch (e) {
          // Skip unparseable logs
        }
      }

      return {
        success: true,
        transactionHash: receipt.hash,
        verificationId: verificationId,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      } as VerificationResult;
    } catch (error: any) {
      logger.error('Document verification failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown blockchain error'
      };
    }
  }

  /**
   * Check if a document is verified on-chain
   */
  async isDocumentVerified(ipfsHash: string): Promise<boolean> {
    try {
      return await this.registryContract.isDocumentVerified(ipfsHash);
    } catch (error) {
      logger.error('Check document verification failed:', error);
      return false;
    }
  }

  /**
   * Get verification record from blockchain
   */
  async getVerificationRecord(verificationId: string): Promise<OnChainVerification | null> {
    try {
      const record = await this.registryContract.getVerificationRecord(verificationId);
      
      return {
        verificationId,
        ipfsHash: record.ipfsHash,
        documentHash: record.documentHash,
        verifier: record.verifier,
        timestamp: Number(record.timestamp),
        isValid: record.isValid,
      };
    } catch (error) {
      logger.error('Get verification record failed:', error);
      return null;
    }
  }

  /**
   * Get all verification IDs for a document
   */
  async getDocumentVerifications(ipfsHash: string): Promise<string[]> {
    try {
      const verificationIds = await this.registryContract.getDocumentVerifications(ipfsHash);
      return verificationIds.map((id: bigint) => id.toString());
    } catch (error) {
      logger.error('Get document verifications failed:', error);
      return [];
    }
  }

  /**
   * Check if address has verifier role
   */
  async hasVerifierRole(address: string): Promise<boolean> {
    try {
      const verifierRole = await this.accessControlContract.VERIFIER_ROLE();
      return await this.accessControlContract.hasRole(verifierRole, address);
    } catch (error) {
      logger.error('Check verifier role failed:', error);
      return false;
    }
  }

  /**
   * Grant verifier role to address (admin only)
   */
  async grantVerifierRole(address: string): Promise<boolean> {
    try {
      if (!this.adminWallet) {
        logger.error('Admin wallet not available');
        return false;
      }

      const verifierRole = await this.accessControlContract.VERIFIER_ROLE();
      const contractWithSigner = this.accessControlContract.connect(this.adminWallet);
      
      const tx = await (contractWithSigner as any).grantRole(verifierRole, address);
      await tx.wait();
      
      logger.info(`Verifier role granted to ${address}`);
      return true;
    } catch (error) {
      logger.error('Grant verifier role failed:', error);
      return false;
    }
  }

  /**
   * Process verification record and update database
   */
  async processVerificationResult(
    documentId: string,
    verificationResult: VerificationResult,
    _verifierId: string
  ): Promise<boolean> {
    try {
      if (verificationResult.success) {
        // Verification is now stored on-chain via smart contract
        // No database operations needed - all verification data is on blockchain
        logger.info(`Verification processed successfully for document ${documentId}`, {
          transactionHash: verificationResult.transactionHash,
          blockNumber: verificationResult.blockNumber,
          gasUsed: verificationResult.gasUsed
        });
        return true;
      } else {
        // Log failed verification - no database storage needed
        logger.warn(`Verification failed for document ${documentId}: ${verificationResult.error}`);
        return false;
      }
    } catch (error) {
      logger.error('Process verification result failed:', error);
      return false;
    }
  }

  /**
   * Get current gas price
   */
  async getCurrentGasPrice(): Promise<bigint> {
    try {
      const feeData = await this.provider.getFeeData();
      return feeData.gasPrice || 0n;
    } catch (error) {
      logger.error('Get gas price failed:', error);
      return 0n;
    }
  }

  /**
   * Get network information
   */
  async getNetworkInfo(): Promise<any> {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const gasPrice = await this.getCurrentGasPrice();
      
      return {
        chainId: network.chainId.toString(),
        name: network.name,
        blockNumber,
        gasPrice: gasPrice.toString(),
        contracts: this.contractAddresses,
      };
    } catch (error) {
      logger.error('Get network info failed:', error);
      return null;
    }
  }

  /**
   * Health check for blockchain connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.provider.getBlockNumber();
      return true;
    } catch (error) {
      logger.error('Blockchain health check failed:', error);
      return false;
    }
  }
}

export const blockchainService = new BlockchainService();
export default blockchainService;