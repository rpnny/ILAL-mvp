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
  const [deviceId, setDeviceId] = React.useState<string>('');
  const [user, setUser] = React.useState<User>(MOCK_USER);

  React.useEffect(() => {
    let id = localStorage.getItem('ilal_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('ilal_device_id', id);
    }
    setDeviceId(id);

    // Update the mock user to visually show them their unique ID (e.g. Developer 1a2b)
    setUser({
      ...MOCK_USER,
      id: `usr_${id.substring(0, 20)}`,
      email: `developer_${id}@ilal.xyz`,
      name: `Developer ${id.substring(0, 4)}`,
    });
  }, []);

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
    localStorage.removeItem('ilal_device_id');
    window.location.href = '/';
  };

  const refreshUser = async () => { };

  return (
    <AuthContext.Provider value={{
      user,
      loading: !deviceId, // Wait for deviceID to be loaded on client
      login,
      register,
      logout,
      refreshUser,
      verifyEmail: verifyEmailAction,
      resendCode: resendCodeAction,
      getAccessToken: () => deviceId ? `mock-access-token-${deviceId}` : 'mock-access-token', // Used for API calls from the client
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
