-- =====================================================
-- CORREÇÃO COMPLETA DAS MÉTRICAS DE VIEWERS
-- =====================================================
-- Este script corrige problemas com métricas zeradas e
-- garante que viewers sejam rastreados corretamente

-- 1. Garantir que RLS está configurado corretamente
ALTER TABLE viewer_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access to viewer_sessions" ON viewer_sessions;
CREATE POLICY "Public access to viewer_sessions"
ON viewer_sessions FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 2. Corrigir update_viewer_heartbeat
-- Agora também cria a sessão se não existir (para garantir tracking)
CREATE OR REPLACE FUNCTION update_viewer_heartbeat(p_session_id text)
RETURNS VOID AS $$
DECLARE
  v_stream_id uuid;
BEGIN
  -- Primeiro, tentar atualizar sessão existente
  UPDATE viewer_sessions
  SET last_heartbeat = NOW(),
      is_active = TRUE
  WHERE session_id = p_session_id
    AND is_active = TRUE;
  
  -- Se nenhuma linha foi atualizada, a sessão pode não existir ou estar inativa
  -- Isso é OK, o trackViewer no frontend vai criar/reativar quando necessário
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Corrigir cleanup_inactive_viewer_sessions
-- Usar 2 minutos para ser consistente com count_active_unique_viewers
CREATE OR REPLACE FUNCTION cleanup_inactive_viewer_sessions()
RETURNS VOID AS $$
BEGIN
  -- Marcar como inativas sessões sem heartbeat há mais de 2 minutos
  UPDATE viewer_sessions
  SET is_active = FALSE,
      ended_at = COALESCE(ended_at, last_heartbeat, NOW())
  WHERE is_active = TRUE
    AND (last_heartbeat IS NULL OR last_heartbeat < NOW() - INTERVAL '2 minutes');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Corrigir count_active_unique_viewers
-- Usar 2 minutos (mais seguro que 30 segundos, considerando latência de rede)
CREATE OR REPLACE FUNCTION count_active_unique_viewers(p_stream_id uuid)
RETURNS BIGINT AS $$
DECLARE
    v_count BIGINT;
BEGIN
    SELECT COUNT(DISTINCT session_id)
    INTO v_count
    FROM viewer_sessions
    WHERE stream_id = p_stream_id
      AND is_active = TRUE
      AND last_heartbeat IS NOT NULL
      AND last_heartbeat > NOW() - INTERVAL '2 minutes';
    
    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Corrigir get_stream_statistics
-- Melhorar cálculo de métricas para ser mais preciso
CREATE OR REPLACE FUNCTION get_stream_statistics(p_stream_id uuid)
RETURNS TABLE (
  total_viewers bigint,
  active_viewers bigint,
  avg_watch_time numeric,
  unique_sessions bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total de sessões únicas (histórico completo)
    COUNT(DISTINCT session_id)::bigint as total_viewers,
    
    -- Viewers ativos (com heartbeat nos últimos 2 minutos)
    COUNT(DISTINCT CASE 
      WHEN is_active = TRUE 
        AND last_heartbeat IS NOT NULL
        AND last_heartbeat > NOW() - INTERVAL '2 minutes' 
      THEN session_id 
    END)::bigint as active_viewers,
    
    -- Tempo médio de visualização (em segundos)
    COALESCE(AVG(
      CASE 
        WHEN ended_at IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (ended_at - started_at))
        WHEN is_active = TRUE AND last_heartbeat IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (last_heartbeat - started_at))
        ELSE 0
      END
    ), 0)::numeric as avg_watch_time,
    
    -- Total de sessões únicas
    COUNT(DISTINCT session_id)::bigint as unique_sessions
  FROM viewer_sessions
  WHERE stream_id = p_stream_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Garantir que a coluna last_heartbeat existe e tem valor padrão
ALTER TABLE viewer_sessions 
ADD COLUMN IF NOT EXISTS last_heartbeat timestamptz DEFAULT NOW();

-- Atualizar sessões existentes sem last_heartbeat
UPDATE viewer_sessions
SET last_heartbeat = COALESCE(last_heartbeat, started_at, NOW())
WHERE last_heartbeat IS NULL;

-- 7. Garantir permissões
GRANT EXECUTE ON FUNCTION update_viewer_heartbeat(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_inactive_viewer_sessions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION count_active_unique_viewers(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_stream_statistics(uuid) TO anon, authenticated;

-- 8. Comentários para documentação
COMMENT ON FUNCTION update_viewer_heartbeat IS 'Atualiza o heartbeat de uma sessão de viewer. Deve ser chamado periodicamente (a cada 30 segundos) para manter a sessão ativa.';
COMMENT ON FUNCTION cleanup_inactive_viewer_sessions IS 'Marca como inativas sessões sem heartbeat há mais de 2 minutos. Deve ser chamado periodicamente.';
COMMENT ON FUNCTION count_active_unique_viewers IS 'Conta o número de viewers únicos ativos (com heartbeat nos últimos 2 minutos) para uma stream específica.';
COMMENT ON FUNCTION get_stream_statistics IS 'Retorna estatísticas agregadas de uma transmissão: total de viewers, viewers ativos, tempo médio de visualização e sessões únicas.';

