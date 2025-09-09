import { SynapseSDK } from '@filoz/synapse-sdk';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

interface StorageResult {
  cid: string;
  dealId: string;
  storageProvider: string;
  cost: number;
}

interface RetrievalResult {
  data: Buffer;
  verified: boolean;
}

class SynapseService {
  private sdk: SynapseSDK;
  private initialized: boolean = false;

  constructor() {
    this.initializeSDK();
  }

  private async initializeSDK(): Promise<void> {
    try {
      this.sdk = new SynapseSDK({
        apiKey: process.env.SYNAPSE_API_KEY!,
        network: process.env.FILECOIN_NETWORK || 'calibration',
        apiUrl: process.env.SYNAPSE_API_URL || 'https://api.synapse.filoz.com',
      });

      await this.sdk.initialize();
      this.initialized = true;
      console.log('✅ Synapse SDK initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Synapse SDK:', error);
      throw error;
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Synapse SDK not initialized');
    }
  }

  /**
   * Store a file on Filecoin using Warm Storage
   */
  async storeFile(filePath: string, metadata?: any): Promise<StorageResult> {
    this.ensureInitialized();

    try {
      // Read file data
      const fileData = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);

      // Calculate file hash for integrity verification
      const fileHash = crypto.createHash('sha256').update(fileData).digest('hex');

      console.log(`📤 Storing file: ${fileName} (${fileData.length} bytes)`);

      // Store file using Synapse SDK
      const result = await this.sdk.storage.store({
        data: fileData,
        name: fileName,
        metadata: {
          ...metadata,
          fileHash,
          timestamp: new Date().toISOString(),
        },
        storageOptions: {
          redundancy: 3, // Store with 3 replicas
          duration: 525600, // 1 year in minutes
          verifyIntegrity: true,
        },
      });

      console.log(`✅ File stored successfully: CID ${result.cid}`);

      return {
        cid: result.cid,
        dealId: result.dealId,
        storageProvider: result.storageProvider,
        cost: result.cost,
      };
    } catch (error) {
      console.error('❌ Failed to store file:', error);
      throw new Error(`Storage failed: ${error.message}`);
    }
  }

  /**
   * Retrieve a file from Filecoin storage
   */
  async retrieveFile(cid: string): Promise<RetrievalResult> {
    this.ensureInitialized();

    try {
      console.log(`📥 Retrieving file with CID: ${cid}`);

      const result = await this.sdk.storage.retrieve({
        cid,
        verifyIntegrity: true,
      });

      console.log(`✅ File retrieved successfully: ${result.data.length} bytes`);

      return {
        data: result.data,
        verified: result.verified,
      };
    } catch (error) {
      console.error('❌ Failed to retrieve file:', error);
      throw new Error(`Retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get storage status for a CID
   */
  async getStorageStatus(cid: string): Promise<any> {
    this.ensureInitialized();

    try {
      const status = await this.sdk.storage.getStatus(cid);
      return status;
    } catch (error) {
      console.error('❌ Failed to get storage status:', error);
      throw new Error(`Status check failed: ${error.message}`);
    }
  }

  /**
   * Generate Proof of Data Possession (PDP)
   */
  async generatePDPProof(cid: string): Promise<string> {
    this.ensureInitialized();

    try {
      console.log(`🔐 Generating PDP proof for CID: ${cid}`);

      const proof = await this.sdk.verification.generatePDPProof({
        cid,
        challengeCount: 10, // Number of random challenges
      });

      console.log(`✅ PDP proof generated successfully`);
      return proof.proofHash;
    } catch (error) {
      console.error('❌ Failed to generate PDP proof:', error);
      throw new Error(`PDP proof generation failed: ${error.message}`);
    }
  }

  /**
   * Verify PDP proof
   */
  async verifyPDPProof(cid: string, proofHash: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      console.log(`🔍 Verifying PDP proof for CID: ${cid}`);

      const result = await this.sdk.verification.verifyPDPProof({
        cid,
        proofHash,
      });

      console.log(`✅ PDP proof verification result: ${result.valid}`);
      return result.valid;
    } catch (error) {
      console.error('❌ Failed to verify PDP proof:', error);
      throw new Error(`PDP proof verification failed: ${error.message}`);
    }
  }

  /**
   * Get storage deals for a CID
   */
  async getStorageDeals(cid: string): Promise<any[]> {
    this.ensureInitialized();

    try {
      const deals = await this.sdk.storage.getDeals(cid);
      return deals;
    } catch (error) {
      console.error('❌ Failed to get storage deals:', error);
      throw new Error(`Get deals failed: ${error.message}`);
    }
  }

  /**
   * Calculate storage cost estimate
   */
  async estimateStorageCost(fileSize: number, duration: number = 525600): Promise<number> {
    this.ensureInitialized();

    try {
      const estimate = await this.sdk.storage.estimateCost({
        size: fileSize,
        duration, // in minutes
        redundancy: 3,
      });

      return estimate.totalCost;
    } catch (error) {
      console.error('❌ Failed to estimate storage cost:', error);
      throw new Error(`Cost estimation failed: ${error.message}`);
    }
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(): Promise<any> {
    this.ensureInitialized();

    try {
      const stats = await this.sdk.network.getStats();
      return stats;
    } catch (error) {
      console.error('❌ Failed to get network stats:', error);
      throw new Error(`Network stats failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export const synapseService = new SynapseService();
export default synapseService;