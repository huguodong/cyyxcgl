import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, type AuthUser, isUnauthorizedError } from '@/services/api';

interface AuthContextValue {
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  user: AuthUser | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  const refreshUser = async () => {
    try {
      const currentUser = await api.auth.me();
      setUser(currentUser);
    } catch (error) {
      if (!isUnauthorizedError(error)) {
        console.error('Failed to refresh auth user:', error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshUser();
  }, []);

  const login = async (username: string, password: string) => {
    const currentUser = await api.auth.login({ username, password });
    setUser(currentUser);
    return currentUser;
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    login,
    logout,
    refreshUser,
    user,
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
