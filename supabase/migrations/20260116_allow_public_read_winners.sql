-- Permitir leitura pública de apostas vencedoras aprovadas
-- Isso permite que usuários não logados vejam os ganhadores na página WinnersPage

-- Remover políticas existentes se já existirem (evitar duplicatas)
DROP POLICY IF EXISTS "Anyone can read winner bets" ON pool_bets;
DROP POLICY IF EXISTS "Anyone can read pools with results" ON match_pools;

-- Todos podem ler apostas vencedoras aprovadas (ganhadores)
CREATE POLICY "Anyone can read winner bets" ON pool_bets
  FOR SELECT
  TO anon, authenticated
  USING (is_winner = true AND payment_status = 'approved');

-- Todos podem ler bolões com resultados definidos (não apenas os ativos)
CREATE POLICY "Anyone can read pools with results" ON match_pools
  FOR SELECT
  TO anon, authenticated
  USING (result_home_score IS NOT NULL AND result_away_score IS NOT NULL);
