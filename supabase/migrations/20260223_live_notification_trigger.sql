-- 1. Primeiro, vamos garantir que a extensão de rede esteja ativa
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Função para disparar a Edge Function de Notificação de Live
-- IMPORTANTE: Substitua 'SUA_SERVICE_ROLE_KEY' pela sua chave real (pode achar em Settings -> API -> service_role no Supabase)
CREATE OR REPLACE FUNCTION public.trigger_notify_live_start()
RETURNS TRIGGER AS $$
DECLARE
  service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a2lneWhoZ3J0Z3J5a2xhYmpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0OTk1NywiZXhwIjoyMDcyOTI1OTU3fQ.G41qsBF6Spd5-ZkHqhtAtkzrds5EcORtpgwz1-8PoZQ'; -- <--- COLOQUE SUA CHAVE AQUI
BEGIN
  -- Verificar se a live foi ATIVADA (is_active mudou de false para true)
  IF (NEW.is_active = true AND (OLD.is_active = false OR OLD.is_active IS NULL)) THEN
    -- Chamada assíncrona para a Edge Function
    PERFORM
      net.http_post(
        url := 'https://bukigyhhgrtgryklabjg.supabase.co/functions/v1/notify-live-start',
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

-- 3. Trigger na tabela live_streams
DROP TRIGGER IF EXISTS on_live_start_notify ON public.live_streams;
CREATE TRIGGER on_live_start_notify
  AFTER UPDATE ON public.live_streams
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_live_start();

COMMENT ON FUNCTION public.trigger_notify_live_start() IS 'Dispara notificação push via Edge Function quando uma live é iniciada';
