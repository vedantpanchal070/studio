
"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: { username: string; password?: string } | null;
  loading: boolean;
  login: (username: string, pass: string) => boolean;
  logout: () => void;
  changePassword: (currentPass: string, newPass: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const FAKE_USER_KEY = 'inventomax_user';
const DEFAULT_USER = {
  username: 'admin',
  password: 'password',
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ username: string; password?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // This effect runs only on the client-side
    try {
      const storedUser = localStorage.getItem(FAKE_USER_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        // If no user is stored, we create the default one for the first run.
        localStorage.setItem(FAKE_USER_KEY, JSON.stringify(DEFAULT_USER));
        setUser(DEFAULT_USER);
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      // If parsing fails, reset to a default state
      localStorage.setItem(FAKE_USER_KEY, JSON.stringify(DEFAULT_USER));
      setUser(DEFAULT_USER);
    } finally {
        setLoading(false);
    }
  }, []);

  const login = (username: string, pass: string): boolean => {
    // During login, we get the currently stored user to check against
    const storedUserRaw = localStorage.getItem(FAKE_USER_KEY);
    const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : DEFAULT_USER;
    
    if (username === storedUser.username && pass === storedUser.password) {
      // Critical Fix: Set the full user object, including the password, into the state.
      setUser(storedUser); 
      return true;
    }
    return false;
  };

  const logout = () => {
    // We don't remove the user object itself from storage on logout, 
    // just clear the session state. This way the "user" persists.
    setUser(null);
    router.push('/login');
  };

  const changePassword = (currentPass: string, newPass: string): boolean => {
    const storedUserRaw = localStorage.getItem(FAKE_USER_KEY);
    if (!storedUserRaw) return false;

    const storedUser = JSON.parse(storedUserRaw);

    if (storedUser.password === currentPass) {
      const updatedUser = { ...storedUser, password: newPass };
      localStorage.setItem(FAKE_USER_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser); // Keep the local state in sync
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword }}>
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
