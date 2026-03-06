/*
  # Corrigir Políticas RLS da Tabela Profiles

  1. Problema
    - Usuários autenticados mas não salvos na tabela profiles
    - Políticas RLS muito restritivas impedem criação de perfis

  2. Solução
    - Simplificar políticas RLS para permitir operações básicas
    - Permitir INSERT para usuários autenticados
    - Permitir UPDATE apenas do próprio perfil
*/

-- Remover políticas existentes conflitantes
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Criar política simplificada para INSERT
CREATE POLICY "Allow authenticated users to insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Criar política para SELECT (usuários podem ler todos os perfis)
CREATE POLICY "Allow authenticated users to read profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Criar política para UPDATE (usuários podem atualizar apenas seu próprio perfil)
CREATE POLICY "Allow users to update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Criar política para DELETE (usuários podem deletar apenas seu próprio perfil)
CREATE POLICY "Allow users to delete own profile"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Adicionar política especial para admins (podem fazer tudo)
CREATE POLICY "Allow admins full access to profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );
