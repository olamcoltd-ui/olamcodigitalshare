-- Olamco Digital Hub - Complete Database Setup

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  referred_by UUID REFERENCES public.profiles(id),
  account_name TEXT,
  account_number TEXT,
  bank_name TEXT,
  bank_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(3,2) NOT NULL,
  duration_months INTEGER,
  features JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert subscription plans
INSERT INTO public.subscription_plans (name, price, commission_rate, duration_months, features) VALUES
('Free Plan', 0.00, 0.20, NULL, '{"features": ["20% commission", "Basic analytics", "Email support"]}'),
('Monthly Plan', 2500.00, 0.30, 1, '{"features": ["30% commission", "Advanced analytics", "Priority support"]}'),
('6-Month Plan', 5500.00, 0.40, 6, '{"features": ["40% commission", "Advanced analytics", "Priority support", "Exclusive products"]}'),
('Annual Plan', 7000.00, 0.50, 12, '{"features": ["50% commission", "Advanced analytics", "Priority support", "Exclusive products", "Marketing tools"]}')
ON CONFLICT DO NOTHING;

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create wallets table  
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(15,2) DEFAULT 0.00,
  total_earned DECIMAL(15,2) DEFAULT 0.00,
  total_withdrawn DECIMAL(15,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ebooks', 'audio', 'courses', 'photos', 'movies', 'dramas', 'comedies', 'music')),
  author TEXT,
  brand TEXT,
  tags TEXT[],
  thumbnail_url TEXT,
  file_url TEXT,
  file_size_mb DECIMAL(10,2),
  file_type TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  buyer_email TEXT NOT NULL,
  buyer_name TEXT,
  seller_id UUID REFERENCES auth.users(id),
  referral_code TEXT,
  amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2),
  commission_rate DECIMAL(3,2),
  paystack_reference TEXT UNIQUE,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create referral tracking table
CREATE TABLE IF NOT EXISTS public.referral_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create referral commissions table
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id),
  subscription_id UUID REFERENCES public.user_subscriptions(id),
  commission_type TEXT NOT NULL CHECK (commission_type IN ('sale', 'subscription', 'referral')),
  commission_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(3,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_code TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  reference TEXT UNIQUE,
  failure_reason TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('payment', 'commission', 'withdrawal', 'refund')),
  amount DECIMAL(10,2) NOT NULL,
  reference TEXT UNIQUE,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create admin wallet table
CREATE TABLE IF NOT EXISTS public.admin_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance DECIMAL(15,2) DEFAULT 0.00,
  total_revenue DECIMAL(15,2) DEFAULT 0.00,
  withdrawal_fees DECIMAL(15,2) DEFAULT 0.00,
  subscription_revenue DECIMAL(15,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert initial admin wallet
INSERT INTO public.admin_wallet (balance, total_revenue, withdrawal_fees, subscription_revenue) 
VALUES (0.00, 0.00, 0.00, 0.00)
ON CONFLICT DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_wallet ENABLE ROW LEVEL SECURITY;