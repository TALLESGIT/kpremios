-- 1. Garantir que a tabela site_settings existe (usada pelo script de futebol e agora pelas notificações)
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS para site_settings (se já não estiver)
-- ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 3. Inserir chaves se não existirem (Necessárias para o trigger chamar a Edge Function)
-- IMPORTANTE: O usuário deve substituir 'SUA_SERVICE_ROLE_KEY_AQUI' pela chave real no SQL Editor.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'supabase_url') THEN
        INSERT INTO site_settings (key, value) VALUES ('supabase_url', '"https://bukigyhhgrtgryklabjg.supabase.co"');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'supabase_service_role_key') THEN
        INSERT INTO site_settings (key, value) VALUES ('supabase_service_role_key', '"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a2lneWhoZ3J0Z3J5a2xhYmpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0OTk1NywiZXhwIjoyMDcyOTI1OTU3fQ.G41qsBF6Spd5-ZkHqhtAtkzrds5EcORtpgwz1-8PoZQ"');
    END IF;
END $$;

-- 4. Criar ou atualizar a função de notificação para usar site_settings (em vez de settings)
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  s_url TEXT;
  s_key TEXT;
BEGIN
  -- Obter configurações da site_settings
  SELECT (value#>>'{}') INTO s_url FROM site_settings WHERE key = 'supabase_url';
  SELECT (value#>>'{}') INTO s_key FROM site_settings WHERE key = 'supabase_service_role_key';
  
  -- Se as configurações não existirem ou forem o placeholder, sair
  IF s_url IS NULL OR s_key IS NULL OR s_key = 'SUA_SERVICE_ROLE_KEY_AQUI' THEN
    RAISE NOTICE 'Skipping push notification: site_settings missing valid supabase_url or key';
    RETURN NEW;
  END IF;

  -- Definir payload baseado na tabela
  CASE TG_TABLE_NAME
    WHEN 'youtube_clips' THEN
      payload := jsonb_build_object(
        'title', '🎬 Novo CLIP adicionado!',
        'body', NEW.title,
        'data', jsonb_build_object('path', '/media')
      );
    WHEN 'spotify_releases' THEN
      payload := jsonb_build_object(
        'title', '🎵 Nova MÚSICA na playlist!',
        'body', NEW.title,
        'data', jsonb_build_object('path', '/media')
      );
    WHEN 'live_games' THEN
      IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
        payload := jsonb_build_object(
          'title', '🔴 Estamos AO VIVO!',
          'body', NEW.title || ' começou agora! ⚽',
          'data', jsonb_build_object('path', '/live/' || NEW.id)
        );
      ELSE
        RETURN NEW;
      END IF;
    WHEN 'live_streams' THEN
      -- Só disparar se mudar de inativo para ativo
      IF NEW.is_active = true AND (OLD.is_active IS NULL OR OLD.is_active = false) THEN
        payload := jsonb_build_object(
          'title', '🔴 Transmissão Iniciada!',
          'body', NEW.title || ' está ao vivo agora! Assista agora! 🎥',
          'data', jsonb_build_object('path', '/live/' || NEW.channel_name)
        );
      ELSE
        RETURN NEW;
      END IF;
    ELSE
      RETURN NEW;
  END CASE;

  -- Chamar a Edge Function via HTTP POST usando a extensão net
  PERFORM
    net.http_post(
      url := s_url || '/functions/v1/notify-events',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || s_key
      ),
      body := payload
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar Triggers para as tabelas relevantes

-- Live Streams (Transmissões Gerais)
DROP TRIGGER IF EXISTS on_live_stream_start ON live_streams;
CREATE TRIGGER on_live_stream_start
  AFTER UPDATE ON live_streams
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
  EXECUTE FUNCTION trigger_push_notification();

-- Live Games (Jogos do Cruzeiro)
DROP TRIGGER IF EXISTS on_live_game_start ON live_games;
CREATE TRIGGER on_live_game_start
  AFTER UPDATE ON live_games
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trigger_push_notification();

-- YouTube Clips
DROP TRIGGER IF EXISTS on_youtube_clip_added ON youtube_clips;
CREATE TRIGGER on_youtube_clip_added
  AFTER INSERT ON youtube_clips
  FOR EACH ROW
  EXECUTE FUNCTION trigger_push_notification();

-- Spotify Releases
DROP TRIGGER IF EXISTS on_spotify_release_added ON spotify_releases;
CREATE TRIGGER on_spotify_release_added
  AFTER INSERT ON spotify_releases
  FOR EACH ROW
  EXECUTE FUNCTION trigger_push_notification();
