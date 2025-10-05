/**
 * Error Message Mapping Utility
 * Converts technical backend error messages into user-friendly, actionable guidance
 */

export interface FriendlyError {
  title: string;
  message: string;
  action?: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Maps technical error messages to user-friendly explanations
 */
export function mapErrorToFriendlyMessage(error: string | Error): FriendlyError {
  const errorMessage = error instanceof Error ? error.message : error;
  const lowerError = errorMessage.toLowerCase();

  // Network and Connection Errors
  if (lowerError.includes('wallet not connected')) {
    return {
      title: 'Wallet Connection Required',
      message: 'Please connect your wallet to upload documents.',
      action: 'Click the "Connect Wallet" button to continue.',
      severity: 'warning'
    };
  }

  if (lowerError.includes('network error') || lowerError.includes('fetch failed')) {
    return {
      title: 'Connection Problem',
      message: 'Unable to connect to the network. Please check your internet connection.',
      action: 'Try again in a few moments or refresh the page.',
      severity: 'error'
    };
  }

  // File Size and Type Errors
  if (lowerError.includes('file size exceeds') || lowerError.includes('100mb')) {
    return {
      title: 'File Too Large',
      message: 'Your file is larger than the 100MB limit.',
      action: 'Please compress your file or choose a smaller file to upload.',
      severity: 'error'
    };
  }

  if (lowerError.includes('file type not supported') || lowerError.includes('allowed types')) {
    return {
      title: 'Unsupported File Type',
      message: 'This file format is not supported.',
      action: 'Please upload a PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, or TXT file.',
      severity: 'error'
    };
  }

  if (lowerError.includes('no file selected')) {
    return {
      title: 'No File Selected',
      message: 'Please select a file to upload.',
      action: 'Click "Choose file" or drag and drop a file into the upload area.',
      severity: 'warning'
    };
  }

  // Filecoin/IPFS Upload Errors
  if (lowerError.includes('failed to upload to filecoin') || lowerError.includes('ipfs')) {
    return {
      title: 'Storage Network Issue',
      message: 'Unable to store your file on the decentralized network.',
      action: 'This is usually temporary. Please try uploading again in a few minutes.',
      severity: 'error'
    };
  }

  if (lowerError.includes('upload timeout')) {
    return {
      title: 'Upload Taking Too Long',
      message: 'The upload is taking longer than expected.',
      action: 'Try uploading a smaller file or check your internet connection.',
      severity: 'error'
    };
  }

  // Blockchain and Smart Contract Errors
  if (lowerError.includes('transaction failed') || lowerError.includes('failed to register document')) {
    return {
      title: 'Blockchain Registration Failed',
      message: 'Your file was uploaded but could not be registered on the blockchain.',
      action: 'Please try again. Make sure you have enough funds for transaction fees.',
      severity: 'error'
    };
  }

  if (lowerError.includes('user rejected') || lowerError.includes('user denied')) {
    return {
      title: 'Transaction Cancelled',
      message: 'You cancelled the transaction in your wallet.',
      action: 'To complete the upload, please approve the transaction when prompted.',
      severity: 'info'
    };
  }

  if (lowerError.includes('insufficient funds') || lowerError.includes('gas')) {
    return {
      title: 'Insufficient Funds',
      message: 'You don\'t have enough funds to pay for the transaction.',
      action: 'Please add funds to your wallet and try again.',
      severity: 'error'
    };
  }

  // Validation Errors
  if (lowerError.includes('document type')) {
    return {
      title: 'Document Type Required',
      message: 'Please select what type of document you\'re uploading.',
      action: 'Choose a document type from the dropdown menu.',
      severity: 'warning'
    };
  }

  if (lowerError.includes('metadata') || lowerError.includes('invalid format')) {
    return {
      title: 'Invalid Document Information',
      message: 'There\'s an issue with the document information provided.',
      action: 'Please check your description and tags, then try again.',
      severity: 'error'
    };
  }

  // Rate Limiting and Server Errors
  if (lowerError.includes('rate limit') || lowerError.includes('too many requests')) {
    return {
      title: 'Too Many Requests',
      message: 'You\'re uploading too quickly.',
      action: 'Please wait a moment before trying to upload again.',
      severity: 'warning'
    };
  }

  if (lowerError.includes('server error') || lowerError.includes('500') || lowerError.includes('503')) {
    return {
      title: 'Service Temporarily Unavailable',
      message: 'Our servers are experiencing issues.',
      action: 'Please try again in a few minutes. If the problem persists, contact support.',
      severity: 'error'
    };
  }

  // Generic timeout errors
  if (lowerError.includes('timeout')) {
    return {
      title: 'Request Timed Out',
      message: 'The operation took too long to complete.',
      action: 'Please check your connection and try again.',
      severity: 'error'
    };
  }

  // Default fallback for unknown errors
  return {
    title: 'Upload Failed',
    message: 'Something went wrong while uploading your document.',
    action: 'Please try again. If the problem continues, contact support.',
    severity: 'error'
  };
}

/**
 * Gets appropriate icon for error severity
 */
export function getErrorIcon(severity: FriendlyError['severity']): string {
  switch (severity) {
    case 'error':
      return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'; // Alert circle
    case 'warning':
      return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z'; // Warning triangle
    case 'info':
      return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'; // Info circle
    default:
      return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }
}

/**
 * Gets appropriate color classes for error severity
 */
export function getErrorColors(severity: FriendlyError['severity']): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} {
  switch (severity) {
    case 'error':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        icon: 'text-red-400'
      };
    case 'warning':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        icon: 'text-yellow-400'
      };
    case 'info':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        icon: 'text-blue-400'
      };
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-800',
        icon: 'text-gray-400'
      };
  }
}