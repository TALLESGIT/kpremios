-- Adicionar colunas de ganhador à tabela users
-- Estas colunas são usadas no código mas não existem na tabela

-- Verificar se a tabela users existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Adicionar coluna is_winner se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'is_winner'
        ) THEN
            ALTER TABLE users ADD COLUMN is_winner boolean DEFAULT false;
        END IF;
        
        -- Adicionar coluna won_at se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'won_at'
        ) THEN
            ALTER TABLE users ADD COLUMN won_at timestamptz;
        END IF;
        
        -- Adicionar coluna won_prize se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'won_prize'
        ) THEN
            ALTER TABLE users ADD COLUMN won_prize text;
        END IF;
        
        -- Adicionar coluna is_admin se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'is_admin'
        ) THEN
            ALTER TABLE users ADD COLUMN is_admin boolean DEFAULT false;
        END IF;
    END IF;
END $$;
