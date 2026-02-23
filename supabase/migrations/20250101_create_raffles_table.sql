/*
  # Criar tabela raffles (Rifas)

  1. Nova Tabela
    - `raffles` - Sistema de rifas múltiplas
    
  2. Campos
    - id (uuid, PK)
    - title (text) - Título da rifa
    - description (text) - Descrição da rifa
    - prize (text) - Descrição do prêmio
    - prize_image (text) - URL da imagem do prêmio
    - start_date (timestamptz) - Data de início
    - end_date (timestamptz) - Data de término
    - max_numbers (integer) - Número máximo de participantes
    - price_per_number (decimal) - Preço por número
    - status (text) - Status: 'active', 'finished', 'cancelled'
    - winner_id (uuid) - ID do vencedor
    - winning_number (integer) - Número vencedor
    - finished_at (timestamptz) - Data de finalização
    - created_by (uuid) - Criador da rifa
    - created_at (timestamptz) - Data de criação
    - updated_at (timestamptz) - Data de atualização

  3. Segurança
    - RLS habilitado
    - Políticas para leitura pública
    - Apenas admins podem criar/editar
*/

-- Criar tabela raffles
CREATE TABLE IF NOT EXISTS raffles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  prize text NOT NULL,
  prize_image text,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  max_numbers integer DEFAULT 1000,
  price_per_number decimal(10,2) DEFAULT 10.00,
  status text DEFAULT 'active' CHECK (status IN ('active', 'finished', 'cancelled')),
  winner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  winning_number integer,
  finished_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE raffles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS

-- Todos podem ler rifas ativas
CREATE POLICY "Anyone can read active raffles" ON raffles
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active' OR status = 'finished');

-- Usuários autenticados podem ler todas as rifas
CREATE POLICY "Authenticated users can read all raffles" ON raffles
  FOR SELECT
  TO authenticated
  USING (true);

-- Apenas admins podem criar rifas
CREATE POLICY "Admins can create raffles" ON raffles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Apenas admins podem atualizar rifas
CREATE POLICY "Admins can update raffles" ON raffles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Apenas admins podem deletar rifas
CREATE POLICY "Admins can delete raffles" ON raffles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_raffles_updated_at 
  BEFORE UPDATE ON raffles 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_raffles_status ON raffles(status);
CREATE INDEX idx_raffles_created_by ON raffles(created_by);
CREATE INDEX idx_raffles_start_date ON raffles(start_date);
CREATE INDEX idx_raffles_end_date ON raffles(end_date);

