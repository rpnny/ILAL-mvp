'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Lock, Code, ArrowLeft, Package, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

const navigation = [
  { name: 'Overview', href: '/docs', icon: BookOpen },
  { name: 'Quick Start', href: '/docs/quickstart', icon: Code },
  { name: 'Authentication', href: '/docs/authentication', icon: Lock },
  { name: 'API Endpoints', href: '/docs/endpoints', icon: Code },
  { name: 'SDK Guide', href: '/docs/sdk', icon: Package },
  { name: 'Error Codes', href: '/docs/errors', icon: AlertTriangle },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Background orbs */}
      <div className="orb orb--1" />
      <div className="orb orb--2" />

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 glass fixed h-screen flex flex-col" style={{ borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderLeft: 'none' }}>
          {/* Logo */}
          <div className="h-16 flex items-center px-6" style={{ borderBottom: '1px solid var(--border)' }}>
            <Link href="/" className="flex items-center space-x-3 group">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center"
                style={{ background: 'var(--accent)' }}
              >
                <span className="font-bold text-white text-sm">I</span>
              </div>
              <span className="font-display text-lg font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
                ILAL Docs
              </span>
            </Link>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group',
                    isActive
                      ? 'text-[var(--text)]'
                      : 'text-[var(--text2)] hover:text-[var(--text)]'
                  )}
                  style={isActive ? {
                    background: 'rgba(59,130,246,0.12)',
                    border: '1px solid rgba(59,130,246,0.2)',
                  } : {}}
                >
                  <item.icon className={cn(
                    'w-[18px] h-[18px] relative z-10 transition-colors',
                  )} style={{ color: isActive ? 'var(--accent)' : undefined }} />
                  <span className="relative z-10">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom links */}
          <div className="p-3 space-y-0.5" style={{ borderTop: '1px solid var(--border)' }}>
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all duration-200"
              style={{ color: 'var(--text2)' }}
            >
              <Home className="w-[18px] h-[18px]" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all duration-200"
              style={{ color: 'var(--text2)' }}
            >
              <ArrowLeft className="w-[18px] h-[18px]" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 ml-64">
          {children}
        </div>
      </div>
    </div>
  );
}
