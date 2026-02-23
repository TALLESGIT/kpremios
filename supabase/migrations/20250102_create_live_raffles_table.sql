/*
  # Criar tabela live_raffles (Rifas ao Vivo)

  1. Nova Tabela
    - `live_raffles` - Sistema de rifas ao vivo com eliminação em tempo real
    
  2. Campos
    - id (uuid, PK)
    - title (text) - Título da rifa
    - description (text) - Descrição
    - admin_id (uuid) - ID do administrador
    - max_participants (integer) - Máximo de participantes
    - is_active (boolean) - Se está ativa
    - participants (jsonb) - Array de participantes
    - current_round (integer) - Rodada atual
    - elimination_interval (integer) - Intervalo entre eliminações (segundos)
    - winner (jsonb) - Dados do vencedor
    - created_at (timestamptz) - Data de criação

  3. Segurança
    - RLS habilitado
    - Usuários autenticados podem ler
    - Apenas admins podem criar/gerenciar
*/

-- Criar tabela live_raffles
CREATE TABLE IF NOT EXISTS live_raffles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  admin_id uuid REFERENCES users(id) ON DELETE CASCADE,
  max_participants integer DEFAULT 100,
  is_active boolean DEFAULT false,
  participants jsonb DEFAULT '[]'::jsonb,
  current_round integer DEFAULT 0,
  elimination_interval integer DEFAULT 30,
  winner jsonb,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE live_raffles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS

-- Todos os usuários autenticados podem ler live raffles
CREATE POLICY "Authenticated users can read live raffles" ON live_raffles
  FOR SELECT
  TO authenticated
  USING (true);

-- Usuários autenticados podem criar live raffles
CREATE POLICY "Authenticated users can create live raffles" ON live_raffles
  FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid());

-- Apenas o admin criador ou admins gerais podem atualizar
CREATE POLICY "Admins can update live raffles" ON live_raffles
  FOR UPDATE
  TO authenticated
  USING (
    admin_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Apenas o admin criador ou admins gerais podem deletar
CREATE POLICY "Admins can delete live raffles" ON live_raffles
  FOR DELETE
  TO authenticated
  USING (
    admin_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Índices para performance
CREATE INDEX idx_live_raffles_admin_id ON live_raffles(admin_id);
CREATE INDEX idx_live_raffles_is_active ON live_raffles(is_active);
CREATE INDEX idx_live_raffles_created_at ON live_raffles(created_at);

