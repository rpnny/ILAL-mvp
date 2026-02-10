import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { DemoModeBanner } from '@/components/DemoModeBanner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ILAL - Institutional Liquidity Access Layer',
  description: '基于 Uniswap v4 的合规机构流动性接入层',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <DemoModeBanner />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
