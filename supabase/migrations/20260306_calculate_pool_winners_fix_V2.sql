-- Função consolidada para cálculo de ganhadores do bolão
-- Mescla lógica de rollover (acúmulo) com atualização de estatísticas do bolão

CREATE OR REPLACE FUNCTION public.calculate_pool_winners(p_pool_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_home_score INT;
    v_away_score INT;
    v_total_collected DECIMAL;
    v_accumulated DECIMAL;
    v_prize_pool DECIMAL;
    v_winners_count INT;
    v_prize_per_winner DECIMAL;
    v_rollover_amount DECIMAL;
BEGIN
    -- 1. Obter resultado e valores do bolão
    SELECT 
        result_home_score, 
        result_away_score, 
        COALESCE(total_pool_amount, 0),
        COALESCE(accumulated_amount, 0)
    INTO v_home_score, v_away_score, v_total_collected, v_accumulated
    FROM public.match_pools
    WHERE id = p_pool_id;

    IF v_home_score IS NULL OR v_away_score IS NULL THEN
        RETURN jsonb_build_object('error', 'Resultado não definido para este bolão');
    END IF;

    -- 2. Calcular o Pote do Prêmio: (70% do Arrecadado neste jogo) + (Valor Acumulado de jogos anteriores)
    v_prize_pool := (v_total_collected * 0.7) + v_accumulated;

    -- 3. Identificar ganhadores (apostas aprovadas com placar exato)
    -- Resetar ganhadores anteriores (caso seja um re-cálculo)
    UPDATE public.pool_bets
    SET is_winner = FALSE,
        prize_amount = 0
    WHERE pool_id = p_pool_id;

    -- Marcar novos ganhadores
    UPDATE public.pool_bets
    SET is_winner = TRUE,
        updated_at = NOW()
    WHERE pool_id = p_pool_id
      AND payment_status = 'approved'
      AND predicted_home_score = v_home_score
      AND predicted_away_score = v_away_score;

    GET DIAGNOSTICS v_winners_count = ROW_COUNT;

    -- 4. Lógica de Distribuição ou Acúmulo
    IF v_winners_count > 0 THEN
        -- Dividir prêmio entre ganhadores
        v_prize_per_winner := v_prize_pool / v_winners_count;
        
        UPDATE public.pool_bets
        SET prize_amount = v_prize_per_winner
        WHERE pool_id = p_pool_id
          AND is_winner = TRUE;

        -- Resetar o carryover das configurações (o acumulado foi usado)
        UPDATE public.cruzeiro_settings
        SET pool_carryover = 0,
            updated_at = NOW();
            
        v_rollover_amount := 0;
    ELSE
        -- Ninguém ganhou: O Pote inteiro (70% do atual + acumulado antigo) vai para o próximo carryover
        v_prize_per_winner := 0;
        v_rollover_amount := v_prize_pool;
        
        -- Atualizar cruzeiro_settings com o novo acumulado
        UPDATE public.cruzeiro_settings
        SET pool_carryover = v_rollover_amount,
            updated_at = NOW();
    END IF;

    -- 5. Marcar bolão como finalizado e salvar estatísticas
    UPDATE public.match_pools
    SET is_active = FALSE,
        result_set_at = NOW(),
        winners_count = v_winners_count,
        prize_per_winner = v_prize_per_winner,
        updated_at = NOW()
    WHERE id = p_pool_id;

    RETURN jsonb_build_object(
        'winners_count', v_winners_count,
        'prize_pool', v_prize_pool,
        'rollover_amount', v_rollover_amount,
        'prize_per_winner', v_prize_per_winner
    );
END;
$function$;
