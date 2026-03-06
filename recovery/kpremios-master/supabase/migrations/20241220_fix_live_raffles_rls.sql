-- Corrigir políticas RLS para live_raffles
-- Primeiro, remover políticas existentes se houver
DROP POLICY IF EXISTS "Permitir leitura para todos os usuários autenticados" ON live_raffles;
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON live_raffles;
DROP POLICY IF EXISTS "Permitir atualização para admin do sorteio" ON live_raffles;

-- Recriar políticas mais permissivas para permitir operações básicas
CREATE POLICY "Permitir leitura para todos os usuários autenticados" ON live_raffles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Permitir inserção para usuários autenticados" ON live_raffles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir atualização para usuários autenticados" ON live_raffles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Garantir que RLS está habilitado
ALTER TABLE live_raffles ENABLE ROW LEVEL SECURITY;
