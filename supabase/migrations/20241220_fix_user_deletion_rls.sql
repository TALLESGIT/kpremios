/*
  # Corrigir Políticas RLS para Exclusão de Usuários

  1. Problema
    - Admins não conseguem excluir usuários não-admin
    - Política de admin pode ter problema com subquery

  2. Solução
    - Simplificar política de admin
    - Adicionar política específica para DELETE de usuários não-admin
*/

-- Remover política de admin existente que pode ter problema
DROP POLICY IF EXISTS "Allow admins full access to profiles" ON profiles;

-- Criar política mais simples para admins
CREATE POLICY "Admins can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Criar política específica para DELETE de usuários não-admin
CREATE POLICY "Admins can delete non-admin users"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    -- Permitir se o usuário atual é admin
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
    AND 
    -- E o usuário sendo deletado não é admin
    is_admin = false
  );

-- Manter políticas existentes para usuários comuns
-- (estas já existem e não precisam ser recriadas)
