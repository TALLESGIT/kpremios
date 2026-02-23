/*
  # Criar tabela live_streams (Transmissões ao Vivo)

  1. Nova Tabela
    - `live_streams` - Sistema de transmissão de vídeo ao vivo
    
  2. Campos
    - id (uuid, PK)
    - title (text) - Título da transmissão
    - description (text) - Descrição
    - channel_name (text) - Nome do canal (único)
    - is_active (boolean) - Se está transmitindo
    - created_by (uuid) - Quem criou
    - viewer_count (integer) - Contador de visualizações
    - created_at (timestamptz) - Data de criação
    - updated_at (timestamptz) - Última atualização

  3. Segurança
    - RLS habilitado
    - Admins podem criar/gerenciar
    - Público pode ver transmissões ativas
*/

-- Criar tabela live_streams
CREATE TABLE IF NOT EXISTS live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  channel_name text UNIQUE NOT NULL,
  is_active boolean DEFAULT false,
  created_by uuid REFERENCES users(id) ON DELETE CASCADE,
  viewer_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;

-- Políticas RLS

-- Todos podem ver transmissões ativas
CREATE POLICY "Anyone can view active streams" ON live_streams
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Usuários autenticados podem ver todas as transmissões
CREATE POLICY "Authenticated users can view all streams" ON live_streams
  FOR SELECT
  TO authenticated
  USING (true);

-- Apenas admins podem criar transmissões
CREATE POLICY "Admins can create streams" ON live_streams
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Apenas o criador ou admins podem atualizar
CREATE POLICY "Admins can update streams" ON live_streams
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Apenas o criador ou admins podem deletar
CREATE POLICY "Admins can delete streams" ON live_streams
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_live_streams_updated_at 
  BEFORE UPDATE ON live_streams 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_live_streams_channel_name ON live_streams(channel_name);
CREATE INDEX idx_live_streams_is_active ON live_streams(is_active);
CREATE INDEX idx_live_streams_created_by ON live_streams(created_by);

