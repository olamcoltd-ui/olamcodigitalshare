-- Storage RLS policies for product uploads
-- Ensure RLS is enabled on storage.objects (it is by default in Supabase)

-- Public read access for product-images bucket (for serving thumbnails)
CREATE POLICY "Public read product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

-- Admins can upload product images
CREATE POLICY "Admins can upload product images"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

-- Admins can update product images
CREATE POLICY "Admins can update product images"
ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND public.is_admin())
WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

-- Admins can delete product images
CREATE POLICY "Admins can delete product images"
ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND public.is_admin());

-- Admins can upload product files to private bucket
CREATE POLICY "Admins can upload product files"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-files' AND public.is_admin());

-- Admins can update product files
CREATE POLICY "Admins can update product files"
ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'product-files' AND public.is_admin())
WITH CHECK (bucket_id = 'product-files' AND public.is_admin());

-- Admins can delete product files
CREATE POLICY "Admins can delete product files"
ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'product-files' AND public.is_admin());