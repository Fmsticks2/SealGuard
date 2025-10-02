import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import AppKitProvider from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SealGuard",
  description: "Secure document verification on Filecoin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppKitProvider>
          <header className="border-b bg-white/50 backdrop-blur">
            <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
              <nav className="flex items-center space-x-6">
                <Link href="/" className="text-xl font-semibold">SealGuard</Link>
                <Link href="/dashboard">Dashboard</Link>
              </nav>
              <appkit-button></appkit-button>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        </AppKitProvider>
      </body>
    </html>
  );
}
