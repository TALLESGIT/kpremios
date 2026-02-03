import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { BarChart3, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../hooks/useSocket';

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
  compact?: boolean;
}

const isPollDebug = () => (import.meta as any).env?.DEV === true || (import.meta as any).env?.VITE_DEBUG_LIVE === '1';

const PollDisplay: React.FC<PollDisplayProps> = ({ streamId, compact = false }) => {
  const { user } = useAuth();
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [results, setResults] = useState<PollResults[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ MIGRAÇÃO: Usar Socket.io em vez de Supabase Realtime
  const { isConnected, on, off, emit } = useSocket({
    streamId,
    autoConnect: true
  });

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

  // Carregar enquete ativa quando conectar ou streamId mudar
  useEffect(() => {
    if (!isConnected || !streamId) return;

    if (isPollDebug()) console.log('🔍 PollDisplay: Buscando enquete ativa para stream:', streamId);
    emit('poll-get-active', { streamId });
  }, [isConnected, streamId, emit]);

  // Escutar resposta de enquete ativa
  useEffect(() => {
    if (!isConnected) return;

    const handlePollActive = (data: any) => {
      const poll = data.poll;
      if (poll) {
        if (isPollDebug()) console.log('✅ PollDisplay: Enquete encontrada:', {
          id: poll.id,
          question: poll.question,
          is_active: poll.is_active,
          is_pinned: poll.is_pinned
        });
        setActivePoll(poll);
        // Carregar resultados e verificar voto
        emit('poll-get-results', { pollId: poll.id });
        const sessionId = getSessionId();
        emit('poll-check-vote', {
          pollId: poll.id,
          userId: user?.id || null,
          sessionId: user?.id ? null : sessionId
        });
      } else {
        if (isPollDebug()) console.log('⚠️ PollDisplay: Nenhuma enquete ativa e fixada encontrada');
        setActivePoll(null);
        setResults([]);
        setTotalVotes(0);
        setHasVoted(false);
      }
    };

    on('poll-active', handlePollActive);

    return () => {
      off('poll-active', handlePollActive);
    };
  }, [isConnected, user?.id, on, off, emit]);

  // Escutar atualizações de enquetes via Socket.io
  useEffect(() => {
    if (!isConnected || !streamId) return;

    const handlePollUpdated = (data: any) => {
      if (isPollDebug()) console.log('🔄 PollDisplay: Enquete atualizada via Socket.io:', data.eventType, data.poll?.id, data.poll?.is_pinned);

      const updatedPoll = data.poll;

      // Se foi deletada, limpar enquete ativa
      if (data.eventType === 'DELETE') {
        const deletedId = data.pollId || data.poll?.id;
        if (isPollDebug()) console.log('🗑️ PollDisplay: Enquete deletada, limpando exibição:', deletedId);
        if (deletedId === activePoll?.id || !deletedId) {
          setActivePoll(null);
          setResults([]);
          setTotalVotes(0);
          setHasVoted(false);
        }
        return;
      }

      // Se a atualização é da mesma stream, buscar enquete ativa para garantir sincronização
      if (updatedPoll?.stream_id === streamId) {
        if (isPollDebug()) console.log('🔄 PollDisplay: Atualização na stream detectada, buscando enquete ativa');
        // Delay maior para garantir que o banco foi atualizado completamente
        setTimeout(() => {
          emit('poll-get-active', { streamId });
        }, 200);
      }
    };

    const handlePollVoteUpdated = (data: any) => {
      if (isPollDebug()) console.log('🔄 PollDisplay: Voto atualizado via Socket.io:', data.pollId);
      // Atualizar resultados se for da enquete ativa
      if (data.pollId === activePoll?.id) {
        setResults(data.results || []);
        setTotalVotes(data.total_votes || 0);
      }
    };

    on('poll-updated', handlePollUpdated);
    on('poll-vote-updated', handlePollVoteUpdated);

    return () => {
      off('poll-updated', handlePollUpdated);
      off('poll-vote-updated', handlePollVoteUpdated);
    };
  }, [isConnected, activePoll?.id, streamId, user?.id, on, off, emit]);

  // Escutar resultados da enquete
  useEffect(() => {
    if (!isConnected || !activePoll?.id) return;

    const handlePollResults = (data: any) => {
      if (data.pollId === activePoll.id) {
        setResults(data.results || []);
        setTotalVotes(data.total_votes || 0);
      }
    };

    on('poll-results', handlePollResults);

    return () => {
      off('poll-results', handlePollResults);
    };
  }, [isConnected, activePoll?.id, on, off]);

  // Escutar status de voto do usuário
  useEffect(() => {
    if (!isConnected || !activePoll?.id) return;

    const handlePollVoteStatus = (data: any) => {
      if (data.pollId === activePoll.id) {
        setHasVoted(data.hasVoted || false);
        setUserVote(data.userVote || null);
      }
    };

    on('poll-vote-status', handlePollVoteStatus);

    return () => {
      off('poll-vote-status', handlePollVoteStatus);
    };
  }, [isConnected, activePoll?.id, on, off]);

  // Escutar resposta de voto
  useEffect(() => {
    if (!isConnected || !activePoll?.id) return;

    const handlePollVoted = (data: any) => {
      if (data.pollId === activePoll.id) {
        setHasVoted(true);
        setUserVote(data.optionId);
        setResults(data.results || []);
        setTotalVotes(data.total_votes || 0);
        toast.success('Voto registrado!');
        setIsLoading(false);
      }
    };

    const handlePollVoteError = (data: any) => {
      toast.error(data.message || 'Erro ao votar');
      setIsLoading(false);
    };

    on('poll-voted', handlePollVoted);
    on('poll-vote-error', handlePollVoteError);

    return () => {
      off('poll-voted', handlePollVoted);
      off('poll-vote-error', handlePollVoteError);
    };
  }, [isConnected, activePoll?.id, on, off]);

  const handleVote = async (optionId: number) => {
    if (hasVoted || isLoading || !isConnected || !activePoll) return;

    setIsLoading(true);
    const sessionId = getSessionId();

    emit('poll-vote', {
      pollId: activePoll.id,
      optionId,
      userId: user?.id || null,
      sessionId: user?.id ? null : sessionId
    });
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
        className={`bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl ${compact ? 'p-3 mb-0' : 'p-5 mb-6'
          } shadow-2xl relative overflow-hidden group`}
      >
        {/* Glow de fundo sutil */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 blur-[60px] pointer-events-none group-hover:bg-blue-500/20 transition-colors" />

        <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-5'}`}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 rounded-lg">
              <BarChart3 className={compact ? 'w-3 h-3 text-blue-400' : 'w-4 h-4 text-blue-400'} />
            </div>
            <h4 className={`text-white font-black uppercase italic tracking-wider ${compact ? 'text-[9px]' : 'text-xs'}`}>Enquete</h4>
          </div>
          {totalVotes > 0 && (
            <span className={`text-slate-500 font-bold ${compact ? 'text-[8px]' : 'text-[10px]'}`}>
              {totalVotes} votos
            </span>
          )}
        </div>

        <h3 className={`text-white font-bold leading-tight ${compact ? 'text-[11px] mb-3' : 'text-base mb-5'}`}>{activePoll.question}</h3>

        <div className={compact ? 'space-y-2' : 'space-y-3'}>
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
                  className={`w-full text-left rounded-xl border transition-all relative overflow-hidden ${compact ? 'p-2' : 'p-3.5'
                    } ${hasVoted
                      ? isUserChoice
                        ? 'bg-blue-600/20 border-blue-500/40 cursor-default'
                        : 'bg-white/5 border-white/5 cursor-default opacity-60'
                      : 'bg-white/5 border-white/5 hover:border-blue-500/40 hover:bg-white/10 cursor-pointer active:scale-[0.98]'
                    }`}
                >
                  <div className={`flex items-center justify-between ${hasVoted ? 'mb-1' : ''}`}>
                    <span className={`text-white font-bold ${compact ? 'text-[10px]' : 'text-sm'}`}>{option.text}</span>
                    {isUserChoice && (
                      <CheckCircle2 className={compact ? 'w-3 h-3 text-blue-400 fill-blue-400' : 'w-4 h-4 text-blue-400 fill-blue-400'} />
                    )}
                  </div>

                  {hasVoted && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] mb-1.5">
                        <span className="text-slate-400 font-medium">{percentage}%</span>
                        <span className="text-blue-400 font-bold uppercase tracking-tighter">{votes} votos</span>
                      </div>
                      <div className={`w-full bg-slate-700/50 rounded-full overflow-hidden ${compact ? 'h-1' : 'h-2'}`}>
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
          <div className={`${compact ? 'mt-2 pt-2' : 'mt-3 pt-3'} border-t border-white/10`}>
            <p className="text-slate-400 text-[9px] text-center">
              Total de votos: <span className="text-blue-400 font-bold">{totalVotes}</span>
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default PollDisplay;

