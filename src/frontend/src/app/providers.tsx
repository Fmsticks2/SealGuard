"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react"; // create modal <mcreference link="https://docs.reown.com/appkit/react/core/installation" index="4">4</mcreference>
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi"; // wagmi adapter <mcreference link="https://docs.reown.com/appkit/react/core/installation" index="4">4</mcreference>
import { defineChain } from "@reown/appkit/networks"; // custom chain <mcreference link="https://docs.reown.com/appkit/react/core/custom-networks" index="3">3</mcreference>

const queryClient = new QueryClient(); // react-query client <mcreference link="https://docs.reown.com/appkit/react/core/installation" index="4">4</mcreference>

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID as string; // get from Reown dashboard <mcreference link="https://docs.reown.com/appkit/react/core/installation" index="4">4</mcreference>
if (!projectId) {
  console.warn("NEXT_PUBLIC_REOWN_PROJECT_ID is not set. Wallet connection will not work.");
}

// Filecoin Calibration testnet chain definition
export const filecoinCalibration = defineChain({
  id: 314159,
  caipNetworkId: "eip155:314159",
  chainNamespace: "eip155",
  name: "Filecoin Calibration",
  nativeCurrency: { decimals: 18, name: "tFIL", symbol: "tFIL" },
  blockExplorers: { default: { name: "Glif Explorer", url: "https://calibration.filscan.io/" } },
}); // Define custom network <mcreference link="https://docs.reown.com/appkit/react/core/custom-networks" index="3">3</mcreference>

const networks = [filecoinCalibration]; // use calibration only

// Configure Wagmi adapter
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
  customRpcUrls: {
    "eip155:314159": [
      process.env.NEXT_PUBLIC_FILECOIN_CALIBRATION_RPC || "https://api.calibration.node.glif.io/rpc/v1",
    ],
  },
});

// Export wagmi config for use in contract reads/writes
export const wagmiConfig = wagmiAdapter.wagmiConfig;

// Create AppKit modal
if (projectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata: {
      name: "SealGuard",
      description: "Secure document verification on Filecoin",
      url: "http://localhost:3000",
      icons: [
        "https://avatars.githubusercontent.com/u/179229932", // Reown example icon <mcreference link="https://docs.reown.com/appkit/react/core/installation" index="4">4</mcreference>
      ],
    },
  });
} else {
  console.warn("Reown AppKit not initialized: NEXT_PUBLIC_REOWN_PROJECT_ID missing");
}

export default function AppKitProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}> {/* Provide wagmi config */}
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}