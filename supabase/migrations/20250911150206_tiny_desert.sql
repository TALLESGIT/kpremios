/*
  # Sistema de Rifas ZK Premios

  1. Tabelas Criadas
    - `users` - Usuários do sistema
    - `numbers` - Números da rifa (1-1000)
    - `extra_number_requests` - Solicitações de números extras
    - `draw_results` - Resultados dos sorteios
    - `audit_logs` - Logs de auditoria

  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas para usuários autenticados
    - Políticas específicas para admins
*/

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  whatsapp text NOT NULL,
  free_number integer,
  extra_numbers integer[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de números (1-1000)
CREATE TABLE IF NOT EXISTS numbers (
  number integer PRIMARY KEY CHECK (number >= 1 AND number <= 1000),
  is_available boolean DEFAULT true,
  selected_by uuid REFERENCES users(id) ON DELETE SET NULL,
  is_free boolean DEFAULT false,
  assigned_at timestamptz
);

-- Criar tabela de solicitações de números extras
CREATE TABLE IF NOT EXISTS extra_number_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_amount decimal(10,2) NOT NULL CHECK (payment_amount >= 10.00),
  requested_quantity integer NOT NULL CHECK (requested_quantity > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  payment_proof_url text,
  admin_notes text,
  assigned_numbers integer[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamptz
);

-- Criar tabela de resultados dos sorteios
CREATE TABLE IF NOT EXISTS draw_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winning_number integer NOT NULL,
  winner_id uuid REFERENCES users(id),
  prize_amount decimal(10,2) DEFAULT 10000.00,
  draw_date timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Criar tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  table_name text,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- Inserir todos os números de 1 a 1000
INSERT INTO numbers (number)
SELECT generate_series(1, 1000)
ON CONFLICT (number) DO NOTHING;

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_number_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para tabela users
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Anyone can insert users" ON users
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Políticas para tabela numbers
CREATE POLICY "Anyone can read numbers" ON numbers
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can update numbers" ON numbers
  FOR UPDATE TO authenticated
  USING (true);

-- Políticas para extra_number_requests
CREATE POLICY "Users can read own requests" ON extra_number_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create requests" ON extra_number_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all requests" ON extra_number_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'admin@zkpremios.com'
    )
  );

CREATE POLICY "Admins can update requests" ON extra_number_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'admin@zkpremios.com'
    )
  );

-- Políticas para draw_results
CREATE POLICY "Anyone can read draw results" ON draw_results
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage draws" ON draw_results
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'admin@zkpremios.com'
    )
  );

-- Políticas para audit_logs
CREATE POLICY "Admins can read audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'admin@zkpremios.com'
    )
  );

-- Funções para triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_extra_requests_updated_at BEFORE UPDATE ON extra_number_requests 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Função para atribuir números extras aleatórios
CREATE OR REPLACE FUNCTION assign_random_extra_numbers(
  request_id uuid,
  quantity integer
) RETURNS integer[] AS $$
DECLARE
  available_numbers integer[];
  assigned_numbers integer[];
  random_numbers integer[];
BEGIN
  -- Buscar números disponíveis
  SELECT ARRAY(
    SELECT number FROM numbers 
    WHERE is_available = true 
    ORDER BY random() 
    LIMIT quantity
  ) INTO available_numbers;
  
  -- Se não há números suficientes disponíveis
  IF array_length(available_numbers, 1) < quantity THEN
    RETURN NULL;
  END IF;
  
  -- Marcar números como não disponíveis
  UPDATE numbers 
  SET is_available = false, 
      assigned_at = now(),
      selected_by = (SELECT user_id FROM extra_number_requests WHERE id = request_id)
  WHERE number = ANY(available_numbers);
  
  -- Atualizar a solicitação com os números atribuídos
  UPDATE extra_number_requests 
  SET assigned_numbers = available_numbers
  WHERE id = request_id;
  
  -- Atualizar usuário com números extras
  UPDATE users 
  SET extra_numbers = array_cat(COALESCE(extra_numbers, '{}'), available_numbers)
  WHERE id = (SELECT user_id FROM extra_number_requests WHERE id = request_id);
  
  RETURN available_numbers;
END;
$$ LANGUAGE plpgsql;