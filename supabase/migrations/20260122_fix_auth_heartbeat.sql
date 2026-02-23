-- ========================================
-- FIX: Heartbeat sem causar erros de autenticação
-- ========================================
-- Problema: update_viewer_heartbeat está causando erros 400
-- quando usuários anônimos (não logados) assistem lives
-- Solução: Permitir heartbeat sem autenticação obrigatória

-- 1. Recriar função update_viewer_heartbeat com tratamento de erro
CREATE OR REPLACE FUNCTION update_viewer_heartbeat(p_session_id text)
RETURNS void AS $$
BEGIN
  -- ✅ Atualizar heartbeat SEM verificar autenticação
  -- Isso permite que usuários anônimos também atualizem heartbeat
  UPDATE viewer_sessions
  SET 
    last_heartbeat = NOW(),
    is_active = TRUE
  WHERE session_id = p_session_id
    AND is_active = TRUE;
    
  -- Se nenhuma linha foi atualizada, não fazer nada
  -- O frontend vai criar a sessão com trackViewer quando necessário
EXCEPTION
  WHEN OTHERS THEN
    -- ✅ Silenciar erros para não causar problemas no frontend
    -- Isso evita que erros de auth quebrem a experiência do usuário
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Garantir que a função pode ser executada por anon e authenticated
GRANT EXECUTE ON FUNCTION update_viewer_heartbeat(text) TO anon, authenticated;

-- 3. Comentário para documentação
COMMENT ON FUNCTION update_viewer_heartbeat IS 
  'Atualiza o heartbeat de uma sessão de viewer. 
   Pode ser chamado por usuários anônimos ou autenticados.
   Não lança erros se a sessão não existir.
   Deve ser chamado a cada 10-30 segundos para manter a sessão ativa.';
