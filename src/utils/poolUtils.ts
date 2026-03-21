import { supabase } from '../lib/supabase';

/**
 * Calcula o valor acumulado para o próximo bolão com base no último bolão finalizado.
 * Regra:
 * 1. Busca o último bolão criado no sistema.
 * 2. Se o último bolão NÃO teve ganhadores (winners_count = 0), o novo bolão herda:
 *    (Acumulado anterior) + (70% do Valor Total Arrecadado no anterior)
 * 3. Se teve pelo menos 1 ganhador, o novo bolão começa com 0 acumulado.
 */
export const calculateNextPoolAccumulated = async (clubSlug?: string | null): Promise<number> => {
  try {
    let query = supabase
      .from('match_pools')
      .select('*')
      .order('created_at', { ascending: false });

    if (clubSlug) {
      query = query.eq('club_slug', clubSlug);
    }

    const { data: lastPool, error } = await query
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar último bolão para cálculo de acumulado:', error);
      return 0;
    }

    const baseAmount = clubSlug === 'atletico-mg' ? 100 : 0;

    if (!lastPool) return baseAmount;

    // Se o bolão ainda não teve resultado definido ou teve ganhadores, o acumulado volta para o base
    const hasResult = lastPool.result_home_score !== null && lastPool.result_away_score !== null;
    const hasWinners = (lastPool.winners_count || 0) > 0;

    if (hasResult && !hasWinners) {
      const previousAccumulated = lastPool.accumulated_amount || 0;
      // total_pool_amount é o valor BRUTO arrecadado. O prêmio é sempre 70% desse valor.
      const previousPrizePortion = (lastPool.total_pool_amount || 0) * 0.70;
      return Math.max(baseAmount, previousAccumulated + previousPrizePortion);
    }

    return baseAmount;
  } catch (err) {
    console.error('Erro crítico no cálculo de acumulado:', err);
    return 0;
  }
};
