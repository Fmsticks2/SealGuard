'use client'

import { useState, useCallback, useRef } from 'react'
import {
  Upload,
  File,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Image,
  FileArchive,
  FileVideo,
  FileAudio,
} from 'lucide-react'
import { LoadingButton } from '@/components/ui/LoadingSpinner'
import { formatFileSize } from '@/lib/utils'
import { api } from '@/lib/apiClient'
import toast from 'react-hot-toast'

interface UploadFile {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
  documentId?: string
}

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const SUPPORTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/zip',
  'application/x-rar-compressed',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
]

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.startsWith('video/')) return FileVideo
  if (mimeType.startsWith('audio/')) return FileAudio
  if (mimeType.includes('zip') || mimeType.includes('rar')) return FileArchive
  return FileText
}

export function FileUpload() {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateId = () => Math.random().toString(36).substr(2, 9)

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`
    }
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return 'File type not supported'
    }
    return null
  }

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    const validFiles: UploadFile[] = []

    fileArray.forEach(file => {
      const error = validateFile(file)
      if (error) {
        toast.error(`${file.name}: ${error}`)
        return
      }

      // Check for duplicates
      const isDuplicate = files.some(f => 
        f.file.name === file.name && 
        f.file.size === file.size && 
        f.file.lastModified === file.lastModified
      )

      if (isDuplicate) {
        toast.error(`${file.name} is already in the upload queue`)
        return
      }

      validFiles.push({
        id: generateId(),
        file,
        progress: 0,
        status: 'pending',
      })
    })

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles])
      toast.success(`${validFiles.length} file(s) added to upload queue`)
    }
  }, [files])

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const uploadFile = async (uploadFile: UploadFile): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Update file status to uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading' as const, progress: 0 }
          : f
      ))

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => {
          if (f.id === uploadFile.id && f.progress < 90) {
            return { ...f, progress: f.progress + Math.random() * 20 }
          }
          return f
        }))
      }, 200)

      // Simulate API call
      api.upload('/documents/upload', uploadFile.file, (progress) => {
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, progress: Math.min(progress, 90) }
            : f
        ))
      })
      .then(response => {
        clearInterval(progressInterval)
        
        // Update to processing
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'processing' as const, progress: 95 }
            : f
        ))

        // Simulate processing delay
        setTimeout(() => {
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { 
                  ...f, 
                  status: 'completed' as const, 
                  progress: 100,
                  documentId: response.data.id
                }
              : f
          ))
          resolve()
        }, 1000)
      })
      .catch(error => {
        clearInterval(progressInterval)
        const errorMessage = error.response?.data?.message || 'Upload failed'
        
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'error' as const, error: errorMessage }
            : f
        ))
        
        reject(error)
      })
    })
  }

  const uploadAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')
    if (pendingFiles.length === 0) {
      toast.error('No files to upload')
      return
    }

    setIsUploading(true)
    let successCount = 0
    let errorCount = 0

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (const file of pendingFiles) {
        try {
          await uploadFile(file)
          successCount++
        } catch (error) {
          errorCount++
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} file(s) uploaded successfully`)
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} file(s) failed to upload`)
      }
    } finally {
      setIsUploading(false)
    }
  }

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'completed'))
  }

  const clearAll = () => {
    setFiles([])
  }

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles)
    }
  }, [addFiles])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles)
    }
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Drop files here or click to upload
        </h3>
        <p className="text-gray-600 mb-4">
          Support for PDF, Word, Excel, PowerPoint, images, and more
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Maximum file size: {formatFileSize(MAX_FILE_SIZE)}
        </p>
        
        <LoadingButton
          onClick={openFileDialog}
          isLoading={false}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
        >
          Select Files
        </LoadingButton>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={SUPPORTED_TYPES.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Upload Queue ({files.length} files)
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={clearCompleted}
                className="text-sm text-gray-600 hover:text-gray-900"
                disabled={!files.some(f => f.status === 'completed')}
              >
                Clear Completed
              </button>
              <button
                onClick={clearAll}
                className="text-sm text-red-600 hover:text-red-900"
              >
                Clear All
              </button>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {files.map((uploadFile) => {
              const FileIcon = getFileIcon(uploadFile.file.type)
              
              return (
                <div key={uploadFile.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {uploadFile.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(uploadFile.file.size)} • {uploadFile.file.type}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Status Icon */}
                      {uploadFile.status === 'pending' && (
                        <File className="h-5 w-5 text-gray-400" />
                      )}
                      {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                        <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                      )}
                      {uploadFile.status === 'completed' && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {uploadFile.status === 'error' && (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      
                      {/* Remove Button */}
                      {uploadFile.status !== 'uploading' && uploadFile.status !== 'processing' && (
                        <button
                          onClick={() => removeFile(uploadFile.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>
                          {uploadFile.status === 'uploading' ? 'Uploading...' : 'Processing...'}
                        </span>
                        <span>{Math.round(uploadFile.progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadFile.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Error Message */}
                  {uploadFile.status === 'error' && uploadFile.error && (
                    <div className="mt-2 text-sm text-red-600">
                      {uploadFile.error}
                    </div>
                  )}
                  
                  {/* Success Message */}
                  {uploadFile.status === 'completed' && (
                    <div className="mt-2 text-sm text-green-600">
                      File uploaded successfully and stored on Filecoin network
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Upload Button */}
          {files.some(f => f.status === 'pending') && (
            <div className="p-4 border-t border-gray-200">
              <LoadingButton
                onClick={uploadAllFiles}
                isLoading={isUploading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium"
              >
                Upload {files.filter(f => f.status === 'pending').length} File(s)
              </LoadingButton>
            </div>
          )}
        </div>
      )}
      
      {/* Upload Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Upload Guidelines</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Files are encrypted and stored securely on the Filecoin network</li>
          <li>• Each file receives a unique cryptographic hash for integrity verification</li>
          <li>• PDP (Proof of Data Possession) challenges ensure your data remains intact</li>
          <li>• Storage costs are calculated based on file size and storage duration</li>
        </ul>
      </div>
    </div>
  )
}