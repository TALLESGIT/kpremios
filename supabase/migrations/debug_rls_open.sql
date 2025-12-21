-- =====================================================
-- POLÍTICA RLS ULTRA SIMPLIFICADA - DEBUG
-- =====================================================

-- Remover TODAS as políticas
DROP POLICY IF EXISTS "Todos podem ler mensagens" ON live_chat_messages;
DROP POLICY IF EXISTS "Usuários podem enviar mensagens" ON live_chat_messages;
DROP POLICY IF EXISTS "Moderadores podem deletar mensagens" ON live_chat_messages;
DROP POLICY IF EXISTS "Admins podem atualizar mensagens" ON live_chat_messages;

-- TEMPORÁRIO: Liberar TUDO para debug
CREATE POLICY "Liberar tudo temporariamente"
  ON live_chat_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verificar se RLS está ativo
SELECT 
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables 
WHERE tablename = 'live_chat_messages';

-- Ver todas as políticas
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'live_chat_messages';
