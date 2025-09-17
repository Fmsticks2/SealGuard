import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { logger } from './logger';

// IPFS configuration
const IPFS_CONFIG = {
  // Default to local IPFS node, fallback to Infura
  url: process.env.IPFS_URL || 'http://127.0.0.1:5001',
  timeout: 30000, // 30 seconds
  ...(process.env.IPFS_AUTH_TOKEN && {
    headers: {
      authorization: `Bearer ${process.env.IPFS_AUTH_TOKEN}`
    }
  })
};

// Infura IPFS fallback configuration
const INFURA_CONFIG = {
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  ...(process.env.INFURA_IPFS_AUTH && {
    headers: {
      authorization: `Basic ${Buffer.from(process.env.INFURA_IPFS_AUTH).toString('base64')}`
    }
  })
};

let ipfsClient: IPFSHTTPClient | null = null;
let isConnected = false;

/**
 * Create and configure IPFS client
 */
export function createIPFSClient(): IPFSHTTPClient {
  if (ipfsClient && isConnected) {
    return ipfsClient;
  }

  try {
    // Try local IPFS node first
    ipfsClient = create(IPFS_CONFIG);
    logger.info('IPFS client created with local node configuration');
    return ipfsClient;
  } catch (error) {
    logger.warn('Failed to connect to local IPFS node, trying Infura fallback:', error);
    
    try {
      // Fallback to Infura
      ipfsClient = create(INFURA_CONFIG);
      logger.info('IPFS client created with Infura configuration');
      return ipfsClient;
    } catch (infuraError) {
      logger.error('Failed to connect to Infura IPFS:', infuraError);
      throw new Error('Unable to connect to any IPFS gateway');
    }
  }
}

/**
 * Test IPFS connection
 */
export async function testIPFSConnection(): Promise<boolean> {
  try {
    const client = createIPFSClient();
    const version = await client.version();
    isConnected = true;
    logger.info(`IPFS connection successful. Version: ${version.version}`);
    return true;
  } catch (error) {
    isConnected = false;
    logger.error('IPFS connection test failed:', error);
    return false;
  }
}

/**
 * Add file to IPFS
 */
export async function addToIPFS(content: Buffer | Uint8Array | string): Promise<{
  cid: string;
  size: number;
  url: string;
}> {
  try {
    const client = createIPFSClient();
    const result = await client.add(content, {
      pin: true, // Pin the content
      cidVersion: 1, // Use CIDv1
      hashAlg: 'sha2-256'
    });

    const cid = result.cid.toString();
    const url = `https://ipfs.io/ipfs/${cid}`;
    
    logger.info(`File added to IPFS: ${cid}, size: ${result.size}`);
    
    return {
      cid,
      size: result.size,
      url
    };
  } catch (error) {
    logger.error('Failed to add file to IPFS:', error);
    throw new Error(`IPFS upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get file from IPFS
 */
export async function getFromIPFS(cid: string): Promise<Uint8Array> {
  try {
    const client = createIPFSClient();
    const chunks: Uint8Array[] = [];
    
    for await (const chunk of client.cat(cid)) {
      chunks.push(chunk);
    }
    
    const result = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    logger.info(`File retrieved from IPFS: ${cid}, size: ${result.length}`);
    return result;
  } catch (error) {
    logger.error(`Failed to get file from IPFS (${cid}):`, error);
    throw new Error(`IPFS retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Pin content to IPFS
 */
export async function pinToIPFS(cid: string): Promise<boolean> {
  try {
    const client = createIPFSClient();
    await client.pin.add(cid);
    logger.info(`Content pinned to IPFS: ${cid}`);
    return true;
  } catch (error) {
    logger.error(`Failed to pin content to IPFS (${cid}):`, error);
    return false;
  }
}

/**
 * Unpin content from IPFS
 */
export async function unpinFromIPFS(cid: string): Promise<boolean> {
  try {
    const client = createIPFSClient();
    await client.pin.rm(cid);
    logger.info(`Content unpinned from IPFS: ${cid}`);
    return true;
  } catch (error) {
    logger.error(`Failed to unpin content from IPFS (${cid}):`, error);
    return false;
  }
}

/**
 * Get IPFS node info
 */
export async function getIPFSNodeInfo(): Promise<{
  id: string;
  version: string;
  addresses: string[];
} | null> {
  try {
    const client = createIPFSClient();
    const [id, version] = await Promise.all([
      client.id(),
      client.version()
    ]);
    
    return {
      id: id.id.toString(),
      version: version.version,
      addresses: id.addresses.map(addr => addr.toString())
    };
  } catch (error) {
    logger.error('Failed to get IPFS node info:', error);
    return null;
  }
}

/**
 * Check if content exists on IPFS
 */
export async function checkIPFSContent(cid: string): Promise<boolean> {
  try {
    const client = createIPFSClient();
    // Use files.stat instead of object.stat for better compatibility
    await client.files.stat(`/ipfs/${cid}`);
    return true;
  } catch (error) {
    logger.warn(`Content not found on IPFS (${cid}):`, error);
    return false;
  }
}

/**
 * Initialize IPFS connection on startup
 */
export async function initializeIPFS(): Promise<void> {
  try {
    logger.info('Initializing IPFS connection...');
    const connected = await testIPFSConnection();
    
    if (connected) {
      const nodeInfo = await getIPFSNodeInfo();
      if (nodeInfo) {
        logger.info(`IPFS initialized successfully. Node ID: ${nodeInfo.id}`);
      }
    } else {
      logger.warn('IPFS connection failed, will use mock mode for development');
    }
  } catch (error) {
    logger.error('IPFS initialization failed:', error);
    logger.warn('Continuing without IPFS - using mock mode');
  }
}

// Export client getter for direct access if needed
export function getIPFSClient(): IPFSHTTPClient | null {
  return ipfsClient;
}

// Export connection status
export function isIPFSConnected(): boolean {
  return isConnected;
}