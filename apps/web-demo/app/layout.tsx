import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { Navbar } from '@/components/Navbar';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// 优化字体加载
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // 字体交换策略，防止不可见文本（FOIT）
  preload: true,
});

// 优化的元数据
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'),
  title: {
    default: 'ILAL - Institutional Liquidity Access Layer',
    template: '%s | ILAL',
  },
  description: 'Compliant institutional liquidity access layer built on Uniswap v4, using zero-knowledge proofs for on-chain privacy verification',
  keywords: ['DeFi', 'Uniswap v4', 'Zero Knowledge Proof', 'PLONK', 'KYC', 'Compliance', 'Base', 'Ethereum'],
  authors: [{ name: 'ILAL Team' }],
  creator: 'ILAL',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://ilal.io',
    title: 'ILAL - Institutional Liquidity Access Layer',
    description: 'Privacy-preserving compliant DeFi access powered by zero-knowledge proofs',
    siteName: 'ILAL',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ILAL - Institutional Liquidity Access Layer',
    description: 'Privacy-preserving compliant DeFi access powered by zero-knowledge proofs',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <ErrorBoundary>
                <main className="flex-1">{children}</main>
              </ErrorBoundary>
              <footer className="border-t border-slate-200/60 py-6 text-center text-xs text-slate-400">
                ILAL v0.1.0 &middot; Base Sepolia Testnet &middot; Powered by Uniswap v4 + PLONK
              </footer>
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
