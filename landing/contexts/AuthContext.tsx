'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as authLib from '../lib/auth';
import * as api from '../lib/api';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Initialize: check if already logged in
  useEffect(() => {
    const initAuth = async () => {
      const token = authLib.getAccessToken();
      const savedUser = authLib.getUser();

      if (token && savedUser) {
        setUser(savedUser);

        // Validate the token
        try {
          const response = await api.getMe(token);
          setUser(response.user);
          authLib.setUser(response.user);
        } catch (error) {
          // Token invalid, clear
          authLib.clearTokens();
          setUser(null);
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login(email, password);

      authLib.setTokens(response.accessToken, response.refreshToken);
      authLib.setUser(response.user);
      setUser(response.user);

      toast.success('Logged in successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      // Handle unverified email
      if (error.message?.includes('not verified') || error.message?.includes('verification')) {
        toast.error('Please verify your email first');
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      toast.error(error.message || 'Login failed');
      throw error;
    }
  };

  const register = async (email: string, password: string, name?: string, inviteCode?: string) => {
    try {
      const response = await api.register(email, password, name, inviteCode);

      authLib.setTokens(response.accessToken, response.refreshToken);
      authLib.setUser(response.user);
      setUser(response.user);

      toast.success('Registration successful! Welcome to ILAL.');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
      throw error;
    }
  };

  const verifyEmailAction = async (email: string, code: string) => {
    try {
      const response = await api.verifyEmail(email, code);

      authLib.setTokens(response.accessToken, response.refreshToken);
      authLib.setUser(response.user);
      setUser(response.user);

      toast.success('Email verified! Welcome to ILAL.');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Verification failed');
      throw error;
    }
  };

  const resendCodeAction = async (email: string) => {
    try {
      await api.resendCode(email);
      toast.success('Verification code sent! Check your email.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend code');
      throw error;
    }
  };

  const logout = () => {
    authLib.clearTokens();
    setUser(null);
    toast.success('Signed out');
    router.push('/');
  };

  const refreshUser = async () => {
    const token = authLib.getAccessToken();
    if (!token) return;

    try {
      const response = await api.getMe(token);
      setUser(response.user);
      authLib.setUser(response.user);
    } catch (error) {
      // Refresh failed, logout
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      verifyEmail: verifyEmailAction,
      resendCode: resendCodeAction,
      getAccessToken: authLib.getAccessToken,
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
