import { http, createConfig } from "wagmi";
import { mainnet } from "wagmi/chains";
import { createPublicClient } from "viem";
import { FILECOIN_CALIBRATION_CHAIN_ID } from "@/lib/contracts";

export const filecoinCalibration = {
  id: FILECOIN_CALIBRATION_CHAIN_ID,
  name: "Filecoin Calibration",
  nativeCurrency: { name: "tFIL", symbol: "tFIL", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_FILECOIN_CALIBRATION_RPC ||
          "https://api.calibration.node.glif.io/rpc/v1",
      ],
    },
    public: {
      http: [
        process.env.NEXT_PUBLIC_FILECOIN_CALIBRATION_RPC ||
          "https://api.calibration.node.glif.io/rpc/v1",
      ],
    },
  },
  blockExplorers: {
    default: { name: "Filscan", url: "https://calibration.filfox.info/en" },
  },
} as const;

export const publicClient = createPublicClient({
  chain: filecoinCalibration,
  transport: http(),
});

export const wagmiConfig = createConfig({
  chains: [filecoinCalibration],
  transports: {
    [filecoinCalibration.id]: http(
      process.env.NEXT_PUBLIC_FILECOIN_CALIBRATION_RPC ||
        "https://api.calibration.node.glif.io/rpc/v1"
    ),
  },
});