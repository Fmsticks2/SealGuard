# Web3-Native Document Upload & Verification Flow

## Overview

This document outlines the complete user journey for uploading documents to SealGuard and obtaining cryptographic verification through Web3-native blockchain and IPFS integration.

## Primary User Flow: Web3 Document Upload to Verification

### Step 1: Web3 Wallet Authentication

**User Actions:**
1. Navigate to SealGuard Web3 application
2. Click "Connect Wallet" button
3. Select preferred wallet (MetaMask, WalletConnect, etc.)
4. Sign SIWE (Sign-in with Ethereum) message for authentication

**System Actions:**
- Detect available Web3 wallets
- Generate SIWE authentication message
- Verify wallet signature cryptographically
- Load user dashboard based on wallet address
- Fetch on-chain document registry for user

**UI Elements:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ SealGuard - Web3 Authentication                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   🔗 Connect your Web3 wallet to get started                      │
│                                                                     │
│   [🦊 MetaMask]     [🔗 WalletConnect]                            │
│                                                                     │
│   [🏦 Coinbase]     [🌈 Rainbow]                                  │
│                                                                     │
│   Status: Wallet detected ✅                                       │
│   Address: 0x742d...4e2f                                           │
│                                                                     │
│   [Sign Message to Authenticate]                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 2: Decentralized File Upload Initiation

**User Actions:**
1. Click "Upload New Document" button
2. Select files via drag-and-drop or file browser
3. Review file details and estimated gas costs
4. Confirm upload and smart contract registration

**System Actions:**
- Validate file types and sizes
- Generate cryptographic file hashes
- Prepare IPFS upload and smart contract transaction
- Initialize client-side encryption before IPFS upload

**UI Elements:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Upload to IPFS & Register on Blockchain            [X Close]       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                             │   │
│   │     📁 Drag and drop files here                            │   │
│   │        Files will be encrypted and stored on IPFS          │   │
│   │                                                             │   │
│   │     Supported: PDF, DOCX, TXT, CSV, JPG, PNG              │   │
│   │     Max size: 100MB per file                               │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   Selected Files:                                                   │
│   • Medical_Record_001.pdf (2.1 MB) - Hash: 7d865e...             │
│   • Transaction_Log.csv (15.3 MB) - Hash: a1b2c3...               │
│                                                                     │
│   💰 Estimated Gas Cost: 0.0045 ETH (~$12.50)                     │
│   🌐 Network: Ethereum Mainnet                                     │
│                                                                     │
│   [Cancel] [Upload to IPFS & Register]                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 3: IPFS Upload & Blockchain Transaction

**User Actions:**
- Monitor IPFS upload progress
- Confirm blockchain transaction in wallet
- View real-time status updates

**System Actions:**
1. **File Encryption:** AES-256 encryption applied client-side
2. **IPFS Upload:** Encrypted file uploaded to IPFS network
3. **CID Generation:** Content Identifier (CID) generated by IPFS
4. **Smart Contract Call:** Register document metadata on blockchain
5. **Transaction Confirmation:** Wait for blockchain confirmation

**Progress Indicators:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ IPFS Upload & Blockchain Registration Progress                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Medical_Record_001.pdf                                              │
│ ████████████████████████████████████████████████████ 100%          │
│ ✓ Encrypted and uploaded to IPFS                                   │
│ 📋 CID: bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55f     │
│                                                                     │
│ Transaction_Log.csv                                                 │
│ ████████████████████████████████████████████████████ 100%          │
│ ✓ Encrypted and uploaded to IPFS                                   │
│ 📋 CID: bafybeihdwdcefgh4dqkjv67uowdwcj6axjqbbyrd5hohs6lw4kej8dprgm │
│                                                                     │
│ 🔗 Blockchain Transaction: 0x1a2b3c4d5e6f... (Pending confirmation) │
│ ⏳ Status: Waiting for 3 block confirmations...                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 4: Blockchain Confirmation & Event Processing

**User Actions:**
- Monitor transaction status in dashboard
- Receive notifications when blockchain confirms registration

**System Actions:**
1. **Transaction Mining:** Blockchain miners process the transaction
2. **Block Confirmation:** Transaction included in confirmed block
3. **Event Emission:** Smart contract emits DocumentRegistered event
4. **Index Update:** Frontend updates document registry from blockchain
5. **Notification Trigger:** User notified of successful registration

**Status Updates:**
```
Blockchain Processing Stages:
1. Transaction Submitted   ⏳ (0-30 seconds)
2. Pending in Mempool     ⏳ (30 seconds - 2 minutes)
3. Block Inclusion        ⏳ (2-5 minutes)
4. Confirmation (3 blocks) ⏳ (5-15 minutes)
5. Registration Complete   ✅ (15-20 minutes)
```

### Step 5: Smart Contract Verification & On-Chain Proof

**User Actions:**
- View blockchain registration status
- Access on-chain verification proofs
- Download cryptographic certificates

**System Actions:**
1. **Smart Contract Storage:** Document metadata permanently stored on-chain
2. **Cryptographic Proof:** Hash-based integrity proof generated
3. **Immutable Record:** Tamper-proof blockchain record created
4. **Event Indexing:** Document registry updated with new entry

**On-Chain Proof Details:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Blockchain Verification Proof - Medical_Record_001.pdf             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Document Hash: 7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3bb │
│ IPFS CID: bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55f     │
│ Block Number: 18,945,123                                            │
│ Transaction: 0x1a2b3c4d5e6f789012345678901234567890abcdef123456789  │
│ Timestamp: 2024-01-15 14:30:22 UTC                                 │
│ Gas Used: 85,432                                                    │
│ Owner: 0x742d35Cc6634C0532925a3b8D4e2f                             │
│                                                                     │
│ [View on Etherscan] [Verify Integrity] [Download Certificate]      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 6: Decentralized Verification & Access

**User Actions:**
1. View document in Web3 dashboard
2. Verify integrity through blockchain queries
3. Access files via IPFS gateway
4. Generate on-chain audit reports

**System Actions:**
- Query smart contract for document metadata
- Verify IPFS content against on-chain hashes
- Generate cryptographic integrity proofs
- Compile blockchain-based audit trails

## Alternative Flows

### Bulk Upload Flow

**Scenario:** User needs to upload multiple documents simultaneously

**Modified Steps:**
1. Select multiple files (up to 50 at once)
2. Batch processing with progress tracking
3. Individual status monitoring for each file
4. Bulk verification report generation

**UI Modifications:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Bulk Upload Progress (15 files)                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Overall Progress: ████████████████████████████████████ 73% (11/15) │
│                                                                     │
│ ✅ Medical_Record_001.pdf - Sealed                                 │
│ ✅ Medical_Record_002.pdf - Sealed                                 │
│ ⏳ Medical_Record_003.pdf - Processing                             │
│ ⏳ Medical_Record_004.pdf - Queued                                 │
│ ⏳ Medical_Record_005.pdf - Queued                                 │
│                                                                     │
│ [View All] [Pause] [Cancel Remaining]                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Error Handling Flow

**Scenario:** Upload or storage process encounters errors

**Error Types:**
1. **File Validation Errors:** Invalid file type, size exceeded
2. **Network Errors:** Connection timeout, upload failure
3. **Storage Errors:** Filecoin network issues, provider unavailable
4. **Verification Errors:** PDP proof generation failure

**Error Recovery:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️ Upload Error                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ File: Transaction_Log.csv                                           │
│ Error: Storage provider temporarily unavailable                     │
│                                                                     │
│ The file has been queued for retry. You will be notified when      │
│ storage is complete.                                                │
│                                                                     │
│ [Retry Now] [Cancel Upload] [Contact Support]                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Mobile Flow Considerations

### Responsive Design Adaptations

**Mobile Upload Interface:**
```
┌─────────────────────────┐
│ SealGuard              │
├─────────────────────────┤
│                         │
│ 📁 Upload Documents     │
│                         │
│ [Take Photo]            │
│ [Choose from Gallery]   │
│ [Browse Files]          │
│                         │
│ Recent Uploads:         │
│ • Doc1.pdf ✅          │
│ • Doc2.jpg ⏳          │
│                         │
└─────────────────────────┘
```

### Mobile-Specific Features

1. **Camera Integration:** Direct photo capture for document scanning
2. **Offline Queuing:** Queue uploads when network unavailable
3. **Push Notifications:** Real-time status updates
4. **Biometric Authentication:** Fingerprint/Face ID for secure access

## Integration Points

### API Endpoints

```javascript
// Upload initiation
POST /api/v1/documents/upload
{
  "filename": "medical_record.pdf",
  "fileSize": 2097152,
  "fileType": "application/pdf",
  "fileHash": "7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3bb"
}

// Status check
GET /api/v1/documents/{documentId}/status

// Verification proof
GET /api/v1/documents/{documentId}/proof
```

### Webhook Notifications

```javascript
// Storage completion webhook
{
  "event": "document.sealed",
  "documentId": "doc_123456789",
  "timestamp": "2024-01-15T14:30:22Z",
  "filecoinCid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55f",
  "proofHash": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890ab"
}
```

## Performance Metrics

### Target Performance

- **Upload Speed:** 10MB/s average
- **Processing Time:** 5-60 minutes depending on file size
- **Proof Generation:** 2-5 minutes after sealing
- **Dashboard Load:** <2 seconds
- **Status Updates:** Real-time via WebSocket

### Monitoring Points

1. **Upload Success Rate:** >99.5%
2. **Storage Success Rate:** >99.9%
3. **Proof Generation Success:** >99.9%
4. **Average Processing Time:** <30 minutes
5. **User Satisfaction:** >4.5/5 rating

This flow ensures users have a smooth, transparent experience while leveraging Filecoin's powerful storage and verification capabilities for maximum document integrity and compliance value.