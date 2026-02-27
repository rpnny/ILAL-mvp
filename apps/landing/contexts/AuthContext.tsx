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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
        // Refresh user info in background
        api.getMe(token)
          .then(({ user: freshUser }) => {
            setUser(freshUser as User);
            localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
          })
          .catch(() => {
            // Token might be expired, try to refresh
            const refreshTok = localStorage.getItem(REFRESH_TOKEN_KEY);
            if (refreshTok) {
              api.refreshToken(refreshTok)
                .then(({ accessToken }) => {
                  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
                  return api.getMe(accessToken);
                })
                .then(({ user: freshUser }) => {
                  setUser(freshUser as User);
                  localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
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
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const login = async (email: string, password: string) => {
    const { user: loggedInUser, accessToken, refreshToken } = await api.login(email, password);
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser as User);
    toast.success(`Welcome back, ${loggedInUser.name || loggedInUser.email}!`);
    router.push('/dashboard/api-keys');
  };

  const register = async (email: string, password: string, name?: string, inviteCode?: string) => {
    const { user: newUser, accessToken, refreshToken } = await api.register(email, password, name, inviteCode);
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
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
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;
    try {
      const { user: freshUser } = await api.getMe(token);
      setUser(freshUser as User);
      localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
    } catch {
      clearSession();
    }
  }, []);

  const verifyEmail = async (email: string, code: string) => {
    const result = await api.verifyEmail(email, code);
    if (result.accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      setUser(result.user as User);
    }
    toast.success('Email verified successfully!');
  };

  const resendCode = async (email: string) => {
    await api.resendCode(email);
    toast.success('Verification code sent!');
  };

  const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

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
