import { supabase } from '../lib/supabase';
import { CruzeiroGame } from '../types';

/**
 * Gera o título da live baseado no jogo do Cruzeiro
 * Formato: "Cruzeiro x [Adversário]"
 */
export function generateLiveTitle(game: CruzeiroGame | null): string {
  if (!game) {
    return 'ZK TV';
  }

  const opponent = game.opponent || 'Adversário';
  return `Cruzeiro x ${opponent}`;
}

/**
 * Busca o jogo ativo (status = 'live') ou o próximo jogo
 */
export async function getActiveGame(): Promise<CruzeiroGame | null> {
  try {
    // Primeiro, tentar buscar jogo com status 'live'
    const { data: liveGame, error: liveError } = await supabase
      .from('cruzeiro_games')
      .select('*')
      .eq('status', 'live')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!liveError && liveGame) {
      return liveGame as CruzeiroGame;
    }

    // Se não encontrar jogo ao vivo, buscar próximo jogo
    const now = new Date().toISOString();
    const { data: nextGame, error: nextError } = await supabase
      .from('cruzeiro_games')
      .select('*')
      .gte('date', now)
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!nextError && nextGame) {
      return nextGame as CruzeiroGame;
    }

    return null;
  } catch (error) {
    console.error('❌ Erro ao buscar jogo ativo:', error);
    return null;
  }
}

/**
 * Atualiza o título da live stream baseado no jogo ativo
 */
export async function updateLiveTitle(streamId?: string, channelName: string = 'zktv'): Promise<boolean> {
  try {
    const activeGame = await getActiveGame();

    // Se não há jogo ativo/próximo, não sobrescrever o título customizado do admin
    if (!activeGame) {
      console.log('ℹ️ liveTitleService: Nenhum jogo encontrado, mantendo título atual.');
      return false;
    }

    const newTitle = generateLiveTitle(activeGame);

    // Se não tem streamId, buscar pelo channel_name
    if (!streamId) {
      const { data: stream } = await supabase
        .from('live_streams')
        .select('id')
        .eq('channel_name', channelName)
        .maybeSingle();

      if (!stream) {
        console.warn('⚠️ Stream não encontrada para atualizar título');
        return false;
      }

      streamId = stream.id;
    }

    // Atualizar título
    const { error } = await supabase
      .from('live_streams')
      .update({ title: newTitle })
      .eq('id', streamId);

    if (error) {
      console.error('❌ Erro ao atualizar título da live:', error);
      return false;
    }

    console.log('✅ Título da live atualizado:', newTitle);
    return true;
  } catch (error) {
    console.error('❌ Erro ao atualizar título da live:', error);
    return false;
  }
}

