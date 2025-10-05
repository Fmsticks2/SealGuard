import React, { useState, useRef, useCallback } from 'react';
import { useDocuments } from '../hooks/useDocuments';
import { mapErrorToFriendlyMessage, getErrorIcon, getErrorColors, FriendlyError } from '../utils/errorMessages';

interface DocumentUploadProps {
  onUploadComplete?: (documentId: number) => void;
  className?: string;
}

const DOCUMENT_TYPES = [
  { value: 'legal', label: 'Legal Document' },
  { value: 'financial', label: 'Financial Document' },
  { value: 'medical', label: 'Medical Record' },
  { value: 'identity', label: 'Identity Document' },
  { value: 'contract', label: 'Contract' },
  { value: 'other', label: 'Other' },
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'text/plain',
];

export default function DocumentUpload({ onUploadComplete, className = '' }: DocumentUploadProps) {
  const { uploadDocument, uploadProgress, error, loading } = useDocuments();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('other');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [friendlyError, setFriendlyError] = useState<FriendlyError | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'File type not supported. Please upload PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, or TXT files.';
    }
    return null;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validationError = validateFile(file);
      
      if (validationError) {
        alert(validationError);
        return;
      }
      
      setSelectedFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validationError = validateFile(file);
      
      if (validationError) {
        const friendlyErrorMsg = mapErrorToFriendlyMessage(validationError);
        setFriendlyError(friendlyErrorMsg);
        return;
      }
      
      setSelectedFile(file);
      setFriendlyError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      const friendlyErrorMsg = mapErrorToFriendlyMessage('No file selected');
      setFriendlyError(friendlyErrorMsg);
      return;
    }

    if (!documentType) {
      const friendlyErrorMsg = mapErrorToFriendlyMessage('Document type is required');
      setFriendlyError(friendlyErrorMsg);
      return;
    }

    try {
      setFriendlyError(null);
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      await uploadDocument(selectedFile, documentType, description, tagArray);
      
      // Reset form
      setSelectedFile(null);
      setDescription('');
      setTags('');
      setDocumentType('other');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      if (onUploadComplete) {
        onUploadComplete(0); // Document ID will be available after transaction confirmation
      }
    } catch (err) {
      console.error('Upload failed:', err);
      const friendlyErrorMsg = mapErrorToFriendlyMessage(err as Error);
      setFriendlyError(friendlyErrorMsg);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-8 ${className}`}>
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-black mb-2">Upload New Document</h3>
          <p className="text-black mb-6">Securely store and verify your documents on the blockchain</p>
        </div>

        {/* Upload Progress */}
        {uploadProgress && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">{uploadProgress.message}</span>
              <span className="text-sm text-blue-600">{uploadProgress.progress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Friendly Error Display */}
        {friendlyError && (
          <div className={`mb-6 p-4 rounded-lg border ${getErrorColors(friendlyError.severity).bg} ${getErrorColors(friendlyError.severity).border}`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg 
                  className={`h-5 w-5 ${getErrorColors(friendlyError.severity).icon}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getErrorIcon(friendlyError.severity)} />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-medium ${getErrorColors(friendlyError.severity).text}`}>
                  {friendlyError.title}
                </h3>
                <p className={`mt-1 text-sm ${getErrorColors(friendlyError.severity).text}`}>
                  {friendlyError.message}
                </p>
                {friendlyError.action && (
                  <p className={`mt-2 text-sm font-medium ${getErrorColors(friendlyError.severity).text}`}>
                    {friendlyError.action}
                  </p>
                )}
              </div>
              <div className="ml-auto pl-3">
                <button
                  type="button"
                  className={`inline-flex rounded-md p-1.5 ${getErrorColors(friendlyError.severity).icon} hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2`}
                  onClick={() => setFriendlyError(null)}
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Legacy Error Display - Remove after testing */}
        {error && !friendlyError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            dragActive 
              ? 'border-blue-400 bg-blue-50' 
              : selectedFile 
                ? 'border-green-400 bg-green-50' 
                : 'border-gray-300 hover:border-blue-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept={ALLOWED_TYPES.join(',')}
          />
          
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-black">{selectedFile.name}</p>
                <p className="text-xs text-black">{formatFileSize(selectedFile.size)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile();
                }}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div className="text-black">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm">Click to upload or drag and drop</p>
              <p className="text-xs text-black mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, TXT up to 100MB</p>
            </div>
          )}
        </div>

        {/* Document Details Form */}
        {selectedFile && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Document Type *
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the document..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Tags
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Enter tags separated by commas (e.g., important, confidential, 2024)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-black mt-1">Separate multiple tags with commas</p>
            </div>

            <button
              onClick={handleUpload}
              disabled={loading || !selectedFile}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? 'Uploading...' : 'Upload & Register Document'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}