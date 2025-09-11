declare module '@reown/appkit/react' {
  export interface AppKitOptions {
    adapters: any[];
    networks: any[];
    metadata: {
      name: string;
      description: string;
      url: string;
      icons: string[];
    };
    projectId: string;
    features?: {
      analytics?: boolean;
      onramp?: boolean;
    };
    themeVariables?: {
      [key: string]: string;
    };
  }

  export interface AppKit {
    open: () => Promise<void>;
    disconnect: () => Promise<void>;
    subscribeProvider: (callback: (data: {
      provider: any;
      address: string;
      chainId: number;
      isConnected: boolean;
    }) => void) => (() => void);
  }

  export function createAppKit(options: AppKitOptions): AppKit;
}

declare module '@reown/appkit-adapter-ethers' {
  export class EthersAdapter {
    constructor();
  }
}