# SealGuard Backend Environment Variables Reference

This document provides a comprehensive reference for all environment variables used in the SealGuard backend application.

## Required Environment Variables

### Database Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | ✅ |
| `DIRECT_URL` | Direct database connection (for migrations) | `postgresql://user:pass@host:5432/db` | ✅ |

### Server Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port number | `3001` | ✅ |
| `NODE_ENV` | Environment mode | `development`, `production`, `staging` | ✅ |
| `FRONTEND_URL` | Frontend application URL | `https://app.sealguard.com` | ✅ |
| `CORS_ORIGIN` | Allowed CORS origins | `https://app.sealguard.com` | ✅ |

### Authentication & Security

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | JWT signing secret | `your-super-secret-jwt-key` | ✅ |
| `JWT_EXPIRES_IN` | JWT token expiration | `7d`, `24h`, `3600` | ✅ |
| `REFRESH_TOKEN_SECRET` | Refresh token secret | `your-refresh-token-secret` | ✅ |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token expiration | `30d` | ✅ |
| `BCRYPT_ROUNDS` | Password hashing rounds | `12` | ❌ |

### Web3 Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `ETHEREUM_RPC_URL` | Ethereum RPC endpoint | `https://mainnet.infura.io/v3/...` | ✅ |
| `POLYGON_RPC_URL` | Polygon RPC endpoint | `https://polygon-mainnet.infura.io/v3/...` | ❌ |
| `BSC_RPC_URL` | Binance Smart Chain RPC | `https://bsc-dataseed.binance.org` | ❌ |
| `CONTRACT_ADDRESS` | Smart contract address | `0x1234567890123456789012345678901234567890` | ✅ |
| `PRIVATE_KEY` | Contract interaction private key | `0xabcdef...` | ✅ |

### IPFS Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `IPFS_GATEWAY_URL` | IPFS gateway URL | `https://gateway.pinata.cloud/ipfs` | ✅ |
| `PINATA_API_KEY` | Pinata API key | `your-pinata-api-key` | ✅ |
| `PINATA_SECRET_API_KEY` | Pinata secret API key | `your-pinata-secret-key` | ✅ |
| `WEB3_STORAGE_TOKEN` | Web3.Storage token (alternative) | `your-web3-storage-token` | ❌ |

### File Upload Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `UPLOAD_TEMP_DIR` | Temporary upload directory | `./uploads/temp` | ❌ |
| `MAX_FILE_SIZE` | Maximum file size in bytes | `104857600` (100MB) | ❌ |
| `ALLOWED_FILE_TYPES` | Allowed file extensions | `pdf,doc,docx,txt,jpg,jpeg,png` | ❌ |

### Rate Limiting

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | `900000` (15 minutes) | ❌ |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` | ❌ |
| `UPLOAD_RATE_LIMIT_MAX` | Max uploads per window | `10` | ❌ |

### Logging Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `LOG_LEVEL` | Logging level | `info`, `debug`, `warn`, `error` | ❌ |
| `LOG_FILE` | Log file path | `logs/app.log` | ❌ |

## Environment-Specific Configurations

### Development Environment

```bash
# .env.development
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://sealguard:sealguard123@localhost:5432/sealguard_dev
LOG_LEVEL=debug

# Use test/development keys (not for production)
JWT_SECRET=dev-jwt-secret-change-in-production
REFRESH_TOKEN_SECRET=dev-refresh-secret-change-in-production

# Development blockchain networks
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/your-project-id
CONTRACT_ADDRESS=0x... # Testnet contract address
```

### Staging Environment

```bash
# .env.staging
NODE_ENV=staging
PORT=3001
FRONTEND_URL=https://staging.sealguard.com
CORS_ORIGIN=https://staging.sealguard.com
DATABASE_URL=postgresql://user:pass@staging-db:5432/sealguard_staging
LOG_LEVEL=info

# Staging-specific secrets
JWT_SECRET=staging-jwt-secret-32-chars-min
REFRESH_TOKEN_SECRET=staging-refresh-secret-32-chars-min

# Testnet configurations
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/your-project-id
CONTRACT_ADDRESS=0x... # Staging contract address
```

### Production Environment

```bash
# .env.production
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://app.sealguard.com
CORS_ORIGIN=https://app.sealguard.com
DATABASE_URL=postgresql://user:pass@prod-db:5432/sealguard_prod
LOG_LEVEL=warn

# Strong production secrets (32+ characters)
JWT_SECRET=super-strong-production-jwt-secret-32-chars-minimum
REFRESH_TOKEN_SECRET=super-strong-refresh-token-secret-32-chars-minimum

# Mainnet configurations
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your-project-id
CONTRACT_ADDRESS=0x... # Production contract address

# Enhanced security settings
BCRYPT_ROUNDS=14
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
UPLOAD_RATE_LIMIT_MAX=5
```

## Platform-Specific Environment Variables

### Railway

```bash
# Railway automatically provides:
RAILWAY_ENVIRONMENT_NAME=production
RAILWAY_PROJECT_NAME=sealguard-backend
RAILWAY_SERVICE_NAME=backend

# Use Railway's database URL
DATABASE_URL=${{Postgres.DATABASE_URL}}
DIRECT_URL=${{Postgres.DATABASE_URL}}

# Railway assigns PORT automatically
PORT=${{PORT}}
```

### Render

```bash
# Render automatically provides:
RENDER=true
RENDER_SERVICE_ID=srv-...
RENDER_SERVICE_NAME=sealguard-backend

# Render assigns PORT automatically
PORT=10000

# Use Render's database URL
DATABASE_URL=postgresql://...
```

### Docker

```bash
# docker.env or docker-compose.yml
NODE_ENV=production
PORT=3001

# Use service names for internal communication
DATABASE_URL=postgresql://sealguard:sealguard123@postgres:5432/sealguard_prod
REDIS_URL=redis://redis:6379
```

## Security Best Practices

### Secret Generation

```bash
# Generate strong JWT secrets
JWT_SECRET=$(openssl rand -base64 32)
REFRESH_TOKEN_SECRET=$(openssl rand -base64 32)

# Generate private key for Web3 (development only)
# For production, use a secure key management service
PRIVATE_KEY=0x$(openssl rand -hex 32)
```

### Environment Variable Validation

The application validates required environment variables on startup:

```typescript
// Required variables check
const requiredVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PINATA_API_KEY',
  'PINATA_SECRET_API_KEY',
  'ETHEREUM_RPC_URL',
  'CONTRACT_ADDRESS'
];

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Required environment variable ${varName} is not set`);
  }
});
```

## Default Values

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `LOG_LEVEL` | `info` | Logging level |
| `BCRYPT_ROUNDS` | `12` | Password hashing rounds |
| `JWT_EXPIRES_IN` | `7d` | JWT expiration |
| `REFRESH_TOKEN_EXPIRES_IN` | `30d` | Refresh token expiration |
| `MAX_FILE_SIZE` | `104857600` | 100MB file size limit |
| `UPLOAD_TEMP_DIR` | `./uploads/temp` | Temporary upload directory |
| `RATE_LIMIT_WINDOW_MS` | `900000` | 15 minutes rate limit window |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `UPLOAD_RATE_LIMIT_MAX` | `10` | Max uploads per window |

## Environment Variable Loading Order

1. System environment variables
2. `.env.local` (ignored by git)
3. `.env.${NODE_ENV}` (e.g., `.env.production`)
4. `.env`
5. Default values in code

## Troubleshooting

### Common Issues

#### Missing Required Variables
```bash
# Error: Required environment variable DATABASE_URL is not set
# Solution: Set the missing variable
export DATABASE_URL="postgresql://..."
```

#### Invalid Database URL Format
```bash
# Error: Invalid DATABASE_URL format
# Correct format: postgresql://username:password@host:port/database
DATABASE_URL="postgresql://sealguard:password@localhost:5432/sealguard_dev"
```

#### JWT Secret Too Short
```bash
# Error: JWT secret should be at least 32 characters
# Solution: Generate a longer secret
JWT_SECRET=$(openssl rand -base64 32)
```

### Validation Script

Create a script to validate environment variables:

```bash
#!/bin/bash
# validate-env.sh

echo "Validating environment variables..."

# Check required variables
required_vars=("DATABASE_URL" "JWT_SECRET" "PINATA_API_KEY" "ETHEREUM_RPC_URL")

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required variable: $var"
    exit 1
  else
    echo "✅ $var is set"
  fi
done

# Check JWT secret length
if [ ${#JWT_SECRET} -lt 32 ]; then
  echo "⚠️  JWT_SECRET should be at least 32 characters"
fi

echo "✅ Environment validation complete"
```

## Environment Variable Templates

### Quick Start Template

```bash
# Copy this template to .env and fill in your values

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/sealguard_dev"
DIRECT_URL="postgresql://username:password@localhost:5432/sealguard_dev"

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Authentication
JWT_SECRET="your-32-character-jwt-secret-here"
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET="your-32-character-refresh-secret"
REFRESH_TOKEN_EXPIRES_IN=30d

# Web3
ETHEREUM_RPC_URL="https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
CONTRACT_ADDRESS="0xYOUR_CONTRACT_ADDRESS"
PRIVATE_KEY="0xYOUR_PRIVATE_KEY"

# IPFS
IPFS_GATEWAY_URL="https://gateway.pinata.cloud/ipfs"
PINATA_API_KEY="your-pinata-api-key"
PINATA_SECRET_API_KEY="your-pinata-secret-key"

# Optional
LOG_LEVEL=debug
MAX_FILE_SIZE=104857600
```

---

*For security reasons, never commit actual environment variable values to version control. Always use `.env.example` files with placeholder values.*