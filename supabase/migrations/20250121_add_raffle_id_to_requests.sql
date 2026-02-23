-- Adicionar campo raffle_id à tabela extra_number_requests
-- Isso permitirá associar cada solicitação ao sorteio específico

-- Verificar se a tabela extra_number_requests existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'extra_number_requests') THEN
        -- Adicionar coluna raffle_id se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'extra_number_requests' AND column_name = 'raffle_id'
        ) THEN
            ALTER TABLE extra_number_requests ADD COLUMN raffle_id uuid REFERENCES raffles(id) ON DELETE CASCADE;
        END IF;
        
        -- Adicionar índice para melhor performance
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'extra_number_requests' AND indexname = 'idx_extra_number_requests_raffle_id'
        ) THEN
            CREATE INDEX idx_extra_number_requests_raffle_id ON extra_number_requests(raffle_id);
        END IF;
    END IF;
END $$;

-- Comentário explicativo
COMMENT ON COLUMN extra_number_requests.raffle_id IS 'ID do sorteio ao qual esta solicitação está associada';