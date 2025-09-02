-- Add comprehensive RLS policies for all tables

-- Helper function to check admin status (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile and admin can view all" ON public.profiles 
FOR SELECT USING (user_id = auth.uid() OR public.is_admin_user());

CREATE POLICY "Users can update their own profile" ON public.profiles 
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert profiles" ON public.profiles 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can manage all profiles" ON public.profiles 
FOR ALL USING (public.is_admin_user());

-- RLS Policies for subscription plans
CREATE POLICY "Anyone can view active subscription plans" ON public.subscription_plans 
FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage subscription plans" ON public.subscription_plans 
FOR ALL USING (public.is_admin_user());

-- RLS Policies for user subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions 
FOR SELECT USING (user_id = auth.uid() OR public.is_admin_user());

CREATE POLICY "Users can insert their own subscriptions" ON public.user_subscriptions 
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own subscriptions" ON public.user_subscriptions 
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admin can manage all subscriptions" ON public.user_subscriptions 
FOR ALL USING (public.is_admin_user());

-- RLS Policies for wallets
CREATE POLICY "Users can view their own wallet" ON public.wallets 
FOR SELECT USING (user_id = auth.uid() OR public.is_admin_user());

CREATE POLICY "Users can update their own wallet" ON public.wallets 
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert wallets" ON public.wallets 
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can manage all wallets" ON public.wallets 
FOR ALL USING (public.is_admin_user());

-- RLS Policies for products
CREATE POLICY "Anyone can view active products" ON public.products 
FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage products" ON public.products 
FOR ALL USING (public.is_admin_user());

-- RLS Policies for sales
CREATE POLICY "Users can view sales they made or bought" ON public.sales 
FOR SELECT USING (
  seller_id = auth.uid() OR 
  buyer_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
  public.is_admin_user()
);

CREATE POLICY "System can insert sales" ON public.sales 
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update sales" ON public.sales 
FOR UPDATE USING (true);

CREATE POLICY "Admin can manage all sales" ON public.sales 
FOR ALL USING (public.is_admin_user());

-- RLS Policies for referral tracking
CREATE POLICY "Users can view their referrals" ON public.referral_tracking 
FOR SELECT USING (
  referrer_id = auth.uid() OR 
  referred_id = auth.uid() OR 
  public.is_admin_user()
);

CREATE POLICY "System can manage referrals" ON public.referral_tracking 
FOR ALL USING (true);

-- RLS Policies for referral commissions
CREATE POLICY "Users can view their commissions" ON public.referral_commissions 
FOR SELECT USING (
  referrer_id = auth.uid() OR 
  referred_id = auth.uid() OR 
  public.is_admin_user()
);

CREATE POLICY "System can manage commissions" ON public.referral_commissions 
FOR ALL USING (true);

-- RLS Policies for withdrawals
CREATE POLICY "Users can view their withdrawals" ON public.withdrawals 
FOR SELECT USING (user_id = auth.uid() OR public.is_admin_user());

CREATE POLICY "Users can create withdrawals" ON public.withdrawals 
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their withdrawals" ON public.withdrawals 
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admin can manage all withdrawals" ON public.withdrawals 
FOR ALL USING (public.is_admin_user());

-- RLS Policies for transactions
CREATE POLICY "Users can view their transactions" ON public.transactions 
FOR SELECT USING (user_id = auth.uid() OR public.is_admin_user());

CREATE POLICY "System can manage transactions" ON public.transactions 
FOR ALL USING (true);

-- RLS Policies for admin wallet
CREATE POLICY "Admin can manage admin wallet" ON public.admin_wallet 
FOR ALL USING (public.is_admin_user());

-- Create auto profile creation function
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
  
  -- Check if admin email
  DECLARE is_admin_flag BOOLEAN := FALSE;
  IF NEW.email = 'olamcoltd@gmail.com' THEN
    is_admin_flag := TRUE;
  END IF;
  
  -- Insert profile
  INSERT INTO public.profiles (user_id, email, full_name, referral_code, referred_by, is_admin)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    ref_code,
    ref_user_id,
    is_admin_flag
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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
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
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_wallets_updated_at ON public.wallets;
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_updated_at ON public.sales;
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_withdrawals_updated_at ON public.withdrawals;
CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_wallet_updated_at ON public.admin_wallet;
CREATE TRIGGER update_admin_wallet_updated_at BEFORE UPDATE ON public.admin_wallet FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_sales_seller_id ON public.sales(seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_paystack_reference ON public.sales(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referrer_id ON public.referral_tracking(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer_id ON public.referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);