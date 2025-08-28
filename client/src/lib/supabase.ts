import { createClient } from '@supabase/supabase-js';

// The environment variables were swapped in the secrets
const supabaseUrl = import.meta.env.VITE_SUPABASE_ANON_KEY || ''; // This actually contains the URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_URL || ''; // This actually contains the anon key

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', { 
    supabaseUrl: !!supabaseUrl, 
    supabaseAnonKey: !!supabaseAnonKey,
    env: import.meta.env 
  });
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types for TypeScript support
export type Profile = {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone?: string;
  referral_code: string;
  referred_by?: string;
  referred_by_code?: string;
  is_admin: boolean;
  account_name?: string;
  account_number?: string;
  bank_name?: string;
  created_at: string;
  updated_at: string;
};