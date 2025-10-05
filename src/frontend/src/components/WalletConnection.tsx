import React, { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { Wallet, LogOut, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface WalletConnectionProps {
  showFullInterface?: boolean;
  onConnectionChange?: (isConnected: boolean) => void;
}

export const WalletConnection: React.FC<WalletConnectionProps> = ({ 
  showFullInterface = false,
  onConnectionChange 
}) => {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    onConnectionChange?.(isConnected);
  }, [isConnected, onConnectionChange]);

  const handleDisconnect = () => {
    disconnect();
    setShowDetails(false);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnecting || isReconnecting) {
    return (
      <div className="flex items-center space-x-2 text-blue-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Connecting...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className={`${showFullInterface ? 'p-6 bg-white rounded-lg border border-gray-200' : ''}`}>
        {showFullInterface && (
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
            <p className="text-gray-600 text-sm">
              Connect your wallet to access the dashboard and start managing your documents securely.
            </p>
          </div>
        )}
        
        <div className="flex flex-col items-center space-y-4">
          <w3m-button />
          
          {showFullInterface && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">Supported Wallets</p>
                  <p className="text-blue-700">
                    MetaMask, WalletConnect, Coinbase Wallet, and other Web3 wallets are supported.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${showFullInterface ? 'p-6 bg-white rounded-lg border border-gray-200' : ''}`}>
      {showFullInterface && (
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Wallet Connected</h3>
          <p className="text-gray-600 text-sm">
            Your wallet is successfully connected and ready to use.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Wallet className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {formatAddress(address!)}
              </p>
              <p className="text-xs text-gray-500">Connected</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {showFullInterface && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded"
              >
                {showDetails ? 'Hide' : 'Details'}
              </button>
            )}
            <button
              onClick={handleDisconnect}
              className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded"
            >
              <LogOut className="h-3 w-3" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>

        {showDetails && showFullInterface && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700">Full Address</label>
              <p className="text-sm text-gray-900 font-mono break-all">{address}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-700">Network</label>
                <p className="text-sm text-gray-900">Filecoin Calibration</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Status</label>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-900">Connected</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {showFullInterface && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-yellow-900 mb-1">Security Notice</p>
                <p className="text-yellow-700">
                  Keep your wallet secure and never share your private keys. SealGuard will never ask for your private keys.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletConnection;