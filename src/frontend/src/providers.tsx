"use client";

import { WagmiProvider, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { defineChain } from "@reown/appkit/networks";

const queryClient = new QueryClient();

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID as string;
if (!projectId) {
  console.warn("VITE_REOWN_PROJECT_ID is not set. Wallet connection will not work.");
}

// Filecoin Calibration testnet chain definition
export const filecoinCalibration = defineChain({
  id: 314159,
  caipNetworkId: "eip155:314159",
  chainNamespace: "eip155",
  name: "Filecoin Calibration",
  nativeCurrency: { decimals: 18, name: "tFIL", symbol: "tFIL" },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_FILECOIN_CALIBRATION_RPC || "https://api.calibration.node.glif.io/rpc/v1"],
    },
  },
  blockExplorers: { default: { name: "Glif Explorer", url: "https://calibration.filscan.io/" } },
});

const networks = [filecoinCalibration];

// Configure Wagmi adapter
const wagmiAdapter = new WagmiAdapter({
  networks: networks as any,
  projectId,
  ssr: false,
  customRpcUrls: {
    "eip155:314159": [
      { url: import.meta.env.VITE_FILECOIN_CALIBRATION_RPC || "https://api.calibration.node.glif.io/rpc/v1" },
    ] as any,
  },
  transports: {
    [filecoinCalibration.id]: http(
      import.meta.env.VITE_FILECOIN_CALIBRATION_RPC || "https://api.calibration.node.glif.io/rpc/v1"
    ),
  },
});

// Export wagmi config for use in contract reads/writes
export const wagmiConfig = wagmiAdapter.wagmiConfig;

// Create AppKit modal
if (projectId) {
  const appUrl = (typeof window !== "undefined" && window.location.origin)
    ? window.location.origin
    : (import.meta.env.DEV ? "http://localhost:3000" : "https://sealguard.netlify.app");

  createAppKit({
    adapters: [wagmiAdapter],
    networks: networks as any,
    projectId,
    customRpcUrls: {
      "eip155:314159": [
        { url: import.meta.env.VITE_FILECOIN_CALIBRATION_RPC || "https://api.calibration.node.glif.io/rpc/v1" },
      ] as any,
    },
    metadata: {
      name: "SealGuard",
      description: "Blockchain Document Verification",
      url: appUrl,
      icons: [`${appUrl}/icon.png`],
    },
    features: {
      analytics: true,
    },
  });
} else {
  console.error("AppKit initialization failed: Missing project ID");
}

export default function AppKitProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}