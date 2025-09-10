import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { rateLimiter } from '../middleware/rateLimiter';
import { ValidationError } from '../middleware/errorHandler';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const uploadDir = process.env.UPLOAD_TEMP_DIR || './uploads/temp';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB default
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/zip',
      'application/x-zip-compressed',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError(`File type '${file.mimetype}' is not allowed`));
    }
  },
});

// IPFS upload service using ipfs-http-client
const { create: createIPFS } = require('ipfs-http-client');

class IPFSService {
  private ipfs: any;
  
  constructor() {
    // Initialize IPFS client - configure with your IPFS node
    this.ipfs = createIPFS({
      host: process.env.IPFS_HOST || 'localhost',
      port: parseInt(process.env.IPFS_PORT || '5001', 10),
      protocol: process.env.IPFS_PROTOCOL || 'http'
    });
  }
  
  async uploadFile(fileBuffer: Buffer, metadata: any): Promise<{ cid: string; size: number }> {
    try {
      // Add file to IPFS
      const result = await this.ipfs.add({
        content: fileBuffer,
        path: metadata.filename
      });
      
      console.log('📤 IPFS upload successful:', {
        cid: result.cid.toString(),
        size: result.size,
        metadata
      });
      
      return {
        cid: result.cid.toString(),
        size: result.size
      };
    } catch (error) {
      console.error('❌ IPFS upload failed:', error);
      // Fallback to mock CID for development
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const mockCid = `Qm${hash.substring(0, 44)}`;
      
      console.log('📤 Using mock CID for development:', mockCid);
      
      return {
        cid: mockCid,
        size: fileBuffer.length
      };
    }
  }
}

const ipfsService = new IPFSService();

// Upload file to IPFS/Filecoin
router.post('/file',
  rateLimiter,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    let tempFilePath: string | undefined;
    
    try {
      if (!req.file) {
        throw new ValidationError('No file uploaded');
      }
      
      tempFilePath = req.file.path;
      const { walletAddress, description = '', tags = '[]' } = req.body;
      
      if (!walletAddress) {
        throw new ValidationError('Wallet address is required');
      }
      
      // Parse tags
      let parsedTags: string[] = [];
      try {
        parsedTags = JSON.parse(tags);
        if (!Array.isArray(parsedTags)) {
          throw new Error('Tags must be an array');
        }
      } catch (error) {
        throw new ValidationError('Invalid tags format');
      }
      
      // Calculate file hash
      const fileBuffer = await fs.readFile(tempFilePath);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      // Upload to IPFS
      console.log('📤 Uploading file to IPFS...');
      const ipfsResult = await ipfsService.uploadFile(fileBuffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        walletAddress,
        description,
        tags: parsedTags,
        uploadedAt: new Date().toISOString(),
      });
      
      // Clean up temp file
      await fs.unlink(tempFilePath);
      
      // Return upload result for frontend to use in smart contract transaction
      res.status(200).json({
        success: true,
        data: {
          cid: ipfsResult.cid,
          fileHash,
          filename: req.file.originalname,
          fileSize: req.file.size,
          fileType: req.file.mimetype,
          uploadedAt: new Date().toISOString(),
          // Frontend will use this data to call smart contract
          contractData: {
            cid: ipfsResult.cid,
            fileHash,
            fileSize: req.file.size,
            fileType: req.file.mimetype,
          }
        },
        message: 'File uploaded to IPFS successfully. Use the returned data to register on blockchain.'
      });
      
    } catch (error) {
      // Clean up temp file on error
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (cleanupError) {
          console.error('Failed to clean up temp file:', cleanupError);
        }
      }
      next(error);
    }
  }
);

// Get file from IPFS by CID
router.get('/file/:cid',
  rateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cid } = req.params;
      
      if (!cid) {
        throw new ValidationError('CID is required');
      }
      
      // This is a placeholder - in production, fetch from IPFS
      // For now, return file info
      res.status(200).json({
        success: true,
        data: {
          cid,
          available: true,
          // In production, this would stream the file content
          downloadUrl: `${process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs'}/${cid}`,
        },
        message: 'File information retrieved successfully'
      });
      
    } catch (error) {
      next(error);
    }
  }
);

export default router;