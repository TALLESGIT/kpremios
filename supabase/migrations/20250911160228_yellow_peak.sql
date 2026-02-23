/*
  # Adicionar campo admin e melhorar sistema de pagamentos

  1. Modificações na tabela users
    - Adicionar campo `is_admin` para identificar administradores
  
  2. Modificações na tabela extra_number_requests
    - Melhorar estrutura para upload de comprovantes
  
  3. Criar tabela para armazenar arquivos de comprovante
    - Tabela `payment_proofs` para gerenciar uploads
  
  4. Security
    - Atualizar políticas RLS para admin
    - Adicionar políticas para gerenciar uploads
*/

-- Adicionar campo is_admin na tabela users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Criar tabela para gerenciar uploads de comprovantes
CREATE TABLE IF NOT EXISTS payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES extra_number_requests(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  file_type text NOT NULL,
  file_url text,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid NOT NULL REFERENCES users(id)
);

ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;

-- Políticas para payment_proofs
CREATE POLICY "Users can insert own payment proofs"
  ON payment_proofs
  FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can read own payment proofs"
  ON payment_proofs
  FOR SELECT
  TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY "Admins can read all payment proofs"
  ON payment_proofs
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.is_admin = true
  ));

-- Atualizar políticas existentes para incluir admins
DROP POLICY IF EXISTS "Admins can read all requests" ON extra_number_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON extra_number_requests;

CREATE POLICY "Admins can read all requests"
  ON extra_number_requests
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.is_admin = true
  ));

CREATE POLICY "Admins can update requests"
  ON extra_number_requests
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.is_admin = true
  ));

-- Política para admins gerenciarem draws
DROP POLICY IF EXISTS "Admins can manage draws" ON draw_results;

CREATE POLICY "Admins can manage draws"
  ON draw_results
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.is_admin = true
  ));

-- Política para admins lerem audit logs
DROP POLICY IF EXISTS "Admins can read audit logs" ON audit_logs;

CREATE POLICY "Admins can read audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.is_admin = true
  ));

-- Inserir admin padrão (você pode alterar o email)
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role)
VALUES (
  'admin@zkpremios.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Criar usuário admin na nossa tabela
INSERT INTO users (id, name, email, whatsapp, is_admin, created_at, updated_at)
SELECT 
  auth_users.id,
  'Administrador',
  'admin@zkpremios.com', 
  '(11) 99999-9999',
  true,
  now(),
  now()
FROM auth.users
WHERE email = 'admin@zkpremios.com'
ON CONFLICT (id) DO UPDATE SET is_admin = true;