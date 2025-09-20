# SealGuard Backend Deployment Guide

This comprehensive guide covers deploying the SealGuard backend to various platforms including Railway, Render, Docker, and local development environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Local Development Setup](#local-development-setup)
4. [Docker Deployment](#docker-deployment)
5. [Railway Deployment](#railway-deployment)
6. [Render Deployment](#render-deployment)
7. [Production Considerations](#production-considerations)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- Node.js 18.x or higher
- npm 8.x or higher
- PostgreSQL 15+ (for production)
- Redis 7+ (for caching and sessions)
- Git

### Required Accounts
- [Railway](https://railway.app) account (for Railway deployment)
- [Render](https://render.com) account (for Render deployment)
- [Pinata](https://pinata.cloud) account (for IPFS storage)
- [Web3.Storage](https://web3.storage) account (optional, alternative IPFS provider)

### Development Tools
- Railway CLI (for Railway deployments)
- Docker and Docker Compose (for containerized deployments)
- PostgreSQL client (for database management)

## Environment Configuration

### Environment Variables

Create a `.env` file in the `src/backend` directory based on `.env.example`:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/sealguard_dev"
DIRECT_URL="postgresql://username:password@localhost:5432/sealguard_dev"

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRES_IN=30d

# Web3 Configuration
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your-project-id
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/your-project-id
BSC_RPC_URL=https://bsc-dataseed.binance.org
CONTRACT_ADDRESS=0x...
PRIVATE_KEY=your-private-key-for-contract-interactions

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
UPLOAD_RATE_LIMIT_MAX=10

# File Upload Configuration
UPLOAD_TEMP_DIR=./uploads/temp
MAX_FILE_SIZE=104857600
ALLOWED_FILE_TYPES=pdf,doc,docx,txt,jpg,jpeg,png

# IPFS Configuration
IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs
PINATA_API_KEY=your-pinata-api-key
PINATA_SECRET_API_KEY=your-pinata-secret-key

# Optional: Web3.Storage
WEB3_STORAGE_TOKEN=your-web3-storage-token

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### Security Considerations

⚠️ **Important Security Notes:**
- Never commit `.env` files to version control
- Use strong, unique secrets for JWT tokens
- Rotate API keys regularly
- Use environment-specific configurations
- Enable HTTPS in production

## Local Development Setup

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd SealGuard

# Navigate to backend
cd src/backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your configuration
```

### 2. Database Setup

#### Option A: Using Docker Compose (Recommended)

```bash
# Start PostgreSQL and Redis
docker-compose -f docker-compose.dev.yml up -d

# Run database migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed
```

#### Option B: Local Installation

```bash
# Install PostgreSQL and Redis locally
# Create database
createdb sealguard_dev

# Run migrations
npm run db:migrate
```

### 3. Start Development Server

```bash
# Start in development mode
npm run dev

# Or start with debugging
npm run dev:debug
```

The server will start on `http://localhost:3001`

### 4. Verify Installation

```bash
# Check health endpoint
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","timestamp":"...","uptime":...}
```

## Docker Deployment

### 1. Build Docker Image

```bash
# From the backend directory
docker build -t sealguard-backend .

# Or with specific tag
docker build -t sealguard-backend:v1.0.0 .
```

### 2. Run with Docker Compose

```bash
# Production setup
docker-compose up -d

# Development setup
docker-compose -f docker-compose.dev.yml up -d
```

### 3. Docker Environment Variables

Create a `docker.env` file:

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://sealguard:sealguard123@postgres:5432/sealguard_prod
# ... other environment variables
```

### 4. Docker Health Checks

The Dockerfile includes health checks:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1
```

## Railway Deployment

### 1. Install Railway CLI

```bash
# Install globally
npm install -g @railway/cli

# Login to Railway
railway login
```

### 2. Project Setup

```bash
# Initialize Railway project
railway init

# Link to existing project (if applicable)
railway link [project-id]
```

### 3. Environment Variables

Set environment variables in Railway dashboard or via CLI:

```bash
# Set individual variables
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}
railway variables set JWT_SECRET=your-production-jwt-secret

# Or bulk import from file
railway variables set --from-file .env.production
```

### 4. Database Setup

```bash
# Add PostgreSQL service
railway add postgresql

# Add Redis service
railway add redis

# Run migrations
railway run npm run db:migrate
```

### 5. Deploy

```bash
# Deploy to staging
railway up

# Deploy to production
railway up --environment production

# Or use the deployment script
./scripts/deploy-backend.sh railway production
```

### 6. Railway Configuration

The `railway.json` file configures the deployment:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build",
    "watchPatterns": [
      "src/**/*.ts",
      "package.json",
      "tsconfig.json"
    ]
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## Render Deployment

### 1. Repository Setup

Ensure your code is pushed to GitHub/GitLab.

### 2. Render Service Creation

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your repository
4. Configure the service:
   - **Name**: `sealguard-backend`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main` or `production`
   - **Root Directory**: `src/backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### 3. Environment Variables

In Render dashboard, add environment variables:

```bash
NODE_ENV=production
PORT=10000  # Render assigns this automatically
DATABASE_URL=your-database-url
JWT_SECRET=your-production-jwt-secret
PINATA_API_KEY=your-pinata-api-key
PINATA_SECRET_API_KEY=your-pinata-secret-key
# ... other variables
```

### 4. Database Setup

```bash
# Add PostgreSQL service in Render
# Connect to your web service
# Update DATABASE_URL environment variable
```

### 5. Render Configuration

The `render.yaml` file provides infrastructure as code:

```yaml
services:
  - type: web
    name: sealguard-backend
    env: node
    region: oregon
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      # ... other environment variables
    autoDeploy: true
    disk:
      name: temp-storage
      mountPath: /tmp
      sizeGB: 1
```

### 6. Deploy

```bash
# Automatic deployment on git push
git push origin main

# Or use the deployment script
./scripts/deploy-backend.sh render production
```

## Production Considerations

### 1. Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
```

### 2. Security Hardening

```bash
# Use strong JWT secrets (32+ characters)
JWT_SECRET=$(openssl rand -base64 32)
REFRESH_TOKEN_SECRET=$(openssl rand -base64 32)

# Enable CORS for specific domains only
CORS_ORIGIN=https://your-frontend-domain.com

# Set secure headers
HELMET_ENABLED=true
```

### 3. Performance Optimization

```javascript
// Enable compression
app.use(compression());

// Set up connection pooling
const pool = {
  max: 20,
  min: 5,
  acquire: 30000,
  idle: 10000
};
```

### 4. Monitoring Setup

```bash
# Enable detailed logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Set up health checks
HEALTH_CHECK_ENABLED=true
```

### 5. Backup Strategy

```bash
# Database backups
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backups (add to cron)
0 2 * * * /path/to/backup-script.sh
```

## Monitoring and Maintenance

### 1. Health Monitoring

```bash
# Check application health
curl https://your-backend-url.com/health

# Monitor logs
tail -f logs/app.log

# Check database connections
npm run db:status
```

### 2. Performance Monitoring

```bash
# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s https://your-backend-url.com/api/documents

# Database performance
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

### 3. Log Management

```javascript
// Structured logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

### 4. Automated Maintenance

```bash
#!/bin/bash
# maintenance.sh

# Clean up old logs
find logs/ -name "*.log" -mtime +30 -delete

# Clean up temporary files
find uploads/temp/ -mtime +1 -delete

# Update dependencies (with caution)
npm audit fix
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues

```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Verify connection string format
echo $DATABASE_URL
# Should be: postgresql://user:password@host:port/database
```

#### 2. IPFS Upload Failures

```bash
# Test Pinata connectivity
curl -X GET \
  https://api.pinata.cloud/data/testAuthentication \
  -H "pinata_api_key: $PINATA_API_KEY" \
  -H "pinata_secret_api_key: $PINATA_SECRET_API_KEY"
```

#### 3. JWT Token Issues

```bash
# Verify JWT secret is set
echo $JWT_SECRET

# Test token generation
node -e "console.log(require('jsonwebtoken').sign({test: true}, process.env.JWT_SECRET))"
```

#### 4. Port Binding Issues

```bash
# Check if port is in use
netstat -tulpn | grep :3001

# Kill process using port
kill -9 $(lsof -t -i:3001)
```

#### 5. Build Failures

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript compilation
npm run type-check
```

### Debug Mode

```bash
# Start with debug logging
DEBUG=* npm run dev

# Or specific modules
DEBUG=app:* npm run dev
```

### Performance Debugging

```bash
# Profile memory usage
node --inspect src/index.js

# Monitor CPU usage
top -p $(pgrep -f "node.*src/index.js")
```

## Deployment Scripts

The project includes automated deployment scripts:

### Bash Script (Linux/macOS)

```bash
# Deploy to Railway staging
./scripts/deploy-backend.sh railway staging

# Deploy to Railway production
./scripts/deploy-backend.sh railway production

# Deploy to Render
./scripts/deploy-backend.sh render production
```

### PowerShell Script (Windows)

```powershell
# Deploy to Railway staging
.\scripts\deploy-backend.ps1 railway staging

# Deploy to Railway production
.\scripts\deploy-backend.ps1 railway production

# Deploy to Render
.\scripts\deploy-backend.ps1 render production
```

## Best Practices

### 1. Environment Management
- Use separate environments for development, staging, and production
- Never commit sensitive data to version control
- Use environment-specific configuration files
- Implement proper secret management

### 2. Database Management
- Always run migrations before deployment
- Backup database before major updates
- Use connection pooling in production
- Monitor database performance regularly

### 3. Security
- Keep dependencies updated
- Use HTTPS in production
- Implement proper CORS policies
- Regular security audits
- Monitor for vulnerabilities

### 4. Performance
- Enable compression
- Implement caching strategies
- Monitor response times
- Optimize database queries
- Use CDN for static assets

### 5. Monitoring
- Set up health checks
- Implement structured logging
- Monitor error rates
- Set up alerts for critical issues
- Regular performance reviews

## Support

For additional support:

1. Check the application logs
2. Review environment configuration
3. Verify all dependencies are installed
4. Test database connectivity
5. Check IPFS service status

For platform-specific issues:
- **Railway**: [Railway Documentation](https://docs.railway.app)
- **Render**: [Render Documentation](https://render.com/docs)
- **Docker**: [Docker Documentation](https://docs.docker.com)

---

*Last updated: $(date)*
*Version: 1.0.0*