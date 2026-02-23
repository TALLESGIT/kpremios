-- =====================================================
-- CORREÇÃO COMPLETA: Chat e Realtime
-- =====================================================

-- 1. Garantir que a coluna user_email existe
ALTER TABLE live_chat_messages 
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- 2. Remover políticas antigas que podem estar conflitando
DROP POLICY IF EXISTS "Anyone can read messages from active streams" ON live_chat_messages;
DROP POLICY IF EXISTS "Authenticated users can read all messages" ON live_chat_messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON live_chat_messages;
DROP POLICY IF EXISTS "Anonymous can send messages to active streams" ON live_chat_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON live_chat_messages;
DROP POLICY IF EXISTS "Moderadores podem deletar mensagens" ON live_chat_messages;

-- 3. Criar políticas simplificadas e funcionais

-- LEITURA: Todos podem ler TODAS as mensagens (sem restrição de is_active)
CREATE POLICY "Todos podem ler mensagens" 
  ON live_chat_messages
  FOR SELECT
  USING (true);

-- INSERÇÃO: Usuários autenticados podem enviar mensagens
CREATE POLICY "Usuários podem enviar mensagens" 
  ON live_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

-- DELETE: Admins e moderadores podem deletar
CREATE POLICY "Moderadores podem deletar mensagens" 
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
    is_moderator(auth.uid(), stream_id)
  );

-- UPDATE: Apenas admins podem atualizar (para pin/unpin)
CREATE POLICY "Admins podem atualizar mensagens" 
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

-- =====================================================
-- HABILITAR REALTIME NA TABELA
-- =====================================================

-- Realtime já está habilitado! (a tabela já está na publicação)
-- Nenhuma ação necessária

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON POLICY "Todos podem ler mensagens" ON live_chat_messages IS 'Permite que todos leiam mensagens sem restrições';
COMMENT ON POLICY "Usuários podem enviar mensagens" ON live_chat_messages IS 'Usuários autenticados podem enviar mensagens';
COMMENT ON POLICY "Moderadores podem deletar mensagens" ON live_chat_messages IS 'Admins e moderadores podem deletar mensagens';
COMMENT ON POLICY "Admins podem atualizar mensagens" ON live_chat_messages IS 'Apenas admins podem atualizar mensagens (pin/unpin)';
