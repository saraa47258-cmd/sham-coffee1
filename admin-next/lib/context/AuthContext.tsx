'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User, checkAuth, logout as authLogout, loginAdmin } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { isAuthenticated, user: userData } = await checkAuth();
        if (isAuthenticated && userData) {
          // Ensure detailedPermissions are loaded
          if (!userData.detailedPermissions && userData.role !== 'admin' && userData.id) {
            try {
              const { getWorker, getFullPermissions, getDefaultWorkerPermissions } = await import('../firebase/database');
              const worker = await getWorker(userData.id);
              
              if (worker) {
                if (worker.detailedPermissions) {
                  userData.detailedPermissions = worker.detailedPermissions;
                } else if (worker.permissions === 'full') {
                  userData.detailedPermissions = getFullPermissions();
                } else {
                  userData.detailedPermissions = getDefaultWorkerPermissions();
                }
              }
            } catch (error) {
              console.error('Error loading permissions in AuthContext:', error);
            }
          }
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const userData = await loginAdmin(username, password);
      setUser(userData);
      router.push('/admin');
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authLogout();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
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





