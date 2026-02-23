import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Play, Users, Target, Trophy, Crown, Zap, Clock, AlertCircle, CheckCircle, XCircle, ArrowLeft, Gamepad2 } from 'lucide-react';
import { useLiveGameRealtime } from '../hooks/useLiveGameRealtime';
import { useNavigate } from 'react-router-dom';

interface Participant {
  id: string;
  name: string;
  phone: string;
  number: number;
  is_eliminated: boolean;
  joined_at: string;
}

interface LiveRaffle {
  id: string;
  title: string;
  description: string;
  max_participants: number;
  is_active: boolean;
  participants: Participant[];
  current_round: number;
  winner?: Participant;
  admin_id: string;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  elimination_interval: number;
}

const LiveRafflePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  // Estados para controle do sorteio
  const [isStarting, setIsStarting] = useState(false);
  const [isEliminating, setIsEliminating] = useState(false);
  const [eliminatedNumbers, setEliminatedNumbers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isJoining, setIsJoining] = useState(false);

  // Hook de tempo real para o jogo ativo
  const { game, participants, loading, refreshData } = useLiveGameRealtime(
    activeGameId || '',
    user?.id
  );

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const loadActiveRaffle = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('live_games')
        .select('*')
        .eq('status', 'waiting') // Tenta buscar um esperando primeiro
        .limit(1);

      // Se não achar waiting, tenta active
      if (!data || data.length === 0) {
        const { data: activeData } = await supabase
          .from('live_games')
          .select('*')
          .eq('status', 'active')
          .limit(1);

        if (activeData && activeData.length > 0) {
          setActiveGameId(activeData[0].id);
          setIsEliminating(true);
          setTimeLeft(activeData[0].elimination_interval || 60);
          return;
        }
      }

      if (error) {
        showMessage('Erro ao carregar sorteio ativo', 'error');
        return;
      }

      if (data && data.length > 0) {
        const gameData = data[0];
        setActiveGameId(gameData.id);

        if (gameData.status === 'active') {
          setIsEliminating(true);
          setTimeLeft(gameData.elimination_interval || 60);
        }
      } else {
        setActiveGameId(null);
      }
    } catch {
      showMessage('Erro ao carregar sorteio', 'error');
    }
  };

  const endRaffle = async (winner: any) => {
    if (!game) return;
    setIsEliminating(false);
    try {
      const { error } = await supabase
        .from('live_games')
        .update({
          status: 'finished',
          winner_id: winner.user_id,
          finished_at: new Date().toISOString()
        })
        .eq('id', game.id);

      if (error) throw error;
      refreshData();
      showMessage(`🏆 VENCEDOR: ${winner.user_name} com o número ${winner.lucky_number}!`, 'success');
    } catch {
      showMessage('❌ Erro ao finalizar sorteio', 'error');
    }
  };

  const eliminateNext = async () => {
    if (!game) return;
    const activeParticipants = participants.filter(p => p.status === 'active');

    if (activeParticipants.length <= 1) {
      const winner = activeParticipants[0];
      await endRaffle(winner);
      return;
    }

    const randomIndex = Math.floor(Math.random() * activeParticipants.length);
    const eliminatedParticipant = activeParticipants[randomIndex];

    setEliminatedNumbers(prev => [...prev, eliminatedParticipant.lucky_number]);
    showMessage(`💀 ${eliminatedParticipant.user_name} (${eliminatedParticipant.lucky_number}) foi eliminado!`, 'info');

    try {
      const { error } = await supabase
        .from('live_participants')
        .update({
          status: 'eliminated',
          eliminated_at: new Date().toISOString()
        })
        .eq('id', eliminatedParticipant.id);

      if (error) throw error;
      refreshData();
    } catch {
      // Silent error
    }
    setTimeLeft(game.elimination_interval || 60);
  };

  useEffect(() => {
    if (user) {
      loadActiveRaffle();
    }
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isEliminating && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            eliminateNext();
            return game?.elimination_interval || 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isEliminating, timeLeft, game?.elimination_interval, eliminateNext]);

  const createLiveRaffle = async () => {
    if (!user) return;
    setIsStarting(true);
    try {
      const newRaffle = {
        title: 'Sorteio ao Vivo - Resta Um',
        description: 'Escolha seu número da sorte e veja quem sobrevive até o final!',
        max_participants: 50,
        status: 'waiting',
        is_active: true,
        created_by: user.id, // Mudei de admin_id para created_by baseado no schema provável
        current_round: 0,
        elimination_interval: 60,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('live_games')
        .insert([newRaffle])
        .select()
        .single();

      if (error) throw error;

      setActiveGameId(data.id);
      showMessage('🎉 Sorteio criado com sucesso!', 'success');
    } catch {
      showMessage('❌ Erro ao criar sorteio', 'error');
    } finally {
      setIsStarting(false);
    }
  };

  const joinRaffle = async (number: number) => {
    if (!user || !game) return;

    if (game.started_at) {
      showMessage('❌ Este sorteio já começou!', 'error');
      return;
    }

    setIsJoining(true);
    try {
      const { data: existingParticipant } = await supabase
        .from('live_participants')
        .select('id')
        .eq('game_id', game.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingParticipant) {
        showMessage('❌ Você já está participando!', 'error');
        return;
      }

      const { data: numberTaken } = await supabase
        .from('live_participants')
        .select('id')
        .eq('game_id', game.id)
        .eq('lucky_number', number)
        .maybeSingle();

      if (numberTaken) {
        showMessage('❌ Número já escolhido!', 'error');
        return;
      }

      const { error } = await supabase
        .from('live_participants')
        .insert({
          game_id: game.id,
          user_id: user.id,
          user_name: user?.email?.split('@')[0] || 'Usuário',
          lucky_number: number,
          status: 'active',
          joined_at: new Date().toISOString()
        });

      if (error) throw error;

      const { error: updateError } = await supabase
        .from('live_games')
        .update({
          current_participants: (game.current_participants || 0) + 1
        })
        .eq('id', game.id);

      if (updateError) throw updateError;

      refreshData();
      showMessage(`✅ Número ${number} confirmado!`, 'success');
    } catch {
      showMessage('❌ Erro ao entrar no sorteio', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const startElimination = async () => {
    if (!game || participants.length < 2) {
      showMessage('❌ Mínimo 2 participantes!', 'error');
      return;
    }

    setIsStarting(true);
    showMessage('🎮 Iniciando...', 'info');

    try {
      const { error } = await supabase
        .from('live_games')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
          current_round: 1
        })
        .eq('id', game.id);

      if (error) throw error;

      setTimeout(() => {
        setIsStarting(false);
        setIsEliminating(true);
        setTimeLeft(game.elimination_interval || 60);
        showMessage('🔥 Valendo!', 'info');
      }, 2000);
    } catch {
      showMessage('❌ Erro ao iniciar', 'error');
      setIsStarting(false);
    }
  };

  const isAdmin = true; // Simplificado para demo, idealmente verificar flag
  const userParticipant = participants.find(p => p.user_id === user?.id);
  const activeParticipants = participants.filter(p => p.status === 'active') || [];
  const eliminatedParticipants = participants.filter(p => p.status === 'eliminated') || [];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>

      <main className="flex-grow w-full py-8 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 z-10">

          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-3xl p-6 mb-8 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent"></div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate('/live-games')} className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary-light rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
                  <Gamepad2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white italic tracking-tight uppercase">Resta Um <span className="text-accent">Cruzeiro</span></h1>
                  <p className="text-blue-200 text-sm">O último a ficar de pé leva o prêmio!</p>
                </div>
              </div>

              {/* Status Badge */}
              {game && (
                <div className="flex items-center gap-3">
                  <div className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider flex items-center gap-2 border ${game.status === 'active'
                    ? 'bg-green-500/20 text-green-400 border-green-500/50'
                    : game.status === 'waiting'
                      ? 'bg-accent/20 text-accent border-accent/50'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                    }`}>
                    {game.status === 'active' ? <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> : null}
                    {game.status === 'active' ? 'Ao Vivo' :
                      game.status === 'waiting' ? 'Aguardando' :
                        'Finalizado'}
                  </div>

                  {isEliminating && (
                    <div className="px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse">
                      🔥 Eliminando
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Alerts */}
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <div className={`px-4 py-3 rounded-xl border flex items-center gap-3 ${messageType === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-200' :
                    messageType === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-200' :
                      'bg-blue-500/20 border-blue-500/50 text-blue-200'
                    }`}>
                    {messageType === 'success' ? <CheckCircle className="w-5 h-5" /> :
                      messageType === 'error' ? <XCircle className="w-5 h-5" /> :
                        <AlertCircle className="w-5 h-5" />}
                    <span className="font-bold text-sm">{message}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {!game ? (
            /* No Raffle State */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel rounded-3xl p-12 text-center"
            >
              <Target className="w-20 h-20 text-white/20 mx-auto mb-6" />
              <h3 className="text-2xl font-black text-white mb-2">Nenhum Jogo Ativo</h3>
              <p className="text-blue-200 mb-8">No momento não há nenhuma rodada de Resta Um acontecendo.</p>

              {isAdmin && (
                <button
                  onClick={createLiveRaffle}
                  disabled={loading}
                  className="btn btn-primary px-8 py-3 shadow-lg shadow-blue-500/20"
                >
                  {loading ? 'Criando...' : 'Iniciar Novo Jogo'}
                </button>
              )}
            </motion.div>
          ) : (
            <>
              {/* Game Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-200 uppercase font-bold">Total</p>
                    <p className="text-xl font-black text-white">{participants.length}</p>
                  </div>
                </div>

                <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-green-200 uppercase font-bold">Vivos</p>
                    <p className="text-xl font-black text-white">{activeParticipants.length}</p>
                  </div>
                </div>

                <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-red-200 uppercase font-bold">Eliminados</p>
                    <p className="text-xl font-black text-white">{eliminatedParticipants.length}</p>
                  </div>
                </div>

                <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-accent uppercase font-bold">Rodada</p>
                    <p className="text-xl font-black text-white">{game.current_round}</p>
                  </div>
                </div>
              </div>

              {/* Admin Controls */}
              {isAdmin && !game.ended_at && (
                <div className="glass-panel p-6 rounded-3xl mb-8">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    {isEliminating && timeLeft > 0 && (
                      <div className="flex items-center gap-4 bg-black/20 px-6 py-3 rounded-xl border border-white/5 w-full md:w-auto">
                        <Clock className="w-6 h-6 text-red-400 animate-pulse" />
                        <div>
                          <p className="text-xs text-red-200 uppercase font-bold">Próxima Eliminação</p>
                          <p className="text-2xl font-black text-white font-mono">{formatTime(timeLeft)}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 w-full md:w-auto">
                      {participants.length >= 2 && !isStarting && !isEliminating && (
                        <button
                          onClick={startElimination}
                          className="btn btn-primary px-8 flex-1 md:flex-none shadow-lg shadow-blue-500/20"
                        >
                          <Play className="w-4 h-4 inline mr-2" />
                          Iniciar Jogo
                        </button>
                      )}

                      {(isStarting || isEliminating) && (
                        <div className="px-6 py-3 bg-white/5 rounded-xl border border-white/10 text-white font-bold flex items-center gap-3">
                          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                          Jogo em Andamento...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Game Grid */}
              <div className="glass-panel p-8 rounded-3xl mb-8">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {game.started_at ? 'O Jogo Começou!' : `Escolha seu Número (1-${game.max_participants || 50})`}
                    </h3>
                    {game.started_at && <p className="text-blue-200 text-sm">Nenhum novo jogador pode entrar agora.</p>}
                  </div>

                  {userParticipant ? (
                    <div className="px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-xl">
                      <p className="text-green-400 text-sm font-bold flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Você é o #{userParticipant.lucky_number}
                      </p>
                    </div>
                  ) : !game.started_at && !game.ended_at && (
                    <div className="px-4 py-2 bg-accent/20 border border-accent/50 rounded-xl">
                      <p className="text-accent text-sm font-bold flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Escolha 1 número
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 md:gap-3">
                  {Array.from({ length: game.max_participants || 50 }, (_, i) => {
                    const number = i + 1;
                    const participant = participants.find(p => p.lucky_number === number);
                    const isTaken = !!participant;
                    const isEliminated = participant?.status === 'eliminated';
                    const isUserNumber = userParticipant?.lucky_number === number;
                    const canSelect = !isTaken && !isAdmin && !loading && !game?.ended_at && !game?.started_at && !userParticipant;

                    return (
                      <button
                        key={number}
                        onClick={() => canSelect && joinRaffle(number)}
                        disabled={!canSelect}
                        className={`
                         aspect-square rounded-xl font-bold text-lg md:text-xl flex items-center justify-center transition-all duration-300 relative overflow-hidden
                         ${isTaken && !isEliminated ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : ''}
                         ${isEliminated ? 'bg-red-900/50 text-red-500 border border-red-500/30 grayscale' : ''}
                         ${isUserNumber ? 'bg-gradient-to-br from-green-500 to-green-600 text-white ring-2 ring-green-400 shadow-lg shadow-green-500/40 z-10 scale-105' : ''}
                         ${!isTaken && !isEliminated && !isUserNumber && canSelect ? 'bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-accent hover:text-accent hover:shadow-[0_0_15px_rgba(250,204,21,0.3)]' : ''}
                         ${!canSelect && !isTaken && !isEliminated ? 'opacity-30 cursor-not-allowed bg-white/5 text-white/50' : ''}
                       `}
                      >
                        <span className="relative z-10">{number}</span>
                        {isUserNumber && <motion.div layoutId="user-ring" className="absolute inset-0 border-2 border-white/50 rounded-xl" />}
                        {isEliminated && <div className="absolute inset-0 flex items-center justify-center opacity-50"><XCircle className="w-full h-full p-2 text-red-500" /></div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Winner Display */}
              {game?.winner_id && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="glass-panel p-8 rounded-3xl text-center border-t-4 border-t-accent"
                >
                  <div className="w-24 h-24 bg-gradient-to-br from-accent to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-accent/30">
                    <Crown className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tight">Vencedor!</h2>
                  <p className="text-xl text-accent font-bold">
                    {(() => {
                      const winner = participants.find(p => p.user_id === game.winner_id);
                      return winner ? `${winner.name} 🎉 #${winner.number}` : 'Aguardando...';
                    })()}
                  </p>
                </motion.div>
              )}
            </>
          )}
        </div>
      </main>

    </>
  );
};

export default LiveRafflePage;
