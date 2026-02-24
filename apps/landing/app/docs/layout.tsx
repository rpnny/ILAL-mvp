'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
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

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }
  }),
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Background pattern */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
        backgroundSize: '48px 48px'
      }} />

      <div className="flex">
        {/* Sidebar */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-64 bg-white/[0.02] backdrop-blur-xl border-r border-white/[0.06] flex flex-col fixed h-screen relative"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00F0FF]/40 to-transparent" />

          <div className="h-16 flex items-center px-6 border-b border-white/[0.06]">
            <Link href="/" className="flex items-center space-x-3 group">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="w-7 h-7 bg-[#00F0FF] rounded-md flex items-center justify-center shadow-lg shadow-[#00F0FF]/20"
              >
                <span className="font-bold text-white text-sm">I</span>
              </motion.div>
              <span className="font-heading text-lg font-semibold tracking-tight group-hover:text-[#00F0FF] transition-colors">ILAL Docs</span>
            </Link>
          </div>

          <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-auto">
            {navigation.map((item, i) => {
              const isActive = pathname === item.href;
              return (
                <motion.div
                  key={item.name}
                  custom={i}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group',
                      isActive
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="docs-active"
                        className="absolute inset-0 bg-[#00F0FF]/15 border border-[#00F0FF]/25 rounded-lg"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                    <item.icon className={cn(
                      'w-[18px] h-[18px] relative z-10 transition-colors',
                      isActive ? 'text-[#00F0FF]' : 'group-hover:text-[#00F0FF]/70'
                    )} />
                    <span className="relative z-10">{item.name}</span>
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          <div className="p-3 border-t border-white/[0.06] space-y-0.5">
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all duration-200"
            >
              <Home className="w-[18px] h-[18px]" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all duration-200"
            >
              <ArrowLeft className="w-[18px] h-[18px]" />
              <span>Back to Home</span>
            </Link>
          </div>
        </motion.div>

        {/* Content */}
        <div className="flex-1 ml-64">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
