-- migração para corrigir acesso de administradores

-- 1. Garantir que a tabela stream_moderators existe (com campos baseados no uso no frontend)
CREATE TABLE IF NOT EXISTS stream_moderators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  stream_id uuid REFERENCES live_streams(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, stream_id)
);

-- 2. Habilitar RLS em stream_moderators
ALTER TABLE stream_moderators ENABLE ROW LEVEL SECURITY;

-- 3. Função auxiliar para verificar se o usuário é admin
-- Verifica em ambas as tabelas (users e profiles) para garantir cobertura total
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE id = user_id AND is_admin = true
  ) OR EXISTS (
    SELECT 1 FROM profiles WHERE id = user_id AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Corrigir Políticas de RLS para stream_moderators
DROP POLICY IF EXISTS "Admins can view moderators" ON stream_moderators;
CREATE POLICY "Admins can view moderators" ON stream_moderators
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS "Admins can manage moderators" ON stream_moderators;
CREATE POLICY "Admins can manage moderators" ON stream_moderators
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 5. Corrigir Políticas de RLS para viewer_sessions (para que admins vejam todos os participantes)
DROP POLICY IF EXISTS "Admins can view all sessions" ON viewer_sessions;
CREATE POLICY "Admins can view all sessions" ON viewer_sessions
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR user_id = auth.uid());

-- 6. Corrigir Políticas de RLS para live_chat_messages (para que admins gerenciem)
DROP POLICY IF EXISTS "Admins can manage messages" ON live_chat_messages;
CREATE POLICY "Admins can manage messages" ON live_chat_messages
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 7. Corrigir Políticas de RLS para live_streams
DROP POLICY IF EXISTS "Admins can manage streams" ON live_streams;
CREATE POLICY "Admins can manage streams" ON live_streams
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 8. Garantir que todos podem ver os usuários básicos (para o join de nomes e emails)
DROP POLICY IF EXISTS "Anyone can see basic user info" ON users;
CREATE POLICY "Anyone can see basic user info" ON users
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can see basic profile info" ON profiles;
CREATE POLICY "Anyone can see basic profile info" ON profiles
  FOR SELECT TO authenticated
  USING (true);
