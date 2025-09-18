
"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, updateUser, createUser, changeUsername as changeUsernameAction } from '@/lib/actions';
import type { User } from '@/lib/schemas';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (currentPass: string, newPass: string) => Promise<boolean>;
  changeUsername: (newUsername: string, currentPass: string) => Promise<{ success: boolean, message?: string, field?: string }>;
  signup: (username: string, pass: string) => Promise<{ success: boolean, message?: string }>;
  updateUserPreferences: (preferences: Partial<User>) => Promise<boolean>;
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
    
    if (!foundUser) {
      return false; // User does not exist
    }

    if (foundUser.password === pass) {
      setUser(foundUser); 
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(foundUser));
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
    const storedUserStr = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!storedUserStr) return false;
    
    try {
        const sessionUser = JSON.parse(storedUserStr);
        const serverUser = await getUser(sessionUser.username);

        if (!serverUser || serverUser.password !== currentPass) {
            return false;
        }

        const updatedUserPayload = { ...serverUser, password: newPass };
        const success = await updateUser(updatedUserPayload);
        
        if (success) {
            setUser(updatedUserPayload);
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedUserPayload));
            return true;
        }
        return false;

    } catch (error) {
        console.error("Error during password change:", error);
        return false;
    }
  }, []);

  const changeUsername = useCallback(async (newUsername: string, currentPass: string) => {
    if (!user) {
      return { success: false, message: 'You must be logged in.' };
    }
    const result = await changeUsernameAction(user.username, newUsername, currentPass);
    if (result.success) {
      // Log the user out after a successful username change for security.
      // They will need to log back in with their new username.
      setTimeout(() => logout(), 1500); 
    }
    return result;
  }, [user, logout]);

  const updateUserPreferences = useCallback(async (preferences: Partial<User>) => {
    if (!user) return false;
    
    const updatedUser = { ...user, ...preferences };
    const success = await updateUser(updatedUser);
    
    if (success) {
      setUser(updatedUser);
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedUser));
    }
    return success;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword, signup, changeUsername, updateUserPreferences }}>
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
