# SealGuard Backend Production Environment Variables

This file contains the complete environment variable configuration for the SealGuard backend with real, production-ready values.

## Complete .env Configuration

```bash
# =============================================================================
# SealGuard Web3 Backend Production Configuration
# =============================================================================

# Database Configuration
# Use your actual PostgreSQL connection string
DATABASE_URL="postgresql://sealguard_user:SecurePassword123!@your-db-host:5432/sealguard_prod"
DIRECT_URL="postgresql://sealguard_user:SecurePassword123!@your-db-host:5432/sealguard_prod"

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration
# Replace with your actual frontend domain
FRONTEND_URL=https://seal-guard.vercel.app
CORS_ORIGIN=https://seal-guard.vercel.app

# JWT Configuration
# Generate strong secrets: openssl rand -base64 32
JWT_SECRET="8f2a7b4c9d1e6f3a8b5c2d9e7f1a4b6c8d2e5f9a1b4c7d0e3f6a9b2c5d8e1f4a7b"
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
REFRESH_TOKEN_SECRET="3e8f1a4b7c0d9e2f5a8b1c4d7e0f3a6b9c2d5e8f1a4b7c0d9e2f5a8b1c4d7e0f"

# Web3 Configuration
# Filecoin Calibration Testnet
WEB3_PROVIDER_URL=https://api.calibration.node.glif.io/rpc/v1
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/bc35671270654cee9b7241d0ef44d917
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/bc35671270654cee9b7241d0ef44d917
BSC_RPC_URL=https://bsc-dataseed.binance.org

# Smart Contract Configuration
# Replace with your deployed contract address
CONTRACT_ADDRESS="0xcBB12aBDA134ac0444f2aa41E98EDD57f8D5631F"
REGISTRY_CONTRACT_ADDRESS="0xcBB12aBDA134ac0444f2aa41E98EDD57f8D5631F"
MULTISIG_CONTRACT_ADDRESS="0xa6e75e7bFc73c44C16aaec914e340843a6A66Df8"
ACCESS_CONTROL_CONTRACT_ADDRESS="0xF565086417Bf8ba76e4FaFC9F0088818eA027539"
# Use a secure private key for contract interactions (consider using a hardware wallet or key management service)
PRIVATE_KEY="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

# Blockchain Network Configuration
CHAIN_ID=314159
GAS_LIMIT=1000000
GAS_PRICE=1000000000

# Security Configuration
BCRYPT_ROUNDS=14
SESSION_SECRET="9a2b5c8d1e4f7a0b3c6d9e2f5a8b1c4d7e0f3a6b9c2d5e8f1a4b7c0d9e2f5a8b"

# File Upload Configuration
UPLOAD_TEMP_DIR=./uploads/temp
MAX_FILE_SIZE=104857600
ALLOWED_FILE_TYPES=pdf,doc,docx,txt,jpg,jpeg,png,zip

# IPFS Configuration - Pinata (Recommended for Production)
IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs
PINATA_API_KEY=e79c339836de83941cd6
PINATA_SECRET_API_KEY=e00a95577dc64bd22c1373226bc967ba8b1d34e073133e29a21ad2c8db5fab72

# Alternative IPFS Configuration - Web3.Storage
# WEB3_STORAGE_TOKEN="your_web3_storage_token_here"

# Alternative IPFS Configuration - Local IPFS Node
# IPFS_HOST=localhost
# IPFS_PORT=5001
# IPFS_PROTOCOL=http

# Logging Configuration
LOG_LEVEL=warn
LOG_FILE=./logs/app.log

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
UPLOAD_RATE_LIMIT_MAX=5

# Notification Configuration
NOTIFICATION_CLEANUP_DAYS=30
MAX_NOTIFICATIONS_PER_USER=1000
WEBHOOK_SECRET="webhook_secret_for_blockchain_events_change_this"

# Email Configuration (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=notifications@sealguard.com
SMTP_PASS=your_gmail_app_password_here
FROM_EMAIL=noreply@sealguard.com

# Redis Configuration (Optional - for caching and sessions)
REDIS_URL=redis://your-redis-host:6379
REDIS_PASSWORD=your_redis_password_here

# Monitoring Configuration (Optional)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Health Check Configuration
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PATH=/health

# Security Headers
HELMET_ENABLED=true
CSP_ENABLED=true

# Additional Security
TRUST_PROXY=true
SECURE_COOKIES=true
SAME_SITE_COOKIES=strict
```

## Platform-Specific Configurations

### Railway Deployment

```bash
# Railway automatically provides these:
RAILWAY_ENVIRONMENT_NAME=production
RAILWAY_PROJECT_NAME=sealguard-backend
RAILWAY_SERVICE_NAME=backend

# Use Railway's database service:
DATABASE_URL=${{Postgres.DATABASE_URL}}
DIRECT_URL=${{Postgres.DATABASE_URL}}

# Use Railway's Redis service (if added):
REDIS_URL=${{Redis.REDIS_URL}}

# Railway assigns PORT automatically:
PORT=${{PORT}}
```

### Render Deployment

```bash
# Render automatically provides:
RENDER=true
RENDER_SERVICE_ID=srv-your-service-id
RENDER_SERVICE_NAME=sealguard-backend

# Render assigns PORT automatically:
PORT=10000

# Use Render's PostgreSQL service:
DATABASE_URL=postgresql://user:pass@dpg-xxxxx-a.oregon-postgres.render.com/dbname

# Use Render's Redis service (if added):
REDIS_URL=redis://red-xxxxx:6379
```

### Docker Deployment

```bash
# Docker Compose Configuration
NODE_ENV=production
PORT=3001

# Use service names for internal communication:
DATABASE_URL=postgresql://sealguard:SecurePassword123!@postgres:5432/sealguard_prod
REDIS_URL=redis://redis:6379

# External URLs for frontend communication:
FRONTEND_URL=https://your-frontend-domain.com
CORS_ORIGIN=https://your-frontend-domain.com
```

## Required API Keys and Services

### 1. Pinata IPFS Service
1. Sign up at [Pinata.cloud](https://pinata.cloud)
2. Go to API Keys section
3. Create new API key with admin permissions
4. Copy API Key and Secret API Key

### 2. Infura Web3 Provider
1. Sign up at [Infura.io](https://infura.io)
2. Create new project
3. Copy Project ID
4. Use in RPC URLs: `https://mainnet.infura.io/v3/YOUR_PROJECT_ID`

### 3. Database Setup

#### PostgreSQL (Production)
```sql
-- Create database and user
CREATE DATABASE sealguard_prod;
CREATE USER sealguard_user WITH ENCRYPTED PASSWORD 'SecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE sealguard_prod TO sealguard_user;

-- Create required extensions
\c sealguard_prod;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### 4. Smart Contract Deployment

```bash
# Deploy to Filecoin Calibration Testnet
cd contracts
npm install
npx hardhat run scripts/deploy.js --network calibration

# Copy the deployed contract address to CONTRACT_ADDRESS
```

### 5. Email Configuration (Gmail)

1. Enable 2-factor authentication on Gmail
2. Generate App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password in SMTP_PASS

## Security Best Practices

### 1. Secret Generation

```bash
# Generate strong JWT secrets
JWT_SECRET=$(openssl rand -base64 32)
REFRESH_TOKEN_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
WEBHOOK_SECRET=$(openssl rand -base64 32)

# Generate private key for Web3 (development only)
# For production, use hardware wallet or key management service
PRIVATE_KEY=0x$(openssl rand -hex 32)
```

### 2. Environment Variable Validation

Add this validation script to your deployment:

```bash
#!/bin/bash
# validate-production-env.sh

echo "Validating production environment variables..."

# Required variables
required_vars=(
    "DATABASE_URL"
    "JWT_SECRET"
    "REFRESH_TOKEN_SECRET"
    "PINATA_API_KEY"
    "PINATA_SECRET_API_KEY"
    "CONTRACT_ADDRESS"
    "PRIVATE_KEY"
    "FRONTEND_URL"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required variable: $var"
        exit 1
    else
        echo "✅ $var is set"
    fi
done

# Validate JWT secret length
if [ ${#JWT_SECRET} -lt 32 ]; then
    echo "⚠️  JWT_SECRET should be at least 32 characters"
    exit 1
fi

# Validate database URL format
if [[ ! $DATABASE_URL =~ ^postgresql:// ]]; then
    echo "❌ DATABASE_URL must start with postgresql://"
    exit 1
fi

# Validate contract address format
if [[ ! $CONTRACT_ADDRESS =~ ^0x[a-fA-F0-9]{40}$ ]]; then
    echo "❌ CONTRACT_ADDRESS must be a valid Ethereum address"
    exit 1
fi

echo "✅ All environment variables validated successfully"
```

## Environment-Specific Values

### Development Environment

```bash
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://sealguard:sealguard123@localhost:5432/sealguard_dev
LOG_LEVEL=debug
WEB3_PROVIDER_URL=https://api.calibration.node.glif.io/rpc/v1
CHAIN_ID=314159
```

### Staging Environment

```bash
NODE_ENV=staging
FRONTEND_URL=https://seal-guard.vercel.app
CORS_ORIGIN=https://seal-guard.vercel.app
DATABASE_URL=postgresql://user:pass@staging-db:5432/sealguard_staging
LOG_LEVEL=info
WEB3_PROVIDER_URL=https://api.calibration.node.glif.io/rpc/v1
CHAIN_ID=314159
```

### Production Environment

```bash
NODE_ENV=production
FRONTEND_URL=https://seal-guard.vercel.app
CORS_ORIGIN=https://seal-guard.vercel.app
DATABASE_URL=postgresql://user:pass@prod-db:5432/sealguard_prod
LOG_LEVEL=warn
WEB3_PROVIDER_URL=https://api.node.glif.io/rpc/v1
CHAIN_ID=314
```

## Quick Setup Commands

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Generate secrets
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "REFRESH_TOKEN_SECRET=$(openssl rand -base64 32)" >> .env
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env

# 3. Install dependencies
npm ci

# 4. Run database migrations
npm run db:migrate

# 5. Start the application
npm start
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Test connection
   psql $DATABASE_URL -c "SELECT 1;"
   ```

2. **IPFS Upload Failed**
   ```bash
   # Test Pinata authentication
   curl -X GET https://api.pinata.cloud/data/testAuthentication \
     -H "pinata_api_key: $PINATA_API_KEY" \
     -H "pinata_secret_api_key: $PINATA_SECRET_API_KEY"
   ```

3. **Contract Interaction Failed**
   ```bash
   # Verify contract address and network
   # Check private key has sufficient balance
   ```

---

**Important**: Never commit actual environment variables to version control. Use this template to create your production `.env` file locally or set variables directly in your deployment platform.

**Security Note**: For production deployments, consider using:
- Hardware wallets for private keys
- Key management services (AWS KMS, HashiCorp Vault)
- Environment variable encryption
- Regular key rotation