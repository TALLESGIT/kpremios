-- Migration: Atualizar can_send_message para considerar VIPs
-- Criado em: 2025-01-29
-- Descrição: VIPs têm prioridade no slow mode (tempo reduzido pela metade)

-- Atualizar função can_send_message para considerar VIPs
CREATE OR REPLACE FUNCTION can_send_message(
    p_user_id UUID,
    p_stream_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_is_banned BOOLEAN := FALSE;
    v_slow_mode_seconds INTEGER := 0;
    v_last_message_time TIMESTAMPTZ;
    v_seconds_since_last NUMERIC;
    v_seconds_remaining INTEGER;
    v_stream_exists BOOLEAN;
    v_is_vip BOOLEAN := FALSE;
    v_is_admin BOOLEAN := FALSE;
    v_is_moderator BOOLEAN := FALSE;
    v_effective_slow_mode INTEGER := 0;
BEGIN
    -- Verificar se a stream existe
    SELECT EXISTS (
        SELECT 1 FROM live_streams WHERE id = p_stream_id
    ) INTO v_stream_exists;
    
    IF NOT v_stream_exists THEN
        -- Stream não existe, permitir envio mesmo assim (fallback)
        RETURN json_build_object(
            'can_send', TRUE,
            'reason', NULL,
            'message', NULL
        );
    END IF;
    
    -- Verificar se está banido (usando chat_bans se existir)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chat_bans') THEN
        SELECT EXISTS (
            SELECT 1 
            FROM chat_bans 
            WHERE user_id = p_user_id 
              AND stream_id = p_stream_id
              AND (expires_at IS NULL OR expires_at > now())
        ) INTO v_is_banned;
        
        IF v_is_banned THEN
            RETURN json_build_object(
                'can_send', FALSE,
                'reason', 'banned',
                'message', 'Você foi silenciado nesta transmissão'
            );
        END IF;
    END IF;
    
    -- Verificar roles do usuário (VIP, Admin, Moderador)
    SELECT COALESCE(is_vip, false), COALESCE(is_admin, false)
    INTO v_is_vip, v_is_admin
    FROM users
    WHERE id = p_user_id;
    
    -- Verificar se é moderador
    SELECT EXISTS (
        SELECT 1 FROM stream_moderators
        WHERE user_id = p_user_id AND stream_id = p_stream_id
    ) INTO v_is_moderator;
    
    -- Verificar slow mode
    SELECT COALESCE(slow_mode_seconds, 0)
    INTO v_slow_mode_seconds
    FROM live_streams 
    WHERE id = p_stream_id;
    
    -- Calcular slow mode efetivo
    -- Admins e moderadores não têm slow mode
    -- VIPs têm slow mode reduzido pela metade
    IF v_is_admin OR v_is_moderator THEN
        v_effective_slow_mode := 0;
    ELSIF v_is_vip AND v_slow_mode_seconds > 0 THEN
        v_effective_slow_mode := GREATEST(1, FLOOR(v_slow_mode_seconds / 2.0)); -- Metade do tempo, mínimo 1 segundo
    ELSE
        v_effective_slow_mode := v_slow_mode_seconds;
    END IF;
    
    IF v_effective_slow_mode > 0 THEN
        SELECT created_at 
        INTO v_last_message_time
        FROM live_chat_messages
        WHERE user_id = p_user_id 
          AND stream_id = p_stream_id
        ORDER BY created_at DESC
        LIMIT 1;
        
        IF v_last_message_time IS NOT NULL THEN
            v_seconds_since_last := EXTRACT(EPOCH FROM (NOW() - v_last_message_time));
            
            IF v_seconds_since_last < v_effective_slow_mode THEN
                v_seconds_remaining := v_effective_slow_mode - FLOOR(v_seconds_since_last);
                
                RETURN json_build_object(
                    'can_send', FALSE,
                    'reason', 'slow_mode',
                    'message', format('Aguarde %s segundos para enviar outra mensagem', v_seconds_remaining),
                    'seconds_remaining', v_seconds_remaining
                );
            END IF;
        END IF;
    END IF;
    
    -- Pode enviar
    RETURN json_build_object(
        'can_send', TRUE,
        'reason', NULL,
        'message', NULL
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de qualquer erro, permitir envio (fail-safe)
        RAISE WARNING 'Erro em can_send_message: %', SQLERRM;
        RETURN json_build_object(
            'can_send', TRUE,
            'reason', NULL,
            'message', NULL
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_send_message IS 'Verifica se um usuário pode enviar mensagem. VIPs têm slow mode reduzido pela metade. Admins e moderadores não têm slow mode.';

