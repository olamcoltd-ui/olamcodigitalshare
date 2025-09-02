-- Fix the database migration by removing the fake admin user insert
-- Remove the problematic admin user insert since it references a non-existent auth user
DELETE FROM public.profiles WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- Add admin assignment function that can be called when needed
CREATE OR REPLACE FUNCTION public.set_admin_status(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.profiles 
  SET is_admin = TRUE 
  WHERE email = user_email;
  
  IF FOUND THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add product storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-files', 'product-files', false) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true) 
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for product files
CREATE POLICY "Admin can upload product files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'product-files' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admin can view product files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'product-files' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Users can download purchased products" ON storage.objects
FOR SELECT USING (
  bucket_id = 'product-files' AND 
  (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true) OR
    EXISTS (
      SELECT 1 FROM public.sales s 
      JOIN public.products p ON s.product_id = p.id 
      WHERE p.file_url = name AND s.seller_id = auth.uid() AND s.payment_status = 'completed'
    )
  )
);

-- Create storage policies for product images
CREATE POLICY "Admin can upload product images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'product-images' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Everyone can view product images" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Admin can update product images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'product-images' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admin can delete product images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'product-images' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- Function to automatically assign admin to specific email
CREATE OR REPLACE FUNCTION public.check_and_assign_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-assign admin to olamcoltd@gmail.com
  IF NEW.email = 'olamcoltd@gmail.com' THEN
    NEW.is_admin = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign admin status
CREATE TRIGGER assign_admin_on_profile_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_assign_admin();