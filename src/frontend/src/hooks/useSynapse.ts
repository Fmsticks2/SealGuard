import { useEffect, useMemo, useState } from 'react';
import { useWalletClient } from 'wagmi';
import { initSynapse, depositUSDFC, approveWarmStorage, uploadViaSynapse, getUSDFCAccountInfo, getNativeTokenSymbol } from '../lib/synapse';

export function useSynapse() {
  const { data: walletClient } = useWalletClient();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await initSynapse({ walletClient });
        if (mounted) setReady(true);
      } catch (e: any) {
        console.error('Failed to init Synapse', e);
        if (mounted) setError(e?.message || 'Failed to initialize Synapse');
      }
    })();
    return () => { mounted = false; };
  }, [walletClient]);

  const api = useMemo(() => ({
    depositUSDFC, // now deposits native tFIL via Synapse
    approveWarmStorage, // approves Warm Storage allowances in tFIL
    uploadViaSynapse,
    getUSDFCAccountInfo, // token-agnostic account info
    getNativeTokenSymbol, // FIL/tFIL indicator based on SDK
  }), []);

  return { ready, error, ...api };
}