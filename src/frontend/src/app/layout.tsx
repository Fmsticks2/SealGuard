import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SealGuard - Secure Document Storage on Filecoin',
  description: 'Immutable audit trail system with PDP verification on Filecoin network',
  keywords: ['filecoin', 'storage', 'verification', 'blockchain', 'audit', 'documents'],
  authors: [{ name: 'SealGuard Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3B82F6',
  openGraph: {
    title: 'SealGuard - Secure Document Storage',
    description: 'Immutable audit trail system with PDP verification on Filecoin network',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SealGuard - Secure Document Storage',
    description: 'Immutable audit trail system with PDP verification on Filecoin network',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 antialiased`}>
        <Providers>
          <div className="min-h-full">
            {children}
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}