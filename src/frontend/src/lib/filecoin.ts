// Filecoin/IPFS upload utilities
// import { create } from 'ipfs-http-client';

// IPFS client configuration
const IPFS_GATEWAY_URL = 'https://ipfs.io/ipfs/';
// const IPFS_API_URL = 'https://api.web3.storage'; // You can use Web3.Storage or other IPFS providers

// Initialize IPFS client (you'll need to configure this with your preferred IPFS provider)
let ipfsClient: any = null;

try {
  // For development, we'll use a public IPFS gateway
  // In production, you should use a dedicated IPFS service like Web3.Storage, Pinata, or Lighthouse
  // ipfsClient = create({
  //   host: 'ipfs.infura.io',
  //   port: 5001,
  //   protocol: 'https',
  //   headers: {
  //     // Add your Infura project credentials here
  //     authorization: 'Basic ' + btoa('your-project-id:your-project-secret'),
  //   },
  // });
} catch (error) {
  console.warn('IPFS client initialization failed, using fallback method');
}

export interface UploadResult {
  cid: string;
  url: string;
  size: number;
}

/**
 * Upload a file to IPFS/Filecoin network
 * @param file The file to upload
 * @returns Promise with upload result containing CID and URL
 */
export async function uploadToFilecoin(file: File): Promise<string> {
  try {
    // Method 1: Try using IPFS client if available
    if (ipfsClient) {
      const result = await ipfsClient.add(file, {
        progress: (prog: number) => console.log(`Upload progress: ${prog}`),
        pin: true, // Pin the file to ensure it stays available
      });
      
      return result.cid.toString();
    }

    // Method 2: Fallback to Web3.Storage API (requires API key)
    return await uploadViaWeb3Storage(file);

  } catch (error) {
    console.error('Filecoin upload failed:', error);
    
    // Method 3: Final fallback - simulate upload for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using simulated upload for development');
      return await simulateUpload(file);
    }
    
    throw new Error('Failed to upload file to Filecoin network');
  }
}

/**
 * Upload file using Web3.Storage API
 */
async function uploadViaWeb3Storage(file: File): Promise<string> {
  const WEB3_STORAGE_TOKEN = import.meta.env.VITE_WEB3_STORAGE_TOKEN;
  
  if (!WEB3_STORAGE_TOKEN) {
    throw new Error('Web3.Storage token not configured');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('https://api.web3.storage/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WEB3_STORAGE_TOKEN}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Web3.Storage upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.cid;
}

/**
 * Simulate file upload for development purposes
 */
async function simulateUpload(file: File): Promise<string> {
  // Simulate upload delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Generate a mock CID based on file content
  const fileContent = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', fileContent);
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Create a mock IPFS CID format
  return `bafybei${hashHex.substring(0, 52)}`;
}

/**
 * Get the IPFS URL for a given CID
 */
export function getIPFSUrl(cid: string): string {
  return `${IPFS_GATEWAY_URL}${cid}`;
}

/**
 * Download a file from IPFS using its CID
 */
export async function downloadFromIPFS(cid: string): Promise<Blob> {
  const url = getIPFSUrl(cid);
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download file from IPFS: ${response.statusText}`);
  }
  
  return response.blob();
}

/**
 * Verify file integrity by comparing hash
 */
export async function verifyFileIntegrity(file: File, expectedHash: string): Promise<boolean> {
  try {
    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return `0x${hashHex}` === expectedHash;
  } catch (error) {
    console.error('File integrity verification failed:', error);
    return false;
  }
}

/**
 * Get file metadata from IPFS
 */
export async function getFileMetadata(cid: string): Promise<any> {
  try {
    if (ipfsClient) {
      const stats = await ipfsClient.files.stat(`/ipfs/${cid}`);
      return {
        size: stats.size,
        type: stats.type,
        cid: cid,
      };
    }
    
    // Fallback: try to get basic info from HTTP head request
    const url = getIPFSUrl(cid);
    const response = await fetch(url, { method: 'HEAD' });
    
    return {
      size: response.headers.get('content-length'),
      type: response.headers.get('content-type'),
      cid: cid,
    };
  } catch (error) {
    console.error('Failed to get file metadata:', error);
    return null;
  }
}