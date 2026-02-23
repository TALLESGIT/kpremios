/*
  # Criar tabela live_chat_messages (Chat da Transmissão)

  1. Nova Tabela
    - `live_chat_messages` - Mensagens do chat em tempo real
    
  2. Campos
    - id (uuid, PK)
    - stream_id (uuid) - ID da transmissão
    - user_id (uuid) - Quem enviou (opcional, pode ser anônimo)
    - user_name (text) - Nome do usuário
    - message (text) - Conteúdo da mensagem
    - is_admin (boolean) - Se é mensagem do admin
    - is_system (boolean) - Se é mensagem do sistema
    - created_at (timestamptz) - Data de envio

  3. Segurança
    - RLS habilitado
    - Todos podem ler mensagens de streams ativas
    - Usuários autenticados podem enviar
    - Admins podem deletar
*/

-- Criar tabela live_chat_messages
CREATE TABLE IF NOT EXISTS live_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  user_name text NOT NULL,
  message text NOT NULL,
  is_admin boolean DEFAULT false,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE live_chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS

-- Todos podem ler mensagens de streams ativas
CREATE POLICY "Anyone can read messages from active streams" ON live_chat_messages
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM live_streams
      WHERE live_streams.id = live_chat_messages.stream_id
      AND live_streams.is_active = true
    )
  );

-- Usuários autenticados podem ler todas as mensagens
CREATE POLICY "Authenticated users can read all messages" ON live_chat_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- Usuários autenticados podem enviar mensagens
CREATE POLICY "Authenticated users can send messages" ON live_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM live_streams
      WHERE live_streams.id = live_chat_messages.stream_id
      AND live_streams.is_active = true
    )
  );

-- Permitir mensagens anônimas (sem user_id) para streams ativas
CREATE POLICY "Anonymous can send messages to active streams" ON live_chat_messages
  FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL AND
    EXISTS (
      SELECT 1 FROM live_streams
      WHERE live_streams.id = live_chat_messages.stream_id
      AND live_streams.is_active = true
    )
  );

-- Admins podem deletar mensagens
CREATE POLICY "Admins can delete messages" ON live_chat_messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Índices para performance
CREATE INDEX idx_live_chat_messages_stream_id ON live_chat_messages(stream_id);
CREATE INDEX idx_live_chat_messages_created_at ON live_chat_messages(created_at);
CREATE INDEX idx_live_chat_messages_user_id ON live_chat_messages(user_id);

-- Função para criar mensagem do sistema
CREATE OR REPLACE FUNCTION create_system_message(
  p_stream_id uuid,
  p_message text
) RETURNS uuid AS $$
DECLARE
  v_message_id uuid;
BEGIN
  INSERT INTO live_chat_messages (
    stream_id,
    user_name,
    message,
    is_system,
    is_admin
  ) VALUES (
    p_stream_id,
    'Sistema',
    p_message,
    true,
    false
  ) RETURNING id INTO v_message_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;

