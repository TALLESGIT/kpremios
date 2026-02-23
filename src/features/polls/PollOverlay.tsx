// =====================================================
// PollOverlay - Overlay temporário para enquetes (estilo Twitch/Kick)
// =====================================================

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { BarChart3, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../hooks/useSocket';

interface Poll {
  id: string;
  question: string;
  options: Array<{ id: number; text: string }>;
  is_active: boolean;
  is_pinned: boolean;
  stream_id: string;
}

interface PollResults {
  option_id: number;
  text: string;
  votes: number;
}

interface PollOverlayProps {
  streamId: string | null;
}

const DEFAULT_DURATION = 12000; // 12 segundos padrão

export function PollOverlay({ streamId }: PollOverlayProps) {
  const { user } = useAuth();
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [results, setResults] = useState<PollResults[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { isConnected, on, off, emit } = useSocket({
    streamId: streamId || undefined,
    autoConnect: !!streamId
  });

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

  // Buscar enquete ativa quando conectar
  useEffect(() => {
    if (!isConnected || !streamId) return;
    emit('poll-get-active', { streamId });
  }, [isConnected, streamId, emit]);

  // Escutar enquete ativa
  useEffect(() => {
    if (!isConnected) return;

    const handlePollActive = (data: any) => {
      const poll = data.poll;
      if (poll && poll.stream_id === streamId) {
        setActivePoll(poll);
        setIsVisible(true);
        setIsDismissed(false);
        
        // Carregar resultados e verificar voto
        emit('poll-get-results', { pollId: poll.id });
        const sessionId = getSessionId();
        emit('poll-check-vote', {
          pollId: poll.id,
          userId: user?.id || null,
          sessionId: user?.id ? null : sessionId
        });

        // Auto-fechar após DEFAULT_DURATION (ou duration_seconds se existir)
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        const duration = poll.duration_seconds ? poll.duration_seconds * 1000 : DEFAULT_DURATION;
        timeoutRef.current = setTimeout(() => {
          setIsVisible(false);
        }, duration);
      }
    };

    on('poll-active', handlePollActive);

    return () => {
      off('poll-active', handlePollActive);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isConnected, streamId, user?.id, on, off, emit]);

  // Escutar atualizações de enquete
  useEffect(() => {
    if (!isConnected || !streamId) return;

    const handlePollUpdated = (data: any) => {
      const updatedPoll = data.poll;
      if (updatedPoll?.stream_id === streamId) {
        if (data.eventType === 'DELETE' || !updatedPoll.is_active || !updatedPoll.is_pinned) {
          // Enquete foi deletada ou desativada
          setActivePoll(null);
          setIsVisible(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        } else if (updatedPoll.id === activePoll?.id) {
          // Atualizar enquete existente
          setActivePoll(updatedPoll);
          // Re-buscar resultados
          emit('poll-get-results', { pollId: updatedPoll.id });
        } else {
          // Nova enquete ativa
          setActivePoll(updatedPoll);
          setIsVisible(true);
          setIsDismissed(false);
          emit('poll-get-results', { pollId: updatedPoll.id });
          const sessionId = getSessionId();
          emit('poll-check-vote', {
            pollId: updatedPoll.id,
            userId: user?.id || null,
            sessionId: user?.id ? null : sessionId
          });
        }
      }
    };

    const handlePollVoteUpdated = (data: any) => {
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

  // Escutar resultados
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

  // Escutar status de voto
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
      }
    };

    const handlePollVoteError = (data: any) => {
      toast.error(data.message || 'Erro ao votar');
    };

    on('poll-voted', handlePollVoted);
    on('poll-vote-error', handlePollVoteError);

    return () => {
      off('poll-voted', handlePollVoted);
      off('poll-vote-error', handlePollVoteError);
    };
  }, [isConnected, activePoll?.id, on, off]);

  const handleVote = async (optionId: number) => {
    if (hasVoted || !isConnected || !activePoll) return;

    const sessionId = getSessionId();
    emit('poll-vote', {
      pollId: activePoll.id,
      optionId,
      userId: user?.id || null,
      sessionId: user?.id ? null : sessionId
    });
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  if (!activePoll || !isVisible || isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] w-full max-w-md px-4"
      >
        <div className="bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-2xl relative">
          {/* Botão fechar */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-blue-500/20 rounded-lg">
              <BarChart3 className="w-4 h-4 text-blue-400" />
            </div>
            <h4 className="text-xs font-black text-white uppercase italic tracking-wider">Enquete</h4>
            {totalVotes > 0 && (
              <span className="text-slate-500 font-bold text-[10px] ml-auto">
                {totalVotes} votos
              </span>
            )}
          </div>

          {/* Pergunta */}
          <h3 className="text-sm font-bold text-white mb-4 leading-tight">{activePoll.question}</h3>

          {/* Opções */}
          <div className="space-y-2">
            {activePoll.options.map((option: any) => {
              const result = results.find(r => r.option_id === option.id);
              const votes = result?.votes || 0;
              const percentage = getPercentage(votes);
              const isUserChoice = hasVoted && userVote === option.id;

              return (
                <button
                  key={option.id}
                  onClick={() => handleVote(option.id)}
                  disabled={hasVoted}
                  className={`w-full text-left rounded-xl border transition-all relative overflow-hidden p-3 ${
                    hasVoted
                      ? isUserChoice
                        ? 'bg-blue-600/20 border-blue-500/40 cursor-default'
                        : 'bg-white/5 border-white/5 cursor-default opacity-60'
                      : 'bg-white/5 border-white/5 hover:border-blue-500/40 hover:bg-white/10 cursor-pointer active:scale-[0.98]'
                  }`}
                >
                  <div className={`flex items-center justify-between ${hasVoted ? 'mb-1' : ''}`}>
                    <span className="text-xs font-bold text-white">{option.text}</span>
                    {isUserChoice && (
                      <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-400" />
                    )}
                  </div>

                  {hasVoted && (
                    <div className="space-y-1 mt-2">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-slate-400 font-medium">{percentage}%</span>
                        <span className="text-blue-400 font-bold uppercase tracking-tighter">{votes} votos</span>
                      </div>
                      <div className="w-full bg-slate-700/50 rounded-full overflow-hidden h-1.5">
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
              );
            })}
          </div>

          {hasVoted && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-slate-400 text-[9px] text-center">
                Total de votos: <span className="text-blue-400 font-bold">{totalVotes}</span>
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
