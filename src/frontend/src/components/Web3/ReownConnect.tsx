'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useWeb3Auth } from '../../hooks/useWeb3Auth';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface ReownConnectProps {
  onSuccess?: () => void;
  showSignIn?: boolean;
  className?: string;
}

export const ReownConnect: React.FC<ReownConnectProps> = ({
  onSuccess,
  showSignIn = true,
  className = ''
}) => {
  const {
    user,
    session,
    isConnecting,
    isSigningIn,
    isAuthenticated,
    error,
    connectWallet,
    signInWithEthereum,
    disconnect,
    clearError,
    formatAddress
  } = useWeb3Auth();

  const [step, setStep] = useState<'connect' | 'sign' | 'complete'>('connect');

  useEffect(() => {
    console.log('ReownConnect - State changed:', {
      userConnected: user?.isConnected,
      hasSession: !!session,
      isAuthenticated,
      showSignIn,
      currentStep: step
    });
    
    if (user?.isConnected && !session && showSignIn && step !== 'sign') {
      console.log('ReownConnect - Moving to sign step and auto-signing');
      setStep('sign');
      // Automatically trigger SIWE signing when wallet connects
      signInWithEthereum();
    } else if (isAuthenticated && step !== 'complete') {
      console.log('ReownConnect - Authentication complete, calling onSuccess');
      setStep('complete');
      // Use setTimeout to ensure state updates are processed
      setTimeout(() => {
        onSuccess?.();
      }, 100);
    } else if (!user?.isConnected && !isAuthenticated) {
      console.log('ReownConnect - Moving to connect step');
      setStep('connect');
    }
  }, [user, session, isAuthenticated, showSignIn, step, onSuccess, signInWithEthereum]);

  const handleConnect = async () => {
    clearError();
    await connectWallet();
  };

  const handleSignIn = async () => {
    clearError();
    await signInWithEthereum();
  };

  const handleDisconnect = async () => {
    clearError();
    await disconnect();
    setStep('connect');
  };

  const getStepIcon = (currentStep: string) => {
    switch (currentStep) {
      case 'connect':
        return step === 'connect' && isConnecting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : step === 'connect' ? (
          <Wallet className="w-5 h-5" />
        ) : (
          <CheckCircle className="w-5 h-5 text-green-500" />
        );
      case 'sign':
        return step === 'sign' && isSigningIn ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : step === 'sign' ? (
          <Shield className="w-5 h-5" />
        ) : step === 'complete' ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <Shield className="w-5 h-5 text-gray-400" />
        );
      case 'complete':
        return step === 'complete' ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <CheckCircle className="w-5 h-5 text-gray-400" />
        );
      default:
        return null;
    }
  };

  const getStepStatus = (currentStep: string) => {
    if (currentStep === 'connect') {
      return step === 'connect' ? 'active' : user?.isConnected ? 'complete' : 'pending';
    }
    if (currentStep === 'sign') {
      return step === 'sign' ? 'active' : isAuthenticated ? 'complete' : 'pending';
    }
    if (currentStep === 'complete') {
      return isAuthenticated ? 'complete' : 'pending';
    }
    return 'pending';
  };

  if (isAuthenticated) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Wallet Connected</h3>
              <p className="text-sm text-gray-600">
                {formatAddress(user?.address || '', 6)}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            Disconnect
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600">
            Secure, decentralized authentication with your Ethereum wallet
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4">
          {/* Step 1: Connect */}
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              getStepStatus('connect') === 'complete' ? 'bg-green-100' :
              getStepStatus('connect') === 'active' ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              {getStepIcon('connect')}
            </div>
            <span className={`text-sm font-medium ${
              getStepStatus('connect') === 'complete' ? 'text-green-600' :
              getStepStatus('connect') === 'active' ? 'text-blue-600' : 'text-gray-400'
            }`}>
              Connect
            </span>
          </div>

          {/* Connector */}
          <div className={`w-8 h-0.5 ${
            getStepStatus('connect') === 'complete' ? 'bg-green-200' : 'bg-gray-200'
          }`} />

          {/* Step 2: Sign */}
          {showSignIn && (
            <>
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  getStepStatus('sign') === 'complete' ? 'bg-green-100' :
                  getStepStatus('sign') === 'active' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {getStepIcon('sign')}
                </div>
                <span className={`text-sm font-medium ${
                  getStepStatus('sign') === 'complete' ? 'text-green-600' :
                  getStepStatus('sign') === 'active' ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  Sign
                </span>
              </div>

              {/* Connector */}
              <div className={`w-8 h-0.5 ${
                getStepStatus('sign') === 'complete' ? 'bg-green-200' : 'bg-gray-200'
              }`} />

              {/* Step 3: Complete */}
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  getStepStatus('complete') === 'complete' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {getStepIcon('complete')}
                </div>
                <span className={`text-sm font-medium ${
                  getStepStatus('complete') === 'complete' ? 'text-green-600' : 'text-gray-400'
                }`}>
                  Complete
                </span>
              </div>
            </>
          )}
        </div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4"
            >
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="space-y-3">
          {step === 'connect' && (
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </>
              )}
            </Button>
          )}

          {step === 'sign' && showSignIn && (
            <Button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="w-full"
              size="lg"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Sign Message
                </>
              )}
            </Button>
          )}
        </div>

        {/* Info */}
        <div className="text-center text-sm text-gray-500">
          <p>
            By connecting your wallet, you agree to our{' '}
            <a href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>

        {/* Supported Wallets */}
        <div className="border-t pt-4">
          <p className="text-xs text-gray-500 text-center mb-3">
            Supported wallets:
          </p>
          <div className="flex justify-center space-x-4">
            <div className="text-xs text-gray-400">MetaMask</div>
            <div className="text-xs text-gray-400">Reown</div>
            <div className="text-xs text-gray-400">Coinbase Wallet</div>
            <div className="text-xs text-gray-400">Rainbow</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ReownConnect;