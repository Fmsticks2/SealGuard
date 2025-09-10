# SealGuard Web3 Backend

Minimal backend service for SealGuard's Web3-native architecture. This backend provides essential services for file uploads to IPFS and blockchain event notifications.

## Architecture Overview

This backend has been restructured to support a **Web3-native decentralized architecture**:

- **No traditional authentication** - Uses wallet-based authentication via SIWE (Sign-in with Ethereum)
- **No database dependencies** - All data is stored on-chain or in IPFS
- **Minimal services** - Only essential proxy services for file uploads and notifications
- **Smart contract integration** - Direct interaction with Ethereum smart contracts

## Services

### 1. File Upload Proxy (`/api/upload`)
- Handles file uploads to IPFS
- Returns Content Identifier (CID) for blockchain storage
- Supports multiple IPFS providers (local node, Pinata, Web3.Storage)
- Temporary file cleanup and validation

### 2. Notification Service (`/api/notifications`)
- Handles Web3 event notifications
- In-memory notification storage (no database)
- WebSocket support for real-time updates
- Blockchain event webhook processing

## Quick Start

### Prerequisites
- Node.js 18+
- IPFS node (local or remote service)
- Environment variables configured

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure your IPFS settings in .env
# IPFS_HOST=localhost
# IPFS_PORT=5001

# Start development server
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Basic health check
- `GET /health/web3` - Web3 connectivity status

### File Upload
- `POST /api/upload` - Upload file to IPFS
- `GET /api/upload/:cid` - Retrieve file by CID

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/webhook` - Blockchain event webhook
- `PUT /api/notifications/:id/read` - Mark notification as read

## Environment Configuration

See `.env.example` for all available configuration options:

- **Server**: Port, CORS settings
- **IPFS**: Node connection, gateway URLs
- **Upload**: File size limits, temp directories
- **Rate Limiting**: Request limits and windows
- **Optional Services**: Pinata, Web3.Storage integration

## IPFS Integration

Supports multiple IPFS providers:

1. **Local IPFS Node** (default)
2. **Pinata** - Managed IPFS service
3. **Web3.Storage** - Decentralized storage

Configure via environment variables or use the default local setup.

## Development

```bash
# Development with hot reload
npm run dev

# Type checking
npm run type-check

# Code formatting
npm run format
npm run format:check

# Linting
npm run lint
```

## Architecture Changes

This backend has been **significantly simplified** from the original architecture:

### Removed Components
- ❌ Traditional user authentication (JWT, bcrypt)
- ❌ PostgreSQL database connections
- ❌ Redis session storage
- ❌ Payment processing routes
- ❌ Complex verification workflows
- ❌ Synapse SDK integration

### Added Components
- ✅ IPFS HTTP client integration
- ✅ Web3-native health checks
- ✅ Simplified notification system
- ✅ Wallet-based request validation
- ✅ Blockchain event processing

## Security

- Rate limiting on all endpoints
- File type validation and size limits
- CORS protection
- Helmet security headers
- Request logging and monitoring
- No sensitive data storage (Web3-native)

## Deployment

This minimal backend can be deployed to:
- Traditional cloud providers (AWS, GCP, Azure)
- Decentralized hosting (IPFS, Arweave)
- Container platforms (Docker, Kubernetes)
- Serverless functions (Vercel, Netlify)

The stateless design makes it highly portable and scalable.