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

const DEFAULT_DURATION = 15000; // 15 segundos padrão

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

  // Verificar se a enquete já foi dispensada pelo usuário
  const isPollDismissed = (pollId: string) => {
    if (typeof window === 'undefined') return false;
    const dismissed = JSON.parse(localStorage.getItem('zk_dismissed_polls') || '[]');
    return dismissed.includes(pollId);
  };

  const markPollAsDismissed = (pollId: string) => {
    if (typeof window === 'undefined') return;
    const dismissed = JSON.parse(localStorage.getItem('zk_dismissed_polls') || '[]');
    if (!dismissed.includes(pollId)) {
      dismissed.push(pollId);
      localStorage.setItem('zk_dismissed_polls', JSON.stringify(dismissed));
    }
  };

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
        // Se já foi dispensada, não mostrar novamente
        if (isPollDismissed(poll.id)) {
          return;
        }

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
        if (data.eventType === 'DELETE' || !updatedPoll.is_active || !updatedPoll.is_pinned || updatedPoll.is_deleted) {
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
          // Nova enquete ativa - verificar se já foi dispensada (improvável para nova)
          if (isPollDismissed(updatedPoll.id)) return;

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

          // Reset timer
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          const duration = updatedPoll.duration_seconds ? updatedPoll.duration_seconds * 1000 : DEFAULT_DURATION;
          timeoutRef.current = setTimeout(() => {
            setIsVisible(false);
          }, duration);
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
    if (activePoll) {
      markPollAsDismissed(activePoll.id);
    }
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
        initial={{ opacity: 0, x: 100, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.9 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed top-24 right-4 z-[10000] w-[320px]"
      >
        <div className="bg-slate-900/90 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative group">
          {/* Decoração Background */}
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-blue-600/20 blur-[40px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-blue-400/10 blur-[40px] rounded-full pointer-events-none" />

          {/* Botão fechar */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-400 rounded-xl shadow-lg shadow-blue-600/20">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <h4 className="text-[10px] font-black text-blue-400 uppercase italic tracking-[0.2em] leading-none mb-1">Live Poll</h4>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                {totalVotes} votos registrados
              </span>
            </div>
          </div>

          {/* Pergunta */}
          <h3 className="text-sm font-black text-white mb-5 leading-tight tracking-tight uppercase italic">{activePoll.question}</h3>

          {/* Opções */}
          <div className="space-y-2.5">
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
                  className={`w-full text-left rounded-2xl border transition-all relative overflow-hidden group/opt ${hasVoted
                      ? isUserChoice
                        ? 'bg-blue-600/20 border-blue-500/40 p-3'
                        : 'bg-white/5 border-white/5 p-3 opacity-60'
                      : 'bg-white/5 border-white/5 hover:border-blue-500/40 hover:bg-white/10 p-3.5 active:scale-[0.97]'
                    }`}
                >
                  <div className="flex items-center justify-between relative z-10">
                    <span className={`text-xs font-bold ${isUserChoice ? 'text-blue-200' : 'text-slate-100'}`}>
                      {option.text}
                    </span>
                    {hasVoted && (
                      <span className="text-[10px] font-black text-blue-400">{percentage}%</span>
                    )}
                  </div>

                  {hasVoted && (
                    <div className="mt-2.5 relative z-10">
                      <div className="w-full bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full ${isUserChoice ? 'bg-gradient-to-r from-blue-500 to-blue-300' : 'bg-slate-600'}`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Feedback Visual ao Votar */}
                  {isUserChoice && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {!hasVoted && (
            <div className="mt-4 flex flex-center justify-center">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">
                Vote agora para ver resultados
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
