# SealGuard System Architecture Design

## Overview

SealGuard is built as a modern, cloud-native SaaS platform leveraging Filecoin Onchain Cloud for immutable storage and verification. The architecture follows microservices principles with clear separation of concerns.

## High-Level Architecture

### Component Overview

1. **Frontend Layer** (React/Next.js)
   - User interface for document management
   - Real-time status updates
   - Responsive design for mobile/desktop

2. **API Gateway** (Express.js)
   - Request routing and load balancing
   - Authentication and authorization
   - Rate limiting and security

3. **Backend Services** (Node.js/Go)
   - Document processing service
   - Verification service
   - User management service
   - Billing service

4. **Database Layer** (PostgreSQL + Redis)
   - Application data and metadata
   - Session management and caching

5. **Filecoin Integration Layer**
   - Synapse SDK integration
   - Warm Storage management
   - PDP proof generation
   - Payment processing

## Detailed Component Design

### Frontend Architecture

```
Components/
├── Dashboard/
│   ├── FileUpload.tsx
│   ├── DocumentLibrary.tsx
│   ├── VerificationStatus.tsx
│   └── AuditReports.tsx
├── Auth/
│   ├── Login.tsx
│   ├── Register.tsx
│   └── PasswordReset.tsx
├── Shared/
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── LoadingSpinner.tsx
└── Utils/
    ├── api.ts
    ├── auth.ts
    └── filecoin.ts
```

### Backend Service Architecture

```
Services/
├── DocumentService/
│   ├── upload.js
│   ├── metadata.js
│   └── validation.js
├── VerificationService/
│   ├── pdp-proof.js
│   ├── integrity-check.js
│   └── audit-trail.js
├── UserService/
│   ├── authentication.js
│   ├── authorization.js
│   └── profile.js
└── BillingService/
    ├── subscription.js
    ├── usage-tracking.js
    └── filecoin-pay.js
```

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    organization_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Documents Table
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    filecoin_cid VARCHAR(255),
    storage_status VARCHAR(50) DEFAULT 'pending',
    verification_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Verification_Proofs Table
```sql
CREATE TABLE verification_proofs (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id),
    proof_hash VARCHAR(64) NOT NULL,
    verification_timestamp TIMESTAMP NOT NULL,
    proof_data JSONB NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Filecoin Integration Details

### Synapse SDK Integration

```javascript
// Filecoin storage service
class FilecoinStorageService {
  constructor() {
    this.synapse = new SynapseSDK({
      apiKey: process.env.SYNAPSE_API_KEY,
      network: 'mainnet'
    });
  }

  async storeDocument(fileBuffer, metadata) {
    try {
      // Upload to Warm Storage
      const result = await this.synapse.warmStorage.store({
        data: fileBuffer,
        metadata: metadata,
        redundancy: 3 // Number of storage providers
      });

      return {
        cid: result.cid,
        dealId: result.dealId,
        storageProviders: result.providers
      };
    } catch (error) {
      throw new Error(`Storage failed: ${error.message}`);
    }
  }

  async generatePDPProof(cid) {
    try {
      const proof = await this.synapse.pdp.generateProof(cid);
      return {
        proofHash: proof.hash,
        timestamp: proof.timestamp,
        verification: proof.verification
      };
    } catch (error) {
      throw new Error(`PDP proof generation failed: ${error.message}`);
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