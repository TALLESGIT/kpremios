-- =====================================================
-- FUNÇÕES RPC PARA O SISTEMA DE LIVE STREAMING
-- =====================================================
-- Remover funções que mudaram assinatura (usar CASCADE para dependências)

-- Funções que têm políticas RLS dependentes - usar CASCADE
DROP FUNCTION IF EXISTS is_moderator(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS is_user_banned(UUID, UUID) CASCADE;

-- Funções que mudaram tipo de retorno - usar CASCADE
DROP FUNCTION IF EXISTS get_stream_statistics(UUID) CASCADE;

-- Outras funções - DROP simples
DROP FUNCTION IF EXISTS can_send_message(UUID, UUID);
DROP FUNCTION IF EXISTS count_active_unique_viewers(UUID);
DROP FUNCTION IF EXISTS cleanup_inactive_viewer_sessions();
DROP FUNCTION IF EXISTS end_all_active_viewer_sessions(UUID);
DROP FUNCTION IF EXISTS clear_stream_data(UUID);

-- =====================================================
-- CRIAR NOVAS FUNÇÕES
-- =====================================================

-- 1. Função: can_send_message
-- Verifica se um usuário pode enviar mensagem (bans + slow mode)
CREATE FUNCTION can_send_message(
    p_user_id UUID,
    p_stream_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_is_banned BOOLEAN;
    v_slow_mode_seconds INTEGER;
    v_last_message_time TIMESTAMPTZ;
    v_seconds_since_last NUMERIC;
    v_seconds_remaining INTEGER;
BEGIN
    -- Verificar se está banido
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
    
    -- Verificar slow mode
    SELECT slow_mode_seconds 
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função: is_moderator
-- Verifica se um usuário é moderador de uma stream
CREATE FUNCTION is_moderator(
    p_user_id UUID,
    p_stream_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM stream_moderators 
        WHERE user_id = p_user_id 
          AND stream_id = p_stream_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função: is_user_banned
-- Verifica se um usuário está banido de uma stream
CREATE FUNCTION is_user_banned(
    p_user_id UUID,
    p_stream_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM banned_users 
        WHERE user_id = p_user_id 
          AND stream_id = p_stream_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Função: get_stream_statistics
-- Retorna estatísticas da transmissão
CREATE FUNCTION get_stream_statistics(
    p_stream_id UUID
)
RETURNS TABLE (
    total_viewers BIGINT,
    active_viewers BIGINT,
    avg_watch_time NUMERIC,
    unique_sessions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT vs.user_id)::BIGINT AS total_viewers,
        COUNT(DISTINCT CASE WHEN vs.is_active = TRUE AND vs.last_heartbeat > NOW() - INTERVAL '5 minutes' 
                            THEN vs.session_id END)::BIGINT AS active_viewers,
        COALESCE(AVG(
            CASE 
                WHEN vs.ended_at IS NOT NULL THEN 
                    EXTRACT(EPOCH FROM (vs.ended_at - vs.started_at))
                WHEN vs.is_active = TRUE THEN 
                    EXTRACT(EPOCH FROM (NOW() - vs.started_at))
                ELSE 0
            END
        ), 0)::NUMERIC AS avg_watch_time,
        COUNT(DISTINCT vs.session_id)::BIGINT AS unique_sessions
    FROM viewer_sessions vs
    WHERE vs.stream_id = p_stream_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função: count_active_unique_viewers
-- Conta visualizadores únicos ativos
CREATE FUNCTION count_active_unique_viewers(
    p_stream_id UUID
)
RETURNS BIGINT AS $$
DECLARE
    v_count BIGINT;
BEGIN
    SELECT COUNT(DISTINCT session_id)
    INTO v_count
    FROM viewer_sessions
    WHERE stream_id = p_stream_id
      AND is_active = TRUE
      AND last_heartbeat > NOW() - INTERVAL '5 minutes';
    
    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Função: cleanup_inactive_viewer_sessions
-- Limpa sessões inativas (sem heartbeat nos últimos 5 minutos)
CREATE FUNCTION cleanup_inactive_viewer_sessions()
RETURNS VOID AS $$
BEGIN
    UPDATE viewer_sessions
    SET is_active = FALSE,
        ended_at = COALESCE(ended_at, last_heartbeat)
    WHERE is_active = TRUE
      AND last_heartbeat < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Função: end_all_active_viewer_sessions
-- Encerra todas as sessões ativas de uma stream
CREATE FUNCTION end_all_active_viewer_sessions(
    p_stream_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE viewer_sessions
    SET is_active = FALSE,
        ended_at = NOW()
    WHERE stream_id = p_stream_id
      AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Função: clear_stream_data
-- Limpa todos os dados de uma stream (mensagens, sessões, etc)
CREATE FUNCTION clear_stream_data(
    p_stream_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Deletar mensagens do chat
    DELETE FROM live_chat_messages WHERE stream_id = p_stream_id;
    
    -- Deletar sessões de visualização
    DELETE FROM viewer_sessions WHERE stream_id = p_stream_id;
    
    -- Resetar contador de viewers
    UPDATE live_streams 
    SET viewer_count = 0 
    WHERE id = p_stream_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTÁRIOS E PERMISSÕES
-- =====================================================

COMMENT ON FUNCTION can_send_message IS 'Verifica se um usuário pode enviar mensagem considerando bans e slow mode';
COMMENT ON FUNCTION is_moderator IS 'Verifica se um usuário é moderador de uma transmissão';
COMMENT ON FUNCTION is_user_banned IS 'Verifica se um usuário está banido de uma transmissão';
COMMENT ON FUNCTION get_stream_statistics IS 'Retorna estatísticas agregadas de uma transmissão';
COMMENT ON FUNCTION count_active_unique_viewers IS 'Conta o número de visualizadores únicos ativos';
COMMENT ON FUNCTION cleanup_inactive_viewer_sessions IS 'Limpa sessões de visualização inativas';
COMMENT ON FUNCTION end_all_active_viewer_sessions IS 'Encerra todas as sessões ativas de uma stream';
COMMENT ON FUNCTION clear_stream_data IS 'Limpa todos os dados relacionados a uma stream';

-- =====================================================
-- RECRIAR POLÍTICAS RLS REMOVIDAS PELO CASCADE
-- =====================================================

-- Políticas para chat_bans (se a tabela existir)
DO $$ 
BEGIN
    -- Verificar se a tabela chat_bans existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chat_bans') THEN
        -- Drop políticas antigas se existirem
        DROP POLICY IF EXISTS "Moderadores podem ver bans" ON chat_bans;
        DROP POLICY IF EXISTS "Moderadores podem gerenciar bans" ON chat_bans;
        
        -- Recriar políticas
        CREATE POLICY "Moderadores podem ver bans" 
            ON chat_bans FOR SELECT
            USING (is_moderator(auth.uid(), stream_id));
        
        CREATE POLICY "Moderadores podem gerenciar bans" 
            ON chat_bans FOR ALL
            USING (is_moderator(auth.uid(), stream_id));
    END IF;
END $$;

-- Políticas para banned_users (alternativa para chat_bans)
DO $$ 
BEGIN
    -- Verificar se a tabela banned_users existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'banned_users') THEN
        -- Drop políticas antigas se existirem
        DROP POLICY IF EXISTS "Moderadores podem ver bans" ON banned_users;
        DROP POLICY IF EXISTS "Moderadores podem gerenciar bans" ON banned_users;
        
        -- Recriar políticas
        CREATE POLICY "Moderadores podem ver bans" 
            ON banned_users FOR SELECT
            USING (is_moderator(auth.uid(), stream_id));
        
        CREATE POLICY "Moderadores podem gerenciar bans" 
            ON banned_users FOR ALL
            USING (is_moderator(auth.uid(), stream_id));
    END IF;
END $$;

-- Política para live_chat_messages
DO $$ 
BEGIN
    -- Drop política antiga se existir
    DROP POLICY IF EXISTS "Moderadores podem deletar mensagens" ON live_chat_messages;
    
    -- Recriar política
    CREATE POLICY "Moderadores podem deletar mensagens" 
        ON live_chat_messages FOR DELETE
        USING (is_moderator(auth.uid(), stream_id));
END $$;

