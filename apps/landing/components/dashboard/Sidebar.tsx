'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Key, BarChart3, Settings, FileText, ArrowLeft, Play, ScrollText, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: Home, exact: true },
  { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
  { name: 'Usage', href: '/dashboard/usage', icon: BarChart3 },
  { name: 'Playground', href: '/dashboard/playground', icon: Play },
  { name: 'Activity Logs', href: '/dashboard/logs', icon: ScrollText },
  { name: 'API Docs', href: '/docs', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }
  }),
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-64 bg-white/[0.02] backdrop-blur-xl border-r border-white/[0.06] flex flex-col flex-shrink-0 relative"
    >
      {/* Subtle gradient accent at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2962FF]/40 to-transparent" />

      <div className="h-16 flex items-center px-6 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center space-x-3 group">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="w-7 h-7 bg-[#2962FF] rounded-md flex items-center justify-center shadow-lg shadow-[#2962FF]/20"
          >
            <span className="font-bold text-white text-sm">I</span>
          </motion.div>
          <span className="text-lg font-semibold tracking-tight group-hover:text-[#2962FF] transition-colors">ILAL</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-auto">
        {navigation.map((item, i) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
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
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-[#2962FF]/15 border border-[#2962FF]/25 rounded-lg"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <item.icon className={cn(
                  'w-[18px] h-[18px] relative z-10 transition-colors',
                  isActive ? 'text-[#2962FF]' : 'group-hover:text-[#2962FF]/70'
                )} />
                <span className="relative z-10">{item.name}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/[0.06] space-y-1">
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-white/[0.03] mb-2"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-[#2962FF] to-[#7C4DFF] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-lg shadow-[#2962FF]/20">
              {user.name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user.name || user.email}</div>
              <div className="text-xs text-gray-500">{user.plan || 'FREE'} Plan</div>
            </div>
          </motion.div>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>Sign Out</span>
        </button>

        <Link
          href="/"
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all duration-200"
        >
          <ArrowLeft className="w-[18px] h-[18px]" />
          <span>Back to Home</span>
        </Link>
      </div>
    </motion.div>
  );
}
