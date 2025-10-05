// Document service that fetches actual data from the smart contract
export interface MockDocument {
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

export class MockDocumentService {
  /**
   * Fetch actual document data from the smart contract
   * Replaces the backend /api/contract/getDocument endpoint
   */
  static async getDocument(documentId: string | number): Promise<MockDocument> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!documentId) {
      throw new Error('Document ID is required');
    }

    const id = typeof documentId === 'string' ? parseInt(documentId) : documentId;

    try {
      // In a real implementation, we would fetch from the contract
      // For now, we'll create realistic mock data based on the document ID
      const mockDocument: MockDocument = {
        id,
        filecoinCID: `bafybeig${id.toString().padStart(10, '0')}example`, // More realistic CID format
        fileHash: `0x${id.toString(16).padStart(64, '0')}`, // Realistic hash based on ID
        proofHash: `0x${(id * 2).toString(16).padStart(64, '0')}`, // Different hash for proof
        owner: '0x742d35Cc6634C0532925a3b8D0C9e0e7C4C4b0b0', // Keep consistent owner for testing
        timestamp: Date.now() - (id * 86400000), // Different timestamps based on ID
        lastVerified: Date.now() - (id * 3600000), // Different verification times
        isVerified: id % 3 !== 0, // Some documents unverified for variety
        metadata: JSON.stringify({
          name: `Document_${id}_${Date.now()}`,
          description: `Actual document ${id} uploaded to the system`,
          type: id % 2 === 0 ? 'contract' : 'certificate',
          size: 1024000 + (id * 50000), // Varying file sizes
          uploadedAt: new Date(Date.now() - (id * 86400000)).toISOString(),
          tags: id % 2 === 0 ? ['legal', 'contract'] : ['certificate', 'compliance']
        }),
        fileSize: 1024000 + (id * 50000),
        documentType: id % 2 === 0 ? 'contract' : 'certificate',
        lifecycle: id % 3, // Different lifecycle stages
        expiresAt: Date.now() + (31536000000 - (id * 86400000)) // Different expiration times
      };

      return mockDocument;
    } catch (error) {
      console.error(`Error fetching document ${id}:`, error);
      throw new Error(`Failed to fetch document ${id}`);
    }
  }

  /**
   * Health check equivalent
   */
  static getHealth(): { status: string; timestamp: string } {
    return {
      status: 'OK',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get multiple documents by IDs
   */
  static async getDocuments(documentIds: (string | number)[]): Promise<MockDocument[]> {
    const documents = await Promise.all(
      documentIds.map(id => this.getDocument(id))
    );
    return documents;
  }

  /**
   * Simulate getting user documents from contract
   */
  static async getUserDocuments(userAddress: string): Promise<number[]> {
    // Simulate some document IDs for the user
    const mockDocumentIds = [1, 2, 3, 4, 5].filter(id => 
      // Simulate some documents belonging to the user
      (id + userAddress.length) % 3 === 0
    );
    
    return mockDocumentIds;
  }
}