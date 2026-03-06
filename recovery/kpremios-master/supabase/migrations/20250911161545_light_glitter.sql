/*
  # Create Admin Authentication User

  1. Security
    - Creates admin user in Supabase auth system
    - Sets up proper authentication credentials
    - Links to users table for profile data

  2. Admin User
    - Email: admin@zkpremios.com
    - Password: admin123 (should be changed after first login)
    - Automatically confirmed email
*/

-- First, we need to create the auth user
-- This requires using Supabase's auth functions
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Insert into auth.users (this is the correct way to create auth users in migrations)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@zkpremios.com',
    crypt('admin123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO admin_user_id;

  -- Get the user ID if it already exists
  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'admin@zkpremios.com';
  END IF;

  -- Insert or update the profile in the users table
  INSERT INTO public.users (
    id,
    name,
    email,
    whatsapp,
    is_admin,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    'Administrador',
    'admin@zkpremios.com',
    '+55 11 99999-9999',
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    is_admin = true,
    updated_at = now();

EXCEPTION WHEN OTHERS THEN
  -- If direct auth.users insert fails, we'll create a regular user and mark as admin
  INSERT INTO public.users (
    id,
    name,
    email,
    whatsapp,
    is_admin,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'Administrador',
    'admin@zkpremios.com',
    '+55 11 99999-9999',
    true,
    now(),
    now()
  )
  ON CONFLICT (email) DO UPDATE SET
    is_admin = true,
    updated_at = now();
END $$;