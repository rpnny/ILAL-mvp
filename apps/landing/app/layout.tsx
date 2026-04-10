import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from "../contexts/AuthContext";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "ILAL | Institutional Liquidity Access Layer",
  description:
    "Zero-knowledge compliance infrastructure for Uniswap v4. Institutions trade on-chain with full KYC/AML compliance, 97% gas reduction, and 24-hour cached sessions.",
  keywords: [
    "DeFi compliance",
    "Uniswap v4 hooks",
    "zero-knowledge proofs",
    "institutional DeFi",
    "KYC on-chain",
    "ZK compliance",
    "Base blockchain",
  ],
  metadataBase: new URL("https://ilal.tech"),
  openGraph: {
    title: "ILAL — Institutional Liquidity Access Layer",
    description:
      "Zero-knowledge compliance for Uniswap v4. One session, 97% less gas, full regulatory safety.",
    url: "https://ilal.tech",
    siteName: "ILAL Protocol",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ILAL — ZK Compliance for Institutional DeFi",
    description:
      "Institutions trade on-chain with full compliance. Built on Uniswap v4 hooks, powered by PLONK zero-knowledge proofs.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans bg-background text-white`}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}
