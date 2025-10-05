# Netlify Environment Variables for SealGuard Frontend

This comprehensive guide covers all environment variables required for deploying the SealGuard frontend application to Netlify.

## Quick Setup

### Required Environment Variables

Copy these variables to your Netlify site settings → Environment Variables:

```bash
# REQUIRED - Wallet Connection
VITE_REOWN_PROJECT_ID=e9b8bea6c20127785f5864276a38fa3d

# REQUIRED - Filecoin Network RPC
VITE_FILECOIN_CALIBRATION_RPC=https://api.calibration.node.glif.io/rpc/v1

# REQUIRED - IPFS Storage Token
VITE_WEB3_STORAGE_TOKEN=did:key:z6MksXW24FNBHNKU8CPXu4B6HSL9bmyRMrJpejznmXcWN1Pr
```

## Detailed Environment Variables Reference

### 🔐 Authentication & Wallet Connection

#### `VITE_REOWN_PROJECT_ID` (Required)
- **Purpose**: Enables WalletConnect v2 functionality for wallet connections
- **Source**: [Reown Cloud Dashboard](https://cloud.reown.com/)
- **Format**: 32-character hexadecimal string
- **Example**: `e9b8bea6c20127785f5864276a38fa3d`
- **Security**: Public (exposed to client-side)

**Setup Instructions:**
1. Visit [cloud.reown.com](https://cloud.reown.com/)
2. Create a new project or use existing
3. Copy the Project ID from your dashboard
4. Add to Netlify environment variables

### 🌐 Blockchain Network Configuration

#### `VITE_FILECOIN_CALIBRATION_RPC` (Required)
- **Purpose**: RPC endpoint for Filecoin Calibration Testnet
- **Default**: `https://api.calibration.node.glif.io/rpc/v1`
- **Chain ID**: 314159
- **Format**: HTTPS URL
- **Security**: Public (exposed to client-side)

**Alternative RPC Endpoints:**
```bash
# Primary (Recommended)
VITE_FILECOIN_CALIBRATION_RPC=https://api.calibration.node.glif.io/rpc/v1

# Alternative endpoints
VITE_FILECOIN_CALIBRATION_RPC=https://calibration.filfox.info/rpc/v1
VITE_FILECOIN_CALIBRATION_RPC=https://filecoin-calibration.chainup.net/rpc/v1
```

### 📁 Storage & IPFS Configuration

#### `VITE_WEB3_STORAGE_TOKEN` (Required)
- **Purpose**: Authentication token for Storacha (Web3.Storage) IPFS uploads
- **Source**: [Storacha Console](https://console.storacha.network/)
- **Format**: DID key format (`did:key:z...`)
- **Example**: `did:key:z6MksXW24FNBHNKU8CPXu4B6HSL9bmyRMrJpejznmXcWN1Pr`
- **Security**: Public but rate-limited (exposed to client-side)

**Setup Instructions:**
1. Visit [console.storacha.network](https://console.storacha.network/)
2. Create account and verify email
3. Generate a new API token
4. Copy the DID key format token
5. Add to Netlify environment variables

### 🏗️ Smart Contract Addresses (Hardcoded)

The following contract addresses are hardcoded in the application for Filecoin Calibration Testnet:

```typescript
// These are NOT environment variables - they're hardcoded in the app
SealGuardRegistry: 0xcBB12aBDA134ac0444f2aa41E98EDD57f8D5631F
SealGuardAccessControl: 0xF565086417Bf8ba76e4FaFC9F0088818eA027539
SealGuardMultiSig: 0xa6e75e7bFc73c44C16aaec914e340843a6A66Df8
```

## Environment-Specific Configurations

### Development Environment
```bash
# Local development (.env.local)
VITE_REOWN_PROJECT_ID=your_dev_project_id
VITE_FILECOIN_CALIBRATION_RPC=https://api.calibration.node.glif.io/rpc/v1
VITE_WEB3_STORAGE_TOKEN=your_dev_storage_token
```

### Staging Environment
```bash
# Staging deployment
VITE_REOWN_PROJECT_ID=your_staging_project_id
VITE_FILECOIN_CALIBRATION_RPC=https://api.calibration.node.glif.io/rpc/v1
VITE_WEB3_STORAGE_TOKEN=your_staging_storage_token
```

### Production Environment
```bash
# Production deployment
VITE_REOWN_PROJECT_ID=your_production_project_id
VITE_FILECOIN_CALIBRATION_RPC=https://api.calibration.node.glif.io/rpc/v1
VITE_WEB3_STORAGE_TOKEN=your_production_storage_token
```

## Netlify Deployment Setup

### Step 1: Access Environment Variables
1. Go to your Netlify site dashboard
2. Navigate to **Site Settings** → **Environment Variables**
3. Click **Add a variable**

### Step 2: Add Required Variables
Add each variable individually:

```bash
# Variable 1
Key: VITE_REOWN_PROJECT_ID
Value: e9b8bea6c20127785f5864276a38fa3d
Scopes: All scopes

# Variable 2
Key: VITE_FILECOIN_CALIBRATION_RPC
Value: https://api.calibration.node.glif.io/rpc/v1
Scopes: All scopes

# Variable 3
Key: VITE_WEB3_STORAGE_TOKEN
Value: did:key:z6MksXW24FNBHNKU8CPXu4B6HSL9bmyRMrJpejznmXcWN1Pr
Scopes: All scopes
```

### Step 3: Deploy and Verify
1. **Trigger a new deployment** (environment variables require rebuild)
2. **Check build logs** for any missing variable errors
3. **Test wallet connection** on deployed site
4. **Verify IPFS uploads** work correctly

## Security Considerations

### ✅ Safe Practices
- **All variables are client-side exposed** (prefixed with `VITE_`)
- **Use different tokens** for development, staging, and production
- **Rotate tokens regularly** (every 90 days recommended)
- **Monitor usage** in Storacha dashboard for unusual activity

### ⚠️ Important Notes
- **Never commit** `.env` files to version control
- **Web3.Storage tokens** are rate-limited but publicly visible
- **Reown Project IDs** are safe to expose publicly
- **RPC endpoints** are public infrastructure

### 🔒 Token Management
```bash
# Development tokens (lower limits)
VITE_WEB3_STORAGE_TOKEN=did:key:z6Mk...dev_token

# Production tokens (higher limits)
VITE_WEB3_STORAGE_TOKEN=did:key:z6Mk...prod_token
```

## Troubleshooting

### Common Issues

#### 1. Wallet Connection Fails
**Error**: "WalletConnect initialization failed"
**Solution**: 
- Verify `VITE_REOWN_PROJECT_ID` is set correctly
- Check Reown project is active in dashboard
- Ensure no extra spaces in environment variable

#### 2. IPFS Upload Fails
**Error**: "Failed to upload to IPFS" or "Storage token invalid"
**Solution**:
- Verify `VITE_WEB3_STORAGE_TOKEN` format (must start with `did:key:`)
- Check token is active in Storacha console
- Verify rate limits haven't been exceeded

#### 3. Network Connection Issues
**Error**: "Failed to connect to Filecoin network"
**Solution**:
- Test RPC endpoint manually: `curl https://api.calibration.node.glif.io/rpc/v1`
- Try alternative RPC endpoints
- Check if endpoint is rate-limited

#### 4. Build Failures
**Error**: "Environment variable not found during build"
**Solution**:
- Ensure all variables are set in Netlify dashboard
- Trigger a new deployment after adding variables
- Check variable names match exactly (case-sensitive)

### Debugging Commands

```bash
# Test RPC endpoint
curl -X POST https://api.calibration.node.glif.io/rpc/v1 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Expected response: {"jsonrpc":"2.0","id":1,"result":"0x4cb2f"}
```

### Environment Variable Validation

Add this to your application for debugging:

```typescript
// Debug environment variables (remove in production)
console.log('Environment Variables Check:');
console.log('VITE_REOWN_PROJECT_ID:', import.meta.env.VITE_REOWN_PROJECT_ID ? '✅ Set' : '❌ Missing');
console.log('VITE_FILECOIN_CALIBRATION_RPC:', import.meta.env.VITE_FILECOIN_CALIBRATION_RPC ? '✅ Set' : '❌ Missing');
console.log('VITE_WEB3_STORAGE_TOKEN:', import.meta.env.VITE_WEB3_STORAGE_TOKEN ? '✅ Set' : '❌ Missing');
```

## Advanced Configuration

### Custom RPC Configuration
For better performance or reliability, you can use custom RPC endpoints:

```bash
# Alchemy (requires API key)
VITE_FILECOIN_CALIBRATION_RPC=https://filecoin-calibration.g.alchemy.com/v2/YOUR_API_KEY

# Infura (requires API key)
VITE_FILECOIN_CALIBRATION_RPC=https://filecoin-calibration.infura.io/v3/YOUR_PROJECT_ID
```

### Multiple Environment Support
```bash
# Branch-specific deployments
# main branch (production)
VITE_REOWN_PROJECT_ID=prod_project_id

# develop branch (staging)
VITE_REOWN_PROJECT_ID=staging_project_id

# feature branches (development)
VITE_REOWN_PROJECT_ID=dev_project_id
```

## Monitoring and Maintenance

### Regular Checks
- **Monthly**: Review Storacha usage and costs
- **Quarterly**: Rotate Web3.Storage tokens
- **As needed**: Update RPC endpoints if performance degrades

### Usage Monitoring
1. **Storacha Dashboard**: Monitor upload volume and costs
2. **Netlify Analytics**: Track deployment success rates
3. **Browser Console**: Check for client-side errors

### Backup Strategy
```bash
# Document your current environment variables
echo "Current Netlify Environment Variables:" > netlify-env-backup.txt
echo "VITE_REOWN_PROJECT_ID=your_current_value" >> netlify-env-backup.txt
echo "VITE_FILECOIN_CALIBRATION_RPC=your_current_value" >> netlify-env-backup.txt
echo "VITE_WEB3_STORAGE_TOKEN=your_current_value" >> netlify-env-backup.txt
```

## Support Resources

### Documentation Links
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Reown (WalletConnect) Documentation](https://docs.reown.com/)
- [Storacha Documentation](https://docs.storacha.network/)
- [Filecoin Calibration Testnet](https://docs.filecoin.io/networks/calibration/)

### Getting Help
- **Netlify Support**: [support.netlify.com](https://support.netlify.com/)
- **Reown Discord**: [discord.gg/walletconnect](https://discord.gg/walletconnect)
- **Filecoin Slack**: [filecoin.io/slack](https://filecoin.io/slack)

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Testnet**: Filecoin Calibration (Chain ID: 314159)