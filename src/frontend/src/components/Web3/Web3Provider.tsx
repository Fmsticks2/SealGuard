"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";
import { SiweMessage } from "siwe";
import { mainnet, sepolia, polygon, localhost } from "@reown/appkit/networks";

/**
 * Configuration (update env / metadata as needed)
 */
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "your-project-id";

const metadata = {
  name: "SealGuard",
  description: "Decentralized Document Verification Platform",
  url: "https://sealguard.app",
  icons: ["https://sealguard.app/icon.png"],
};

// Use predefined networks from AppKit
const networks = [mainnet, sepolia, polygon, localhost];

/**
 * Minimal AppKit type describing only the parts we use.
 * Replace with the real exported AppKit type when available.
 */
interface ProviderState {
  provider: unknown; // provider objects from wallets: keep as `unknown` and cast when needed
  address: string;
  chainId: number;
  isConnected: boolean;
}

interface ProvidersMap {
  eip155?: ProviderState;
  solana?: ProviderState;
  bip122?: ProviderState;
}

interface AppKitMinimal {
  subscribeProviders: (cb: (state: ProvidersMap) => void) => (() => void) | undefined;
  open?: () => Promise<void>;
  connect?: () => Promise<void>;
  openModal?: () => Promise<void>;
  disconnect?: () => Promise<void>;
}

/**
 * Domain types for context
 */
interface User {
  address: string;
  chainId: number;
  isConnected: boolean;
  ens?: string | null;
}

interface Session {
  address: string;
  chainId: number;
  message: string;
  signature: string;
  expiresAt: Date;
}

interface Web3ContextType {
  // state
  user: User | null;
  session: Session | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  isConnecting: boolean;
  isSigningIn: boolean;
  isAuthenticated: boolean;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // actions
  connectWallet: () => Promise<void>;
  signInWithEthereum: () => Promise<void>;
  disconnect: () => Promise<void>;
  clearError: () => void;

  // utilities
  formatAddress: (address: string, chars?: number) => string;
  switchChain: (chainId: number) => Promise<void>;
}

/**
 * Create and initialize appKit (typed with our minimal interface)
 */
const ethersAdapter = new EthersAdapter();

let appKit: AppKitMinimal | undefined;
try {
  // cast to AppKitMinimal to satisfy TS — replace with real type when available
  appKit = createAppKit({
    adapters: [ethersAdapter],
    networks: networks,
    metadata,
    projectId,
    features: { analytics: true },
    themeVariables: {
      '--w3m-font-family': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
  }) as unknown as AppKitMinimal;
  
  // Make appKit available globally for web3AuthService
  globalThis.appKit = appKit;
} catch (err) {
  // initialization failure will be handled inside the provider
  // keep appKit undefined in that case
  // eslint-disable-next-line no-console
  console.error("Failed to initialize AppKit:", err);
}

/**
 * React context
 */
const Web3Context = createContext<Web3ContextType | null>(null);

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!(user?.isConnected && session);
  const isConnected = !!user?.isConnected;

  // --- restore session from localStorage (client-only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sealguard_session");
      if (!saved) return;
      const parsed = JSON.parse(saved) as { expiresAt: string } & Omit<Session, "expiresAt">;
      if (new Date(parsed.expiresAt) > new Date()) {
        setSession({ ...parsed, expiresAt: new Date(parsed.expiresAt) });
      } else {
        localStorage.removeItem("sealguard_session");
      }
    } catch (err) {
      // invalid JSON or other issues
      // eslint-disable-next-line no-console
      console.error("Failed to restore session:", err);
      localStorage.removeItem("sealguard_session");
    }
  }, []);

  // --- subscribe to Reown AppKit providers
  useEffect(() => {
    if (!appKit) {
      setError("AppKit initialization failed");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let unsubscribeFn: (() => void) | undefined;

    try {
      if (typeof appKit.subscribeProviders === "function") {
        unsubscribeFn = appKit.subscribeProviders((state: ProvidersMap) => {
          const eip155 = state["eip155"];

          if (eip155?.isConnected && eip155.address && eip155.chainId && eip155.provider) {
            try {
              // We keep provider typed as unknown in ProviderState; cast when constructing BrowserProvider.
              // The cast is explicit — avoids implicit-any TS errors.
              const external = eip155.provider as unknown;
              const ethersProvider = new ethers.BrowserProvider(external as any); // runtime constructor needs the wallet provider shape
              setProvider(ethersProvider);

              // get signer (async)
              (async () => {
                try {
                  const s = await ethersProvider.getSigner();
                  setSigner(s);
                  setUser({
                    address: eip155.address,
                    chainId: eip155.chainId,
                    isConnected: true,
                  });
                  setIsLoading(false);
                } catch (err) {
                  // couldn't get signer
                  // eslint-disable-next-line no-console
                  console.error("Failed to get signer:", err);
                  setError("Failed to get signer");
                  setIsLoading(false);
                }
              })();
            } catch (err) {
              // failed to build ethers provider
              // eslint-disable-next-line no-console
              console.error("Error creating ethers provider:", err);
              setError("Failed to create provider");
              setIsLoading(false);
            }
          } else {
            // not connected (or provider removed)
            setProvider(null);
            setSigner(null);
            setUser(null);
            setSession(null);
            localStorage.removeItem("sealguard_session");
            setIsLoading(false);
          }
        });
      } else {
        setError("AppKit does not support subscribeProviders");
        setIsLoading(false);
      }
    } catch (err) {
      // unexpected runtime error during subscription setup
      // eslint-disable-next-line no-console
      console.error("Error setting up wallet subscription:", err);
      setError("Failed to setup wallet connection");
      setIsLoading(false);
    }

    return () => {
      if (typeof unsubscribeFn === "function") {
        try {
          unsubscribeFn();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Error during unsubscribe:", err);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- connect wallet
  const connectWallet = async (): Promise<void> => {
    if (!appKit) {
      setError("AppKit initialization failed");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      if (typeof appKit.open === "function") {
        await appKit.open();
      } else if (typeof appKit.connect === "function") {
        await appKit.connect();
      } else if (typeof appKit.openModal === "function") {
        await appKit.openModal();
      } else {
        throw new Error("No connection method available on AppKit");
      }
    } catch (err: unknown) {
      // use `unknown` then narrow
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error("Failed to connect wallet:", err);
      setError(message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  // --- SIWE sign-in
  const signInWithEthereum = async (): Promise<void> => {
    if (!user?.address || !provider || !signer) {
      setError("Wallet not connected");
      return;
    }
    if (!appKit) {
      setError("AppKit initialization failed");
      return;
    }

    try {
      setIsSigningIn(true);
      setError(null);

      const domain = window.location.host;
      const origin = window.location.origin;
      const statement = "Sign in to SealGuard with your Ethereum account.";
      const nonce = Math.random().toString(36).substring(2, 15);
      const expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

      const message = new SiweMessage({
        domain,
        address: user.address,
        statement,
        uri: origin,
        version: "1",
        chainId: user.chainId,
        nonce,
        expirationTime: expirationTime.toISOString(),
      });

      const messageString = message.prepareMessage();
      let signature: string;
      try {
        signature = await signer.signMessage(messageString);
      } catch (signErr: unknown) {
        const msg = signErr instanceof Error ? signErr.message : String(signErr);
        // eslint-disable-next-line no-console
        console.error("Error signing message:", signErr);
        setError(msg || "Failed to sign message");
        throw new Error(msg || "Failed to sign message");
      }

      // Verify signature
      const recoveredAddress = ethers.verifyMessage(messageString, signature);
      if (recoveredAddress.toLowerCase() !== user.address.toLowerCase()) {
        throw new Error("Signature verification failed");
      }

      const newSession: Session = {
        address: user.address,
        chainId: user.chainId,
        message: messageString,
        signature,
        expiresAt: expirationTime,
      };

      setSession(newSession);
      localStorage.setItem("sealguard_session", JSON.stringify(newSession));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error("Failed to sign in:", err);
      setError(message || "Failed to sign in");
    } finally {
      setIsSigningIn(false);
    }
  };

  // --- disconnect
  const disconnect = async (): Promise<void> => {
    try {
      if (appKit && typeof appKit.disconnect === "function") {
        await appKit.disconnect();
      }
      setUser(null);
      setSession(null);
      setProvider(null);
      setSigner(null);
      localStorage.removeItem("sealguard_session");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error("Failed to disconnect:", err);
      setError(message || "Failed to disconnect");
    }
  };

  // --- helpers
  const clearError = (): void => setError(null);

  const formatAddress = (address: string, chars = 4): string => {
    if (!address) return "";
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
  };

  const switchChain = async (chainId: number): Promise<void> => {
    try {
      if (!provider) throw new Error("No provider available");
      // provider.send exists on BrowserProvider instance
      await provider.send("wallet_switchEthereumChain", [{ chainId: `0x${chainId.toString(16)}` }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error("Failed to switch chain:", err);
      setError(message || "Failed to switch chain");
    }
  };

  const contextValue: Web3ContextType = {
    user,
    session,
    provider,
    signer,
    isConnecting,
    isSigningIn,
    isAuthenticated,
    isConnected,
    isLoading,
    error,
    connectWallet,
    signInWithEthereum,
    disconnect,
    clearError,
    formatAddress,
    switchChain,
  };

  return <Web3Context.Provider value={contextValue}>{children}</Web3Context.Provider>;
};

/**
 * Hook: useWeb3Context
 */
export const useWeb3Context = (): Web3ContextType => {
  const ctx = useContext(Web3Context);
  if (!ctx) {
    throw new Error("useWeb3Context must be used within a Web3Provider");
  }
  return ctx;
};

export default Web3Provider;
