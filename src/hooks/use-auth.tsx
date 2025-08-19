
"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, updateUser, createUser } from '@/lib/actions';
import type { User } from '@/lib/schemas';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (currentPass: string, newPass: string) => Promise<boolean>;
  signup: (username: string, pass: string) => Promise<{ success: boolean, message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_STORAGE_KEY = 'inventomax_session_user';


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for a session on initial load
    try {
      const storedUser = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
        console.error("Failed to parse user from sessionStorage", error);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } finally {
        setLoading(false);
    }
  }, []);
  
  const signup = useCallback(async (username: string, pass: string) => {
    const result = await createUser({ username, password: pass });
    return result;
  }, []);

  const login = useCallback(async (username: string, pass: string): Promise<boolean> => {
    const foundUser = await getUser(username);
    
    if (foundUser && foundUser.password === pass) {
      const userToStore = { username: foundUser.username, password: foundUser.password };
      setUser(userToStore); 
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userToStore));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    router.push('/login');
  }, [router]);

  const changePassword = useCallback(async (currentPass: string, newPass: string): Promise<boolean> => {
    // We get the user from session storage to ensure we have the most recent data client-side
    const storedUserStr = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!storedUserStr) return false;
    const storedUser = JSON.parse(storedUserStr);

    if (storedUser.password === currentPass) {
      const updatedUser = { ...storedUser, password: newPass };
      const success = await updateUser(updatedUser);
      if (success) {
        setUser(updatedUser); // Keep the local state in sync
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedUser));
        return true;
      }
    }
    return false;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword, signup }}>
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
