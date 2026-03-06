-- Criar tabela de bolões de resultados de partidas
CREATE TABLE IF NOT EXISTS match_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  match_title TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false, -- Bolão ativo para apostas
  result_home_score INTEGER, -- Resultado real (preenchido pelo admin)
  result_away_score INTEGER, -- Resultado real (preenchido pelo admin)
  total_participants INTEGER DEFAULT 0,
  total_pool_amount NUMERIC(10, 2) DEFAULT 0.00, -- Total arrecadado (R$ 2,00 por aposta)
  winners_count INTEGER DEFAULT 0, -- Quantidade de ganhadores
  prize_per_winner NUMERIC(10, 2) DEFAULT 0.00, -- Prêmio dividido por ganhador
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de apostas do bolão
CREATE TABLE IF NOT EXISTS pool_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES match_pools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  predicted_home_score INTEGER NOT NULL CHECK (predicted_home_score >= 0),
  predicted_away_score INTEGER NOT NULL CHECK (predicted_away_score >= 0),
  payment_id TEXT, -- ID do pagamento Mercado Pago
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'failed', 'cancelled')),
  is_winner BOOLEAN DEFAULT false, -- Calculado após resultado
  prize_amount NUMERIC(10, 2) DEFAULT 0.00, -- Valor do prêmio se ganhou
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Garantir que um usuário só pode apostar uma vez por bolão
  UNIQUE(pool_id, user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_match_pools_live_stream ON match_pools(live_stream_id);
CREATE INDEX IF NOT EXISTS idx_match_pools_active ON match_pools(is_active);
CREATE INDEX IF NOT EXISTS idx_pool_bets_pool ON pool_bets(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_bets_user ON pool_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_pool_bets_payment ON pool_bets(payment_status);
CREATE INDEX IF NOT EXISTS idx_pool_bets_winner ON pool_bets(is_winner);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_match_pools_updated_at
  BEFORE UPDATE ON match_pools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pool_bets_updated_at
  BEFORE UPDATE ON pool_bets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função RPC para calcular ganhadores após resultado
CREATE OR REPLACE FUNCTION calculate_pool_winners(p_pool_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result_home INTEGER;
  v_result_away INTEGER;
  v_winners_count INTEGER;
  v_total_amount NUMERIC;
  v_prize_per_winner NUMERIC;
BEGIN
  -- Buscar resultado real
  SELECT result_home_score, result_away_score, total_pool_amount
  INTO v_result_home, v_result_away, v_total_amount
  FROM match_pools
  WHERE id = p_pool_id;

  IF v_result_home IS NULL OR v_result_away IS NULL THEN
    RAISE EXCEPTION 'Resultado do jogo ainda não foi definido';
  END IF;

  -- Marcar apostas vencedoras (placar exato)
  UPDATE pool_bets
  SET is_winner = true
  WHERE pool_id = p_pool_id
    AND payment_status = 'approved'
    AND predicted_home_score = v_result_home
    AND predicted_away_score = v_result_away;

  -- Contar ganhadores
  SELECT COUNT(*) INTO v_winners_count
  FROM pool_bets
  WHERE pool_id = p_pool_id AND is_winner = true;

  -- Calcular prêmio por ganhador
  IF v_winners_count > 0 THEN
    v_prize_per_winner := v_total_amount / v_winners_count;
    
    -- Atualizar valor do prêmio para cada ganhador
    UPDATE pool_bets
    SET prize_amount = v_prize_per_winner
    WHERE pool_id = p_pool_id AND is_winner = true;
  ELSE
    v_prize_per_winner := 0.00;
  END IF;

  -- Atualizar tabela match_pools
  -- ✅ NOVO: Definir result_set_at se ainda não foi definido (garante que sempre teremos a data quando houver resultado)
  UPDATE match_pools
  SET winners_count = v_winners_count,
      prize_per_winner = v_prize_per_winner,
      result_set_at = COALESCE(result_set_at, NOW()) -- Define result_set_at se ainda não foi definido
  WHERE id = p_pool_id;

  -- Retornar estatísticas
  RETURN json_build_object(
    'winners_count', v_winners_count,
    'total_amount', v_total_amount,
    'prize_per_winner', v_prize_per_winner
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função RPC para atualizar estatísticas do bolão
CREATE OR REPLACE FUNCTION update_pool_stats(p_pool_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE match_pools
  SET 
    total_participants = (
      SELECT COUNT(*) 
      FROM pool_bets 
      WHERE pool_id = p_pool_id AND payment_status = 'approved'
    ),
    total_pool_amount = (
      SELECT COUNT(*) * 2.00 
      FROM pool_bets 
      WHERE pool_id = p_pool_id AND payment_status = 'approved'
    )
  WHERE id = p_pool_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar estatísticas quando uma aposta é aprovada
CREATE OR REPLACE FUNCTION trigger_update_pool_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'approved' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'approved') THEN
    PERFORM update_pool_stats(NEW.pool_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pool_stats_on_bet
  AFTER INSERT OR UPDATE ON pool_bets
  FOR EACH ROW
  WHEN (NEW.payment_status = 'approved')
  EXECUTE FUNCTION trigger_update_pool_stats();

-- RLS Policies
ALTER TABLE match_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_bets ENABLE ROW LEVEL SECURITY;

-- Todos podem ler bolões ativos
CREATE POLICY "Anyone can read active pools" ON match_pools
  FOR SELECT USING (is_active = true);

-- Todos podem ler suas próprias apostas
CREATE POLICY "Users can read their own bets" ON pool_bets
  FOR SELECT USING (auth.uid() = user_id);

-- Admins podem gerenciar tudo
CREATE POLICY "Admins can manage pools" ON match_pools
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage bets" ON pool_bets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Usuários autenticados podem criar apostas
CREATE POLICY "Authenticated users can create bets" ON pool_bets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Comentários
COMMENT ON TABLE match_pools IS 'Bolões de resultados de partidas vinculados a lives';
COMMENT ON TABLE pool_bets IS 'Apostas dos usuários nos bolões';
COMMENT ON COLUMN match_pools.is_active IS 'Quando true, usuários podem apostar. Quando false, apostas fechadas.';
COMMENT ON COLUMN pool_bets.payment_status IS 'Status do pagamento: pending, approved, failed, cancelled';

