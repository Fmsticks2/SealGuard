'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

// Web3Modal configuration
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id';

const metadata = {
  name: 'SealGuard',
  description: 'Decentralized Document Verification Platform',
  url: 'https://sealguard.app',
  icons: ['https://sealguard.app/icon.png']
};

const chains = [
  {
    chainId: 1,
    name: 'Ethereum',
    currency: 'ETH',
    explorerUrl: 'https://etherscan.io',
    rpcUrl: 'https://cloudflare-eth.com'
  },
  {
    chainId: 11155111,
    name: 'Sepolia',
    currency: 'ETH',
    explorerUrl: 'https://sepolia.etherscan.io',
    rpcUrl: 'https://rpc.sepolia.org'
  },
  {
    chainId: 137,
    name: 'Polygon',
    currency: 'MATIC',
    explorerUrl: 'https://polygonscan.com',
    rpcUrl: 'https://polygon-rpc.com'
  },
  {
    chainId: 80001,
    name: 'Mumbai',
    currency: 'MATIC',
    explorerUrl: 'https://mumbai.polygonscan.com',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com'
  }
];

// Create Reown AppKit instance
const ethersAdapter = new EthersAdapter();

const appKit = createAppKit({
  adapters: [ethersAdapter],
  networks: chains,
  metadata,
  projectId,
  features: {
    analytics: true,
    onramp: true
  }
});

// Types
interface User {
  address: string;
  chainId: number;
  isConnected: boolean;
  ens?: string;
}

interface Session {
  address: string;
  chainId: number;
  message: string;
  signature: string;
  expiresAt: Date;
}

interface Web3ContextType {
  // State
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
  
  // Actions
  connectWallet: () => Promise<void>;
  signInWithEthereum: () => Promise<void>;
  disconnect: () => Promise<void>;
  clearError: () => void;
  
  // Utilities
  formatAddress: (address: string, chars?: number) => string;
  switchChain: (chainId: number) => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | null>(null);

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
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

  // Initialize from localStorage
  useEffect(() => {
    const savedSession = localStorage.getItem('sealguard_session');
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession);
        if (new Date(parsedSession.expiresAt) > new Date()) {
          setSession({
            ...parsedSession,
            expiresAt: new Date(parsedSession.expiresAt)
          });
        } else {
          localStorage.removeItem('sealguard_session');
        }
      } catch (error) {
        console.error('Failed to parse saved session:', error);
        localStorage.removeItem('sealguard_session');
      }
    }
  }, []);

  // Listen to Reown AppKit events
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = appKit.subscribeProvider(({ provider: walletProvider, address, chainId, isConnected }) => {
      if (isConnected && address && chainId) {
        const ethersProvider = new ethers.BrowserProvider(walletProvider);
        setProvider(ethersProvider);
        
        ethersProvider.getSigner().then(signer => {
          setSigner(signer);
          setUser({
            address,
            chainId,
            isConnected: true
          });
          setIsLoading(false);
        }).catch(error => {
          console.error('Failed to get signer:', error);
          setError('Failed to get signer');
          setIsLoading(false);
        });
      } else {
        setProvider(null);
        setSigner(null);
        setUser(null);
        setSession(null);
        localStorage.removeItem('sealguard_session');
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      await appKit.open();
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      setError(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const signInWithEthereum = async () => {
    if (!user?.address || !provider || !signer) {
      setError('Wallet not connected');
      return;
    }

    try {
      setIsSigningIn(true);
      setError(null);

      const domain = window.location.host;
      const origin = window.location.origin;
      const statement = 'Sign in to SealGuard with your Ethereum account.';
      const nonce = Math.random().toString(36).substring(2, 15);
      const expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const message = new SiweMessage({
        domain,
        address: user.address,
        statement,
        uri: origin,
        version: '1',
        chainId: user.chainId,
        nonce,
        expirationTime: expirationTime.toISOString()
      });

      const messageString = message.prepareMessage();
      const signature = await signer.signMessage(messageString);

      // Verify the signature
      const recoveredAddress = ethers.verifyMessage(messageString, signature);
      if (recoveredAddress.toLowerCase() !== user.address.toLowerCase()) {
        throw new Error('Signature verification failed');
      }

      const newSession: Session = {
        address: user.address,
        chainId: user.chainId,
        message: messageString,
        signature,
        expiresAt: expirationTime
      };

      setSession(newSession);
      localStorage.setItem('sealguard_session', JSON.stringify(newSession));
    } catch (error: any) {
      console.error('Failed to sign in:', error);
      setError(error.message || 'Failed to sign in');
    } finally {
      setIsSigningIn(false);
    }
  };

  const disconnect = async () => {
    try {
      await appKit.disconnect();
      setUser(null);
      setSession(null);
      setProvider(null);
      setSigner(null);
      localStorage.removeItem('sealguard_session');
    } catch (error: any) {
      console.error('Failed to disconnect:', error);
      setError(error.message || 'Failed to disconnect');
    }
  };

  const clearError = () => {
    setError(null);
  };

  const formatAddress = (address: string, chars: number = 4): string => {
    if (!address) return '';
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
  };

  const switchChain = async (chainId: number) => {
    try {
      if (!provider) throw new Error('No provider available');
      
      await provider.send('wallet_switchEthereumChain', [
        { chainId: `0x${chainId.toString(16)}` }
      ]);
    } catch (error: any) {
      console.error('Failed to switch chain:', error);
      setError(error.message || 'Failed to switch chain');
    }
  };

  const contextValue: Web3ContextType = {
    // State
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
    
    // Actions
    connectWallet,
    signInWithEthereum,
    disconnect,
    clearError,
    
    // Utilities
    formatAddress,
    switchChain
  };

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3Context = (): Web3ContextType => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3Context must be used within a Web3Provider');
  }
  return context;
};

export default Web3Provider;