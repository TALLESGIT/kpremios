-- =====================================================
-- 🎯 SETUP ZKTV NO SUPABASE - COPIAR E COLAR TUDO
-- =====================================================
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- 1️⃣ ADICIONAR CAMPOS HLS E STARTED_AT
-- =====================================================
ALTER TABLE live_streams 
ADD COLUMN IF NOT EXISTS hls_url text,
ADD COLUMN IF NOT EXISTS started_at timestamptz;

-- Comentários para documentação
COMMENT ON COLUMN live_streams.hls_url IS 'URL do arquivo .m3u8 do Agora (HLS) para mobile';
COMMENT ON COLUMN live_streams.started_at IS 'Data/hora em que a live foi iniciada';

-- =====================================================
-- 2️⃣ CRIAR REGISTRO INICIAL ZKTV
-- =====================================================
INSERT INTO live_streams (title, description, channel_name, is_active, viewer_count)
VALUES ('ZK TV', 'Transmissão ao vivo do ZK TV', 'zktv', false, 0)
ON CONFLICT (channel_name) DO NOTHING;

-- =====================================================
-- 3️⃣ GARANTIR REALTIME HABILITADO
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS live_streams;
ALTER TABLE live_streams REPLICA IDENTITY FULL;

-- =====================================================
-- 4️⃣ VERIFICAR POLICIES (JÁ DEVEM ESTAR CORRETAS)
-- =====================================================
-- A policy "Anyone can view active streams" já permite
-- leitura pública quando is_active = true
-- 
-- Se precisar ajustar, use:
-- DROP POLICY IF EXISTS "Public read live status" ON live_streams;
-- CREATE POLICY "Public read live status" ON live_streams
--   FOR SELECT USING (true);

-- =====================================================
-- ✅ PRONTO! AGORA O SISTEMA ESTÁ CONFIGURADO
-- =====================================================
-- 
-- 🟢 QUANDO A LIVE INICIA (no código do admin):
-- UPDATE live_streams
-- SET 
--   is_active = true,
--   hls_url = 'https://SUA_URL_DO_AGORA.m3u8',
--   started_at = now()
-- WHERE channel_name = 'zktv';
--
-- 🔴 QUANDO A LIVE ENCERRA (no código do admin):
-- UPDATE live_streams
-- SET 
--   is_active = false,
--   hls_url = null
-- WHERE channel_name = 'zktv';
--
-- =====================================================

