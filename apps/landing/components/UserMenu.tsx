'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { User, LogOut, Key, BarChart3 } from 'lucide-react';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-sm hover:text-white transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-[#2962FF] flex items-center justify-center">
          <User className="w-4 h-4" />
        </div>
        <span className="hidden md:inline text-gray-400">{user.email}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[#1A1A1A] border border-white/10 rounded-lg shadow-xl py-2 z-50">
          <div className="px-4 py-3 border-b border-white/10">
            <div className="text-sm font-medium">{user.name || user.email}</div>
            <div className="text-xs text-gray-500 mt-1">{user.email}</div>
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-[#2962FF]/20 text-[#2962FF]">
                {user.plan || 'FREE'} Plan
              </span>
            </div>
          </div>

          <div className="py-1">
            <Link
              href="/dashboard/api-keys"
              className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Key className="w-4 h-4 mr-3" />
              API Keys
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <BarChart3 className="w-4 h-4 mr-3" />
              Usage Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
