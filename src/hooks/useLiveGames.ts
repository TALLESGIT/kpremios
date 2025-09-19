import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast'; 

export interface LiveGame {
  id: string;
  title: string;
  description: string;
  status: 'waiting' | 'active' | 'finished';
  max_participants: number;
  winner_number?: number;
  winner_user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  game_id: string;
  user_id: string;
  lucky_number: number;
  status: 'active' | 'eliminated';
  eliminated_at?: string;
  created_at: string;
  user_name?: string;
}

export const useLiveGames = () => {
  const [games, setGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGames = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('live_games')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGames(data || []);
    } catch (err) {
      console.error('Erro ao carregar jogos:', err);
      setError('Erro ao carregar jogos');
      toast.error('Erro ao carregar jogos');
    } finally {
      setLoading(false);
    }
  }, []);

  const createGame = useCallback(async (gameData: {
    title: string;
    description: string;
    max_participants: number;
  }) => {
    try {
      const { data, error } = await supabase
        .from('live_games')
        .insert({
          ...gameData,
          status: 'waiting'
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Jogo criado com sucesso!');
      await loadGames();
      return data;
    } catch (err) {
      console.error('Erro ao criar jogo:', err);
      toast.error('Erro ao criar jogo');
      throw err;
    }
  }, [loadGames]);

  const deleteGame = useCallback(async (gameId: string) => {
    try {
      // Primeiro, deletar todos os participantes
      const { error: participantsError } = await supabase
        .from('live_participants')
        .delete()
        .eq('game_id', gameId);

      if (participantsError) throw participantsError;

      // Depois, deletar o jogo
      const { error: gameError } = await supabase
        .from('live_games')
        .delete()
        .eq('id', gameId);

      if (gameError) throw gameError;
      
      toast.success('Jogo deletado com sucesso!');
      await loadGames();
    } catch (err) {
      console.error('Erro ao deletar jogo:', err);
      toast.error('Erro ao deletar jogo');
      throw err;
    }
  }, [loadGames]);

  const updateGameStatus = useCallback(async (gameId: string, status: LiveGame['status']) => {
    try {
      const { error } = await supabase
        .from('live_games')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', gameId);

      if (error) throw error;
      
      const statusMessages = {
        waiting: 'Jogo definido como aguardando',
        active: 'Jogo iniciado!',
        finished: 'Jogo finalizado!'
      };
      
      toast.success(statusMessages[status]);
      await loadGames();
    } catch (err) {
      console.error('Erro ao atualizar status do jogo:', err);
      toast.error('Erro ao atualizar status do jogo');
      throw err;
    }
  }, [loadGames]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  // Configurar subscription em tempo real
  useEffect(() => {
    const subscription = supabase
      .channel('live_games_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_games'
        },
        () => {
          loadGames();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadGames]);

  return {
    games,
    loading,
    error,
    loadGames,
    createGame,
    deleteGame,
    updateGameStatus
  };
};

export const useGameParticipants = (gameId: string | undefined) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadParticipants = useCallback(async () => {
    if (!gameId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('live_participants')
        .select(`
          *,
          users:user_id (
            name
          )
        `)
        .eq('game_id', gameId)
        .order('lucky_number', { ascending: true });

      if (error) throw error;
      
      const formattedParticipants = data.map(p => ({
        ...p,
        user_name: p.users?.name || 'Usuário'
      }));
      
      setParticipants(formattedParticipants);
    } catch (err) {
      console.error('Erro ao carregar participantes:', err);
      setError('Erro ao carregar participantes');
      toast.error('Erro ao carregar participantes');
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  const eliminateParticipant = useCallback(async (participantId: string) => {
    try {
      const { error } = await supabase
        .from('live_participants')
        .update({
          status: 'eliminated',
          eliminated_at: new Date().toISOString()
        })
        .eq('id', participantId);

      if (error) throw error;
      
      toast.success('Participante eliminado!');
      await loadParticipants();
    } catch (err) {
      console.error('Erro ao eliminar participante:', err);
      toast.error('Erro ao eliminar participante');
      throw err;
    }
  }, [loadParticipants]);

  const reactivateParticipant = useCallback(async (participantId: string) => {
    try {
      const { error } = await supabase
        .from('live_participants')
        .update({
          status: 'active',
          eliminated_at: null
        })
        .eq('id', participantId);

      if (error) throw error;
      
      toast.success('Participante reativado!');
      await loadParticipants();
    } catch (err) {
      console.error('Erro ao reativar participante:', err);
      toast.error('Erro ao reativar participante');
      throw err;
    }
  }, [loadParticipants]);

  const finishGameWithWinner = useCallback(async (winnerParticipant: Participant) => {
    if (!gameId) return;
    
    try {
      const { error } = await supabase
        .from('live_games')
        .update({
          status: 'finished',
          winner_number: winnerParticipant.lucky_number,
          winner_user_id: winnerParticipant.user_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId);

      if (error) throw error;
      
      toast.success(`Jogo finalizado! Vencedor: ${winnerParticipant.user_name} (${winnerParticipant.lucky_number})`);
    } catch (err) {
      console.error('Erro ao finalizar jogo:', err);
      toast.error('Erro ao finalizar jogo');
      throw err;
    }
  }, [gameId]);

  const resetGame = useCallback(async () => {
    if (!gameId) return;
    
    try {
      // Reativar todos os participantes
      const { error: participantsError } = await supabase
        .from('live_participants')
        .update({
          status: 'active',
          eliminated_at: null
        })
        .eq('game_id', gameId);

      if (participantsError) throw participantsError;

      // Resetar o jogo
      const { error: gameError } = await supabase
        .from('live_games')
        .update({
          status: 'waiting',
          winner_number: null,
          winner_user_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId);

      if (gameError) throw gameError;
      
      toast.success('Jogo reiniciado!');
      await loadParticipants();
    } catch (err) {
      console.error('Erro ao reiniciar jogo:', err);
      toast.error('Erro ao reiniciar jogo');
      throw err;
    }
  }, [gameId, loadParticipants]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  // Configurar subscription em tempo real para participantes
  useEffect(() => {
    if (!gameId) return;
    
    const subscription = supabase
      .channel(`game_participants_${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_participants',
          filter: `game_id=eq.${gameId}`
        },
        () => {
          loadParticipants();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [gameId, loadParticipants]);

  return {
    participants,
    loading,
    error,
    loadParticipants,
    eliminateParticipant,
    reactivateParticipant,
    finishGameWithWinner,
    resetGame
  };
};