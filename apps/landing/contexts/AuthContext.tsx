'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import * as api from '@/lib/api';

interface User {
  id: string;
  email: string;
  name?: string;
  plan: string;
  walletAddress?: string;
  emailVerified?: boolean | number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, inviteCode?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'ilal_access_token';
const REFRESH_TOKEN_KEY = 'ilal_refresh_token';
const USER_KEY = 'ilal_user';

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

function migrateLegacyValue(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const legacy = window.localStorage.getItem(key);
  if (!legacy) return null;
  window.sessionStorage.setItem(key, legacy);
  window.localStorage.removeItem(key);
  return legacy;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const storage = getSessionStorage();
    const storedUser = storage?.getItem(USER_KEY) ?? migrateLegacyValue(USER_KEY);
    const token = storage?.getItem(ACCESS_TOKEN_KEY) ?? migrateLegacyValue(ACCESS_TOKEN_KEY);

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
        // Refresh user info in background
        api.getMe(token)
          .then(({ user: freshUser }) => {
            setUser(freshUser as User);
            storage?.setItem(USER_KEY, JSON.stringify(freshUser));
          })
          .catch(() => {
            // Token might be expired, try to refresh
            const refreshTok = storage?.getItem(REFRESH_TOKEN_KEY) ?? migrateLegacyValue(REFRESH_TOKEN_KEY);
            if (refreshTok) {
              api.refreshToken(refreshTok)
                .then(({ accessToken }) => {
                  storage?.setItem(ACCESS_TOKEN_KEY, accessToken);
                  return api.getMe(accessToken);
                })
                .then(({ user: freshUser }) => {
                  setUser(freshUser as User);
                  storage?.setItem(USER_KEY, JSON.stringify(freshUser));
                })
                .catch(() => {
                  // Refresh failed, clear session
                  clearSession();
                });
            } else {
              clearSession();
            }
          });
      } catch {
        clearSession();
      }
    }

    setLoading(false);
  }, []);

  const clearSession = () => {
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    window.sessionStorage.removeItem(USER_KEY);
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const login = async (email: string, password: string) => {
    const storage = getSessionStorage();
    const { user: loggedInUser, accessToken, refreshToken } = await api.login(email, password);
    storage?.setItem(ACCESS_TOKEN_KEY, accessToken);
    storage?.setItem(REFRESH_TOKEN_KEY, refreshToken);
    storage?.setItem(USER_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser as User);
    toast.success(`Welcome back, ${loggedInUser.name || loggedInUser.email}!`);
    router.push('/dashboard/api-keys');
  };

  const register = async (email: string, password: string, name?: string, inviteCode?: string) => {
    const storage = getSessionStorage();
    const { user: newUser, accessToken, refreshToken } = await api.register(email, password, name, inviteCode);
    storage?.setItem(ACCESS_TOKEN_KEY, accessToken);
    storage?.setItem(REFRESH_TOKEN_KEY, refreshToken);
    storage?.setItem(USER_KEY, JSON.stringify(newUser));
    setUser(newUser as User);
    toast.success(`Welcome to ILAL, ${newUser.name || newUser.email}!`);
    router.push('/dashboard/api-keys');
  };

  const logout = () => {
    clearSession();
    toast.success('Logged out successfully.');
    router.push('/');
  };

  const refreshUser = useCallback(async () => {
    const token = getSessionStorage()?.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;
    try {
      const { user: freshUser } = await api.getMe(token);
      setUser(freshUser as User);
      getSessionStorage()?.setItem(USER_KEY, JSON.stringify(freshUser));
    } catch {
      clearSession();
    }
  }, []);

  const verifyEmail = async (email: string, code: string) => {
    const storage = getSessionStorage();
    const result = await api.verifyEmail(email, code);
    if (result.accessToken) {
      storage?.setItem(ACCESS_TOKEN_KEY, result.accessToken);
      storage?.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
      storage?.setItem(USER_KEY, JSON.stringify(result.user));
      setUser(result.user as User);
    }
    toast.success('Email verified successfully!');
  };

  const resendCode = async (email: string) => {
    await api.resendCode(email);
    toast.success('Verification code sent!');
  };

  const getAccessToken = () => getSessionStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      verifyEmail,
      resendCode,
      getAccessToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
