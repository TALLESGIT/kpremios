-- =====================================================
-- 🚀 CONSOLIDADO: CORREÇÃO COMPLETA (CHAT, VIEWERS E BANNERS)
-- =====================================================

-- -----------------------------------------------------
-- 1. CHAT E REALTIME
-- -----------------------------------------------------

-- Garantir que a coluna user_email existe
ALTER TABLE live_chat_messages 
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Anyone can read messages from active streams" ON live_chat_messages;
DROP POLICY IF EXISTS "Authenticated users can read all messages" ON live_chat_messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON live_chat_messages;
DROP POLICY IF EXISTS "Anonymous can send messages to active streams" ON live_chat_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON live_chat_messages;
DROP POLICY IF EXISTS "Moderadores podem deletar mensagens" ON live_chat_messages;
DROP POLICY IF EXISTS "Todos podem ler mensagens" ON live_chat_messages;
DROP POLICY IF EXISTS "Usuários podem enviar mensagens" ON live_chat_messages;
DROP POLICY IF EXISTS "Admins podem atualizar mensagens" ON live_chat_messages;

-- Criar políticas simplificadas
CREATE POLICY "Todos podem ler mensagens" ON live_chat_messages FOR SELECT USING (true);

CREATE POLICY "Usuários podem enviar mensagens" ON live_chat_messages FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Moderadores podem deletar mensagens" ON live_chat_messages FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  OR is_moderator(auth.uid(), stream_id)
);

CREATE POLICY "Admins podem atualizar mensagens" ON live_chat_messages FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));

-- -----------------------------------------------------
-- 2. VIEWERS (HEARTBEAT)
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION update_viewer_heartbeat(p_session_id text)
RETURNS void AS $$
BEGIN
  UPDATE viewer_sessions SET last_heartbeat = NOW()
  WHERE session_id = p_session_id AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION count_active_unique_viewers(p_stream_id uuid)
RETURNS BIGINT AS $$
DECLARE v_count BIGINT;
BEGIN
  SELECT COUNT(DISTINCT session_id) INTO v_count FROM viewer_sessions
  WHERE stream_id = p_stream_id AND is_active = true
    AND last_heartbeat > NOW() - INTERVAL '30 seconds';
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------
-- 3. BANNERS (STORAGE E CLICKS)
-- -----------------------------------------------------

-- Criar bucket de banners
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('banners', 'banners', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Políticas de Storage
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage banners" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'banners');

CREATE POLICY "Admins can manage banners" ON storage.objects FOR ALL 
USING (
  bucket_id = 'banners' 
  AND (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true))
);

-- Função de incremento de cliques
CREATE OR REPLACE FUNCTION increment_advertisement_clicks(ad_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE advertisements
  SET click_count = COALESCE(click_count, 0) + 1, updated_at = NOW()
  WHERE id = ad_id;
END;
$$;

-- -----------------------------------------------------
-- ✅ FIM DO SCRIPT
-- -----------------------------------------------------
