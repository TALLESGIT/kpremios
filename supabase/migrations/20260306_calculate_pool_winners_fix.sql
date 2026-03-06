-- Migration: Corrigir cálculo de ganhadores do Bolão (70% + acumulado)
-- Mantém a compatibilidade com a verificação de result_set_at
CREATE OR REPLACE FUNCTION calculate_pool_winners(p_pool_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result_home INTEGER;
  v_result_away INTEGER;
  v_winners_count INTEGER;
  v_total_amount NUMERIC;
  v_accumulated_amount NUMERIC;
  v_prize_per_winner NUMERIC;
BEGIN
  -- Buscar resultado real e valores financeiros
  SELECT result_home_score, result_away_score, total_pool_amount, COALESCE(accumulated_amount, 0)
  INTO v_result_home, v_result_away, v_total_amount, v_accumulated_amount
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

  -- Calcular prêmio por ganhador: (70% do total_pool_amount) + accumulated_amount
  IF v_winners_count > 0 THEN
    v_prize_per_winner := ((v_total_amount * 0.70) + v_accumulated_amount) / v_winners_count;
    
    UPDATE pool_bets
    SET prize_amount = v_prize_per_winner
    WHERE pool_id = p_pool_id AND is_winner = true;
  ELSE
    v_prize_per_winner := 0.00;
  END IF;

  -- Atualizar match_pools
  UPDATE match_pools
  SET winners_count = v_winners_count,
      prize_per_winner = v_prize_per_winner
  WHERE id = p_pool_id;

  -- Opcional: define result_set_at se a coluna existir (retrocompatível)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'match_pools' AND column_name = 'result_set_at'
  ) THEN
    UPDATE match_pools
    SET result_set_at = COALESCE(result_set_at, NOW())
    WHERE id = p_pool_id;
  END IF;

  RETURN json_build_object(
    'winners_count', v_winners_count,
    'total_amount', COALESCE(v_total_amount, 0),
    'accumulated_amount', v_accumulated_amount,
    'prize_per_winner', v_prize_per_winner
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
