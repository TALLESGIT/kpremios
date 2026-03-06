-- Adicionar coluna de status à tabela raffles
-- Status: 'active', 'finished', 'cancelled'

-- Verificar se a tabela raffles existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'raffles') THEN
        -- Adicionar coluna status se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'raffles' AND column_name = 'status'
        ) THEN
            ALTER TABLE raffles ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'finished', 'cancelled'));
        END IF;
        
        -- Adicionar coluna winner_id se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'raffles' AND column_name = 'winner_id'
        ) THEN
            ALTER TABLE raffles ADD COLUMN winner_id uuid REFERENCES users(id);
        END IF;
        
        -- Adicionar coluna finished_at se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'raffles' AND column_name = 'finished_at'
        ) THEN
            ALTER TABLE raffles ADD COLUMN finished_at timestamptz;
        END IF;
    END IF;
END $$;
