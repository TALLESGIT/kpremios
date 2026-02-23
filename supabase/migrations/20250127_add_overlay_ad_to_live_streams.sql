/*
  # Adicionar colunas para Propaganda Overlay na tabela live_streams

  1. Novas Colunas
    - overlay_ad_url (text) - URL da imagem de propaganda overlay
    - overlay_ad_enabled (boolean) - Se o overlay está ativo

  2. Objetivo
    - Permitir que o admin configure propaganda overlay que será sincronizada em tempo real com todos os espectadores
*/

-- Adicionar colunas para overlay de propaganda
ALTER TABLE live_streams 
ADD COLUMN IF NOT EXISTS overlay_ad_url text,
ADD COLUMN IF NOT EXISTS overlay_ad_enabled boolean DEFAULT false;

-- Criar índice para performance em queries que filtram por overlay ativo
CREATE INDEX IF NOT EXISTS idx_live_streams_overlay_enabled ON live_streams(overlay_ad_enabled) WHERE overlay_ad_enabled = true;

-- Comentários para documentação
COMMENT ON COLUMN live_streams.overlay_ad_url IS 'URL da imagem de propaganda overlay (fullscreen)';
COMMENT ON COLUMN live_streams.overlay_ad_enabled IS 'Indica se a propaganda overlay está ativa e deve ser exibida para os espectadores';

