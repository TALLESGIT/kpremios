-- =====================================================
-- Adicionar campos de duração para enquetes
-- =====================================================

-- Adicionar campos de duração (opcionais)
ALTER TABLE stream_polls
ADD COLUMN IF NOT EXISTS duration_seconds integer,
ADD COLUMN IF NOT EXISTS starts_at timestamptz,
ADD COLUMN IF NOT EXISTS ends_at timestamptz;

-- Comentários para documentação
COMMENT ON COLUMN stream_polls.duration_seconds IS 'Duração da enquete em segundos (opcional). Se definido, a enquete será automaticamente desativada após este tempo.';
COMMENT ON COLUMN stream_polls.starts_at IS 'Data/hora de início da enquete (opcional).';
COMMENT ON COLUMN stream_polls.ends_at IS 'Data/hora de término da enquete (opcional). Calculado automaticamente se duration_seconds for fornecido.';
