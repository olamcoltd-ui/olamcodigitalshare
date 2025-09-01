-- Create comprehensive database schema for Olamco Digital Hub

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user profiles table
CREATE TABLE public.profiles (
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

-- Set admin account
INSERT INTO public.profiles (user_id, email, full_name, referral_code, is_admin) 
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid, 
  'olamcoltd@gmail.com', 
  'Olamco Admin', 
  'ADMIN001', 
  TRUE
) ON CONFLICT DO NOTHING;

-- Create subscription plans table
CREATE TABLE public.subscription_plans (
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
('Monthly Plan', 2500.00, 0.30, 1, '{"features": ["30% commission", "Advanced analytics", "Priority support", "Custom referral codes"]}'),
('6-Month Plan', 5500.00, 0.40, 6, '{"features": ["40% commission", "Advanced analytics", "Priority support", "Custom referral codes", "Exclusive products"]}'),
('Annual Plan', 7000.00, 0.50, 12, '{"features": ["50% commission", "Advanced analytics", "Priority support", "Custom referral codes", "Exclusive products", "Marketing tools"]}');

-- Create user subscriptions table
CREATE TABLE public.user_subscriptions (
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
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(15,2) DEFAULT 0.00,
  total_earned DECIMAL(15,2) DEFAULT 0.00,
  total_withdrawn DECIMAL(15,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
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
CREATE TABLE public.sales (
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
CREATE TABLE public.referral_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create referral commissions table
CREATE TABLE public.referral_commissions (
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
CREATE TABLE public.withdrawals (
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

-- Create transactions table for payment tracking
CREATE TABLE public.transactions (
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
CREATE TABLE public.admin_wallet (
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
VALUES (0.00, 0.00, 0.00, 0.00);

-- Enable Row Level Security
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

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid() OR is_admin = true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin can view all profiles" ON public.profiles FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

-- RLS Policies for subscription plans
CREATE POLICY "Anyone can view subscription plans" ON public.subscription_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage subscription plans" ON public.subscription_plans FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

-- RLS Policies for user subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own subscriptions" ON public.user_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin can view all subscriptions" ON public.user_subscriptions FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

-- RLS Policies for wallets
CREATE POLICY "Users can view their own wallet" ON public.wallets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own wallet" ON public.wallets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own wallet" ON public.wallets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin can view all wallets" ON public.wallets FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

-- RLS Policies for products
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage products" ON public.products FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

-- RLS Policies for sales
CREATE POLICY "Users can view sales they made" ON public.sales FOR SELECT USING (seller_id = auth.uid() OR buyer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "System can insert sales" ON public.sales FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update sales" ON public.sales FOR UPDATE USING (true);
CREATE POLICY "Admin can view all sales" ON public.sales FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

-- RLS Policies for referral tracking
CREATE POLICY "Users can view their referrals" ON public.referral_tracking FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid());
CREATE POLICY "System can manage referrals" ON public.referral_tracking FOR ALL USING (true);

-- RLS Policies for referral commissions
CREATE POLICY "Users can view their commissions" ON public.referral_commissions FOR SELECT USING (referrer_id = auth.uid());
CREATE POLICY "System can manage commissions" ON public.referral_commissions FOR ALL USING (true);

-- RLS Policies for withdrawals
CREATE POLICY "Users can view their withdrawals" ON public.withdrawals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin can view all withdrawals" ON public.withdrawals FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

-- RLS Policies for transactions
CREATE POLICY "Users can view their transactions" ON public.transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can manage transactions" ON public.transactions FOR ALL USING (true);

-- RLS Policies for admin wallet
CREATE POLICY "Admin can view admin wallet" ON public.admin_wallet FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

-- Create functions for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  ref_code TEXT;
  ref_user_id UUID;
BEGIN
  -- Generate unique referral code
  ref_code := UPPER(SUBSTRING(NEW.email FROM 1 FOR 3)) || SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 6);
  
  -- Handle referral if provided
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    SELECT user_id INTO ref_user_id 
    FROM public.profiles 
    WHERE referral_code = NEW.raw_user_meta_data->>'referral_code';
  END IF;
  
  -- Insert profile
  INSERT INTO public.profiles (user_id, email, full_name, referral_code, referred_by)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    ref_code,
    ref_user_id
  );
  
  -- Create wallet
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  
  -- Create free subscription
  INSERT INTO public.user_subscriptions (user_id, plan_id, status)
  SELECT NEW.id, id, 'active'
  FROM public.subscription_plans 
  WHERE name = 'Free Plan';
  
  -- Create referral tracking if referred
  IF ref_user_id IS NOT NULL THEN
    INSERT INTO public.referral_tracking (referrer_id, referred_id, referral_code)
    VALUES (ref_user_id, NEW.id, NEW.raw_user_meta_data->>'referral_code');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers for tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_admin_wallet_updated_at BEFORE UPDATE ON public.admin_wallet FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_is_active ON public.products(is_active);
CREATE INDEX idx_sales_seller_id ON public.sales(seller_id);
CREATE INDEX idx_sales_paystack_reference ON public.sales(paystack_reference);
CREATE INDEX idx_referral_tracking_referrer_id ON public.referral_tracking(referrer_id);
CREATE INDEX idx_referral_commissions_referrer_id ON public.referral_commissions(referrer_id);
CREATE INDEX idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);