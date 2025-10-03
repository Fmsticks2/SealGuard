import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SEO from "../components/SEO";
import Link from "next/link";
import AppKitProvider from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SealGuard - Blockchain Document Verification",
  description: "Secure, immutable document verification powered by blockchain technology",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <SEO />
      <body className={`${inter.className} antialiased`}>
        <AppKitProvider>
          {/* Header */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                {/* Logo */}
                <Link href="/" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">S</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">SealGuard</span>
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex items-center space-x-8">
                  <Link href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Features
                  </Link>
                  <Link href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Pricing
                  </Link>
                  <Link href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">
                    About
                  </Link>
                  <Link href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Contact
                  </Link>
                </nav>

                {/* CTA Button */}
                <div className="flex items-center space-x-4">
                  <w3m-button />
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="min-h-screen">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-gray-900 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Brand */}
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">S</span>
                    </div>
                    <span className="text-xl font-bold">SealGuard</span>
                  </div>
                  <p className="text-gray-400 mb-4 max-w-md">
                    Secure, immutable document verification powered by blockchain technology. 
                    Protect your documents with enterprise-grade security.
                  </p>
                </div>

                {/* Product */}
                <div>
                  <h3 className="font-semibold mb-4">Product</h3>
                  <ul className="space-y-2 text-gray-400">
                    <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                    <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                    <li><Link href="#security" className="hover:text-white transition-colors">Security</Link></li>
                    <li><Link href="#api" className="hover:text-white transition-colors">API</Link></li>
                  </ul>
                </div>

                {/* Company */}
                <div>
                  <h3 className="font-semibold mb-4">Company</h3>
                  <ul className="space-y-2 text-gray-400">
                    <li><Link href="#about" className="hover:text-white transition-colors">About</Link></li>
                    <li><Link href="#contact" className="hover:text-white transition-colors">Contact</Link></li>
                    <li><Link href="#careers" className="hover:text-white transition-colors">Careers</Link></li>
                    <li><Link href="#blog" className="hover:text-white transition-colors">Blog</Link></li>
                  </ul>
                </div>
              </div>

              {/* Bottom */}
              <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
                <p className="text-gray-400 text-sm">
                  © 2024 SealGuard. All rights reserved.
                </p>
                <div className="flex space-x-6 mt-4 md:mt-0">
                  <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                    Privacy Policy
                  </Link>
                  <Link href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                    Terms of Service
                  </Link>
                </div>
              </div>
            </div>
          </footer>
        </AppKitProvider>
      </body>
    </html>
  );
}
