# SealGuard Web3-Native System Architecture Design

## Overview

SealGuard has been restructured as a **Web3-native decentralized application** that leverages blockchain technology for immutable document verification. The architecture eliminates traditional centralized components in favor of smart contracts, IPFS storage, and wallet-based authentication.

## High-Level Architecture

### Component Overview

1. **Frontend Layer** (React/Next.js + Web3)
   - Wallet-based authentication (Reown/WalletConnect)
   - Direct smart contract interactions
   - IPFS file retrieval and display
   - Real-time blockchain event monitoring

2. **Smart Contract Layer** (Ethereum/Polygon)
   - Document registry and metadata storage
   - Access control and permissions
   - Verification proof storage
   - Event emission for notifications

3. **Minimal Backend Services** (Node.js)
   - IPFS upload proxy service
   - Blockchain event notifications
   - No database dependencies
   - Stateless and horizontally scalable

4. **Decentralized Storage** (IPFS/Filecoin)
   - Immutable file storage
   - Content addressing via CID
   - Distributed and censorship-resistant
   - No single point of failure

5. **Web3 Infrastructure**
   - Ethereum/Polygon blockchain
   - IPFS network for file storage
   - Wallet providers for authentication
   - Blockchain indexing services

## Detailed Component Design

### Frontend Architecture (Web3-Native)

```
Components/
├── Dashboard/
│   ├── FileUpload.tsx          # IPFS upload with smart contract integration
│   ├── DocumentLibrary.tsx     # Displays documents from blockchain events
│   ├── VerificationStatus.tsx  # Real-time contract state monitoring
│   └── AuditReports.tsx        # On-chain verification history
├── Web3/
│   ├── WalletConnect.tsx       # Reown wallet integration
│   ├── ContractInteraction.tsx # Smart contract method calls
│   ├── TransactionStatus.tsx   # Transaction monitoring
│   └── NetworkSwitcher.tsx     # Multi-chain support
├── Shared/
│   ├── Header.tsx              # Wallet connection status
│   ├── Sidebar.tsx             # Web3-native navigation
│   └── LoadingSpinner.tsx      # Transaction pending states
└── Utils/
    ├── web3.ts                 # Web3 provider setup
    ├── contracts.ts            # Smart contract ABIs and addresses
    ├── ipfs.ts                 # IPFS client utilities
    └── wallet.ts               # Wallet connection management
```

### Backend Service Architecture (Minimal)

```
Services/
├── UploadService/
│   ├── ipfs-upload.js          # IPFS file upload proxy
│   ├── file-validation.js      # File type and size validation
│   └── temp-cleanup.js         # Temporary file management
├── NotificationService/
│   ├── blockchain-events.js    # Listen to smart contract events
│   ├── webhook-handler.js      # Process blockchain webhooks
│   └── notification-store.js   # In-memory notification storage
└── HealthService/
    ├── ipfs-health.js          # IPFS node connectivity check
    ├── blockchain-health.js    # RPC endpoint health check
    └── system-metrics.js       # Basic system monitoring
```

### Smart Contract Schema

#### DocumentRegistry Contract
```solidity
struct Document {
    string ipfsHash;          // IPFS CID for file content
    bytes32 fileHash;         // SHA-256 hash of file content
    string filename;          // Original filename
    uint256 fileSize;         // File size in bytes
    address owner;            // Document owner's wallet address
    uint256 timestamp;        // Upload timestamp
    bool isVerified;          // Verification status
    string[] tags;            // Document tags/categories
}

mapping(bytes32 => Document) public documents;
mapping(address => bytes32[]) public userDocuments;
mapping(bytes32 => VerificationProof[]) public documentProofs;
```

#### AccessControl Contract
```solidity
struct AccessPermission {
    address grantee;          // Address granted access
    bytes32 documentId;       // Document identifier
    uint8 permissionLevel;    // 1=read, 2=verify, 3=admin
    uint256 expiresAt;        // Permission expiration
    bool isActive;            // Permission status
}

mapping(bytes32 => AccessPermission[]) public documentPermissions;
mapping(address => mapping(bytes32 => uint8)) public userPermissions;
```

#### VerificationProof Structure
```solidity
struct VerificationProof {
    bytes32 documentId;       // Reference to document
    bytes32 proofHash;        // Cryptographic proof hash
    address verifier;         // Address that performed verification
    uint256 timestamp;        // Verification timestamp
    string proofType;         // Type of verification performed
    bool isValid;             // Verification result
}
```

## Web3 Integration Details

### IPFS Storage Integration

```javascript
// Web3-native IPFS storage service
class IPFSStorageService {
  constructor() {
    this.ipfs = createIPFS({
      host: process.env.IPFS_HOST || 'localhost',
      port: parseInt(process.env.IPFS_PORT || '5001', 10),
      protocol: process.env.IPFS_PROTOCOL || 'http'
    });
  }

  async storeDocument(fileBuffer, metadata) {
    try {
      // Upload to IPFS network
      const result = await this.ipfs.add({
        content: fileBuffer,
        path: metadata.filename
      });

      return {
        cid: result.cid.toString(),
        size: result.size,
        path: result.path
      };
    } catch (error) {
      throw new Error(`IPFS storage failed: ${error.message}`);
    }
  }

  async retrieveDocument(cid) {
    try {
      const chunks = [];
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      throw new Error(`IPFS retrieval failed: ${error.message}`);
    }
  }

  async pinDocument(cid) {
    try {
      await this.ipfs.pin.add(cid);
      return { pinned: true, cid };
    } catch (error) {
      throw new Error(`IPFS pinning failed: ${error.message}`);
    }
  }
}

// Smart contract integration
class DocumentRegistryService {
  constructor(web3Provider, contractAddress) {
    this.web3 = new Web3(web3Provider);
    this.contract = new this.web3.eth.Contract(DocumentRegistryABI, contractAddress);
  }

  async registerDocument(documentData, userAddress) {
    try {
      const tx = await this.contract.methods.registerDocument(
        documentData.ipfsHash,
        documentData.fileHash,
        documentData.filename,
        documentData.fileSize,
        documentData.tags
      ).send({ from: userAddress });

      return {
        transactionHash: tx.transactionHash,
        documentId: tx.events.DocumentRegistered.returnValues.documentId,
        blockNumber: tx.blockNumber
      };
    } catch (error) {
      throw new Error(`Document registration failed: ${error.message}`);
    }
  }

  async verifyDocument(documentId, userAddress) {
    try {
      const tx = await this.contract.methods.verifyDocument(
        documentId
      ).send({ from: userAddress });

      return {
        transactionHash: tx.transactionHash,
        verified: true,
        timestamp: tx.events.DocumentVerified.returnValues.timestamp
      };
    } catch (error) {
      throw new Error(`Document verification failed: ${error.message}`);
    }
  }
}
```

### Payment Integration

```javascript
// Filecoin Pay integration
class PaymentService {
  constructor() {
    this.filecoinPay = new FilecoinPay({
      apiKey: process.env.FILECOIN_PAY_API_KEY,
      network: 'mainnet'
    });
  }

  async createSubscription(userId, planId) {
    return await this.filecoinPay.subscriptions.create({
      customer: userId,
      plan: planId,
      paymentMethod: 'FIL'
    });
  }

  async processUsageCharge(userId, storageUsed, verificationsCount) {
    const amount = this.calculateUsageCharge(storageUsed, verificationsCount);
    return await this.filecoinPay.charges.create({
      customer: userId,
      amount: amount,
      currency: 'FIL',
      description: 'Storage and verification usage'
    });
  }
}
```

## Security Architecture

### Data Flow Security

1. **Client-Side Encryption**
   - Files encrypted before upload using AES-256
   - Encryption keys managed client-side
   - Zero-knowledge architecture

2. **Transport Security**
   - TLS 1.3 for all communications
   - Certificate pinning for API calls
   - HSTS headers enforced

3. **Storage Security**
   - Encrypted at rest in Filecoin
   - Redundant storage across multiple providers
   - Cryptographic integrity verification

### Authentication & Authorization

```javascript
// JWT-based authentication
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based access control
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

## Scalability Considerations

### Horizontal Scaling

1. **Stateless Services**
   - All services designed to be stateless
   - Session data stored in Redis
   - Easy horizontal scaling with load balancers

2. **Database Scaling**
   - Read replicas for query performance
   - Partitioning by organization/user
   - Connection pooling and caching

3. **File Processing**
   - Asynchronous processing with queues
   - Worker nodes for file upload/verification
   - Auto-scaling based on queue depth

### Performance Optimization

1. **Caching Strategy**
   - Redis for session and metadata caching
   - CDN for static assets
   - Application-level caching for frequent queries

2. **Database Optimization**
   - Indexed queries for fast lookups
   - Materialized views for reporting
   - Query optimization and monitoring

## Monitoring & Observability

### Metrics Collection

```javascript
// Application metrics
const metrics = {
  documentsUploaded: new Counter('documents_uploaded_total'),
  verificationLatency: new Histogram('verification_duration_seconds'),
  storageUsage: new Gauge('storage_usage_bytes'),
  activeUsers: new Gauge('active_users_total')
};

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabaseHealth(),
      filecoin: await checkFilecoinHealth(),
      redis: await checkRedisHealth()
    }
  };
  
  res.json(health);
});
```

### Logging Strategy

1. **Structured Logging**
   - JSON format for all logs
   - Correlation IDs for request tracing
   - Log levels: ERROR, WARN, INFO, DEBUG

2. **Audit Logging**
   - All document operations logged
   - User actions tracked
   - Compliance-ready audit trails

## Deployment Architecture

### Container Strategy

```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Infrastructure as Code

```yaml
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sealguard-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sealguard-api
  template:
    metadata:
      labels:
        app: sealguard-api
    spec:
      containers:
      - name: api
        image: sealguard/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: sealguard-secrets
              key: database-url
```

## Disaster Recovery

### Backup Strategy

1. **Database Backups**
   - Daily automated backups
   - Point-in-time recovery capability
   - Cross-region backup replication

2. **Filecoin Redundancy**
   - Multiple storage provider deals
   - Automatic repair and replication
   - Cryptographic verification of backups

### Recovery Procedures

1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 1 hour
3. **Automated failover** for critical services
4. **Manual procedures** for complex recovery scenarios

This architecture ensures SealGuard can scale to enterprise requirements while maintaining the highest levels of security and compliance.