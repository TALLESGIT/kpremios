-- Migration: Sistema de Moderação do Chat
-- Criado em: 2025-12-20

-- 1. Criar tabela de bans
CREATE TABLE IF NOT EXISTS chat_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stream_id uuid NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  banned_by uuid NOT NULL REFERENCES users(id),
  reason text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, stream_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_chat_bans_user_stream ON chat_bans(user_id, stream_id);
CREATE INDEX IF NOT EXISTS idx_chat_bans_expires ON chat_bans(expires_at) WHERE expires_at IS NOT NULL;

-- 2. Adicionar campos de moderação em live_streams
ALTER TABLE live_streams 
ADD COLUMN IF NOT EXISTS slow_mode_seconds integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS moderators_only_mode boolean DEFAULT false;

-- 3. RPC: Verificar se usuário está banido
CREATE OR REPLACE FUNCTION is_user_banned(p_user_id uuid, p_stream_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM chat_bans
    WHERE user_id = p_user_id 
    AND stream_id = p_stream_id
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: Verificar se usuário é moderador ou admin
CREATE OR REPLACE FUNCTION is_moderator(p_user_id uuid, p_stream_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM stream_moderators
    WHERE user_id = p_user_id AND stream_id = p_stream_id
  ) OR EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: Banir usuário
CREATE OR REPLACE FUNCTION ban_user(
  p_user_id uuid,
  p_stream_id uuid,
  p_banned_by uuid,
  p_duration_minutes integer DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_expires_at timestamptz;
BEGIN
  -- Verificar se quem está banindo é moderador ou admin
  IF NOT is_moderator(p_banned_by, p_stream_id) THEN
    RAISE EXCEPTION 'Apenas moderadores podem banir usuários';
  END IF;

  -- Calcular data de expiração
  IF p_duration_minutes IS NOT NULL THEN
    v_expires_at := now() + (p_duration_minutes || ' minutes')::interval;
  END IF;

  -- Inserir ou atualizar ban
  INSERT INTO chat_bans (user_id, stream_id, banned_by, expires_at, reason)
  VALUES (p_user_id, p_stream_id, p_banned_by, v_expires_at, p_reason)
  ON CONFLICT (user_id, stream_id) 
  DO UPDATE SET 
    banned_by = EXCLUDED.banned_by,
    expires_at = EXCLUDED.expires_at,
    reason = EXCLUDED.reason,
    created_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: Verificar se usuário pode enviar mensagem (slow mode)
CREATE OR REPLACE FUNCTION can_send_message(p_user_id uuid, p_stream_id uuid)
RETURNS json AS $$
DECLARE
  v_slow_mode_seconds integer;
  v_last_message_at timestamptz;
  v_seconds_remaining integer;
BEGIN
  -- Verificar se está banido
  IF is_user_banned(p_user_id, p_stream_id) THEN
    RETURN json_build_object(
      'can_send', false,
      'reason', 'banned',
      'message', 'Você foi silenciado temporariamente'
    );
  END IF;

  -- Verificar slow mode
  SELECT slow_mode_seconds INTO v_slow_mode_seconds
  FROM live_streams
  WHERE id = p_stream_id;

  IF v_slow_mode_seconds > 0 THEN
    -- Buscar última mensagem
    SELECT created_at INTO v_last_message_at
    FROM live_chat_messages
    WHERE user_id = p_user_id AND stream_id = p_stream_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_last_message_at IS NOT NULL THEN
      v_seconds_remaining := v_slow_mode_seconds - EXTRACT(EPOCH FROM (now() - v_last_message_at))::integer;
      
      IF v_seconds_remaining > 0 THEN
        RETURN json_build_object(
          'can_send', false,
          'reason', 'slow_mode',
          'seconds_remaining', v_seconds_remaining,
          'message', 'Aguarde ' || v_seconds_remaining || ' segundos'
        );
      END IF;
    END IF;
  END IF;

  RETURN json_build_object('can_send', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS Policies
ALTER TABLE chat_bans ENABLE ROW LEVEL SECURITY;

-- Moderadores e admins podem ver todos os bans
CREATE POLICY "Moderadores podem ver bans"
  ON chat_bans FOR SELECT
  USING (
    is_moderator(auth.uid(), stream_id)
  );

-- Moderadores e admins podem criar/atualizar bans
CREATE POLICY "Moderadores podem gerenciar bans"
  ON chat_bans FOR ALL
  USING (
    is_moderator(auth.uid(), stream_id)
  );

-- 8. RLS para deletar mensagens (moderadores)
DROP POLICY IF EXISTS "Moderadores podem deletar mensagens" ON live_chat_messages;
CREATE POLICY "Moderadores podem deletar mensagens"
  ON live_chat_messages FOR DELETE
  USING (
    is_moderator(auth.uid(), stream_id)
  );

-- 9. Função para limpar bans expirados (executar periodicamente)
CREATE OR REPLACE FUNCTION cleanup_expired_bans()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_bans
  WHERE expires_at IS NOT NULL 
  AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
COMMENT ON TABLE chat_bans IS 'Usuários banidos temporária ou permanentemente do chat';
COMMENT ON COLUMN chat_bans.expires_at IS 'NULL = ban permanente, caso contrário = data/hora de expiração';
COMMENT ON FUNCTION is_user_banned IS 'Verifica se usuário está banido (incluindo bans temporários não expirados)';
COMMENT ON FUNCTION is_moderator IS 'Verifica se usuário é moderador ou admin de uma stream';
COMMENT ON FUNCTION ban_user IS 'Bane usuário por X minutos (NULL = permanente)';
COMMENT ON FUNCTION can_send_message IS 'Verifica se usuário pode enviar mensagem (bans + slow mode)';
