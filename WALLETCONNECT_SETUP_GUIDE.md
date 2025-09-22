# Reown (formerly WalletConnect) Setup Guide

## Issue Resolution

The wallet connection and redirect issue has been fixed with the following changes:

### 1. Automatic SIWE Signing
- Modified `WalletConnect.tsx` to automatically trigger SIWE (Sign-In with Ethereum) signing after wallet connection
- Users no longer need to manually click "Sign Message" - it happens automatically

### 2. Improved Authentication Flow
- Updated login page to redirect immediately when wallet connects
- Enhanced dashboard to show authentication completion screen when SIWE signature is needed
- Eliminated stuck states where wallet connects but nothing happens

## Getting a Real Reown Project ID

The current placeholder project ID (`your-project-id`) causes 403 errors. Here's how to get a real one:

### Step 1: Create Reown Account
1. Go to [dashboard.reown.com](https://dashboard.reown.com) <mcreference link="https://docs.reown.com/cloud/relay" index="4">4</mcreference>
2. Sign up for a free account
3. Verify your email address

### Step 2: Create New Project
1. Click "Create New Project" in the dashboard
2. Enter project details:
   - **Project Name**: SealGuard
   - **Description**: Decentralized Document Verification Platform
   - **URL**: https://seal-guard.vercel.app
3. Click "Create Project"

### Step 3: Get Project ID
1. Copy the generated Project ID (format: `c4f79cc821944d9680842e34466bfbd`)
2. Update your environment variables:

```bash
NEXT_PUBLIC_REOWN_PROJECT_ID=your_actual_project_id_here
```

### Step 4: Update Vercel Environment Variables
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Update `NEXT_PUBLIC_REOWN_PROJECT_ID` with your real project ID
4. Redeploy your application

## Security Notes

- **Project ID is public**: <mcreference link="https://www.reddit.com/r/ethdev/comments/1bhks3y/walletconnectweb3modal_project_id/" index="1">1</mcreference> The Reown project ID is expected to be in the client-side code and doesn't need to be secured
- **Free tier available**: Reown offers a generous free tier for development and small projects
- **Create separate projects**: <mcreference link="https://docs.reown.com/cloud/relay" index="4">4</mcreference> Create a new project ID for each application

## Testing the Fix

1. **Local Development**: 
   - Update `.env.local` with real project ID
   - Restart development server: `npm run dev`
   - Test wallet connection at http://localhost:3000/login

2. **Production**: 
   - Update Vercel environment variables with `NEXT_PUBLIC_REOWN_PROJECT_ID`
   - Redeploy application
   - Test at https://seal-guard.vercel.app/login

## Expected Behavior After Fix

1. User clicks "Connect Wallet" on login page
2. Wallet connection modal opens
3. User connects wallet (MetaMask, WalletConnect, etc.)
4. **Automatic SIWE signing is triggered**
5. User signs the authentication message
6. **Immediate redirect to dashboard**
7. Dashboard shows full functionality

If SIWE signing fails or is cancelled, the dashboard will show a "Complete Authentication" screen prompting the user to sign again.