-- Migration: Sistema VIP para Usuários
-- Criado em: 2025-01-29
-- Descrição: Adiciona suporte para membros VIP no sistema

-- 1. Adicionar coluna is_vip na tabela users
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Adicionar coluna is_vip se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'is_vip'
        ) THEN
            ALTER TABLE users ADD COLUMN is_vip boolean DEFAULT false;
            
            -- Criar índice para performance
            CREATE INDEX IF NOT EXISTS idx_users_is_vip ON users(is_vip) WHERE is_vip = true;
        END IF;
    END IF;
END $$;

-- 2. RPC: Verificar se usuário é VIP
CREATE OR REPLACE FUNCTION is_user_vip(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id AND is_vip = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Comentário na coluna para documentação
COMMENT ON COLUMN users.is_vip IS 'Indica se o usuário é membro VIP, com benefícios especiais no chat e sistema';

