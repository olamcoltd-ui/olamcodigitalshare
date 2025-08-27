import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// Mock user interface for migration
interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}

interface AuthContextType {
  user: User | null;
  session: any;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string, referralCode?: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
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

  useEffect(() => {
    // Mock auth initialization - set loading to false
    setTimeout(() => {
      setLoading(false);
    }, 100);
  }, []);

  const signUp = async (email: string, password: string, fullName?: string, referralCode?: string) => {
    // TODO: Implement actual signup with API
    console.log('Sign up:', { email, fullName, referralCode });
    return { error: { message: 'Authentication needs to be implemented' } };
  };

  const signIn = async (email: string, password: string) => {
    // TODO: Implement actual signin with API  
    console.log('Sign in:', { email });
    return { error: { message: 'Authentication needs to be implemented' } };
  };

  const signOut = async () => {
    // TODO: Implement actual signout
    setUser(null);
    setSession(null);
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};