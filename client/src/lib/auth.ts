// Simple auth context replacement for Supabase auth
// This is a temporary implementation for the migration

export interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}

// Mock auth functions for now - these would need to be replaced with a proper auth system
export const mockAuth = {
  signIn: async (email: string, password: string) => {
    // TODO: Implement actual authentication
    console.log('Sign in:', email);
    return { error: null };
  },
  
  signUp: async (email: string, password: string, fullName?: string, referralCode?: string) => {
    // TODO: Implement actual user registration
    console.log('Sign up:', email, fullName, referralCode);
    return { error: null };
  },
  
  signOut: async () => {
    // TODO: Implement sign out
    console.log('Sign out');
    return { error: null };
  },
  
  getUser: () => {
    // TODO: Implement getting current user
    return null as User | null;
  }
};