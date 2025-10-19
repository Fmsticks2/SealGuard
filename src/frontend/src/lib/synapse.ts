import { Synapse, TOKENS, CONTRACT_ADDRESSES } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';

// Simple singleton to avoid multiple instances
let _synapse: Synapse | null = null;

function getEip1193ProviderFromWalletClient(walletClient: any): any {
  if (!walletClient) return null;
  // Create a minimal EIP-1193 shim from viem wallet client
  return {
    request: async ({ method, params }: { method: string; params?: any[] }) => {
      // viem walletClient has a request method via transport
      if (walletClient?.transport?.request) {
        return walletClient.transport.request({ method, params } as any);
      }
      // Fallback to walletClient.request if exposed
      if (walletClient?.request) {
        return walletClient.request({ method, params });
      }
      throw new Error('Wallet client transport does not support EIP-1193 request');
    },
  } as any;
}

export async function initSynapse(opts?: {
  walletClient?: any;
  rpcUrl?: string;
}): Promise<Synapse> {
  if (_synapse) return _synapse;

  let provider: ethers.Provider | undefined;

  // Prefer browser-injected provider
  const injected = (globalThis as any).ethereum;
  if (injected) {
    provider = new ethers.BrowserProvider(injected as any);
  } else if (opts?.walletClient) {
    const eip1193 = getEip1193ProviderFromWalletClient(opts.walletClient);
    if (eip1193) provider = new ethers.BrowserProvider(eip1193);
  }

  if (!provider) {
    const rpc = opts?.rpcUrl || import.meta.env.VITE_FILECOIN_CALIBRATION_RPC || 'https://api.calibration.node.glif.io/rpc/v1';
    provider = new ethers.JsonRpcProvider(rpc);
  }

  _synapse = await Synapse.create({ provider });
  return _synapse;
}

export async function getSynapse(): Promise<Synapse> {
  if (!_synapse) {
    _synapse = await Synapse.create({
      provider: new ethers.JsonRpcProvider(import.meta.env.VITE_FILECOIN_CALIBRATION_RPC || 'https://api.calibration.node.glif.io/rpc/v1'),
    });
  }
  return _synapse!;
}

// Helper: resolve native token symbol based on SDK network and enums
export async function getNativeTokenSymbol(): Promise<'FIL' | 'tFIL'> {
  const synapse = await getSynapse();
  const network = (synapse as any).getNetwork?.() || '';
  const n = String(network).toLowerCase();
  const isTestnet = ['calibration', 'hyperspace', 'testnet', 'wallaby'].some((s) => n.includes(s));
  if (isTestnet && (TOKENS as any).TFIL) return 'tFIL';
  return 'FIL';
}

// Deposit native FIL (tFIL on Calibration)
export async function depositUSDFC(amount: string): Promise<string> {
  const synapse = await getSynapse();
  const parsed = ethers.parseUnits(amount, 18);
  const filToken = (TOKENS as any).FIL ?? (TOKENS as any).TFIL;
  if (!filToken) throw new Error('Synapse SDK does not expose FIL/TFIL token enum');
  const tx = await (synapse as any).payments.deposit(parsed, filToken);
  return tx.hash;
}

// Account info is token-agnostic in recent SDK versions
export async function getUSDFCAccountInfo(): Promise<any> {
  const synapse = await getSynapse();
  const info = await (synapse as any).payments.accountInfo();
  return info;
}

export async function approveWarmStorage(rateAllowance: string, lockupAllowance: string): Promise<string> {
  const synapse = await getSynapse();
  const network = (synapse as any).getNetwork?.() || 'calibration';
  const addresses = (CONTRACT_ADDRESSES as any);
  const warmStorageAddr = (addresses.WARM_STORAGE && addresses.WARM_STORAGE[network])
    || (addresses.PANDORA_SERVICE && addresses.PANDORA_SERVICE[network]);
  if (!warmStorageAddr) throw new Error('Warm Storage service address not found for network');

  const rate = ethers.parseUnits(rateAllowance, 18);
  const lock = ethers.parseUnits(lockupAllowance, 18);
  const filToken = (TOKENS as any).FIL ?? (TOKENS as any).TFIL;
  if (!filToken) throw new Error('Synapse SDK does not expose FIL/TFIL token enum');
  const tx = await (synapse as any).payments.approveService(warmStorageAddr, rate, lock, filToken);
  return tx.hash;
}

export interface SynapseUploadResult {
  commp: string; // Piece CID (CommP)
  size?: number;
}

export async function uploadViaSynapse(file: File): Promise<SynapseUploadResult> {
  const synapse = await getSynapse();
  // Use high-level storage API; SDK exposes storage.upload(file) in recent versions
  const storage = (synapse as any).storage;
  if (!storage) throw new Error('Synapse storage service not available');

  const result = await storage.upload(file);
  // Expect result to include commp (Piece CID). Some versions may return { commp, dealId, provider }
  if (!result?.commp) {
    throw new Error('Upload did not return CommP');
  }
  return { commp: result.commp, size: (result.size as number) };
}