import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Upload, 
  FileText,
  User,
  Key,
  Loader2,
  X
} from 'lucide-react';
import { useContract } from '../hooks/useContract';
import { useContractRead } from '../hooks/useContract';

interface DocumentVerificationProps {
  documentId: number;
  documentName: string;
  currentStatus: 'verified' | 'pending' | 'rejected';
  onClose: () => void;
  onVerificationSubmitted: () => void;
}



export function DocumentVerification({ 
  documentId, 
  documentName, 
  currentStatus, 
  onClose, 
  onVerificationSubmitted 
}: DocumentVerificationProps) {
  const [proofData, setProofData] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isValid, setIsValid] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newOwner, setNewOwner] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const { 
    submitVerificationProof, 
    transferDocumentOwnership,
    transactionStatus,
    clearError 
  } = useContract();

  const { getLatestProof } = useContractRead();
  const { data: latestProof, isLoading: isLoadingProof } = getLatestProof(BigInt(documentId));

  useEffect(() => {
    if (transactionStatus.isConfirmed) {
      onVerificationSubmitted();
      onClose();
    }
  }, [transactionStatus.isConfirmed, onVerificationSubmitted, onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      // Read file content for proof data
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setProofData(content.substring(0, 1000)); // Limit to first 1000 chars
      };
      reader.readAsText(file);
    }
  };

  const handleSubmitProof = async () => {
    if (!proofData.trim()) {
      setError('Please provide proof data or upload a proof file');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    clearError();

    try {
      // Generate a simple hash of the proof data
      const encoder = new TextEncoder();
      const data = encoder.encode(proofData);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const proofHash = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      await submitVerificationProof(
        BigInt(documentId),
        proofHash,
        proofData,
        isValid
      );
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to submit verification proof');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!newOwner.trim()) {
      setError('Please provide a valid wallet address');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(newOwner)) {
      setError('Please provide a valid Ethereum address');
      return;
    }

    setIsTransferring(true);
    setError(null);
    clearError();

    try {
      await transferDocumentOwnership(BigInt(documentId), newOwner);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to transfer document ownership');
    } finally {
      setIsTransferring(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'rejected':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Document Verification</h2>
                <p className="text-sm text-gray-600">{documentName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(currentStatus)}
                <div>
                  <h3 className="font-medium text-gray-900">Current Status</h3>
                  <p className="text-sm text-gray-600">Document ID: {documentId}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(currentStatus)}`}>
                {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
              </span>
            </div>
          </div>

          {/* Latest Proof */}
          {isLoadingProof ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-600">Loading latest proof...</span>
              </div>
            </div>
          ) : latestProof && (latestProof as any).proofHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Latest Verification Proof</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Proof Hash:</span>
                  <code className="ml-2 bg-white px-2 py-1 rounded text-xs">
                    {(latestProof as any).proofHash}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    (latestProof as any).isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {(latestProof as any).isValid ? 'Valid' : 'Invalid'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">No verification proof submitted yet</span>
              </div>
            </div>
          )}

          {/* Submit New Proof */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <Upload className="h-4 w-4 mr-2" />
              Submit Verification Proof
            </h3>

            <div className="space-y-4">
              {/* Proof Data Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proof Data
                </label>
                <textarea
                  value={proofData}
                  onChange={(e) => setProofData(e.target.value)}
                  placeholder="Enter verification proof data or upload a file..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or Upload Proof File
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".txt,.json,.pdf,.doc,.docx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {proofFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {proofFile.name}
                  </p>
                )}
              </div>

              {/* Validity Toggle */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isValid"
                  checked={isValid}
                  onChange={(e) => setIsValid(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isValid" className="text-sm font-medium text-gray-700">
                  Mark as valid proof
                </label>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitProof}
                disabled={isSubmitting || transactionStatus.isPending || transactionStatus.isConfirming}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting || transactionStatus.isPending || transactionStatus.isConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {transactionStatus.isPending ? 'Submitting...' : 
                     transactionStatus.isConfirming ? 'Confirming...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Submit Verification Proof
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Transfer Ownership */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <Key className="h-4 w-4 mr-2" />
              Transfer Document Ownership
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Owner Address
                </label>
                <input
                  type="text"
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleTransferOwnership}
                disabled={isTransferring || !newOwner.trim()}
                className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4 mr-2" />
                    Transfer Ownership
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {(error || transactionStatus.error) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800">
                  {error || transactionStatus.error?.message}
                </span>
              </div>
            </div>
          )}

          {/* Transaction Status */}
          {transactionStatus.hash && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Transaction Submitted</span>
                </div>
                <p className="text-xs text-blue-600 font-mono break-all">
                  {transactionStatus.hash}
                </p>
                {transactionStatus.isConfirming && (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                    <span className="text-xs text-blue-600">Waiting for confirmation...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}