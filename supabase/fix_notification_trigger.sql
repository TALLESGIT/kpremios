-- 1. Garante que a extensão pg_net está ativa (necessária para Webhooks via SQL)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Função Melhorada para disparar a Notificação
-- Esta versão tenta usar a URL dinâmica e deixa claro onde colocar a chave
CREATE OR REPLACE FUNCTION public.trigger_notify_live_start()
RETURNS TRIGGER AS $$
DECLARE
  -- Pegue sua service_role_key em: Settings -> API -> service_role
  service_role_key TEXT := 'SUA_SERVICE_ROLE_KEY_AQUI'; 
  project_id TEXT := 'bukigyhhgrtgryklabjg'; -- Seu ID de projeto
BEGIN
  -- Dispara apenas quando is_active muda de FALSE para TRUE
  IF (NEW.is_active = true AND (OLD.is_active = false OR OLD.is_active IS NULL)) THEN
    PERFORM
      net.http_post(
        url := 'https://' || project_id || '.supabase.co/functions/v1/notify-live-start',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'type', 'UPDATE',
          'record', row_to_json(NEW),
          'old_record', row_to_json(OLD)
        )
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recriar o Trigger
DROP TRIGGER IF EXISTS on_live_start_notify ON public.live_streams;
CREATE TRIGGER on_live_start_notify
  AFTER UPDATE ON public.live_streams
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_live_start();

COMMENT ON FUNCTION public.trigger_notify_live_start() IS 'Dispara notificação push via Edge Function de forma segura';
