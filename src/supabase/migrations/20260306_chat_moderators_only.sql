-- Migration: Atualização do Sistema de Moderação do Chat (Moderators Only)
-- Criado em: 2026-03-06

-- Atualizar RPC: Verificar se usuário pode enviar mensagem (bans + slow mode + moderators only)
CREATE OR REPLACE FUNCTION can_send_message(p_user_id uuid, p_stream_id uuid)
RETURNS json AS $$
DECLARE
  v_slow_mode_seconds integer;
  v_moderators_only boolean;
  v_last_message_at timestamptz;
  v_seconds_remaining integer;
  v_is_mod boolean;
BEGIN
  -- Verificar se está banido
  IF is_user_banned(p_user_id, p_stream_id) THEN
    RETURN json_build_object(
      'can_send', false,
      'reason', 'banned',
      'message', 'Você foi silenciado temporariamente'
    );
  END IF;

  -- Buscar configurações da stream (slow mode e moderators only)
  SELECT slow_mode_seconds, moderators_only_mode 
  INTO v_slow_mode_seconds, v_moderators_only
  FROM live_streams
  WHERE id = p_stream_id;

  -- Verificar status de moderador/admin
  v_is_mod := is_moderator(p_user_id, p_stream_id);

  -- Verificar restrição "Moderators Only"
  IF v_moderators_only AND NOT v_is_mod THEN
    RETURN json_build_object(
      'can_send', false,
      'reason', 'moderators_only',
      'message', 'O chat está restrito apenas para moderadores no momento.'
    );
  END IF;

  -- Verificar slow mode (moderadores ignoram slow mode)
  IF v_slow_mode_seconds > 0 AND NOT v_is_mod THEN
    -- Buscar última mensagem
    SELECT created_at INTO v_last_message_at
    FROM live_chat_messages
    WHERE user_id = p_user_id AND stream_id = p_stream_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_last_message_at IS NOT NULL THEN
      v_seconds_remaining := v_slow_mode_seconds - EXTRACT(EPOCH FROM (now() - v_last_message_at))::integer;
      
      IF v_seconds_remaining > 0 THEN
        RETURN json_build_object(
          'can_send', false,
          'reason', 'slow_mode',
          'seconds_remaining', v_seconds_remaining,
          'message', 'Aguarde ' || v_seconds_remaining || ' segundos'
        );
      END IF;
    END IF;
  END IF;

  RETURN json_build_object('can_send', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
