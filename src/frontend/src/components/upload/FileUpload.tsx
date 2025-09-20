'use client'

import { DocumentUpload } from '@/components/DocumentUpload'

// Legacy FileUpload component - now uses DocumentUpload for direct smart contract interaction

export function FileUpload() {
  return <DocumentUpload />
}