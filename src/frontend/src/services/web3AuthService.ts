import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { SiweMessage } from 'siwe';

// Web3Modal configuration
const projectId = process.env.REACT_APP_REOWN_PROJECT_ID || 'your-reown-project-id';

const metadata = {
  name: 'SealGuard',
  description: 'Decentralized Document Verification System',
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
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY'
  },
  {
    chainId: 137,
    name: 'Polygon',
    currency: 'MATIC',
    explorerUrl: 'https://polygonscan.com',
    rpcUrl: 'https://polygon-rpc.com'
  },
  {
    chainId: 1337,
    name: 'Localhost',
    currency: 'ETH',
    explorerUrl: 'http://localhost:8545',
    rpcUrl: 'http://localhost:8545'
  }
];

// Create Reown AppKit instance
const ethersAdapter = new EthersAdapter();

export const appKit = createAppKit({
  adapters: [ethersAdapter],
  networks: chains,
  metadata,
  projectId,
  features: {
    analytics: true
  }
});

export interface AuthUser {
  address: string;
  chainId: number;
  isConnected: boolean;
  ensName?: string;
  avatar?: string;
}

export interface SiweSession {
  address: string;
  chainId: number;
  message: string;
  signature: string;
  expiresAt: Date;
  issuedAt: Date;
}

class Web3AuthService {
  private provider: BrowserProvider | null = null;
  private signer: JsonRpcSigner | null = null;
  private currentUser: AuthUser | null = null;
  private siweSession: SiweSession | null = null;

  constructor() {
    this.initializeListeners();
    this.loadStoredSession();
  }

  private initializeListeners() {
    // Listen for account changes
    appKit.subscribeProvider(({ provider, address, chainId, isConnected }) => {
      if (provider && address && isConnected) {
        this.provider = new BrowserProvider(provider);
        this.currentUser = {
          address,
          chainId: chainId || 1,
          isConnected
        };
        this.getSigner();
      } else {
        this.disconnect();
      }
    });
  }

  async getSigner(): Promise<JsonRpcSigner | null> {
    if (!this.provider) return null;
    
    try {
      this.signer = await this.provider.getSigner();
      return this.signer;
    } catch (error) {
      console.error('Error getting signer:', error);
      return null;
    }
  }

  private loadStoredSession() {
    try {
      const storedSession = localStorage.getItem('sealguard_siwe_session');
      if (storedSession) {
        const session = JSON.parse(storedSession);
        // Check if session is still valid
        if (new Date(session.expiresAt) > new Date()) {
          this.siweSession = {
            ...session,
            expiresAt: new Date(session.expiresAt),
            issuedAt: new Date(session.issuedAt)
          };
        } else {
          localStorage.removeItem('sealguard_siwe_session');
        }
      }
    } catch (error) {
      console.error('Error loading stored session:', error);
      localStorage.removeItem('sealguard_siwe_session');
    }
  }

  private storeSession(session: SiweSession) {
    try {
      localStorage.setItem('sealguard_siwe_session', JSON.stringify(session));
      this.siweSession = session;
    } catch (error) {
      console.error('Error storing session:', error);
    }
  }

  async connectWallet(): Promise<AuthUser | null> {
    try {
      await appKit.open();
      
      // Wait for connection
      return new Promise((resolve) => {
        const checkConnection = () => {
          if (this.currentUser?.isConnected) {
            resolve(this.currentUser);
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    } catch (error) {
      console.error('Error connecting wallet:', error);
      return null;
    }
  }

  async signInWithEthereum(): Promise<SiweSession | null> {
    if (!this.currentUser?.isConnected || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const domain = window.location.host;
      const origin = window.location.origin;
      const statement = 'Sign in to SealGuard with your Ethereum account.';
      
      const siweMessage = new SiweMessage({
        domain,
        address: this.currentUser.address,
        statement,
        uri: origin,
        version: '1',
        chainId: this.currentUser.chainId,
        nonce: this.generateNonce(),
        issuedAt: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      });

      const message = siweMessage.prepareMessage();
      const signature = await this.signer.signMessage(message);

      // Verify the signature
      const verificationResult = await siweMessage.verify({ signature });
      
      if (!verificationResult.success) {
        throw new Error('Signature verification failed');
      }

      const session: SiweSession = {
        address: this.currentUser.address,
        chainId: this.currentUser.chainId,
        message,
        signature,
        expiresAt: new Date(siweMessage.expirationTime!),
        issuedAt: new Date(siweMessage.issuedAt!)
      };

      this.storeSession(session);
      return session;
    } catch (error) {
      console.error('Error signing in with Ethereum:', error);
      return null;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await appKit.disconnect();
      this.provider = null;
      this.signer = null;
      this.currentUser = null;
      this.siweSession = null;
      localStorage.removeItem('sealguard_siwe_session');
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  getSession(): SiweSession | null {
    return this.siweSession;
  }

  isAuthenticated(): boolean {
    return !!(
      this.currentUser?.isConnected && 
      this.siweSession && 
      this.siweSession.expiresAt > new Date()
    );
  }

  getProvider(): BrowserProvider | null {
    return this.provider;
  }

  getCachedSigner(): JsonRpcSigner | null {
    return this.signer;
  }

  async switchChain(chainId: number): Promise<boolean> {
    try {
      if (!this.provider) return false;
      
      await this.provider.send('wallet_switchEthereumChain', [
        { chainId: `0x${chainId.toString(16)}` }
      ]);
      
      return true;
    } catch (error: any) {
      // Chain not added to wallet
      if (error.code === 4902) {
        const chain = chains.find(c => c.chainId === chainId);
        if (chain) {
          try {
            await this.provider!.send('wallet_addEthereumChain', [{
              chainId: `0x${chainId.toString(16)}`,
              chainName: chain.name,
              nativeCurrency: {
                name: chain.currency,
                symbol: chain.currency,
                decimals: 18
              },
              rpcUrls: [chain.rpcUrl],
              blockExplorerUrls: [chain.explorerUrl]
            }]);
            return true;
          } catch (addError) {
            console.error('Error adding chain:', addError);
            return false;
          }
        }
      }
      console.error('Error switching chain:', error);
      return false;
    }
  }

  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Utility method to format address
  formatAddress(address: string, length: number = 4): string {
    if (!address) return '';
    return `${address.slice(0, 2 + length)}...${address.slice(-length)}`;
  }

  // Get ENS name if available
  async getENSName(address: string): Promise<string | null> {
    try {
      if (!this.provider) return null;
      return await this.provider.lookupAddress(address);
    } catch (error) {
      console.error('Error getting ENS name:', error);
      return null;
    }
  }

  // Get ENS avatar if available
  async getENSAvatar(address: string): Promise<string | null> {
    try {
      if (!this.provider) return null;
      return await this.provider.getAvatar(address);
    } catch (error) {
      console.error('Error getting ENS avatar:', error);
      return null;
    }
  }
}

// Export singleton instance
export const web3AuthService = new Web3AuthService();
export default web3AuthService;