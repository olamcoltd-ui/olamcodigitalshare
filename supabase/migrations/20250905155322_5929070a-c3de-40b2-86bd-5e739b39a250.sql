-- Reset and set up OLAMCO DIGITAL database schema

-- Update subscription plans with exact requirements
UPDATE subscription_plans SET 
  name = 'Free Plan',
  price = 0,
  commission_rate = 0.20,
  duration_months = NULL,
  features = '{"commission": "20%", "downloads": "unlimited", "sharing": "unlimited"}'::jsonb
WHERE name = 'Free Plan';

UPDATE subscription_plans SET
  name = 'Monthly Subscription', 
  price = 2500,
  commission_rate = 0.30,
  duration_months = 1,
  features = '{"commission": "30%", "downloads": "unlimited", "sharing": "unlimited", "priority_support": true}'::jsonb
WHERE price = 2500;

-- Insert missing subscription plans
INSERT INTO subscription_plans (name, price, commission_rate, duration_months, features) 
VALUES 
  ('6-Month Subscription', 5500, 0.40, 6, '{"commission": "40%", "downloads": "unlimited", "sharing": "unlimited", "priority_support": true, "analytics": "advanced"}'::jsonb),
  ('Annual Subscription', 7000, 0.50, 12, '{"commission": "50%", "downloads": "unlimited", "sharing": "unlimited", "priority_support": true, "analytics": "premium", "early_access": true}'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  price = EXCLUDED.price,
  commission_rate = EXCLUDED.commission_rate,
  duration_months = EXCLUDED.duration_months,
  features = EXCLUDED.features;

-- Update products table to support new categories and requirements
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_category_check;

-- Add new columns if they don't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS author text,
ADD COLUMN IF NOT EXISTS brand text,
ADD COLUMN IF NOT EXISTS file_type text;

-- Remove file size constraint to allow unlimited uploads
ALTER TABLE products ALTER COLUMN file_size_mb DROP NOT NULL;

-- Update admin profile to ensure olamcoltd@gmail.com is admin
UPDATE profiles 
SET is_admin = true 
WHERE email = 'olamcoltd@gmail.com';

-- Create downloads table for tracking product downloads after purchase
CREATE TABLE IF NOT EXISTS downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  product_id uuid REFERENCES products(id) NOT NULL,
  sale_id uuid REFERENCES sales(id),
  buyer_email text NOT NULL,
  download_count integer DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on downloads table
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- Downloads policies
CREATE POLICY "Users can view their downloads" ON downloads
  FOR SELECT USING (user_id = auth.uid() OR buyer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "System can insert downloads" ON downloads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their download count" ON downloads
  FOR UPDATE USING (user_id = auth.uid() OR buyer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Admin can manage all downloads" ON downloads
  FOR ALL USING (is_admin_user());

-- Create product categories table for better organization
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  icon text,
  created_at timestamptz DEFAULT now()
);

-- Insert product categories
INSERT INTO product_categories (name, description, icon) VALUES
  ('ebooks', 'Digital books and publications', 'book'),
  ('audio', 'Audio files and podcasts', 'headphones'),
  ('courses', 'Online courses and tutorials', 'graduation-cap'),
  ('photos', 'Stock photos and graphics', 'image'),
  ('movies', 'Movie files and videos', 'film'),
  ('dramas', 'Drama series and shows', 'drama'),
  ('comedy', 'Comedy shows and content', 'laugh'),
  ('music', 'Music files and albums', 'music')
ON CONFLICT (name) DO NOTHING;

-- Update RLS policies to make products visible to non-authenticated users
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
CREATE POLICY "Anyone can view active products" ON products
  FOR SELECT USING (is_active = true);

-- Reset all financial data as requested
UPDATE wallets SET balance = 0, total_earned = 0, total_withdrawn = 0;
UPDATE admin_wallet SET balance = 0, total_revenue = 0, withdrawal_fees = 0, subscription_revenue = 0;
UPDATE sales SET commission_amount = 0, amount = 0;
UPDATE referral_commissions SET commission_amount = 0;

-- Create cart table for e-commerce functionality
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  product_id uuid REFERENCES products(id) NOT NULL,
  quantity integer DEFAULT 1,
  added_at timestamptz DEFAULT now()
);

-- Enable RLS on cart
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Cart policies
CREATE POLICY "Users can manage their cart" ON cart_items
  FOR ALL USING (user_id = auth.uid());

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_downloads_user ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_product ON downloads(product_id);

-- Create function to calculate user commission based on subscription
CREATE OR REPLACE FUNCTION get_user_commission_rate(user_id_param uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  commission_rate numeric := 0.20; -- Default free plan rate
BEGIN
  SELECT sp.commission_rate INTO commission_rate
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = user_id_param 
    AND us.status = 'active'
    AND (us.expires_at IS NULL OR us.expires_at > now())
  ORDER BY sp.commission_rate DESC
  LIMIT 1;
  
  RETURN COALESCE(commission_rate, 0.20);
END;
$$;