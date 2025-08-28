-- Olamco Digital Hub - Supabase Migration Script
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  referral_code TEXT UNIQUE,
  referred_by UUID,
  referred_by_code TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  account_name TEXT,
  account_number TEXT,
  bank_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price DECIMAL NOT NULL,
  thumbnail_url TEXT,
  file_url TEXT,
  file_size_mb DECIMAL,
  tags TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id),
  seller_id UUID NOT NULL,
  buyer_email TEXT NOT NULL,
  sale_amount DECIMAL NOT NULL,
  commission_amount DECIMAL NOT NULL,
  admin_amount DECIMAL NOT NULL,
  transaction_id TEXT,
  referral_link TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance DECIMAL DEFAULT 0,
  total_earned DECIMAL DEFAULT 0,
  total_withdrawn DECIMAL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL NOT NULL,
  duration_months INTEGER NOT NULL,
  commission_rate DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status TEXT DEFAULT 'active',
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create downloads table
CREATE TABLE IF NOT EXISTS downloads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID,
  product_id UUID NOT NULL REFERENCES products(id),
  buyer_email TEXT NOT NULL,
  sale_id UUID REFERENCES sales(id),
  download_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create referral_tracking table
CREATE TABLE IF NOT EXISTS referral_tracking (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referral_code TEXT NOT NULL,
  referrer_id UUID,
  referred_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create referral_commissions table
CREATE TABLE IF NOT EXISTS referral_commissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id),
  sale_id UUID NOT NULL REFERENCES sales(id),
  commission_amount DECIMAL DEFAULT 0,
  commission_rate DECIMAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL NOT NULL,
  net_amount DECIMAL NOT NULL,
  processing_fee DECIMAL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  bank_code TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, price, duration_months, commission_rate) VALUES 
('Free Plan', 0, 12, 0.20),
('Basic Plan', 500, 1, 0.30),
('Premium Plan', 2500, 3, 0.40),
('Pro Plan', 8000, 12, 0.50)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_sales_seller_id ON sales(seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_product_id ON downloads(product_id);

-- Enable Row Level Security (RLS) for secure access
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Users can read and update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow profile creation" ON profiles FOR INSERT WITH CHECK (true);

-- Products: Anyone can read active products, only authenticated users can create
CREATE POLICY "Anyone can view active products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated users can create products" ON products FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Sales: Users can view their own sales
CREATE POLICY "Users can view own sales" ON sales FOR SELECT USING (auth.uid()::text = seller_id);

-- Wallets: Users can view their own wallet
CREATE POLICY "Users can view own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own wallet" ON wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow wallet creation" ON wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User subscriptions: Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow subscription creation" ON user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Downloads: Users can view their own downloads
CREATE POLICY "Users can view own downloads" ON downloads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow download creation" ON downloads FOR INSERT WITH CHECK (true);

-- Referral commissions: Users can view their own commissions
CREATE POLICY "Users can view own referral commissions" ON referral_commissions FOR SELECT USING (auth.uid() = referrer_id);

-- Withdrawal requests: Users can view their own requests
CREATE POLICY "Users can view own withdrawal requests" ON withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create withdrawal requests" ON withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Subscription plans are publicly readable
CREATE POLICY "Subscription plans are publicly readable" ON subscription_plans FOR SELECT USING (true);