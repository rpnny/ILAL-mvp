'use client';

import React, { createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name?: string;
  plan: string;
  walletAddress?: string;
  emailVerified?: boolean;
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

// Provide a mock user so the dashboard doesn't crash, but there's no real login requirement
const MOCK_USER: User = {
  id: 'usr_anonymous_demo',
  email: 'developer@ilal.xyz',
  name: 'ILAL Developer',
  plan: 'ENTERPRISE',
  emailVerified: true
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Mock functions that do nothing or just show toasts
  const login = async () => {
    toast.success('You have direct access. Taking you to dashboard.');
    router.push('/dashboard/api-keys');
  };

  const register = async () => {
    toast.success('Registration not required. Taking you to dashboard.');
    router.push('/dashboard/api-keys');
  };

  const verifyEmailAction = async () => { };
  const resendCodeAction = async () => { };

  const logout = () => {
    toast.success('Session cleared locally');
    router.push('/');
  };

  const refreshUser = async () => { };

  return (
    <AuthContext.Provider value={{
      user: MOCK_USER,
      loading: false, // Never loading since we have a mock user instantly
      login,
      register,
      logout,
      refreshUser,
      verifyEmail: verifyEmailAction,
      resendCode: resendCodeAction,
      getAccessToken: () => 'mock-access-token', // Used for API calls from the client
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
