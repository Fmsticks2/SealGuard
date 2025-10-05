# SealGuard Render Deployment Guide

## Overview
This guide will help you deploy the SealGuard frontend application to Render. The backend functionality has been moved to a frontend service, so only the frontend needs to be deployed.

## Prerequisites
- GitHub repository with your SealGuard code
- Render account (free tier available)
- Required API keys and credentials

## Required Environment Variables

You'll need to set these environment variables in your Render dashboard:

### 1. WalletConnect Project ID
```
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
```
**How to get it:**
1. Go to https://cloud.walletconnect.com/
2. Create a new project or use existing one
3. Copy the Project ID from your project dashboard

### 2. Pinata JWT Token
```
VITE_PINATA_JWT=your_pinata_jwt_token_here
```
**How to get it:**
1. Go to https://app.pinata.cloud/
2. Navigate to API Keys section
3. Create a new API key
4. Copy the JWT token (starts with "eyJ...")
5. **Important:** Copy it immediately as it cannot be retrieved later

### 3. Smart Contract Address
```
VITE_CONTRACT_ADDRESS=your_deployed_contract_address_here
```
**How to get it:**
1. Deploy your smart contracts to Filecoin Calibration testnet
2. Copy the deployed contract address from the deployment output
3. Should look like: `0x1234567890abcdef1234567890abcdef12345678`

### 4. Filecoin RPC URL (Pre-configured)
```
VITE_FILECOIN_CALIBRATION_RPC=https://api.calibration.node.glif.io/rpc/v1
```
This is already set in the render.yaml file.

## Deployment Steps

### Step 1: Prepare Your Repository
1. Ensure your code is pushed to GitHub
2. Make sure the `render.yaml` file is in your repository root
3. Verify the `src/frontend` directory contains your React application

### Step 2: Create Render Service
1. Go to https://render.com/ and sign in
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` configuration

### Step 3: Configure Environment Variables
In the Render dashboard, add these environment variables:
- `VITE_WALLETCONNECT_PROJECT_ID`
- `VITE_PINATA_JWT`
- `VITE_CONTRACT_ADDRESS`

### Step 4: Deploy
1. Click "Create Web Service"
2. Render will automatically build and deploy your application
3. The build process will:
   - Install dependencies with `pnpm install`
   - Build the React app with `pnpm build`
   - Start the preview server

### Step 5: Verify Deployment
1. Once deployed, visit your Render URL
2. Test the application functionality:
   - Wallet connection
   - File upload
   - Document management
   - Dashboard functionality

## Build Configuration Details

The `render.yaml` file configures:
- **Build Command:** `cd src/frontend && pnpm install && pnpm build`
- **Start Command:** `cd src/frontend && pnpm preview --host 0.0.0.0 --port $PORT`
- **Environment:** Node.js
- **Plan:** Free tier
- **Auto-deploy:** Enabled for main branch

## Troubleshooting

### Build Failures
- Check that all environment variables are set correctly
- Verify your repository structure matches the expected layout
- Review build logs in Render dashboard

### Runtime Issues
- Ensure WalletConnect Project ID is valid
- Verify Pinata JWT token is correct and not expired
- Check that contract address is deployed and accessible

### Performance
- Free tier has limitations on build minutes and bandwidth
- Consider upgrading to paid plan for production use

## Frontend Service Architecture

The application now uses a frontend service (`MockDocumentService`) instead of a separate backend:
- No backend server required
- All document operations handled in the frontend
- Reduced deployment complexity
- Better performance for static hosting

## Security Notes

- Environment variables are securely managed by Render
- JWT tokens are not exposed in the client-side code
- All sensitive operations use environment variables
- HTTPS is automatically provided by Render

## Support

If you encounter issues:
1. Check Render build logs
2. Verify all environment variables are set
3. Test locally first with `pnpm dev`
4. Review the application console for errors

## Cost Estimation

**Free Tier Includes:**
- 750 build hours per month
- 100GB bandwidth per month
- Custom domains
- Automatic SSL certificates

**Paid Plans:** Start at $7/month for additional resources and features.