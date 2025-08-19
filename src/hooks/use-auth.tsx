
"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: string | null;
  loading: boolean;
  login: (username: string, pass: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hardcoded credentials for the prototype
const FAKE_USER = {
  username: 'admin',
  password: 'password',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // This effect runs only on the client-side
    try {
      const storedUser = localStorage.getItem('inventomax_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('inventomax_user');
    } finally {
        setLoading(false);
    }
  }, []);

  const login = (username: string, pass: string): boolean => {
    if (username === FAKE_USER.username && pass === FAKE_USER.password) {
      const userData = JSON.stringify(username);
      localStorage.setItem('inventomax_user', userData);
      setUser(username);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('inventomax_user');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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
