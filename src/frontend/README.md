# SealGuard Frontend (Vite + React)

This is the SealGuard frontend built with Vite + React and Wagmi/AppKit for wallet connectivity, plus Synapse SDK for payments and storage.

## Getting Started

```bash
# From the repo root
cd src/frontend
pnpm install
pnpm dev
```

- Vite serves locally on `http://localhost:3000/` by default.
- If `3000` is busy, Vite automatically picks the next free port (e.g., `3002`).
- App routes:
  - `/:` Home
  - `/dashboard:` Protected Dashboard (connect a wallet first)

## Required Environment Variables
Create `src/frontend/.env.local` (or set in your hosting platform):

```bash
# Wallet/AppKit (required for wallet connect)
VITE_REOWN_PROJECT_ID=your_appkit_project_id

# Filecoin Calibration RPC (used by wagmi + Synapse)
VITE_FILECOIN_CALIBRATION_RPC=https://api.calibration.node.glif.io/rpc/v1

# Pinata JWT for IPFS uploads (used by lib/filecoin.ts)
VITE_PINATA_JWT=your_pinata_jwt_token
```

## Wallet & Network
- Wallet connect is provided by AppKit + Wagmi.
- Default network is Filecoin Calibration (`eip155:314159`).
- RPC is configured from `VITE_FILECOIN_CALIBRATION_RPC`.

## Synapse Integration
Synapse SDK is initialized via the `useSynapse` hook.

```tsx
import { useSynapse } from '@/hooks/useSynapse';

function PaymentsExample() {
  const { ready, depositUSDFC, approveWarmStorage, getUSDFCAccountInfo } = useSynapse();
  // Call depositUSDFC('10.0'), approveWarmStorage('0.1', '5'), getUSDFCAccountInfo()
}
```

### Payments UI (Dashboard)
- Open `/dashboard` after connecting your wallet.
- In "Payments & Storage":
  - Enter an amount and click "Deposit" to deposit USDFC.
  - Set a rate and lockup allowance, then click "Approve Allowance" for warm storage.
  - Account info is shown (raw values converted to strings).

### Upload via Synapse
Use Synapse storage to upload and then register the document on-chain:

```tsx
import { uploadViaSynapse } from '@/lib/synapse';
import { useDocuments } from '@/hooks/useDocuments';

async function uploadAndRegister(file: File) {
  const { registerDocumentFromExternalUpload } = useDocuments();
  const result = await uploadViaSynapse(file); // { commp, size }
  await registerDocumentFromExternalUpload(result.commp, result.size ?? 0, {
    name: file.name,
    type: 'document'
  });
}
```

## Troubleshooting
- If wallet connect fails, ensure `VITE_REOWN_PROJECT_ID` is set.
- If Synapse shows "Initializing" for long, confirm wallet is connected and RPC is reachable.
- If uploads fail, verify `VITE_PINATA_JWT` and network connectivity.
