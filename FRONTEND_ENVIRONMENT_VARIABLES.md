# Frontend Environment Variables for Deployment

This document contains all the required environment variables for deploying the SealGuard frontend application.

## Core Web3 Configuration

### WalletConnect Integration
```bash
# Get your project ID from https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
```

### Smart Contract Addresses

#### Filecoin Calibration Testnet (Currently Deployed)
```bash
NEXT_PUBLIC_REGISTRY_CONTRACT=0xcBB12aBDA134ac0444f2aa41E98EDD57f8D5631F
NEXT_PUBLIC_ACCESS_CONTROL_CONTRACT=0xF565086417Bf8ba76e4FaFC9F0088818eA027539
NEXT_PUBLIC_MULTISIG_CONTRACT=0xa6e75e7bFc73c44C16aaec914e340843a6A66Df8
```

#### Other Networks (Deploy contracts first and update addresses)
```bash
# Ethereum Mainnet: NEXT_PUBLIC_REGISTRY_CONTRACT=0x...
# Sepolia Testnet: NEXT_PUBLIC_REGISTRY_CONTRACT=0x...
# Polygon Mainnet: NEXT_PUBLIC_REGISTRY_CONTRACT=0x...
```

## Network Configuration

```bash
# Default network settings
NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111
NEXT_PUBLIC_NETWORK_NAME=Sepolia
```

## RPC URLs

### Primary RPC URLs (Alchemy - Production Ready)
```bash
NEXT_PUBLIC_ETHEREUM_RPC=https://eth-mainnet.g.alchemy.com/v2/O6r4vg9nJLb0MLjOk1wTM
NEXT_PUBLIC_SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/O6r4vg9nJLb0MLjOk1wTM
NEXT_PUBLIC_POLYGON_RPC=https://polygon-mainnet.g.alchemy.com/v2/O6r4vg9nJLb0MLjOk1wTM
NEXT_PUBLIC_MUMBAI_RPC=https://polygon-mumbai.g.alchemy.com/v2/O6r4vg9nJLb0MLjOk1wTM
```

### Alternative Public RPC URLs (Backup Options)
```bash
# NEXT_PUBLIC_ETHEREUM_RPC=https://cloudflare-eth.com
# NEXT_PUBLIC_SEPOLIA_RPC=https://rpc.sepolia.org
# NEXT_PUBLIC_POLYGON_RPC=https://polygon-rpc.com
# NEXT_PUBLIC_MUMBAI_RPC=https://rpc-mumbai.maticvigil.com
```

## API Keys for Contract Verification

```bash
# Required for contract verification during development
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
```

## IPFS/Filecoin Configuration

```bash
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
NEXT_PUBLIC_FILECOIN_RPC=https://api.node.glif.io
```

## Application Settings

```bash
NEXT_PUBLIC_APP_NAME=SealGuard
NEXT_PUBLIC_APP_DESCRIPTION=Decentralized Document Verification Platform
NEXT_PUBLIC_APP_URL=https://sealguard.netlify.app
```

## Feature Flags & Development Settings

```bash
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_ONRAMP=true
NEXT_PUBLIC_DEBUG_MODE=false
```

## Deployment Instructions

### For Vercel Deployment

1. **Copy the environment variables** from above into your Vercel project settings
2. **Update the following critical variables:**
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Get from [WalletConnect Cloud](https://cloud.walletconnect.com/)
   - `NEXT_PUBLIC_APP_URL`: Replace with your actual Vercel domain
   - RPC URLs: Consider using your own Alchemy/Infura API keys for production

3. **Network-specific deployment:**
   - For **Filecoin**: Use the provided contract addresses
   - For **Ethereum/Polygon**: Deploy contracts first and update addresses

### Security Notes

- All `NEXT_PUBLIC_` prefixed variables are exposed to the client-side
- Never include sensitive information in public environment variables
- The provided Alchemy API key is for demonstration - use your own for production
- API keys for Etherscan/Polygonscan are only needed for contract verification

### Testing the Configuration

1. Set up the environment variables in your deployment platform
2. Deploy the application
3. Test wallet connection functionality
4. Verify contract interactions work correctly
5. Check that IPFS gateway access is functional

---

**Note**: This configuration is based on the current `.env.example` file and includes actual deployed contract addresses for Filecoin Calibration Testnet.