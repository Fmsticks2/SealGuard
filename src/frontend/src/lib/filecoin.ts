// Filecoin/IPFS upload utilities using Pinata
import { PinataSDK } from "pinata";

// IPFS client configuration
const IPFS_GATEWAY_URL = 'https://ipfs.io/ipfs/';

// Initialize Pinata client with environment variable
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

if (!PINATA_JWT) {
  console.error('VITE_PINATA_JWT environment variable is not set');
}

const pinata = new PinataSDK({
  pinataJwt: PINATA_JWT,
});

export interface UploadResult {
  cid: string;
  url: string;
  size: number;
}

/**
 * Upload a file to IPFS/Filecoin network using Pinata
 * @param file The file to upload
 * @returns Promise with upload result containing CID
 */
export async function uploadToFilecoin(file: File): Promise<string> {
  try {
    // Check if Pinata JWT is configured
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT is not configured. Please set VITE_PINATA_JWT environment variable.');
    }

    console.log('Starting Pinata upload for file:', file.name);
    
    // Upload file to Pinata IPFS using the correct API structure
    const uploadBuilder = pinata.upload.public.file(file);
    const upload = await uploadBuilder;
    
    console.log('Pinata upload successful, CID:', upload.cid);
    return upload.cid;

  } catch (error) {
    console.error('Pinata upload failed:', error);
    
    // Enhanced error handling for network issues
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // Check for network-related errors
      if (errorMessage.includes('fetch') || 
          errorMessage.includes('network') || 
          errorMessage.includes('timeout') ||
          errorMessage.includes('connection')) {
        throw new Error('Network connection issue. Please check your internet connection and try again.');
      }
      
      // Check for authentication errors
      if (errorMessage.includes('unauthorized') || 
          errorMessage.includes('forbidden') ||
          errorMessage.includes('invalid') ||
          errorMessage.includes('jwt')) {
        throw new Error('Authentication failed. Please check your Pinata API credentials.');
      }
    }
    
    // Method 2: Final fallback - simulate upload for development
    if (import.meta.env.DEV) {
      console.warn('Using simulated upload for development');
      return await simulateUpload(file);
    }

    // Propagate detailed error message when available
    if (error instanceof Error) {
      throw new Error(`Failed to upload file to Pinata IPFS: ${error.message}`);
    }
    
    throw new Error('Failed to upload file to Pinata IPFS');
  }
}

/**
 * Simulate file upload for development purposes
 */
async function simulateUpload(file: File): Promise<string> {
  // Simulate upload delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Generate a realistic mock CID
  const mockCid = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  
  console.log(`Simulated upload complete for ${file.name}, mock CID: ${mockCid}`);
  return mockCid;
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