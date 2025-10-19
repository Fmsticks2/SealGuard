# SealGuard Latest Updates

Date: 2025-10-19

This document captures the most recent changes across the contracts and frontend, summarizes Synapse SDK usage throughout the project, and outlines the enterprise-grade design implementation now in place.

## Highlights
- Subscription contract and plans configured on Filecoin Calibration.
- Frontend now reads on-chain plan price and subscribes using the deployed address.
- Wallet connection via AppKit (WalletConnect) + Wagmi on Calibration.
- Synapse SDK integrated for payments, storage uploads, and service approvals.
- Enterprise-ready UI/UX patterns using Tailwind, error boundaries, and protected routes.

## Latest Changes
- Environment configuration
  - Set `VITE_SUBSCRIPTION_CONTRACT_ADDRESS=0x9CC47525a6C2f3e915D44cA785c7B11dE164AF07` in `src/frontend/.env.local`.
  - Confirmed `VITE_REOWN_PROJECT_ID` and `VITE_FILECOIN_CALIBRATION_RPC` are set for wallet connectivity and RPC.
- Contracts: plan configuration script
  - Added `contracts/scripts/configure-plans.js` to configure plan IDs, prices, and durations on the deployed `SubscriptionPayments` contract.
  - Defaults encoded in the script:
    - Starter (planId `1`): `STARTER_PRICE_FIL` default `"45"` tFIL, `STARTER_DURATION_DAYS` default `30` days
    - Professional (planId `2`): `PRO_PRICE_FIL` default `"150"` tFIL, `PRO_DURATION_DAYS` default `30` days
  - Override via environment variables when running:
    - `STARTER_PRICE_FIL`, `PRO_PRICE_FIL`, `STARTER_DURATION_DAYS`, `PRO_DURATION_DAYS`, `SUBSCRIPTION_CONTRACT_ADDRESS`
  - Example run:
    - `npx hardhat run --network filecoinCalibration contracts/scripts/configure-plans.js`
- Frontend: subscription flow
  - `src/frontend/src/lib/subscription.ts`
    - Uses `getPlanPrice(planId)` to retrieve on-chain plan price.
    - `subscribePlan(planId)` reads price then executes the subscription transaction.
  - `src/frontend/src/pages/Home.tsx`
    - Pricing buttons wired: Starter calls `handleSubscribe(1)`, Professional calls `handleSubscribe(2)`.
  - Dev server restarted and verified at `http://localhost:3001/`.

## Synapse SDK Usage
- Library wrapper: `src/frontend/src/lib/synapse.ts`
  - Imports: `@filoz/synapse-sdk` with `Synapse`, `TOKENS`, `CONTRACT_ADDRESSES`.
  - Initialization:
    - `initSynapse({ walletClient?, rpcUrl? })` creates a singleton using browser or RPC provider.
    - `getSynapse()` returns the initialized instance.
  - Helpers:
    - `getNativeTokenSymbol()` → returns `'FIL'` or `'tFIL'` based on network.
    - `depositUSDFC(amount: string)` → deposits native FIL/tFIL via Synapse payments API.
    - `getUSDFCAccountInfo()` → retrieves account info (token-agnostic in recent SDKs).
    - `approveWarmStorage(rateAllowance: string, lockupAllowance: string)` → approves service allowances for Warm Storage using FIL/tFIL.
    - `uploadViaSynapse(file: File)` → uploads via Synapse storage and returns `{ commp, size }`.
- React hook: `src/frontend/src/hooks/useSynapse.ts`
  - Binds to Wagmi’s `useWalletClient` and initializes Synapse on wallet availability.
  - Exposes: `depositUSDFC`, `approveWarmStorage`, `uploadViaSynapse`, `getUSDFCAccountInfo`, `getNativeTokenSymbol`.
- Component usage
  - `src/frontend/src/pages/Dashboard.tsx`
    - Payments & Storage section uses the hook to deposit, approve, and display account info.
  - `src/frontend/src/components/DocumentUpload.tsx`
    - Allows choosing `synapse` storage; if selected, uploads via `uploadViaSynapse` and registers the document with the app’s registry.
- Environment prerequisites
  - `VITE_FILECOIN_CALIBRATION_RPC` for RPC access.
  - `VITE_PINATA_JWT` still used for IPFS flows where relevant.

## Enterprise-Grade Design Implementation
- Wallet & access management
  - `Reown AppKit` + `Wagmi` integration for secure wallet auth.
  - `ProtectedRoute` gating the dashboard when wallet is not connected.
- Robust UI foundations
  - Tailwind CSS for responsive layout and consistent styling.
  - Lucide icons for clear visual feedback and status.
  - Error handling with `ErrorBoundary.tsx` to catch and report UI failures gracefully.
- Modular architecture
  - Separation of concerns across `components/`, `hooks/`, `lib/`, and `pages/`.
  - Contract interactions centralized under `src/frontend/src/lib/` with typed wrappers.
- Documentation & deployment readiness
  - Enterprise API docs: `api-documentation-enterprise.md` for integration clarity.
  - Multi-platform deployment guides (Render, Netlify, Vercel) and environment variable references.
  - Security and scalability docs to guide production hardening.

## Environment & Network
- Chain: Filecoin Calibration (`chainId=314159`).
- Wallet/AppKit: `VITE_REOWN_PROJECT_ID` required.
- RPC: `VITE_FILECOIN_CALIBRATION_RPC` set in `.env.local`.
- Subscription contract address: `VITE_SUBSCRIPTION_CONTRACT_ADDRESS` set to current deployment.

## How to Verify
- Frontend
  - `cd src/frontend && pnpm dev` → open `http://localhost:3001/`.
  - Connect a wallet via the AppKit button; ensure network is Calibration.
  - On Home, click pricing buttons; each should read the plan price via `getPlanPrice` and execute `subscribePlan`.
- Contracts
  - Verify plans using Hardhat console:
    - `npx hardhat --network filecoinCalibration console`
    - `const sub = await ethers.getContractAt("SubscriptionPayments", "0x9CC47525a6C2f3e915D44cA785c7B11dE164AF07")`
    - `await sub.plans(1)` and `await sub.plans(2)` to confirm price and duration.

## Notes
- Font preloading warnings were reviewed; `index.css` uses Geist font variables but `index.html` does not preload fonts. This can be optimized later if needed.
- If wallet connection or RPC fails, confirm `VITE_REOWN_PROJECT_ID` and `VITE_FILECOIN_CALIBRATION_RPC`.
- Adjust plan prices/durations via env when running `configure-plans.js`.