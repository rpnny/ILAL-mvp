'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, ChevronDown, LogOut, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const pageTitles: Record<string, string> = {
    '/dashboard': 'Overview',
    '/dashboard/api-keys': 'API Keys',
    '/dashboard/usage': 'Usage',
    '/dashboard/settings': 'Settings',
    '/dashboard/playground': 'API Playground',
    '/dashboard/logs': 'Activity Logs',
};

export default function TopBar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const pageTitle = pageTitles[pathname] || 'Dashboard';

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="h-16 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-30"
        >
            <div>
                <motion.h2
                    key={pageTitle}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-lg font-semibold"
                >
                    {pageTitle}
                </motion.h2>
            </div>

            <div className="flex items-center space-x-3">
                <motion.div
                    className="relative hidden md:block"
                    animate={{ width: searchFocused ? 280 : 224 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${searchFocused ? 'text-[#2962FF]' : 'text-gray-500'}`} />
                    <input
                        type="text"
                        placeholder="Search docs..."
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className={`w-full bg-white/[0.04] border rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none transition-all duration-300 ${searchFocused
                                ? 'border-[#2962FF]/50 bg-white/[0.06] shadow-[0_0_20px_rgba(41,98,255,0.1)]'
                                : 'border-white/[0.08]'
                            }`}
                    />
                </motion.div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative p-2 text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#2962FF] rounded-full animate-pulse" />
                </motion.button>

                <div className="relative" ref={menuRef}>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-all duration-200"
                    >
                        <div className="w-8 h-8 bg-gradient-to-br from-[#2962FF] to-[#7C4DFF] rounded-full flex items-center justify-center text-sm font-bold shadow-lg shadow-[#2962FF]/20">
                            {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="hidden md:block text-left">
                            <div className="text-sm font-medium truncate max-w-[120px]">
                                {user?.name || user?.email}
                            </div>
                            <div className="text-xs text-gray-500">{user?.plan || 'FREE'} Plan</div>
                        </div>
                        <motion.div
                            animate={{ rotate: showUserMenu ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        </motion.div>
                    </motion.button>

                    <AnimatePresence>
                        {showUserMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                                className="absolute right-0 top-full mt-2 w-56 bg-[#141414] backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl shadow-black/40 overflow-hidden py-1 z-50"
                            >
                                <div className="px-4 py-3 border-b border-white/[0.06]">
                                    <div className="text-sm font-medium truncate">{user?.name || user?.email}</div>
                                    <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                                </div>
                                <a
                                    href="/dashboard/settings"
                                    className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/[0.04] transition-all duration-150"
                                >
                                    <User className="w-4 h-4" />
                                    <span>Settings</span>
                                </a>
                                <button
                                    onClick={() => {
                                        setShowUserMenu(false);
                                        logout();
                                    }}
                                    className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-150"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Sign Out</span>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}
