-- =====================================================
-- ATUALIZAÇÃO: Função can_send_message mais robusta
-- =====================================================

-- Remover função atual
DROP FUNCTION IF EXISTS can_send_message(UUID, UUID) CASCADE;

-- Recriar com tratamento de erros melhorado
CREATE FUNCTION can_send_message(
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
    
    -- Verificar se está banido (apenas se a tabela existir)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'banned_users') THEN
        SELECT EXISTS (
            SELECT 1 
            FROM banned_users 
            WHERE user_id = p_user_id 
              AND stream_id = p_stream_id
        ) INTO v_is_banned;
        
        IF v_is_banned THEN
            RETURN json_build_object(
                'can_send', FALSE,
                'reason', 'banned',
                'message', 'Você foi silenciado nesta transmissão'
            );
        END IF;
    END IF;
    
    -- Verificar slow mode
    SELECT COALESCE(slow_mode_seconds, 0)
    INTO v_slow_mode_seconds
    FROM live_streams 
    WHERE id = p_stream_id;
    
    IF v_slow_mode_seconds > 0 THEN
        -- Buscar última mensagem do usuário
        SELECT created_at 
        INTO v_last_message_time
        FROM live_chat_messages
        WHERE user_id = p_user_id 
          AND stream_id = p_stream_id
        ORDER BY created_at DESC
        LIMIT 1;
        
        IF v_last_message_time IS NOT NULL THEN
            v_seconds_since_last := EXTRACT(EPOCH FROM (NOW() - v_last_message_time));
            
            IF v_seconds_since_last < v_slow_mode_seconds THEN
                v_seconds_remaining := v_slow_mode_seconds - FLOOR(v_seconds_since_last);
                
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

COMMENT ON FUNCTION can_send_message IS 'Verifica se um usuário pode enviar mensagem (com tratamento robusto de erros)';
