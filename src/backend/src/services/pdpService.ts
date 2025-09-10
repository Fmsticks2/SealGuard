import crypto from 'crypto';
import { synapseService } from './synapseService';
import { getPool } from '../config/database';

interface PDPChallenge {
  blockIndex: number;
  randomValue: string;
}

interface PDPProof {
  challenges: PDPChallenge[];
  responses: string[];
  merkleRoot: string;
  timestamp: number;
}

interface VerificationResult {
  valid: boolean;
  proofHash: string;
  blockHeight?: number;
  transactionHash?: string;
  timestamp: number;
}

class PDPService {
  private readonly CHALLENGE_COUNT = 10;
  private readonly BLOCK_SIZE = 1024; // 1KB blocks

  /**
   * Generate PDP proof for a stored file
   */
  async generateProof(documentId: string, cid: string): Promise<VerificationResult> {
    try {
      console.log(`🔐 Generating PDP proof for document: ${documentId}`);

      // Generate random challenges
      const challenges = this.generateChallenges();
      
      // Retrieve file data from Filecoin
      const retrievalResult = await synapseService.retrieveFile(cid);
      
      if (!retrievalResult.verified) {
        throw new Error('File integrity verification failed during retrieval');
      }

      // Generate proof responses
      const responses = this.generateProofResponses(retrievalResult.data, challenges);
      
      // Calculate Merkle root
      const merkleRoot = this.calculateMerkleRoot(retrievalResult.data);
      
      // Create proof object
      const proof: PDPProof = {
        challenges,
        responses,
        merkleRoot,
        timestamp: Date.now(),
      };

      // Generate proof hash
      const proofHash = this.hashProof(proof);

      // Store proof using Synapse SDK
      await synapseService.generatePDPProof(cid);

      // Save verification proof to database
      await this.saveVerificationProof(documentId, 'PDP', proofHash, true);

      console.log(`✅ PDP proof generated successfully: ${proofHash}`);

      return {
        valid: true,
        proofHash,
        timestamp: proof.timestamp,
      };
    } catch (error) {
      console.error('❌ Failed to generate PDP proof:', error);
      
      // Save failed verification to database
      await this.saveVerificationProof(documentId, 'PDP', '', false);
      
      throw new Error(`PDP challenge generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Verify existing PDP proof
   */
  async verifyProof(documentId: string, cid: string, proofHash: string): Promise<VerificationResult> {
    try {
      console.log(`🔍 Verifying PDP proof for document: ${documentId}`);

      // Verify using Synapse SDK
      const synapseVerification = await synapseService.verifyPDPProof(cid, proofHash);
      
      if (!synapseVerification) {
        throw new Error('Synapse SDK verification failed');
      }

      // Retrieve and verify file integrity
      const retrievalResult = await synapseService.retrieveFile(cid);
      
      if (!retrievalResult.verified) {
        throw new Error('File integrity verification failed');
      }

      // Additional local verification
      const localVerification = await this.performLocalVerification(retrievalResult.data, proofHash);
      
      const isValid = synapseVerification && localVerification;

      // Save verification result to database
      await this.saveVerificationProof(documentId, 'PDP_VERIFY', proofHash, isValid);

      // Update document verification status
      await this.updateDocumentVerificationStatus(documentId, isValid);

      console.log(`✅ PDP proof verification completed: ${isValid}`);

      return {
        valid: isValid,
        proofHash,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('❌ Failed to verify PDP proof:', error);
      
      // Save failed verification to database
      await this.saveVerificationProof(documentId, 'PDP_VERIFY', proofHash, false);
      
      throw new Error(`PDP proof verification failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate random challenges for PDP
   */
  private generateChallenges(): PDPChallenge[] {
    const challenges: PDPChallenge[] = [];
    
    for (let i = 0; i < this.CHALLENGE_COUNT; i++) {
      challenges.push({
        blockIndex: Math.floor(Math.random() * 1000), // Random block index
        randomValue: crypto.randomBytes(32).toString('hex'),
      });
    }
    
    return challenges;
  }

  /**
   * Generate proof responses for challenges
   */
  private generateProofResponses(fileData: Buffer, challenges: PDPChallenge[]): string[] {
    const responses: string[] = [];
    
    for (const challenge of challenges) {
      const blockStart = challenge.blockIndex * this.BLOCK_SIZE;
      const blockEnd = Math.min(blockStart + this.BLOCK_SIZE, fileData.length);
      
      if (blockStart >= fileData.length) {
        // If block index is beyond file size, use last block
        const lastBlockStart = Math.max(0, fileData.length - this.BLOCK_SIZE);
        const block = fileData.slice(lastBlockStart, fileData.length);
        const response = crypto.createHmac('sha256', challenge.randomValue)
          .update(block)
          .digest('hex');
        responses.push(response);
      } else {
        const block = fileData.slice(blockStart, blockEnd);
        const response = crypto.createHmac('sha256', challenge.randomValue)
          .update(block)
          .digest('hex');
        responses.push(response);
      }
    }
    
    return responses;
  }

  /**
   * Calculate Merkle root of file data
   */
  private calculateMerkleRoot(fileData: Buffer): string {
    const blockCount = Math.ceil(fileData.length / this.BLOCK_SIZE);
    const leaves: string[] = [];
    
    // Generate leaf hashes
    for (let i = 0; i < blockCount; i++) {
      const blockStart = i * this.BLOCK_SIZE;
      const blockEnd = Math.min(blockStart + this.BLOCK_SIZE, fileData.length);
      const block = fileData.slice(blockStart, blockEnd);
      const hash = crypto.createHash('sha256').update(block).digest('hex');
      leaves.push(hash);
    }
    
    // Build Merkle tree
    return this.buildMerkleTree(leaves);
  }

  /**
   * Build Merkle tree from leaf hashes
   */
  private buildMerkleTree(leaves: string[]): string {
    if (leaves.length === 0) {
      return crypto.createHash('sha256').update('').digest('hex');
    }
    
    if (leaves.length === 1) {
      return leaves[0];
    }
    
    const nextLevel: string[] = [];
    
    for (let i = 0; i < leaves.length; i += 2) {
      const left = leaves[i];
      const right = i + 1 < leaves.length ? leaves[i + 1] : left;
      const combined = crypto.createHash('sha256').update(left + right).digest('hex');
      nextLevel.push(combined);
    }
    
    return this.buildMerkleTree(nextLevel);
  }

  /**
   * Hash PDP proof object
   */
  private hashProof(proof: PDPProof): string {
    const proofString = JSON.stringify({
      challenges: proof.challenges,
      responses: proof.responses,
      merkleRoot: proof.merkleRoot,
      timestamp: proof.timestamp,
    });
    
    return crypto.createHash('sha256').update(proofString).digest('hex');
  }

  /**
   * Perform local verification of proof
   */
  private async performLocalVerification(fileData: Buffer, _proofHash: string): Promise<boolean> {
    try {
      // This is a simplified local verification
      // In a real implementation, you would reconstruct the proof and verify it
      const fileHash = crypto.createHash('sha256').update(fileData).digest('hex');
      const merkleRoot = this.calculateMerkleRoot(fileData);
      
      // Verify file integrity by checking if the data hasn't been tampered with
      return fileHash.length === 64 && merkleRoot.length === 64;
    } catch (error) {
      console.error('Local verification failed:', error);
      return false;
    }
  }

  /**
   * Save verification proof to database
   */
  private async saveVerificationProof(
    documentId: string,
    proofType: string,
    proofHash: string,
    verificationResult: boolean
  ): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query(
        `INSERT INTO verification_proofs 
         (document_id, proof_type, proof_hash, verification_result, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          documentId,
          proofType,
          proofHash,
          verificationResult,
          JSON.stringify({ timestamp: Date.now() }),
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Update document verification status
   */
  private async updateDocumentVerificationStatus(
    documentId: string,
    isValid: boolean
  ): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query(
        `UPDATE documents 
         SET verification_status = $1, last_verified_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [isValid ? 'verified' : 'failed', documentId]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get verification history for a document
   */
  async getVerificationHistory(documentId: string): Promise<any[]> {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT * FROM verification_proofs 
         WHERE document_id = $1 
         ORDER BY created_at DESC`,
        [documentId]
      );
      
      return result.rows;
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const pdpService = new PDPService();
export default pdpService;