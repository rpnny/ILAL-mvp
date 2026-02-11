import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { Navbar } from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ILAL - Institutional Liquidity Access Layer',
  description: 'Compliant institutional liquidity access layer built on Uniswap v4, using zero-knowledge proofs for on-chain privacy verification',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-slate-200/60 py-6 text-center text-xs text-slate-400">
              ILAL v0.1.0 &middot; Base Sepolia Testnet &middot; Powered by Uniswap v4 + PLONK
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
