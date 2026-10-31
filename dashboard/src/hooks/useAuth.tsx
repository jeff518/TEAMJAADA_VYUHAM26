import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { User } from '../types';
import { authApi, MOCK_USER } from '../api/endpoints';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string, remember?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return MOCK_USER;
      }
    }
    return MOCK_USER;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
          localStorage.setItem('user', JSON.stringify(currentUser));
        } catch {
          // If token fails, fallback to stored user or clear
          const saved = localStorage.getItem('user');
          if (saved) {
            setUser(JSON.parse(saved));
          } else {
            localStorage.removeItem('access_token');
            setUser(null);
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();

    const handleLogoutEvent = () => {
      setUser(null);
    };

    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => window.removeEventListener('auth:logout', handleLogoutEvent);
  }, []);

  const login = async (email: string, pass: string, remember: boolean = true): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await authApi.login({ email, password: pass });
      localStorage.setItem('access_token', res.access_token);
      if (res.refresh_token) {
        localStorage.setItem('refresh_token', res.refresh_token);
      }
      localStorage.setItem('user', JSON.stringify(res.user));
      if (!remember) {
        sessionStorage.setItem('temp_session', 'true');
      }
      setUser(res.user);
      setIsLoading(false);
      return true;
    } catch {
      setIsLoading(false);
      return false;
    }
  };

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((updated: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
