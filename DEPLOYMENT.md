# SealGuard Deployment Guide

This guide covers deploying SealGuard's Web3-native architecture to production environments.

## Architecture Overview

SealGuard consists of:
- **Frontend**: Next.js Web3 application (deploy to Vercel)
- **Backend**: Minimal Node.js IPFS proxy service (deploy to Railway/Render)
- **Smart Contracts**: Already deployed on blockchain
- **Storage**: IPFS/Filecoin (decentralized)

## Prerequisites

### Required Accounts & Services
1. **Vercel Account** (for frontend)
2. **Railway or Render Account** (for backend)
3. **WalletConnect Project ID** (from [WalletConnect Cloud](https://cloud.walletconnect.com/))
4. **IPFS Service** (Pinata recommended for production)
5. **RPC Providers** (Alchemy, Infura, or QuickNode)

### Required Environment Variables

#### Frontend (.env.local)
```bash
# Web3 Configuration
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Contract Addresses (update with your deployed contracts)
NEXT_PUBLIC_REGISTRY_CONTRACT=0x...
NEXT_PUBLIC_ACCESS_CONTROL_CONTRACT=0x...

# Network Configuration
NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111
NEXT_PUBLIC_NETWORK_NAME=Sepolia

# RPC URLs (use your provider URLs)
NEXT_PUBLIC_ETHEREUM_RPC=https://eth-mainnet.g.alchemy.com/v2/O6r4vg9nJLb0MLjOk1wTM
NEXT_PUBLIC_SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/O6r4vg9nJLb0MLjOk1wTM
NEXT_PUBLIC_POLYGON_RPC=https://polygon-mainnet.g.alchemy.com/v2/O6r4vg9nJLb0MLjOk1wTM

# IPFS Configuration
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/

# Application Settings
NEXT_PUBLIC_APP_NAME=SealGuard
NEXT_PUBLIC_APP_DESCRIPTION=Decentralized Document Verification Platform
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

#### Backend (.env)
```bash
# Server Configuration
PORT=5000
NODE_ENV=production

# CORS Configuration
FRONTEND_URL=https://your-domain.vercel.app

# File Upload Configuration
UPLOAD_TEMP_DIR=/tmp/uploads
MAX_FILE_SIZE=104857600

# IPFS Configuration (Pinata recommended for production)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key
IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
UPLOAD_RATE_LIMIT_MAX=10
```

## Frontend Deployment (Vercel)

### Step 1: Prepare Frontend for Deployment

1. **Navigate to frontend directory**:
   ```bash
   cd src/frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Test build locally**:
   ```bash
   npm run build
   npm run start
   ```

### Step 2: Deploy to Vercel

#### Option A: Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from frontend directory**:
   ```bash
   cd src/frontend
   vercel
   ```

4. **Configure project settings**:
   - Framework Preset: `Next.js`
   - Root Directory: `src/frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

#### Option B: GitHub Integration

1. **Push code to GitHub repository**

2. **Connect to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Set Root Directory to `src/frontend`

### Step 3: Configure Environment Variables in Vercel

1. **Go to Project Settings** → **Environment Variables**

2. **Add all required variables** (see Frontend .env.local section above)

3. **Redeploy** to apply environment variables

### Step 4: Configure Custom Domain (Optional)

1. **Go to Project Settings** → **Domains**
2. **Add your custom domain**
3. **Update DNS records** as instructed
4. **Update NEXT_PUBLIC_APP_URL** environment variable

## Backend Deployment

### Option A: Railway Deployment (Recommended)

#### Step 1: Prepare Backend

1. **Navigate to backend directory**:
   ```bash
   cd src/backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Test build**:
   ```bash
   npm run build
   npm start
   ```

#### Step 2: Deploy to Railway

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Initialize project**:
   ```bash
   cd src/backend
   railway init
   ```

4. **Deploy**:
   ```bash
   railway up
   ```

#### Step 3: Configure Environment Variables

1. **Go to Railway Dashboard**
2. **Select your project** → **Variables**
3. **Add all backend environment variables**
4. **Redeploy service**

### Option B: Render Deployment

#### Step 1: Create Render Service

1. **Go to [Render Dashboard](https://dashboard.render.com/)**
2. **Click "New +"** → **Web Service**
3. **Connect your GitHub repository**

#### Step 2: Configure Service

- **Name**: `sealguard-backend`
- **Root Directory**: `src/backend`
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Instance Type**: `Starter` (free tier)

#### Step 3: Add Environment Variables

1. **Go to Environment tab**
2. **Add all backend environment variables**
3. **Deploy service**

## Post-Deployment Configuration

### 1. Update Frontend Backend URL

After backend deployment, update the frontend to point to your deployed backend:

```bash
# Add to Vercel environment variables
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.railway.app
# or
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.onrender.com
```

### 2. Configure CORS

Ensure your backend's `FRONTEND_URL` environment variable matches your Vercel deployment URL.

### 3. Test Integration

1. **Test wallet connection**
2. **Test file upload** (IPFS integration)
3. **Test smart contract interactions**
4. **Verify notifications work**

## Production Considerations

### Security

- **Environment Variables**: Never commit `.env` files
- **API Keys**: Use production API keys with appropriate rate limits
- **CORS**: Configure strict CORS policies
- **Rate Limiting**: Implement appropriate rate limits

### Performance

- **CDN**: Vercel provides global CDN automatically
- **IPFS**: Use Pinata or similar service for reliable IPFS access
- **RPC**: Use dedicated RPC providers (Alchemy, Infura)
- **Caching**: Implement appropriate caching strategies

### Monitoring

- **Vercel Analytics**: Enable for frontend monitoring
- **Railway/Render Logs**: Monitor backend logs
- **Error Tracking**: Consider Sentry integration
- **Uptime Monitoring**: Use services like UptimeRobot

### Scaling

- **Frontend**: Vercel scales automatically
- **Backend**: Railway/Render provide auto-scaling options
- **IPFS**: Consider multiple IPFS providers for redundancy

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check TypeScript errors

2. **Environment Variables**:
   - Ensure all required variables are set
   - Check variable names (NEXT_PUBLIC_ prefix for frontend)
   - Verify no trailing spaces in values

3. **CORS Errors**:
   - Verify FRONTEND_URL in backend matches Vercel URL
   - Check CORS middleware configuration

4. **Web3 Connection Issues**:
   - Verify WalletConnect Project ID
   - Check RPC URL accessibility
   - Ensure contract addresses are correct

### Support Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Railway Documentation**: https://docs.railway.app
- **Render Documentation**: https://render.com/docs
- **WalletConnect Documentation**: https://docs.walletconnect.com

## Maintenance

### Regular Updates

1. **Dependencies**: Keep packages updated
2. **Security**: Monitor for security advisories
3. **Performance**: Regular performance audits
4. **Backup**: Ensure IPFS content is properly pinned

### Monitoring Checklist

- [ ] Frontend deployment status
- [ ] Backend service health
- [ ] IPFS gateway accessibility
- [ ] Smart contract interactions
- [ ] Error rates and logs
- [ ] Performance metrics

---

**Note**: This deployment guide assumes you have already deployed your smart contracts. If you need to deploy contracts, refer to the contracts deployment documentation in the `/contracts` directory.