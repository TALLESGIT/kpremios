/*
  # Adicionar coluna is_admin à tabela users

  1. Alterações
    - Adiciona coluna `is_admin` (boolean, padrão false)
    - Permite identificar usuários administradores
    - Valor padrão é false para todos os usuários

  2. Segurança
    - Mantém as políticas RLS existentes
    - Admins podem ser definidos manualmente no dashboard
*/

-- Adicionar coluna is_admin à tabela users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin boolean DEFAULT false NOT NULL;
  END IF;
END $$;