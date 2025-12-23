/*
  # Sistema de Enquetes (Polls) e Curtidas (Likes)
  
  1. Tabelas Criadas
    - `stream_polls` - Enquetes criadas pelo admin
    - `poll_votes` - Votos dos usuários nas enquetes
    - Campo `likes_count` adicionado em `live_chat_messages`
    - Tabela `message_likes` - Para rastrear quem curtiu cada mensagem
  
  2. Funcionalidades
    - Admin pode criar enquetes e fixá-las no chat
    - Usuários podem votar em enquetes (uma vez por enquete)
    - Todos podem curtir mensagens do chat
    - Resultados em tempo real via Realtime
*/

-- =====================================================
-- 1. TABELA DE ENQUETES (POLLS)
-- =====================================================
CREATE TABLE IF NOT EXISTS stream_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL, -- Array de opções: [{"id": 1, "text": "Opção 1"}, {"id": 2, "text": "Opção 2"}]
  is_active boolean DEFAULT true,
  is_pinned boolean DEFAULT false, -- Se está fixada no chat
  allow_multiple_votes boolean DEFAULT false, -- Se permite múltiplos votos (futuro)
  expires_at timestamptz, -- Data de expiração (opcional)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Garantir que só há uma enquete ativa fixada por stream
  CONSTRAINT unique_active_pinned_poll UNIQUE NULLS NOT DISTINCT (stream_id, is_pinned) 
    WHERE is_active = true AND is_pinned = true
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_stream_polls_stream_id ON stream_polls(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_polls_active ON stream_polls(stream_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_stream_polls_pinned ON stream_polls(stream_id, is_pinned) WHERE is_pinned = true;

-- Garantir que só há uma enquete ativa fixada por stream
CREATE UNIQUE INDEX IF NOT EXISTS unique_pinned_poll_per_stream 
ON stream_polls(stream_id) 
WHERE is_active = true AND is_pinned = true;

-- =====================================================
-- 2. TABELA DE VOTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES stream_polls(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL, -- NULL para usuários anônimos
  option_id integer NOT NULL, -- ID da opção escolhida
  session_id text, -- Para rastrear votos de usuários anônimos
  created_at timestamptz DEFAULT now(),
  
  -- Garantir que um usuário só vota uma vez por enquete (ou por sessão se anônimo)
  CONSTRAINT unique_user_vote_per_poll UNIQUE (poll_id, user_id) WHERE user_id IS NOT NULL,
  CONSTRAINT unique_session_vote_per_poll UNIQUE (poll_id, session_id) WHERE user_id IS NULL AND session_id IS NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON poll_votes(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_id ON poll_votes(poll_id, option_id);

-- =====================================================
-- 3. ADICIONAR CAMPO LIKES NAS MENSAGENS
-- =====================================================
ALTER TABLE live_chat_messages 
ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0;

-- Índice para ordenação por likes
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_likes ON live_chat_messages(stream_id, likes_count DESC, created_at DESC);

-- =====================================================
-- 4. TABELA DE CURTIDAS (PARA RASTREAR QUEM CURTIU)
-- =====================================================
CREATE TABLE IF NOT EXISTS message_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES live_chat_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL, -- NULL para usuários anônimos
  session_id text, -- Para rastrear curtidas de usuários anônimos
  created_at timestamptz DEFAULT now(),
  
  -- Garantir que um usuário só curte uma vez por mensagem
  CONSTRAINT unique_user_like_per_message UNIQUE (message_id, user_id) WHERE user_id IS NOT NULL,
  CONSTRAINT unique_session_like_per_message UNIQUE (message_id, session_id) WHERE user_id IS NULL AND session_id IS NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_message_likes_message_id ON message_likes(message_id);
CREATE INDEX IF NOT EXISTS idx_message_likes_user_id ON message_likes(user_id) WHERE user_id IS NOT NULL;

-- =====================================================
-- 5. FUNÇÕES RPC PARA GERENCIAR VOTOS E LIKES
-- =====================================================

-- Função para votar em uma enquete
CREATE OR REPLACE FUNCTION vote_on_poll(
  p_poll_id uuid,
  p_option_id integer,
  p_user_id uuid DEFAULT NULL,
  p_session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_poll stream_polls%ROWTYPE;
  v_vote_id uuid;
  v_result jsonb;
BEGIN
  -- Verificar se a enquete existe e está ativa
  SELECT * INTO v_poll FROM stream_polls WHERE id = p_poll_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Enquete não encontrada ou inativa');
  END IF;
  
  -- Verificar se já votou
  IF p_user_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM poll_votes WHERE poll_id = p_poll_id AND user_id = p_user_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Você já votou nesta enquete');
    END IF;
  ELSIF p_session_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM poll_votes WHERE poll_id = p_poll_id AND session_id = p_session_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Você já votou nesta enquete');
    END IF;
  END IF;
  
  -- Verificar se a opção existe
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_poll.options) AS opt 
    WHERE (opt->>'id')::integer = p_option_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Opção inválida');
  END IF;
  
  -- Inserir voto
  INSERT INTO poll_votes (poll_id, user_id, option_id, session_id)
  VALUES (p_poll_id, p_user_id, p_option_id, p_session_id)
  RETURNING id INTO v_vote_id;
  
  -- Retornar resultado com contagem atualizada
  SELECT jsonb_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'results', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'option_id', (opt->>'id')::integer,
          'text', opt->>'text',
          'votes', (
            SELECT COUNT(*)::integer 
            FROM poll_votes 
            WHERE poll_id = p_poll_id AND option_id = (opt->>'id')::integer
          )
        )
      )
      FROM jsonb_array_elements(v_poll.options) AS opt
    ),
    'total_votes', (SELECT COUNT(*)::integer FROM poll_votes WHERE poll_id = p_poll_id)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Função para curtir/descurtir uma mensagem
CREATE OR REPLACE FUNCTION toggle_message_like(
  p_message_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_like_exists boolean;
  v_likes_count integer;
  v_result jsonb;
BEGIN
  -- Verificar se já curtiu
  IF p_user_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM message_likes WHERE message_id = p_message_id AND user_id = p_user_id) INTO v_like_exists;
  ELSIF p_session_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM message_likes WHERE message_id = p_message_id AND session_id = p_session_id) INTO v_like_exists;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'user_id ou session_id é obrigatório');
  END IF;
  
  IF v_like_exists THEN
    -- Descurtir
    IF p_user_id IS NOT NULL THEN
      DELETE FROM message_likes WHERE message_id = p_message_id AND user_id = p_user_id;
    ELSE
      DELETE FROM message_likes WHERE message_id = p_message_id AND session_id = p_session_id;
    END IF;
  ELSE
    -- Curtir
    INSERT INTO message_likes (message_id, user_id, session_id)
    VALUES (p_message_id, p_user_id, p_session_id);
  END IF;
  
  -- Atualizar contador de likes na mensagem
  SELECT COUNT(*)::integer INTO v_likes_count 
  FROM message_likes 
  WHERE message_id = p_message_id;
  
  UPDATE live_chat_messages 
  SET likes_count = v_likes_count 
  WHERE id = p_message_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'liked', NOT v_like_exists,
    'likes_count', v_likes_count
  );
END;
$$;

-- Função para obter resultados de uma enquete
CREATE OR REPLACE FUNCTION get_poll_results(p_poll_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_poll stream_polls%ROWTYPE;
  v_result jsonb;
BEGIN
  SELECT * INTO v_poll FROM stream_polls WHERE id = p_poll_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Enquete não encontrada');
  END IF;
  
  SELECT jsonb_build_object(
    'success', true,
    'poll_id', p_poll_id,
    'question', v_poll.question,
    'results', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'option_id', (opt->>'id')::integer,
          'text', opt->>'text',
          'votes', (
            SELECT COUNT(*)::integer 
            FROM poll_votes 
            WHERE poll_id = p_poll_id AND option_id = (opt->>'id')::integer
          )
        )
      )
      FROM jsonb_array_elements(v_poll.options) AS opt
    ),
    'total_votes', (SELECT COUNT(*)::integer FROM poll_votes WHERE poll_id = p_poll_id)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Função para verificar se usuário já votou
CREATE OR REPLACE FUNCTION has_user_voted(
  p_poll_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_session_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_user_id IS NOT NULL THEN
    RETURN EXISTS(SELECT 1 FROM poll_votes WHERE poll_id = p_poll_id AND user_id = p_user_id);
  ELSIF p_session_id IS NOT NULL THEN
    RETURN EXISTS(SELECT 1 FROM poll_votes WHERE poll_id = p_poll_id AND session_id = p_session_id);
  END IF;
  RETURN false;
END;
$$;

-- Função para verificar se usuário já curtiu
CREATE OR REPLACE FUNCTION has_user_liked(
  p_message_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_session_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_user_id IS NOT NULL THEN
    RETURN EXISTS(SELECT 1 FROM message_likes WHERE message_id = p_message_id AND user_id = p_user_id);
  ELSIF p_session_id IS NOT NULL THEN
    RETURN EXISTS(SELECT 1 FROM message_likes WHERE message_id = p_message_id AND session_id = p_session_id);
  END IF;
  RETURN false;
END;
$$;

-- =====================================================
-- 6. HABILITAR RLS
-- =====================================================
ALTER TABLE stream_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_likes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. POLÍTICAS RLS
-- =====================================================

-- Enquetes: Todos podem ler enquetes ativas
CREATE POLICY "Anyone can read active polls" ON stream_polls
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Enquetes: Apenas admins podem criar/editar
CREATE POLICY "Admins can manage polls" ON stream_polls
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- Votos: Todos podem ler votos
CREATE POLICY "Anyone can read votes" ON poll_votes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Votos: Todos podem votar (via RPC)
CREATE POLICY "Anyone can vote" ON poll_votes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Curtidas: Todos podem ler curtidas
CREATE POLICY "Anyone can read likes" ON message_likes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Curtidas: Todos podem curtir
CREATE POLICY "Anyone can like messages" ON message_likes
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 8. HABILITAR REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE stream_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE message_likes;

-- Configurar REPLICA IDENTITY para Realtime
ALTER TABLE stream_polls REPLICA IDENTITY FULL;
ALTER TABLE poll_votes REPLICA IDENTITY FULL;
ALTER TABLE message_likes REPLICA IDENTITY FULL;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION vote_on_poll(uuid, integer, uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION toggle_message_like(uuid, uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_poll_results(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION has_user_voted(uuid, uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION has_user_liked(uuid, uuid, text) TO anon, authenticated, service_role;

