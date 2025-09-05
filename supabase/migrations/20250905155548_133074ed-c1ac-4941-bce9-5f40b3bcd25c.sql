-- Deduplicate subscription_plans by name, add unique constraint, and upsert plans

-- 1) Remove duplicate plan names, keep the earliest row
DELETE FROM subscription_plans a
USING subscription_plans b
WHERE a.name = b.name
  AND a.ctid > b.ctid;

-- 2) Add unique constraint on name if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_plan_name'
  ) THEN
    ALTER TABLE subscription_plans ADD CONSTRAINT unique_plan_name UNIQUE (name);
  END IF;
END$$;

-- 3) Ensure required plans exist with correct pricing and commission
-- Free Plan
UPDATE subscription_plans SET 
  price = 0,
  commission_rate = 0.20,
  duration_months = NULL,
  is_active = true,
  features = '{"commission":"20%","downloads":"unlimited","sharing":"unlimited"}'::jsonb
WHERE name = 'Free Plan';

-- Monthly
INSERT INTO subscription_plans (name, price, commission_rate, duration_months, is_active, features)
VALUES ('Monthly Subscription', 2500, 0.30, 1, true, '{"commission":"30%","downloads":"unlimited","sharing":"unlimited","priority_support":true}'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  price = EXCLUDED.price,
  commission_rate = EXCLUDED.commission_rate,
  duration_months = EXCLUDED.duration_months,
  is_active = true,
  features = EXCLUDED.features;

-- 6-Month
INSERT INTO subscription_plans (name, price, commission_rate, duration_months, is_active, features)
VALUES ('6-Month Subscription', 5500, 0.40, 6, true, '{"commission":"40%","downloads":"unlimited","sharing":"unlimited","priority_support":true,"analytics":"advanced"}'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  price = EXCLUDED.price,
  commission_rate = EXCLUDED.commission_rate,
  duration_months = EXCLUDED.duration_months,
  is_active = true,
  features = EXCLUDED.features;

-- Annual
INSERT INTO subscription_plans (name, price, commission_rate, duration_months, is_active, features)
VALUES ('Annual Subscription', 7000, 0.50, 12, true, '{"commission":"50%","downloads":"unlimited","sharing":"unlimited","priority_support":true,"analytics":"premium","early_access":true}'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  price = EXCLUDED.price,
  commission_rate = EXCLUDED.commission_rate,
  duration_months = EXCLUDED.duration_months,
  is_active = true,
  features = EXCLUDED.features;

-- 4) Ensure admin flag on the requested email if profile exists
UPDATE profiles SET is_admin = true WHERE email = 'olamcoltd@gmail.com';