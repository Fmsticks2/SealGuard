import { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  LogOut,
  Plus,
  Search,
  Filter,
  Download,
  Settings
} from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';
import { useContractRead } from '../hooks/useContract';
import DocumentUpload from '../components/DocumentUpload';
import { DocumentVerification } from '../components/DocumentVerification';
import LoadingSpinner from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { Document } from '../hooks/useDocuments';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'rejected'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Real data from smart contracts
  const { 
    userDocumentIds, 
    isLoadingUserDocs,
    refetchUserDocs
  } = useContractRead();

  const {
    documents,
    loading: isLoadingDocuments,
    error: documentsError,
    refetchDocuments,
  } = useDocuments();

  const fetchUserDocuments = refetchDocuments;

  // Fetch user documents when wallet connects or document IDs change
  useEffect(() => {
    if (isConnected && address && userDocumentIds) {
      fetchUserDocuments();
    }
  }, [isConnected, address, userDocumentIds, fetchUserDocuments]);

  // Refresh data periodically
  useEffect(() => {
    if (isConnected && address) {
      const interval = setInterval(() => {
        refetchUserDocs();
        fetchUserDocuments();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isConnected, address, refetchUserDocs, fetchUserDocuments]);

  const handleDisconnect = () => {
    disconnect();
  };

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    // Refresh data after successful upload
    setTimeout(() => {
      refetchUserDocs();
      fetchUserDocuments();
    }, 2000);
  };

  const handleVerificationClick = (document: Document) => {
    setSelectedDocument(document);
    setShowVerificationModal(true);
  };

  const handleVerificationSubmitted = () => {
    // Refresh data after verification
    setTimeout(() => {
      refetchUserDocs();
      refetchDocuments(); // This will fetch fresh document data from the contract
    }, 2000);
  };

  const handleDownloadDocument = async (document: Document) => {
    try {
      // Create IPFS URL for download
      const ipfsUrl = `https://ipfs.io/ipfs/${document.filecoinCID}`;
      window.open(ipfsUrl, '_blank');
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  // Filter documents based on search and status
  const filteredDocuments = documents?.filter(doc => {
    // Parse metadata to get name and type for searching
    let docName = '';
    let docType = doc.documentType;
    
    try {
      const metadata = JSON.parse(doc.metadata);
      docName = metadata.name || '';
    } catch {
      docName = `Document ${doc.id}`;
    }
    
    const matchesSearch = docName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         docType.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Map status filter to document properties
    let matchesStatus = true;
    if (statusFilter === 'verified') {
      matchesStatus = doc.isVerified;
    } else if (statusFilter === 'pending') {
      matchesStatus = !doc.isVerified && doc.lifecycle === 0; // active
    } else if (statusFilter === 'rejected') {
      matchesStatus = doc.lifecycle === 2 || doc.lifecycle === 3; // expired or revoked
    }
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Calculate statistics
  const stats = {
      total: documents?.length || 0,
      verified: documents?.filter(doc => doc.isVerified).length || 0,
      pending: documents?.filter(doc => !doc.isVerified && doc.lifecycle === 0).length || 0,
      rejected: documents?.filter(doc => doc.lifecycle === 1 || doc.lifecycle === 2).length || 0,
    };

  // Don't show wallet connection UI since ProtectedRoute handles it
  // if (!isConnected) {
  //   return (
  //     <div className="container mx-auto px-4 py-20">
  //       <div className="max-w-md mx-auto text-center">
  //         <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
  //           <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto">
  //             <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  //               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  //             </svg>
  //           </div>
  //           <div className="space-y-2">
  //             <h2 className="text-2xl font-bold text-gray-900">Connect Your Wallet</h2>
  //             <p className="text-gray-600">
  //               Please connect your wallet to access the dashboard and start verifying documents.
  //             </p>
  //           </div>
  //           <w3m-button />
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-black">
            Manage and verify your documents with blockchain security
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-black">Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Upload Document</span>
          </button>
          <button
            onClick={handleDisconnect}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Disconnect</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {isLoadingUserDocs ? (
                <LoadingSpinner size="sm" />
              ) : (
                stats.total
              )}
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="font-medium text-gray-900">Total Documents</h3>
            <p className="text-sm text-black">+2 from last month</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-green-600">
              {isLoadingUserDocs ? (
                <LoadingSpinner size="sm" />
              ) : (
                stats.verified
              )}
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="font-medium text-gray-900">Verified</h3>
            <p className="text-sm text-black">83% success rate</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-2xl font-bold text-yellow-600">
              {isLoadingUserDocs ? (
                <LoadingSpinner size="sm" />
              ) : (
                stats.pending
              )}
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="font-medium text-gray-900">Pending</h3>
            <p className="text-sm text-black">Processing...</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-2xl font-bold text-red-600">
              {isLoadingUserDocs ? (
                <LoadingSpinner size="sm" />
              ) : (
                stats.rejected
              )}
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="font-medium text-gray-900">Rejected</h3>
            <p className="text-sm text-black">Needs attention</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Documents</h2>
            <span className="text-sm text-black">
              {filteredDocuments.length} of {stats.total} documents
            </span>
          </div>
        </div>

        {/* Verification Help Banner */}
        {stats.pending > 0 && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-900">
                  You have {stats.pending} pending document{stats.pending > 1 ? 's' : ''} awaiting verification
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  To verify a document: Click the ⚙️ settings icon next to any pending document, then submit verification proof (text or file upload) to confirm authenticity.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {(isLoadingDocuments || isLoadingUserDocs) && (
          <div className="p-8 text-center">
            <LoadingSpinner size="lg" text="Loading your documents..." />
          </div>
        )}

        {/* Error State */}
        {documentsError && (
          <div className="p-8 text-center">
            <ErrorMessage 
              message={documentsError} 
              onDismiss={() => fetchUserDocuments()}
              className="mb-4"
            />
            <button
              onClick={() => fetchUserDocuments()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingDocuments && !isLoadingUserDocs && !documentsError && filteredDocuments.length === 0 && (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
            <p className="text-black mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Upload your first document to get started.'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload Document
              </button>
            )}
          </div>
        )}

        {/* Documents Table */}
        {!isLoadingDocuments && !isLoadingUserDocs && !documentsError && filteredDocuments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Upload Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((doc) => {
                  // Parse metadata for display
                  let docName = '';
                  try {
                    const metadata = JSON.parse(doc.metadata);
                    docName = metadata.name || `Document ${doc.id}`;
                  } catch {
                    docName = `Document ${doc.id}`;
                  }
                  
                  // Determine status for display
                  let status = 'pending';
                  if (doc.isVerified) {
                    status = 'verified';
                  } else if (doc.lifecycle === 2 || doc.lifecycle === 3) {
                    status = 'rejected';
                  }
                  
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{docName}</div>
                            <div className="text-sm text-black">ID: {doc.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{doc.documentType}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            status === 'verified' 
                              ? 'bg-green-100 text-green-800'
                              : status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {status === 'verified' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {status === 'rejected' && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                          {status === 'pending' && (
                            <div className="ml-2 text-xs text-gray-500">
                              <span className="italic">Click ⚙️ to verify</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(doc.timestamp * 1000).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                         <div className="flex items-center space-x-2">
                           <button 
                             onClick={() => handleVerificationClick(doc)}
                             className="text-blue-600 hover:text-blue-900 p-1 rounded"
                             title="Manage Verification"
                           >
                             <Settings className="h-4 w-4" />
                           </button>
                           <button 
                             onClick={() => handleDownloadDocument(doc)}
                             className="text-green-600 hover:text-green-900 p-1 rounded"
                             title="Download Document"
                           >
                             <Download className="h-4 w-4" />
                           </button>
                         </div>
                       </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Upload Document</h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <DocumentUpload 
                onUploadComplete={handleUploadSuccess} 
                onClose={() => setShowUploadModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Document Verification Modal */}
      {showVerificationModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Document Verification & Management</h3>
              <button 
                onClick={() => {
                  setShowVerificationModal(false);
                  setSelectedDocument(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <DocumentVerification 
              documentId={selectedDocument.id}
              documentName={(() => {
                try {
                  const metadata = JSON.parse(selectedDocument.metadata);
                  return metadata.name || `Document ${selectedDocument.id}`;
                } catch {
                  return `Document ${selectedDocument.id}`;
                }
              })()}
              currentStatus={selectedDocument.isVerified ? 'verified' : 'pending'}
              onClose={() => setSelectedDocument(null)}
              onVerificationSubmitted={handleVerificationSubmitted}
            />
          </div>
        </div>
      )}
    </div>
  );
}