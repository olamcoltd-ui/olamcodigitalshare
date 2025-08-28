import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// User interface matching the API response
interface User {
  id: string;
  email: string;
  full_name: string;
  referral_code: string;
  is_admin: boolean;
  phone?: string;
  account_name?: string;
  account_number?: string;
  bank_name?: string;
}

interface AuthContextType {
  user: User | null;
  session: any;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, referralCode?: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user on app start
  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setSession({ user: userData });
      } else {
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, referralCode?: string) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, fullName, referralCode }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setUser(data.user);
        setSession({ user: data.user });
        return { data: data.user, error: null };
      } else {
        return { data: null, error: { message: data.error || 'Registration failed' } };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { data: null, error: { message: 'Network error during registration' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setUser(data.user);
        setSession({ user: data.user });
        return { data: data.user, error: null };
      } else {
        return { data: null, error: { message: data.error || 'Sign in failed' } };
      }
    } catch (error) {
      console.error('Signin error:', error);
      return { data: null, error: { message: 'Network error during sign in' } };
    }
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Signout error:', error);
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};