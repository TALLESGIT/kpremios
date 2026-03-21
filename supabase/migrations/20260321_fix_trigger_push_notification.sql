-- 1. Atualizar a função genérica para usar match_games em vez de cruzeiro_games
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  image_url TEXT;
BEGIN
  -- Definir payload baseado na tabela
  CASE TG_TABLE_NAME
    WHEN 'youtube_clips' THEN
      payload := jsonb_build_object(
        'title', '🎬 Novo CLIP adicionado!',
        'body', NEW.title,
        'image', NEW.thumbnail_url,
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
      
    -- Suporte para live_streams (Canal ZK TV)
    WHEN 'live_streams' THEN
      IF NEW.is_active = true AND (OLD.is_active IS NULL OR OLD.is_active = false) THEN
        -- Buscar logo do oponente se houver jogo vinculado (TABELA CORRETAMENTE ATUALIZADA)
        IF NEW.match_id IS NOT NULL THEN
          SELECT opponent_logo INTO image_url FROM match_games WHERE id = NEW.match_id;
        END IF;
        
        -- Se não houver logo do oponente, tenta usar o banner de propaganda (se existir)
        IF image_url IS NULL THEN
          image_url := NEW.overlay_ad_url;
        END IF;

        payload := jsonb_build_object(
          'title', '🔴 Transmissão Iniciada!',
          'body', NEW.title || ' está ao vivo agora! Assista agora! 🎥',
          'image', image_url,
          'data', jsonb_build_object('path', '/zk-tv')
        );
      ELSE
        RETURN NEW;
      END IF;
    ELSE
      RETURN NEW;
  END CASE;

  -- Chamar a Edge Function via HTTP POST
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

-- Garantir que os triggers existam e usem a função atualizada
-- O trigger em live_streams é o principal causador do erro atual
DROP TRIGGER IF EXISTS on_live_stream_start ON live_streams;
CREATE TRIGGER on_live_stream_start
  AFTER UPDATE ON live_streams
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
  EXECUTE FUNCTION trigger_push_notification();
