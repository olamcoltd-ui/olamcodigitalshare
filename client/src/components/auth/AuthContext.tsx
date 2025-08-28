import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, type Profile } from '@/lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// User interface combining Supabase auth user and profile data
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
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, referralCode?: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to generate referral code
function generateReferralCode(fullName: string): string {
  const cleanName = fullName.replace(/\s+/g, '').toLowerCase();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${cleanName.substring(0, 6)}${randomSuffix}`;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from Supabase
  const fetchUserProfile = async (supabaseUser: SupabaseUser): Promise<User | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return {
        id: profile.user_id,
        email: profile.email,
        full_name: profile.full_name,
        referral_code: profile.referral_code,
        is_admin: profile.is_admin || false,
        phone: profile.phone,
        account_name: profile.account_name,
        account_number: profile.account_number,
        bank_name: profile.bank_name
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user).then(setUser);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user);
        setUser(userProfile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, referralCode?: string) => {
    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        return { data: null, error: authError };
      }

      if (authData.user) {
        // Create user profile
        const userReferralCode = generateReferralCode(fullName);
        
        // Find referrer if referral code provided
        let referrerId = null;
        if (referralCode) {
          const { data: referrer } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('referral_code', referralCode)
            .single();
          if (referrer) {
            referrerId = referrer.user_id;
          }
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            email,
            full_name: fullName,
            referral_code: userReferralCode,
            referred_by: referrerId,
            referred_by_code: referralCode || null
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          return { data: null, error: { message: 'Failed to create profile' } };
        }

        // Create wallet
        await supabase.from('wallets').insert({
          user_id: authData.user.id,
          balance: 0,
          total_earned: 0,
          total_withdrawn: 0
        });

        // Get free subscription plan and create subscription
        const { data: freePlan } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('price', 0)
          .single();
        
        if (freePlan) {
          const startDate = new Date();
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + freePlan.duration_months);
          
          await supabase.from('user_subscriptions').insert({
            user_id: authData.user.id,
            plan_id: freePlan.id,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            status: 'active'
          });
        }
      }

      return { data: authData.user, error: null };
    } catch (error) {
      console.error('Signup error:', error);
      return { data: null, error: { message: 'Registration failed' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { data: null, error };
      }

      return { data: data.user, error: null };
    } catch (error) {
      console.error('Signin error:', error);
      return { data: null, error: { message: 'Sign in failed' } };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Signout error:', error);
    }
  };

  const refreshUser = async () => {
    if (session?.user) {
      const userProfile = await fetchUserProfile(session.user);
      setUser(userProfile);
    }
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