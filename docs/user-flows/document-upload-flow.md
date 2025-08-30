# Document Upload & Verification Flow

## Overview

This document outlines the complete user journey for uploading documents to SealGuard and obtaining cryptographic verification through Filecoin Onchain Cloud integration.

## Primary User Flow: Document Upload to Verification

### Step 1: Authentication & Dashboard Access

**User Actions:**
1. Navigate to SealGuard web application
2. Enter credentials (email/password or SSO)
3. Complete two-factor authentication if enabled
4. Access main dashboard

**System Actions:**
- Validate credentials against user database
- Generate JWT token for session management
- Load user-specific dashboard with current storage metrics
- Display recent activity and document status

**UI Elements:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ SealGuard - Secure Login                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Email: [_________________________]                                │
│   Password: [_________________________]                             │
│                                                                     │
│   [ ] Remember me    [Forgot Password?]                            │
│                                                                     │
│   [Sign In with SSO] [Sign In]                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 2: File Selection & Upload Initiation

**User Actions:**
1. Click "Upload New Document" button
2. Select files via drag-and-drop or file browser
3. Review file details and metadata
4. Confirm upload initiation

**System Actions:**
- Validate file types and sizes
- Generate unique document IDs
- Create database records with "pending" status
- Initialize client-side encryption

**UI Elements:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Upload Documents                                        [X Close]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                             │   │
│   │     📁 Drag and drop files here                            │   │
│   │        or click to browse                                   │   │
│   │                                                             │   │
│   │     Supported: PDF, DOCX, TXT, CSV, JPG, PNG              │   │
│   │     Max size: 100MB per file                               │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   Selected Files:                                                   │
│   • Medical_Record_001.pdf (2.1 MB)                               │
│   • Transaction_Log.csv (15.3 MB)                                 │
│                                                                     │
│   [Cancel] [Upload Documents]                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 3: Client-Side Processing

**User Actions:**
- Monitor upload progress
- View real-time status updates

**System Actions:**
1. **File Encryption:** AES-256 encryption applied client-side
2. **Hash Generation:** SHA-256 hash calculated for integrity verification
3. **Metadata Extraction:** File type, size, creation date captured
4. **Chunked Upload:** Large files split into chunks for reliable transfer

**Progress Indicators:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Upload Progress                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Medical_Record_001.pdf                                              │
│ ████████████████████████████████████████████████████ 100%          │
│ ✓ Encrypted and uploaded                                            │
│                                                                     │
│ Transaction_Log.csv                                                 │
│ ████████████████████████████████████████████████████ 100%          │
│ ✓ Encrypted and uploaded                                            │
│                                                                     │
│ Status: Processing for Filecoin storage...                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 4: Filecoin Storage Processing

**User Actions:**
- Monitor storage status in dashboard
- Receive notifications when processing completes

**System Actions:**
1. **Synapse SDK Integration:** Files queued for Filecoin storage
2. **Storage Provider Selection:** Optimal providers chosen based on cost/performance
3. **Deal Negotiation:** Storage deals negotiated with selected providers
4. **Data Sealing:** Files sealed into Filecoin sectors
5. **CID Generation:** Content Identifier (CID) generated for each file

**Status Updates:**
```
Processing Stages:
1. Queued for Storage      ⏳ (0-2 minutes)
2. Provider Selection      ⏳ (2-5 minutes)
3. Deal Negotiation        ⏳ (5-15 minutes)
4. Data Sealing           ⏳ (15-45 minutes)
5. Storage Confirmation    ✅ (45-60 minutes)
```

### Step 5: PDP Proof Generation

**User Actions:**
- View proof generation status
- Access generated proofs

**System Actions:**
1. **Proof of Data Possession:** Cryptographic proof generated
2. **Blockchain Recording:** Proof hash recorded on Filecoin blockchain
3. **Verification Certificate:** Digital certificate created
4. **Database Update:** Document status updated to "sealed"

**Proof Details:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Verification Proof - Medical_Record_001.pdf                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Document Hash: 7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3bb │
│ Filecoin CID: bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55f │
│ Proof Hash: a1b2c3d4e5f6789012345678901234567890abcdef1234567890ab │
│ Timestamp: 2024-01-15 14:30:22 UTC                                 │
│ Storage Providers: 3 confirmed                                      │
│                                                                     │
│ [Download Certificate] [Verify Integrity] [View Details]           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 6: Verification & Access

**User Actions:**
1. View document in library
2. Verify current integrity status
3. Download verification certificates
4. Generate audit reports

**System Actions:**
- Real-time integrity verification
- Audit trail generation
- Certificate formatting
- Report compilation

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