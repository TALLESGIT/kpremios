-- Adicionar campo result_set_at para rastrear quando o resultado do bolão foi definido
-- Isso permite mostrar ganhadores por 7 dias após o resultado ser definido pelo admin
ALTER TABLE match_pools 
ADD COLUMN IF NOT EXISTS result_set_at TIMESTAMPTZ;

-- Comentário explicativo
COMMENT ON COLUMN match_pools.result_set_at IS 'Data/hora em que o admin definiu o resultado do bolão. Usado para calcular quando remover os ganhadores da exibição (7 dias após esta data)';
