-- =====================================================
-- FIX: Statement Timeout e Performance
-- =====================================================
-- Problema: Queries demorando muito e sendo canceladas
-- Solucao: Aumentar timeout e otimizar queries

-- 1. Aumentar statement timeout para 30 segundos (padrao: 10s)
ALTER DATABASE postgres SET statement_timeout = '30s';

-- 2. Adicionar indices para melhorar performance de viewer_sessions
CREATE INDEX IF NOT EXISTS idx_viewer_sessions_stream_active 
  ON viewer_sessions(stream_id, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_viewer_sessions_heartbeat 
  ON viewer_sessions(last_heartbeat) 
  WHERE is_active = true;

-- 3. Adicionar indice para live_chat_messages (usado frequentemente)
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_stream_created 
  ON live_chat_messages(stream_id, created_at DESC);

-- 4. Adicionar indice para live_streams (queries de status)
CREATE INDEX IF NOT EXISTS idx_live_streams_active_updated 
  ON live_streams(is_active, updated_at DESC) 
  WHERE is_active = true;

-- 5. Otimizar funcao de heartbeat para evitar timeout
CREATE OR REPLACE FUNCTION update_viewer_heartbeat_optimized(p_session_id text)
RETURNS void AS $$
BEGIN
  -- Usar UPDATE simples sem subqueries complexas
  UPDATE viewer_sessions
  SET 
    last_heartbeat = NOW(), 
    is_active = TRUE
  WHERE session_id = p_session_id 
    AND is_active = TRUE;
    
  -- Nao fazer EXCEPTION para evitar overhead
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_viewer_heartbeat_optimized(text) TO anon, authenticated;

-- 6. Criar funcao otimizada para contar viewers (evita COUNT(*) lento)
CREATE OR REPLACE FUNCTION get_viewer_count_fast(p_stream_id uuid)
RETURNS integer AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Usar indice e limitar tempo de busca
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM viewer_sessions
  WHERE stream_id = p_stream_id
    AND is_active = TRUE
    AND last_heartbeat > NOW() - INTERVAL '2 minutes';
    
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_viewer_count_fast(uuid) TO anon, authenticated;

-- 7. Limpar sessoes antigas automaticamente (evita tabela crescer demais)
CREATE OR REPLACE FUNCTION cleanup_old_viewer_sessions()
RETURNS void AS $$
BEGIN
  -- Marcar como inativas sessoes com heartbeat antigo
  UPDATE viewer_sessions
  SET is_active = FALSE
  WHERE is_active = TRUE
    AND last_heartbeat < NOW() - INTERVAL '5 minutes';
    
  -- Deletar sessoes muito antigas (mais de 24h)
  DELETE FROM viewer_sessions
  WHERE last_heartbeat < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios para documentacao
COMMENT ON FUNCTION update_viewer_heartbeat_optimized IS 
  'Versao otimizada do heartbeat sem exception handling para melhor performance';
COMMENT ON FUNCTION get_viewer_count_fast IS 
  'Conta viewers ativos de forma rapida usando indices';
COMMENT ON FUNCTION cleanup_old_viewer_sessions IS 
  'Limpa sessoes antigas para manter tabela pequena e rapida';
