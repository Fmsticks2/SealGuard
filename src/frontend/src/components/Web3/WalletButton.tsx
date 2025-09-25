'use client';

import React from 'react';
import { useWeb3Context } from './Web3Provider';

interface WalletButtonProps {
  size?: 'sm' | 'md';
  label?: string;
  loadingLabel?: string;
  balance?: 'show' | 'hide';
  charsStart?: number;
  charsEnd?: number;
  className?: string;
}

/**
 * Reown AppKit Wallet Button Component
 * Uses the Web3Context to trigger wallet connection
 * This provides proper wallet connection without custom screens
 */
export const WalletButton: React.FC<WalletButtonProps> = ({
  size = 'md',
  label = 'Connect Wallet',
  loadingLabel = 'Connecting...',
  className = '',
}) => {
  const { connectWallet, isConnecting, isConnected, user, formatAddress } = useWeb3Context();

  const handleClick = async () => {
    if (!isConnected) {
      await connectWallet();
    }
  };

  const displayText = isConnecting 
    ? loadingLabel 
    : isConnected && user 
      ? formatAddress(user.address) 
      : label;

  return (
    <button
      onClick={handleClick}
      disabled={isConnecting}
      className={`${className} ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {displayText}
    </button>
  );
};

export default WalletButton;