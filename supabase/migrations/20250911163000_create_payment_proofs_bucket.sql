-- Create the payment-proofs storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the payment-proofs bucket
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public access to payment proofs" ON storage.objects;

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload payment proofs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payment-proofs' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to view their own files
CREATE POLICY "Users can view their own payment proofs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-proofs' AND
    auth.role() = 'authenticated'
  );

-- Allow admins to view all payment proofs
CREATE POLICY "Admins can view all payment proofs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-proofs' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- Allow public access to files (since bucket is public)
CREATE POLICY "Public access to payment proofs" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-proofs');