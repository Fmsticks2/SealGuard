import React from 'react';
import { useAccount } from 'wagmi';
import { WalletConnection } from './WalletConnection';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireConnection?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback,
  requireConnection = true 
}) => {
  const { isConnected, isConnecting } = useAccount();

  if (!requireConnection) {
    return <>{children}</>;
  }

  if (isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking wallet connection...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <WalletConnection showFullInterface={true} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;