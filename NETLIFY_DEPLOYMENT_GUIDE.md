# SealGuard Netlify Deployment Guide

This guide will help you deploy the SealGuard frontend application to Netlify with all necessary environment variables.

## Prerequisites

1. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
2. **GitHub Repository**: Your SealGuard code should be in a GitHub repository
3. **WalletConnect Project ID**: Get one from [Reown Cloud](https://cloud.reown.com/) (formerly WalletConnect)

## Step 1: Connect Repository to Netlify

1. Log into your Netlify dashboard
2. Click "New site from Git"
3. Choose GitHub and authorize Netlify
4. Select your SealGuard repository
5. Configure build settings:
   - **Build command**: `cd src/frontend && npm run build`
   - **Publish directory**: `src/frontend/dist`
   - **Node version**: 18 (set in netlify.toml)

## Step 2: Environment Variables Setup

Go to your Netlify site settings → Environment variables and add the following:

### Required Environment Variables

```bash
# Web3 Configuration (REQUIRED)
NEXT_PUBLIC_REOWN_PROJECT_ID=your_reown_project_id_here

# Contract Addresses - Filecoin Calibration Testnet
NEXT_PUBLIC_REGISTRY_CONTRACT=0xcBB12aBDA134ac0444f2aa41E98EDD57f8D5631F
NEXT_PUBLIC_ACCESS_CONTROL_CONTRACT=0xF565086417Bf8ba76e4FaFC9F0088818eA027539
NEXT_PUBLIC_MULTISIG_CONTRACT=0xa6e75e7bFc73c44C16aaec914e340843a6A66Df8

# Network Configuration
NEXT_PUBLIC_DEFAULT_CHAIN_ID=314159
NEXT_PUBLIC_NETWORK_NAME=Filecoin Calibration

# Filecoin RPC (Optional - has fallback)
NEXT_PUBLIC_FILECOIN_CALIBRATION_RPC=https://api.calibration.node.glif.io/rpc/v1

# Application Settings
NEXT_PUBLIC_APP_NAME=SealGuard
NEXT_PUBLIC_APP_DESCRIPTION=Decentralized Document Verification Platform
NEXT_PUBLIC_APP_URL=https://your-site-name.netlify.app

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_ONRAMP=true
NEXT_PUBLIC_DEBUG_MODE=false

# IPFS Configuration
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
NEXT_PUBLIC_FILECOIN_RPC=https://api.node.glif.io
```

### Optional Environment Variables (for multi-chain support)

```bash
# RPC URLs for other networks (if needed)
NEXT_PUBLIC_ETHEREUM_RPC=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
NEXT_PUBLIC_SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
NEXT_PUBLIC_POLYGON_RPC=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
NEXT_PUBLIC_MUMBAI_RPC=https://polygon-mumbai.g.alchemy.com/v2/YOUR_API_KEY

# Contract Verification (Development only)
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
```

## Step 3: Critical Configuration Steps

### 1. Get Your Reown Project ID
1. Go to [Reown Cloud](https://cloud.reown.com/)
2. Create a new project
3. Copy the Project ID
4. Add it as `NEXT_PUBLIC_REOWN_PROJECT_ID` in Netlify

### 2. Update App URL
- Replace `NEXT_PUBLIC_APP_URL` with your actual Netlify domain
- Example: `https://sealguard-app.netlify.app`

### 3. Configure Domain (Optional)
- In Netlify: Site settings → Domain management
- Add your custom domain if you have one

## Step 4: Deploy

1. Click "Deploy site" in Netlify
2. Wait for the build to complete
3. Check the deploy logs for any errors
4. Visit your site URL to test

## Step 5: Testing Your Deployment

After deployment, test these features:

1. **Wallet Connection**: Try connecting a wallet (MetaMask, WalletConnect)
2. **Network Switching**: Ensure it connects to Filecoin Calibration
3. **Contract Interaction**: Test document upload/verification
4. **IPFS Access**: Verify file uploads work

## Troubleshooting

### Common Issues:

1. **Build Fails**:
   - Check Node.js version (should be 18)
   - Verify all dependencies are in package.json
   - Check build logs for specific errors

2. **Wallet Connection Issues**:
   - Verify `NEXT_PUBLIC_REOWN_PROJECT_ID` is correct
   - Check browser console for errors
   - Ensure domain is added to Reown project settings

3. **Contract Interaction Fails**:
   - Verify contract addresses are correct
   - Check network configuration
   - Ensure RPC URLs are accessible

4. **IPFS Upload Issues**:
   - Verify IPFS gateway URLs
   - Check network connectivity
   - Test with different IPFS providers if needed

### Build Command Issues:
If the build fails, try these alternative commands in Netlify:
- `npm ci && npm run build` (if using package-lock.json)
- `cd src/frontend && npm ci && npm run build`

## Security Notes

- All `NEXT_PUBLIC_` variables are exposed to clients
- Never include private keys or sensitive data
- Use your own API keys for production (Alchemy, Infura, etc.)
- The provided API keys are for demonstration only

## Post-Deployment

1. **Monitor**: Check Netlify analytics and logs
2. **Update**: Keep dependencies updated
3. **Backup**: Ensure your environment variables are documented
4. **Scale**: Consider upgrading Netlify plan for production traffic

---

**Need Help?** Check the Netlify documentation or contact support if you encounter issues during deployment.