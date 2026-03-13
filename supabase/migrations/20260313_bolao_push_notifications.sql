-- SQL Migration for Bolão (Match Pools) Push Notifications
-- Creates triggers to send notifications for active/inactive state and match results

CREATE OR REPLACE FUNCTION public.trigger_bolao_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  winners_names TEXT := '';
  winners_ids UUID[];
  winner_names_list TEXT[];
BEGIN
  -- 1. Bolão ativado
  IF NEW.is_active = true AND (OLD.is_active IS NULL OR OLD.is_active = false) THEN
    payload := jsonb_build_object(
      'title', '⚽ Bolão Liberado!',
      'body', 'Faça seu palpite para ' || NEW.home_team || ' x ' || NEW.away_team || ' e concorra a prêmios! 🏆',
      'data', jsonb_build_object('path', '/tv') 
    );
    -- Envia para todos
    PERFORM net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/notify-events',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')),
      body := payload
    );

  -- 2. Bolão desativado (sem resultado ainda)
  ELSIF NEW.is_active = false AND (OLD.is_active = true) AND NEW.result_set_at IS NULL THEN
    payload := jsonb_build_object(
      'title', '🛑 Palpites Encerrados!',
      'body', 'Acompanhe o jogo ' || NEW.home_team || ' x ' || NEW.away_team || ' para saber se você ganhou o Bolão! ⏳',
      'data', jsonb_build_object('path', '/tv')
    );
    -- Envia para todos
    PERFORM net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/notify-events',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')),
      body := payload
    );

  -- 3. Resultado publicado
  ELSIF NEW.result_set_at IS NOT NULL AND OLD.result_set_at IS NULL THEN
    -- Obter os ganhadores
    SELECT 
      array_agg(u.full_name),
      array_agg(u.id)
    INTO 
      winner_names_list,
      winners_ids
    FROM pool_bets pb
    JOIN users u ON u.id = pb.user_id
    WHERE pb.pool_id = NEW.id AND pb.is_winner = true;

    IF array_length(winners_ids, 1) > 0 THEN
      -- Há ganhadores
      winners_names := array_to_string(winner_names_list, ', ');
      
      -- Notificação geral para todos
      payload := jsonb_build_object(
        'title', '🎉 Resultado do Bolão!',
        'body', 'Placar oficial: ' || NEW.home_team || ' ' || NEW.result_home_score || 'x' || NEW.result_away_score || ' ' || NEW.away_team || '. Ganhador(es): ' || winners_names || '! 🏆',
        'data', jsonb_build_object('path', '/tv')
      );
      PERFORM net.http_post(
        url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/notify-events',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')),
        body := payload
      );

      -- Notificação EXCLUSIVA para os ganhadores
      payload := jsonb_build_object(
        'title', '✨ PARABÉNS! Você ganhou o Bolão! ✨',
        'body', 'Você cravou ' || NEW.result_home_score || 'x' || NEW.result_away_score || ' no jogo ' || NEW.home_team || ' x ' || NEW.away_team || '! Entre em contato com o suporte para resgatar seu prêmio! 🎁📱',
        'data', jsonb_build_object('path', '/tv'),
        'user_ids', winners_ids
      );
      PERFORM net.http_post(
        url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/notify-events',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')),
        body := payload
      );

    ELSE
      -- Acumulou (ninguém ganhou)
      payload := jsonb_build_object(
        'title', '😔 Bolão Acumulou!',
        'body', 'Ninguém acertou o placar de ' || NEW.result_home_score || 'x' || NEW.result_away_score || ' no jogo ' || NEW.home_team || ' x ' || NEW.away_team || '! O prêmio acumulou! 💰🔄',
        'data', jsonb_build_object('path', '/tv')
      );
      PERFORM net.http_post(
        url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/notify-events',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')),
        body := payload
      );
    END IF;

  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_match_pool_updates ON match_pools;
CREATE TRIGGER on_match_pool_updates
  AFTER UPDATE ON match_pools
  FOR EACH ROW
  EXECUTE FUNCTION trigger_bolao_push_notification();
