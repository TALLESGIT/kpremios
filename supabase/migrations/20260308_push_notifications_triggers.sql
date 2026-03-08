 1. Função genérica para chamar a Edge Function de push
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
    ELSE
      RETURN NEW;
  END CASE;

  -- Chamar a Edge Function (requer net.http_post ou similar, ou webhook nativo do Supabase)
  -- Para este projeto, o usuário deve ativar os Webhooks no dashboard do Supabase apontando para:
  -- [SUPABASE_URL]/functions/v1/notify-events
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criar os Triggers
DROP TRIGGER IF EXISTS on_new_clip ON youtube_clips;
CREATE TRIGGER on_new_clip
  AFTER INSERT ON youtube_clips
  FOR EACH ROW EXECUTE FUNCTION trigger_push_notification();

DROP TRIGGER IF EXISTS on_new_music ON spotify_releases;
CREATE TRIGGER on_new_music
  AFTER INSERT ON spotify_releases
  FOR EACH ROW EXECUTE FUNCTION trigger_push_notification();

DROP TRIGGER IF EXISTS on_live_start ON live_games;
CREATE TRIGGER on_live_start
  AFTER UPDATE ON live_games
  FOR EACH ROW EXECUTE FUNCTION trigger_push_notification();
