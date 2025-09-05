-- Fixed migration for OLAMCO DIGITAL database schema

-- Add unique constraint to subscription_plans name if it doesn't exist
ALTER TABLE subscription_plans ADD CONSTRAINT unique_plan_name UNIQUE (name);

-- Update existing subscription plans
UPDATE subscription_plans SET 
  name = 'Free Plan',
  price = 0,
  commission_rate = 0.20,
  duration_months = NULL,
  features = '{"commission": "20%", "downloads": "unlimited", "sharing": "unlimited"}'::jsonb
WHERE name = 'Free Plan';

-- Insert or update subscription plans
INSERT INTO subscription_plans (name, price, commission_rate, duration_months, features) 
VALUES 
  ('Monthly Subscription', 2500, 0.30, 1, '{"commission": "30%", "downloads": "unlimited", "sharing": "unlimited", "priority_support": true}'::jsonb),
  ('6-Month Subscription', 5500, 0.40, 6, '{"commission": "40%", "downloads": "unlimited", "sharing": "unlimited", "priority_support": true, "analytics": "advanced"}'::jsonb),
  ('Annual Subscription', 7000, 0.50, 12, '{"commission": "50%", "downloads": "unlimited", "sharing": "unlimited", "priority_support": true, "analytics": "premium", "early_access": true}'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  price = EXCLUDED.price,
  commission_rate = EXCLUDED.commission_rate,
  duration_months = EXCLUDED.duration_months,
  features = EXCLUDED.features;

-- Update products table to support new categories and unlimited file sizes
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS author text,
ADD COLUMN IF NOT EXISTS brand text,
ADD COLUMN IF NOT EXISTS file_type text;

-- Remove file size constraint to allow unlimited uploads
ALTER TABLE products ALTER COLUMN file_size_mb DROP NOT NULL;

-- Ensure admin account is set
INSERT INTO profiles (user_id, email, full_name, referral_code, is_admin, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'olamcoltd@gmail.com',
  'OLAMCO Admin',
  'ADMIN001',
  true,
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'olamcoltd@gmail.com');