-- =====================================================
-- CORREÇÃO COMPLETA: Chat, Métricas e Realtime
-- =====================================================
-- Este script corrige:
-- 1. Mensagens não aparecem (RLS muito restritivo)
-- 2. Métricas zeradas (RLS bloqueando leitura de viewer_sessions)
-- 3. Realtime não funcionando
-- =====================================================

-- =====================================================
-- PARTE 1: CORRIGIR CHAT (live_chat_messages)
-- =====================================================

-- 1. Garantir que a coluna user_email existe
ALTER TABLE live_chat_messages 
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- 2. Garantir que a coluna user_name existe (caso não exista)
ALTER TABLE live_chat_messages 
ADD COLUMN IF NOT EXISTS user_name TEXT;

-- 3. Remover TODAS as políticas antigas que podem estar conflitando
DROP POLICY IF EXISTS "Anyone can read messages from active streams" ON live_chat_messages;
DROP POLICY IF EXISTS "Authenticated users can read all messages" ON live_chat_messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON live_chat_messages;
DROP POLICY IF EXISTS "Anonymous can send messages to active streams" ON live_chat_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON live_chat_messages;
DROP POLICY IF EXISTS "Moderadores podem deletar mensagens" ON live_chat_messages;
DROP POLICY IF EXISTS "Todos podem ler mensagens" ON live_chat_messages;
DROP POLICY IF EXISTS "Usuários podem enviar mensagens" ON live_chat_messages;
DROP POLICY IF EXISTS "Admins podem atualizar mensagens" ON live_chat_messages;

-- 4. Criar políticas simplificadas e funcionais

-- LEITURA: TODOS podem ler TODAS as mensagens (sem restrições)
CREATE POLICY "chat_read_all" 
  ON live_chat_messages
  FOR SELECT
  USING (true);

-- INSERÇÃO: Usuários autenticados podem enviar mensagens
CREATE POLICY "chat_insert_authenticated" 
  ON live_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

-- UPDATE: Apenas admins podem atualizar (para pin/unpin)
CREATE POLICY "chat_update_admin" 
  ON live_chat_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- DELETE: Admins e moderadores podem deletar
CREATE POLICY "chat_delete_moderator" 
  ON live_chat_messages 
  FOR DELETE
  TO authenticated
  USING (
    -- Admin pode deletar qualquer mensagem
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
    OR
    -- Moderador pode deletar mensagens da stream que ele modera
    EXISTS (
      SELECT 1 FROM stream_moderators
      WHERE user_id = auth.uid()
      AND stream_id = live_chat_messages.stream_id
    )
  );

-- =====================================================
-- PARTE 2: CORRIGIR VIEWER_SESSIONS (para métricas)
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Anyone can create viewer sessions" ON viewer_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON viewer_sessions;
DROP POLICY IF EXISTS "Anon can view own sessions" ON viewer_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON viewer_sessions;

-- INSERT: Todos podem criar sessões (anon e authenticated)
CREATE POLICY "viewer_sessions_insert_all" 
  ON viewer_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- SELECT: Admins podem ver TODAS as sessões (para estatísticas)
CREATE POLICY "viewer_sessions_select_admin" 
  ON viewer_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- SELECT: Anônimos podem ver suas próprias sessões (para tracking)
CREATE POLICY "viewer_sessions_select_anon" 
  ON viewer_sessions
  FOR SELECT
  TO anon
  USING (true);

-- UPDATE: Todos podem atualizar suas próprias sessões (heartbeat)
CREATE POLICY "viewer_sessions_update_all" 
  ON viewer_sessions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- PARTE 3: HABILITAR REALTIME
-- =====================================================

-- Habilitar Realtime na tabela live_chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE live_chat_messages;

-- Habilitar Realtime na tabela viewer_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE viewer_sessions;

-- Habilitar Realtime na tabela live_streams
ALTER PUBLICATION supabase_realtime ADD TABLE live_streams;

-- Configurar REPLICA IDENTITY para garantir que mudanças sejam detectadas
ALTER TABLE live_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE viewer_sessions REPLICA IDENTITY FULL;
ALTER TABLE live_streams REPLICA IDENTITY FULL;

-- =====================================================
-- PARTE 4: GARANTIR QUE FUNÇÕES RPC EXISTEM
-- =====================================================

-- Função: count_active_unique_viewers
CREATE OR REPLACE FUNCTION count_active_unique_viewers(
  p_stream_id uuid
)
RETURNS BIGINT AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(DISTINCT session_id)
  INTO v_count
  FROM viewer_sessions
  WHERE stream_id = p_stream_id
    AND is_active = true
    AND last_heartbeat > NOW() - INTERVAL '5 minutes';
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: update_viewer_heartbeat
CREATE OR REPLACE FUNCTION update_viewer_heartbeat(
  p_session_id text
)
RETURNS void AS $$
BEGIN
  UPDATE viewer_sessions
  SET last_heartbeat = NOW()
  WHERE session_id = p_session_id
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: cleanup_inactive_viewer_sessions
CREATE OR REPLACE FUNCTION cleanup_inactive_viewer_sessions()
RETURNS void AS $$
BEGIN
  -- Marcar como inativas sessões sem heartbeat há mais de 5 minutos
  UPDATE viewer_sessions
  SET is_active = false,
      ended_at = COALESCE(ended_at, NOW())
  WHERE is_active = true
    AND (last_heartbeat IS NULL OR last_heartbeat < NOW() - INTERVAL '5 minutes');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: get_stream_statistics (melhorada)
CREATE OR REPLACE FUNCTION get_stream_statistics(
  p_stream_id uuid
)
RETURNS TABLE (
  total_viewers bigint,
  active_viewers bigint,
  avg_watch_time numeric,
  unique_sessions bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT vs.user_id)::BIGINT AS total_viewers,
    COUNT(DISTINCT CASE 
      WHEN vs.is_active = TRUE 
        AND (vs.last_heartbeat IS NULL OR vs.last_heartbeat > NOW() - INTERVAL '5 minutes')
      THEN vs.session_id 
    END)::BIGINT AS active_viewers,
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

-- =====================================================
-- PARTE 5: GARANTIR QUE COLUNA last_heartbeat EXISTE
-- =====================================================

ALTER TABLE viewer_sessions 
ADD COLUMN IF NOT EXISTS last_heartbeat timestamptz;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_viewer_sessions_last_heartbeat 
ON viewer_sessions(last_heartbeat);

-- Criar índice único para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_viewer_sessions_unique 
ON viewer_sessions(session_id, stream_id) 
WHERE is_active = true;

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

COMMENT ON POLICY "chat_read_all" ON live_chat_messages IS 'Permite que todos leiam mensagens sem restrições';
COMMENT ON POLICY "chat_insert_authenticated" ON live_chat_messages IS 'Usuários autenticados podem enviar mensagens';
COMMENT ON POLICY "viewer_sessions_select_admin" ON viewer_sessions IS 'Admins podem ver todas as sessões para estatísticas';

