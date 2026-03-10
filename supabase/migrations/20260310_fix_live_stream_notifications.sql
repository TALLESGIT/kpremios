-- 1. Atualizar a função genérica para suportar live_streams
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
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
    -- ADIÇÃO: Suporte para live_streams
    WHEN 'live_streams' THEN
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

  -- Chamar a Edge Function via HTTP POST
  -- Requer extensões net ou custom webhook. Por padrão usaremos o timeout e segurançao recomendados.
  PERFORM
    net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/notify-events',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
      ),
      body := payload
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criar o Trigger para live_streams
DROP TRIGGER IF EXISTS on_live_stream_start ON live_streams;
CREATE TRIGGER on_live_stream_start
  AFTER UPDATE ON live_streams
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
  EXECUTE FUNCTION trigger_push_notification();
