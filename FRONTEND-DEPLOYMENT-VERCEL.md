# SealGuard Frontend Deployment to Vercel

Complete guide for deploying the SealGuard frontend to Vercel with all required environment variables and configuration.

## Prerequisites

### Required Accounts & Services
1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **WalletConnect Project ID** - Get from [WalletConnect Cloud](https://cloud.walletconnect.com/)
3. **RPC Provider** - Alchemy, Infura, or QuickNode (recommended for production)
4. **GitHub Repository** - For automatic deployments

## Environment Variables

### Frontend Environment Variables (Vercel)

These are **FRONTEND-ONLY** environment variables that should be configured in your Vercel project dashboard. All variables prefixed with `NEXT_PUBLIC_` are exposed to the client-side code.

```bash
# ===== FRONTEND ENVIRONMENT VARIABLES =====
# Configure these in Vercel Project Settings → Environment Variables

# Web3 Configuration
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here

# Smart Contract Addresses (Filecoin Calibration Testnet)
NEXT_PUBLIC_REGISTRY_CONTRACT=0xcBB12aBDA134ac0444f2aa41E98EDD57f8D5631F
NEXT_PUBLIC_ACCESS_CONTROL_CONTRACT=0xF565086417Bf8ba76e4FaFC9F0088818eA027539
NEXT_PUBLIC_MULTISIG_CONTRACT=0xa6e75e7bFc73c44C16aaec914e340843a6A66Df8

# Network Configuration (Filecoin Calibration)
NEXT_PUBLIC_DEFAULT_CHAIN_ID=314159
NEXT_PUBLIC_NETWORK_NAME=Filecoin Calibration
NEXT_PUBLIC_FILECOIN_RPC=https://api.calibration.node.glif.io/rpc/v1

# Additional RPC URLs (for multi-chain support)
NEXT_PUBLIC_ETHEREUM_RPC=https://eth-mainnet.g.alchemy.com/v2/O6r4vg9nJLb0MLjOk1wTM
NEXT_PUBLIC_SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/O6r4vg9nJLb0MLjOk1wTM
NEXT_PUBLIC_POLYGON_RPC=https://polygon-mainnet.g.alchemy.com/v2/O6r4vg9nJLb0MLjOk1wTM
NEXT_PUBLIC_MUMBAI_RPC=https://polygon-mumbai.g.alchemy.com/v2/O6r4vg9nJLb0MLjOk1wTM

# IPFS/Filecoin Configuration
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
NEXT_PUBLIC_FILECOIN_GATEWAY=https://api.node.glif.io

# Application Settings
NEXT_PUBLIC_APP_NAME=SealGuard
NEXT_PUBLIC_APP_DESCRIPTION=Decentralized Document Verification Platform
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_ONRAMP=true
NEXT_PUBLIC_DEBUG_MODE=false

# Backend API URL (update with your deployed backend)
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

### Backend Environment Variables (Railway/Render)

These are **BACKEND-ONLY** environment variables that should be configured in your backend deployment platform (Railway, Render, etc.). These variables are server-side only and not exposed to the client.

```bash
# ===== BACKEND ENVIRONMENT VARIABLES =====
# Configure these in Railway/Render Environment Variables

# Server Configuration
PORT=5000
NODE_ENV=production

# CORS Configuration
FRONTEND_URL=https://your-domain.vercel.app
ALLOWED_ORIGINS=https://your-domain.vercel.app,https://localhost:3000

# File Upload Configuration
UPLOAD_TEMP_DIR=/tmp/uploads
MAX_FILE_SIZE=104857600
ALLOWED_FILE_TYPES=pdf,doc,docx,txt,jpg,jpeg,png

# IPFS Configuration (Pinata recommended for production)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key
IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs

# Database Configuration (if using)
DATABASE_URL=postgresql://username:password@host:port/database
REDIS_URL=redis://username:password@host:port

# Authentication & Security
JWT_SECRET=your_jwt_secret_key_here
ENCRYPTION_KEY=your_encryption_key_here
API_KEY_SECRET=your_api_key_secret

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
UPLOAD_RATE_LIMIT_MAX=10

# Monitoring & Analytics
SENTRY_DSN=your_sentry_dsn_here
ANALYTICS_API_KEY=your_analytics_key

# External Services
EMAIL_SERVICE_API_KEY=your_email_service_key
NOTIFICATION_SERVICE_URL=https://your-notification-service.com
```

## Deployment Methods

### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Navigate to frontend directory**:
   ```bash
   cd src/frontend
   ```

3. **Login to Vercel**:
   ```bash
   vercel login
   ```

4. **Deploy**:
   ```bash
   vercel --prod
   ```

5. **Set environment variables** (one-time setup):
   ```bash
   # Set each environment variable
   vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
   vercel env add NEXT_PUBLIC_REGISTRY_CONTRACT
   vercel env add NEXT_PUBLIC_ACCESS_CONTROL_CONTRACT
   # ... continue for all variables
   ```

### Method 2: GitHub Integration (Automatic Deployments)

1. **Push code to GitHub repository**

2. **Connect to Vercel**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `src/frontend` directory as the root

3. **Configure build settings**:
   - Framework Preset: `Next.js`
   - Root Directory: `src/frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Add environment variables**:
   - Go to Project Settings → Environment Variables
   - Add all variables from the list above

### Method 3: Vercel Dashboard Manual Upload

1. **Build locally**:
   ```bash
   cd src/frontend
   npm install
   npm run build
   ```

2. **Upload to Vercel**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Drag and drop the `.next` folder

## Configuration Files

### vercel.json Configuration

The project includes a `vercel.json` file with optimized settings:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "rewrites": [
    {
      "source": "/api/upload/:path*",
      "destination": "https://your-backend-url.railway.app/api/upload/:path*"
    },
    {
      "source": "/api/notifications/:path*",
      "destination": "https://your-backend-url.railway.app/api/notifications/:path*"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ],
  "functions": {
    "app/api/**/*.js": {
      "maxDuration": 30
    }
  },
  "regions": ["iad1"]
}
```

## Environment Variable Setup Guide

### 1. WalletConnect Project ID
1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a new project
3. Copy the Project ID
4. Set as `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

### 2. RPC Provider URLs
**Alchemy (Recommended)**:
1. Sign up at [alchemy.com](https://alchemy.com)
2. Create apps for each network:
   - Ethereum Mainnet
   - Sepolia Testnet
   - Polygon Mainnet
   - Mumbai Testnet
3. Copy the HTTP URLs
4. The Alchemy API key is already configured in the environment variables
5. **WalletConnect Project ID**: Create a free project at [cloud.walletconnect.com](https://cloud.walletconnect.com) and replace `your_walletconnect_project_id_here`
6. **Contract Addresses**: Currently set to Filecoin Calibration testnet. Deploy contracts to your target networks and update addresses
7. Get your Etherscan API keys from [etherscan.io](https://etherscan.io/apis) and [polygonscan.com](https://polygonscan.com/apis)

**Alternative Providers**:
- **Infura**: [infura.io](https://infura.io)
- **QuickNode**: [quicknode.com](https://quicknode.com)
- **Public RPCs**: Use with caution in production

### 3. Backend API URL
1. Deploy the backend to Railway/Render (see separate backend deployment guide)
2. Copy the deployed backend URL
3. Set as `NEXT_PUBLIC_API_URL` in **frontend** environment variables
4. Update the `vercel.json` rewrites with the correct backend URL

**Note**: The backend has its own separate set of environment variables (listed above) that should be configured in your backend deployment platform, not in Vercel.

## Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] WalletConnect Project ID obtained
- [ ] RPC provider URLs configured
- [ ] Backend deployed and URL updated
- [ ] Contract addresses verified

### Build Verification
- [ ] `npm run build` succeeds locally
- [ ] `npm run start` works locally
- [ ] All Web3 connections functional
- [ ] IPFS uploads working

### Post-Deployment
- [ ] Domain configured (if using custom domain)
- [ ] SSL certificate active
- [ ] All pages load correctly
- [ ] Wallet connection works
- [ ] Contract interactions functional
- [ ] File uploads to IPFS working

## Custom Domain Setup

1. **Add domain in Vercel**:
   - Go to Project Settings → Domains
   - Add your custom domain

2. **Configure DNS**:
   - Add CNAME record pointing to `cname.vercel-dns.com`
   - Or add A record pointing to Vercel's IP

3. **Update environment variables**:
   - Update `NEXT_PUBLIC_APP_URL` with your custom domain

## Troubleshooting

### Common Issues

**Build Failures**:
- Check all environment variables are set
- Verify Node.js version compatibility
- Check for TypeScript errors

**Web3 Connection Issues**:
- Verify WalletConnect Project ID
- Check RPC URLs are accessible
- Confirm contract addresses are correct

**IPFS Upload Failures**:
- Verify IPFS gateway URL
- Check backend API connectivity
- Confirm file size limits

### Performance Optimization

1. **Enable Analytics**:
   ```bash
   vercel env add VERCEL_ANALYTICS_ID
   ```

2. **Configure Caching**:
   - Static assets cached automatically
   - API routes cached based on headers

3. **Bundle Analysis**:
   ```bash
   npm run build -- --analyze
   ```

## Security Considerations

1. **Environment Variables**:
   - Never commit `.env.local` to git
   - Use `NEXT_PUBLIC_` prefix only for client-side variables
   - Keep sensitive keys server-side only

2. **Content Security Policy**:
   - Configured in `vercel.json` headers
   - Restricts external resource loading

3. **HTTPS Enforcement**:
   - Automatic on Vercel
   - Redirects HTTP to HTTPS

## Monitoring & Analytics

1. **Vercel Analytics**:
   - Automatic performance monitoring
   - Real user metrics

2. **Error Tracking**:
   - Consider integrating Sentry
   - Monitor Web3 transaction failures

3. **Usage Analytics**:
   - Track wallet connections
   - Monitor document uploads
   - Analyze user flows

## Support

For deployment issues:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test locally with production build
4. Review network connectivity

---

**Next Steps**: After frontend deployment, deploy the backend service and update the API URLs in your environment variables.