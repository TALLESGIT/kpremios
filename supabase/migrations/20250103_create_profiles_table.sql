/*
  # Criar tabela profiles (Perfis de Usuários)

  1. Nova Tabela
    - `profiles` - Perfis adicionais de usuários
    
  2. Campos
    - id (uuid, PK) - Referência ao auth.users
    - name (text) - Nome do usuário
    - email (text) - Email
    - whatsapp (text) - WhatsApp
    - is_admin (boolean) - Se é administrador
    - avatar_url (text) - URL do avatar
    - created_at (timestamptz) - Data de criação
    - updated_at (timestamptz) - Data de atualização

  3. Segurança
    - RLS habilitado
    - Usuários podem ler todos os perfis
    - Usuários podem criar/atualizar apenas seu próprio perfil
    - Admins têm acesso total
*/

-- Criar tabela profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  whatsapp text,
  is_admin boolean DEFAULT false,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS

-- Usuários autenticados podem inserir seu próprio perfil
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Usuários autenticados podem ler todos os perfis
CREATE POLICY "Users can read all profiles" ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Usuários podem deletar apenas seu próprio perfil
CREATE POLICY "Users can delete own profile" ON profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Admins têm acesso total
CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_is_admin ON profiles(is_admin);

