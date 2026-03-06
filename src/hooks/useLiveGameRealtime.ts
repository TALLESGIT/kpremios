import { useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export interface Participant {
  number: any;
  name: any;
  id: string;
  user_id: string;
  lucky_number: number;
  status: 'active' | 'eliminated';
  eliminated_at?: string;
  user_name?: string;
  user_phone?: string;
}

export interface LiveGame {
  current_round: ReactNode;
  id: string;
  title: string;
  description: string;
  status: 'waiting' | 'active' | 'finished';
  max_participants: number;
  current_participants: number;
  winner_id?: string;
  winner_user_id?: string;
  winner_number?: number;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  elimination_interval?: number;
}

export const useLiveGameRealtime = (gameId: string, userId?: string) => {
  const [game, setGame] = useState<LiveGame | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEliminated, setIsEliminated] = useState(false);

  const loadGame = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('live_games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) throw error;
      setGame(data);
    } catch (error) {
    }
  }, [gameId]);

  const loadParticipants = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('live_participants')
        .select(`
          *,
          users:user_id (
            name,
            whatsapp
          )
        `)
        .eq('game_id', gameId)
        .order('lucky_number', { ascending: true });

      if (error) throw error;

      const formattedParticipants = (data || []).map(p => ({
        ...p,
        user_name: p.users?.name || 'Usuário',
        user_phone: p.users?.whatsapp || ''
      }));

      setParticipants(formattedParticipants);

      // Verificar se o usuário atual foi eliminado
      if (userId) {
        const myParticipation = formattedParticipants.find(p => p.user_id === userId);
        setIsEliminated(myParticipation?.status === 'eliminated' || false);
      }
    } catch (error) {
    }
  }, [gameId, userId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadGame(), loadParticipants()]);
    setLoading(false);
  }, [loadGame, loadParticipants]);

  // Carregar dados iniciais
  useEffect(() => {
    if (gameId) {
      loadData();
    }
  }, [gameId, loadData]);

  // Configurar subscriptions em tempo real
  useEffect(() => {
    if (!gameId) return;

    const gameChannel = supabase
      .channel(`live_game_${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_games',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          loadGame();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_participants',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          // Se foi uma eliminação, mostrar notificação
          if (payload.eventType === 'UPDATE' && payload.new.status === 'eliminated') {
            const participant = participants.find(p => p.id === payload.new.id);
            if (participant) {
              // Notificar outros usuários sobre a eliminação
              toast(
                `❌ ${participant.user_name} (${participant.lucky_number}) foi eliminado!`,
                {
                  duration: 5000,
                  style: {
                    background: '#374151',
                    color: 'white',
                  },
                  icon: '👋',
                }
              );

              // Se foi o usuário atual, mostrar notificação especial
              if (userId && participant.user_id === userId) {
                toast.error(
                  `💀 Você foi eliminado! Número ${participant.lucky_number}`,
                  {
                    duration: 10000,
                    style: {
                      background: '#dc2626',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: 'bold',
                    },
                    icon: '💀',
                  }
                );
                setIsEliminated(true);
              }
            }
          }

          loadParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [gameId, userId, participants, loadGame, loadParticipants]);

  const refreshData = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    game,
    participants,
    loading,
    isEliminated,
    refreshData,
    loadGame,
    loadParticipants
  };
};
