import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { BarChart3, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Poll {
  id: string;
  question: string;
  options: Array<{ id: number; text: string }>;
  is_active: boolean;
  is_pinned: boolean;
}

interface PollResults {
  option_id: number;
  text: string;
  votes: number;
}

interface PollDisplayProps {
  streamId: string;
}

const PollDisplay: React.FC<PollDisplayProps> = ({ streamId }) => {
  const { user } = useAuth();
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [results, setResults] = useState<PollResults[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Gerar session_id único para usuários anônimos
  const getSessionId = () => {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('session_id', sessionId);
      }
      return sessionId;
    }
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  useEffect(() => {
    loadActivePoll();
    
    // Escutar mudanças em tempo real para enquetes
    const pollChannel = supabase
      .channel(`poll_display_${streamId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stream_polls',
        filter: `stream_id=eq.${streamId}`
      }, (payload) => {
        console.log('🔄 PollDisplay: Mudança detectada na enquete:', payload.eventType);
        // Recarregar enquete imediatamente quando houver mudança
        loadActivePoll();
      })
      .subscribe();

    // Escutar mudanças em votos - usar subscription dinâmica
    let votesChannel: any = null;
    
    const setupVotesSubscription = (pollId: string) => {
      // Remover subscription anterior se existir
      if (votesChannel) {
        supabase.removeChannel(votesChannel);
      }
      
      // Criar nova subscription para votos desta enquete
      votesChannel = supabase
        .channel(`poll_votes_${pollId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'poll_votes',
          filter: `poll_id=eq.${pollId}`
        }, () => {
          console.log('🔄 PollDisplay: Novo voto detectado');
          if (activePoll) {
            loadPollResults(activePoll.id);
          }
        })
        .subscribe();
    };

    // Configurar subscription de votos quando activePoll mudar
    if (activePoll?.id) {
      setupVotesSubscription(activePoll.id);
    }

    return () => {
      supabase.removeChannel(pollChannel);
      if (votesChannel) {
        supabase.removeChannel(votesChannel);
      }
    };
  }, [streamId]);
  
  // Subscription separada para votos que atualiza quando activePoll muda
  useEffect(() => {
    if (!activePoll?.id) return;
    
    const votesChannel = supabase
      .channel(`poll_votes_${activePoll.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'poll_votes',
        filter: `poll_id=eq.${activePoll.id}`
      }, () => {
        console.log('🔄 PollDisplay: Novo voto detectado para enquete:', activePoll.id);
        loadPollResults(activePoll.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(votesChannel);
    };
  }, [activePoll?.id]);

  const loadActivePoll = async () => {
    try {
      console.log('🔍 PollDisplay: Carregando enquete ativa e fixada para stream:', streamId);
      const { data, error } = await supabase
        .from('stream_polls')
        .select('*')
        .eq('stream_id', streamId)
        .eq('is_active', true)
        .eq('is_pinned', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ PollDisplay: Erro ao buscar enquete:', error);
        throw error;
      }

      if (data) {
        console.log('✅ PollDisplay: Enquete encontrada:', {
          id: data.id,
          question: data.question,
          is_active: data.is_active,
          is_pinned: data.is_pinned
        });
        setActivePoll(data);
        await loadPollResults(data.id);
        await checkUserVote(data.id);
      } else {
        console.log('⚠️ PollDisplay: Nenhuma enquete ativa e fixada encontrada');
        setActivePoll(null);
        setResults([]);
        setTotalVotes(0);
        setHasVoted(false);
      }
    } catch (error: any) {
      console.error('❌ PollDisplay: Erro ao carregar enquete:', error);
    }
  };

  const loadPollResults = async (pollId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_poll_results', {
        p_poll_id: pollId
      });

      if (error) throw error;

      if (data && data.success) {
        setResults(data.results || []);
        setTotalVotes(data.total_votes || 0);
      }
    } catch (error: any) {
      console.error('Erro ao carregar resultados:', error);
    }
  };

  const checkUserVote = async (pollId: string) => {
    try {
      const sessionId = getSessionId();
      const { data, error } = await supabase.rpc('has_user_voted', {
        p_poll_id: pollId,
        p_user_id: user?.id || null,
        p_session_id: user?.id ? null : sessionId
      });

      if (error) throw error;

      setHasVoted(data || false);

      // Se já votou, descobrir qual opção
      if (data) {
        const { data: voteData } = await supabase
          .from('poll_votes')
          .select('option_id')
          .eq('poll_id', pollId)
          .eq(user?.id ? 'user_id' : 'session_id', user?.id || sessionId)
          .single();

        if (voteData) {
          setUserVote(voteData.option_id);
        }
      }
    } catch (error: any) {
      console.error('Erro ao verificar voto:', error);
    }
  };

  const handleVote = async (optionId: number) => {
    if (hasVoted || isLoading) return;

    setIsLoading(true);
    try {
      const sessionId = getSessionId();
      const { data, error } = await supabase.rpc('vote_on_poll', {
        p_poll_id: activePoll!.id,
        p_option_id: optionId,
        p_user_id: user?.id || null,
        p_session_id: user?.id ? null : sessionId
      });

      if (error) throw error;

      if (data && data.success) {
        setHasVoted(true);
        setUserVote(optionId);
        setResults(data.results || []);
        setTotalVotes(data.total_votes || 0);
        toast.success('Voto registrado!');
      } else {
        toast.error(data?.error || 'Erro ao votar');
      }
    } catch (error: any) {
      console.error('Erro ao votar:', error);
      toast.error('Erro ao votar');
    } finally {
      setIsLoading(false);
    }
  };

  if (!activePoll) return null;

  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gradient-to-r from-blue-600/20 via-blue-500/20 to-blue-600/20 backdrop-blur-md border-2 border-blue-500/40 rounded-2xl p-4 mb-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <h4 className="text-white font-black text-sm uppercase italic">Enquete</h4>
        </div>

        <h3 className="text-white font-bold text-base mb-4">{activePoll.question}</h3>

        <div className="space-y-3">
          {activePoll.options.map((option: any) => {
            const result = results.find(r => r.option_id === option.id);
            const votes = result?.votes || 0;
            const percentage = getPercentage(votes);
            const isUserChoice = hasVoted && userVote === option.id;

            return (
              <div key={option.id} className="relative">
                <button
                  onClick={() => handleVote(option.id)}
                  disabled={hasVoted || isLoading}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    hasVoted
                      ? isUserChoice
                        ? 'bg-blue-600/30 border-blue-500/60 cursor-default'
                        : 'bg-slate-800/50 border-slate-700/50 cursor-default opacity-60'
                      : 'bg-slate-800/50 border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-800 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-bold text-sm">{option.text}</span>
                    {isUserChoice && (
                      <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-400" />
                    )}
                  </div>
                  
                  {hasVoted && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">{votes} votos</span>
                        <span className="text-blue-400 font-bold">{percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                        />
                      </div>
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {hasVoted && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-slate-400 text-xs text-center">
              Total de votos: <span className="text-blue-400 font-bold">{totalVotes}</span>
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default PollDisplay;

