import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

export type User = {
  username: string;
  email?: string;
  role?: string;
  sector?: number | null;
  department?: number | null;
  is_superuser?: boolean;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('auth_token', token);
      // Fetch user profile from backend
      (async () => {
        try {
          const res = await api.get('/me/');
          setUser({
            username: res.data?.username,
            email: res.data?.email,
            role: res.data?.role,
            sector: res.data?.sector ?? null,
            department: res.data?.department ?? null,
            is_superuser: res.data?.is_superuser ?? false,
          });
          localStorage.setItem('auth_username', res.data?.username ?? '');
        } catch (e) {
          // token invalid -> logout
          setUser(null);
        }
      })();
    } else {
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  }, [token]);

  const login = async (username: string, password: string) => {
    const res = await api.post('/auth/token/', { username, password });
    const tok = res.data?.token;
    setToken(tok);
    localStorage.setItem('auth_username', username);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('auth_username');
  };

  const value = useMemo(() => ({ user, token, login, logout }), [user, token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
