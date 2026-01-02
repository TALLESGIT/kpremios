/*
  # Adicionar campos HLS e registro inicial para ZKTV

  1. Novos Campos
    - hls_url (text) - URL do arquivo .m3u8 do Agora
    - started_at (timestamptz) - Quando a live iniciou

  2. Registro Inicial
    - Criar registro com channel_name = 'zktv' se não existir

  3. Objetivo
    - Permitir que o sistema controle o status da live via Supabase
    - Mobile usa HLS (.m3u8) quando status = LIVE
    - Desktop usa RTC quando status = LIVE
*/

-- Adicionar colunas HLS e started_at
ALTER TABLE live_streams 
ADD COLUMN IF NOT EXISTS hls_url text,
ADD COLUMN IF NOT EXISTS started_at timestamptz;

-- Criar índice para performance em queries que filtram por is_active
CREATE INDEX IF NOT EXISTS idx_live_streams_hls_active ON live_streams(channel_name, is_active) WHERE is_active = true;

-- Comentários para documentação
COMMENT ON COLUMN live_streams.hls_url IS 'URL do arquivo .m3u8 do Agora (HLS) para mobile';
COMMENT ON COLUMN live_streams.started_at IS 'Data/hora em que a live foi iniciada';

-- Criar registro inicial para ZKTV (se não existir)
INSERT INTO live_streams (title, description, channel_name, is_active, viewer_count)
VALUES ('ZK TV', 'Transmissão ao vivo do ZK TV', 'zktv', false, 0)
ON CONFLICT (channel_name) DO NOTHING;

-- Garantir que Realtime está habilitado para live_streams
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS live_streams;

-- Garantir que a tabela tem REPLICA IDENTITY FULL para Realtime funcionar corretamente
ALTER TABLE live_streams REPLICA IDENTITY FULL;

