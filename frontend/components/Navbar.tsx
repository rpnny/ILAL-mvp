'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useSession } from '@/hooks/useSession';
import { useAccount } from 'wagmi';

const NAV_ITEMS = [
  { href: '/', label: 'Verify', icon: ShieldIcon },
  { href: '/trade', label: 'Trade', icon: SwapIcon },
  { href: '/liquidity', label: 'Liquidity', icon: DropIcon },
  { href: '/history', label: 'History', icon: ClockIcon },
];

export function Navbar() {
  const pathname = usePathname();
  const { isActive, timeRemainingFormatted } = useSession();
  const { isConnected } = useAccount();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <span className="text-white font-bold text-sm">IL</span>
            </div>
            <span className="font-bold text-lg text-slate-900">ILAL</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-3">
            {/* Session 状态指示器 */}
            {isConnected && (
              <SessionBadge
                isActive={!!isActive}
                timeRemaining={timeRemainingFormatted}
              />
            )}

            {/* Wallet connect */}
            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus="avatar"
            />
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-100 py-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1.5 px-3 text-xs ${
                active ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}

// ============ Session Badge ============

function SessionBadge({
  isActive,
  timeRemaining,
}: {
  isActive: boolean;
  timeRemaining: string;
}) {
  return (
    <div
      className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
        isActive
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-slate-100 text-slate-500 border border-slate-200'
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
        }`}
      />
      <span>{isActive ? timeRemaining : 'Not Verified'}</span>
    </div>
  );
}

// ============ 图标 ============

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function DropIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
