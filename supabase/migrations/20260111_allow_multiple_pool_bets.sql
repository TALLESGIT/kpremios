-- Permitir múltiplas apostas por usuário no mesmo bolão
-- Remove o constraint UNIQUE que impedia múltiplas apostas

-- Remover constraint UNIQUE existente (pode ter nomes diferentes)
ALTER TABLE pool_bets 
DROP CONSTRAINT IF EXISTS pool_bets_pool_id_user_id_key;

-- Também tentar remover com outro nome possível
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'pool_bets'::regclass 
        AND conname LIKE '%pool_id%user_id%'
    ) THEN
        ALTER TABLE pool_bets DROP CONSTRAINT pool_bets_pool_id_user_id_key;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Se não existir, ignora o erro
    NULL;
END $$;

-- Criar índice parcial único apenas para apostas pendentes
-- Isso permite múltiplas apostas pagas, mas impede múltiplas apostas pendentes simultâneas por usuário
CREATE UNIQUE INDEX IF NOT EXISTS pool_bets_pool_user_pending_unique 
ON pool_bets(pool_id, user_id) 
WHERE payment_status = 'pending';

-- Comentário
COMMENT ON INDEX pool_bets_pool_user_pending_unique IS 'Garante apenas uma aposta pendente por usuário por bolão, mas permite múltiplas apostas pagas';

