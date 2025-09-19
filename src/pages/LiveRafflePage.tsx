import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Play, Users, Target, Trophy, Crown, Zap, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useLiveGameRealtime } from '../hooks/useLiveGameRealtime';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

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
  const { game, participants, loading, isEliminated, refreshData } = useLiveGameRealtime(
    activeGameId || '', 
    user?.id
  );

  // Função para mostrar mensagens
  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  // Função para carregar sorteio ativo
  const loadActiveRaffle = async () => {
    if (!user) {
      console.log('Usuário não autenticado, pulando carregamento do sorteio');
      return;
    }

    try {
      console.log('Loading active live raffle for user:', user.id);
      
      const { data, error } = await supabase
        .from('live_games')
        .select('*')
        .eq('status', 'waiting')
        .limit(1);

      if (error) {
        console.log('Error loading live raffle:', error);
        console.error('Erro ao carregar sorteio:', error);
        showMessage('Erro ao carregar sorteio ativo', 'error');
        return;
      }

      if (data && data.length > 0) {
        const game = data[0];
        console.log('Live raffle loaded successfully:', game);
        setActiveGameId(game.id);
        
        // Se o jogo está ativo, configurar timer
        if (game.status === 'active') {
          setIsEliminating(true);
          setTimeLeft(game.elimination_interval || 60);
        }
      } else {
        console.log('No active live raffle found');
        setActiveGameId(null);
      }
    } catch (error) {
      console.error('Erro ao carregar sorteio:', error);
      showMessage('Erro ao carregar sorteio', 'error');
    }
  };

  // Função para finalizar o sorteio
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

      // Atualizar dados em tempo real
      refreshData();
      showMessage(`🏆 VENCEDOR: ${winner.user_name} com o número ${winner.lucky_number}!`, 'success');
      
      // Aqui você pode integrar com WhatsApp para notificar o vencedor
      // await notifyWinner(winner);
    } catch (error) {
      console.error('Erro ao finalizar sorteio:', error);
      showMessage('❌ Erro ao finalizar sorteio', 'error');
    }
  };

  // Função para eliminar próximo participante
  const eliminateNext = async () => {
    if (!game) return;

    const activeParticipants = participants.filter(p => p.status === 'active');
    
    if (activeParticipants.length <= 1) {
      // Temos um vencedor!
      const winner = activeParticipants[0];
      await endRaffle(winner);
      return;
    }

    // Escolher participante aleatório para eliminação
    const randomIndex = Math.floor(Math.random() * activeParticipants.length);
    const eliminatedParticipant = activeParticipants[randomIndex];

    setEliminatedNumbers(prev => [...prev, eliminatedParticipant.lucky_number]);
    showMessage(`💀 ${eliminatedParticipant.user_name} (${eliminatedParticipant.lucky_number}) foi eliminado!`, 'info');

    // Atualizar participante eliminado no banco
    try {
      const { error } = await supabase
        .from('live_participants')
        .update({ 
          status: 'eliminated',
          eliminated_at: new Date().toISOString()
        })
        .eq('id', eliminatedParticipant.id);

      if (error) throw error;

      // Atualizar dados em tempo real
      refreshData();
    } catch (error) {
      console.error('Erro ao atualizar eliminação:', error);
    }

    // Resetar timer para próxima eliminação
    setTimeLeft(game.elimination_interval || 60);
  };

  useEffect(() => {
    // Só carregar se o usuário estiver autenticado
    if (user) {
      loadActiveRaffle();
    }
  }, [user]);

  // Timer para eliminação
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
        is_active: true,
        admin_id: user.id,
        participants: [],
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
      showMessage('🎉 Sorteio criado com sucesso! Compartilhe o link para participantes se inscreverem.', 'success');
    } catch (error) {
      console.error('Erro ao criar sorteio:', error);
      showMessage('❌ Erro ao criar sorteio', 'error');
    } finally {
      setIsStarting(false);
    }
  };

  const joinRaffle = async (number: number) => {
    if (!user || !game) return;

    // Verificar se o sorteio já começou
    if (game.started_at) {
      showMessage('❌ Este sorteio já começou! Não é possível entrar agora.', 'error');
      return;
    }

    setIsJoining(true);
    try {
      // Verificar se o usuário já está participando
      const { data: existingParticipant, error: participantError } = await supabase
        .from('live_participants')
        .select('id')
        .eq('game_id', game.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (participantError) {
        console.error('Erro ao verificar participação:', participantError);
        showMessage('❌ Erro ao verificar participação. Tente novamente.', 'error');
        return;
      }

      if (existingParticipant) {
        showMessage('❌ Você já está participando deste sorteio!', 'error');
        return;
      }

      // Verificar se o número já foi escolhido
      const { data: numberTaken, error: numberError } = await supabase
        .from('live_participants')
        .select('id')
        .eq('game_id', game.id)
        .eq('lucky_number', number)
        .maybeSingle();

      if (numberError) {
        console.error('Erro ao verificar número:', numberError);
        showMessage('❌ Erro ao verificar número. Tente novamente.', 'error');
        return;
      }

      if (numberTaken) {
        showMessage('❌ Este número já foi escolhido!', 'error');
        return;
      }

      // Inserir participante na tabela live_participants
      const { error } = await supabase
        .from('live_participants')
        .insert({
          game_id: game.id,
          user_id: user.id,
          user_name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
          lucky_number: number,
          status: 'active',
          joined_at: new Date().toISOString()
        });

      if (error) throw error;

      // Atualizar contador de participantes no jogo
      const { error: updateError } = await supabase
        .from('live_games')
        .update({ 
          current_participants: (game.current_participants || 0) + 1 
        })
        .eq('id', game.id);

      if (updateError) throw updateError;

      // Atualizar dados em tempo real
      refreshData();
      
      showMessage(`✅ Você escolheu o número ${number}! Boa sorte!`, 'success');
    } catch (error) {
      console.error('Erro ao entrar no sorteio:', error);
      showMessage('❌ Erro ao entrar no sorteio', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const startElimination = async () => {
    if (!game || participants.length < 2) {
      showMessage('❌ Precisa de pelo menos 2 participantes para começar!', 'error');
      return;
    }

    setIsStarting(true);
    showMessage('🎮 Iniciando eliminação...', 'info');
    
    try {
      // Atualizar no banco que o sorteio começou
      const { error } = await supabase
        .from('live_games')
        .update({ 
          started_at: new Date().toISOString(),
          current_round: 1
        })
        .eq('id', game.id);

      if (error) throw error;

      // Iniciar eliminação
      setTimeout(() => {
        setIsStarting(false);
        setIsEliminating(true);
        setTimeLeft(game.elimination_interval || 60);
        showMessage('🔥 Eliminação em andamento!', 'info');
      }, 2000);
    } catch (error) {
      console.error('Erro ao iniciar eliminação:', error);
      showMessage('❌ Erro ao iniciar eliminação', 'error');
      setIsStarting(false);
    }
  };

  const isAdmin = user?.id === game?.created_by;
  const userParticipant = participants.find(p => p.user_id === user?.id);
  const activeParticipants = participants.filter(p => p.status === 'active') || [];
  const eliminatedParticipants = participants.filter(p => p.status === 'eliminated') || [];

  // Função para formatar tempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full px-2 sm:px-4 lg:px-8">
      <Header />
      
      <main className="flex-grow py-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">🎮</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sorteio ao Vivo - Resta Um</h1>
                <p className="text-gray-600 text-sm">Escolha seu número da sorte e sobreviva até o final!</p>
              </div>
            </div>
            
            {/* Status Badge */}
            {game && (
              <div className="flex space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  game.status === 'active' 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : game.status === 'waiting'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-gray-100 text-gray-800 border border-gray-200'
                }`}>
                  {game.status === 'active' ? '🟢 Ativo' : 
                   game.status === 'waiting' ? '⏳ Aguardando' : 
                   '🔴 Finalizado'}
                </span>
                {isEliminating && (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800 border border-red-200">
                    🔥 Eliminando
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Message Alert */}
          {message && (
            <div className={`rounded-lg p-4 mb-4 border ${
              messageType === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              messageType === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <div className="flex items-center space-x-2">
                {messageType === 'success' ? <CheckCircle className="h-5 w-5" /> :
                 messageType === 'error' ? <XCircle className="h-5 w-5" /> :
                 <AlertCircle className="h-5 w-5" />}
                <span className="font-medium">{message}</span>
              </div>
            </div>
          )}
        </div>

        {!game ? (
          /* No Raffle State */
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum sorteio ativo</h3>
            <p className="text-gray-600 mb-6">Não há sorteios ao vivo no momento.</p>
            {isAdmin && (
              <button
                onClick={createLiveRaffle}
                disabled={loading}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200"
              >
                {loading ? 'Criando...' : 'Criar Novo Sorteio'}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Raffle Info Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-blue-600 text-sm font-medium">Total</p>
                      <p className="text-blue-900 text-xl font-bold">{participants.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-green-600 text-sm font-medium">Ativos</p>
                      <p className="text-green-900 text-xl font-bold">{activeParticipants.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <XCircle className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-red-600 text-sm font-medium">Eliminados</p>
                      <p className="text-red-900 text-xl font-bold">{eliminatedParticipants.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <Trophy className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-purple-600 text-sm font-medium">Rodada</p>
                      <p className="text-purple-900 text-xl font-bold">{game.current_round}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timer and Admin Controls */}
              {isAdmin && (
                <div className="border-t border-gray-200 pt-6">
                  {isEliminating && timeLeft > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Clock className="h-5 w-5 text-red-600" />
                          <span className="text-red-800 font-semibold">Próxima eliminação em:</span>
                        </div>
                        <span className="text-2xl font-bold text-red-900">{formatTime(timeLeft)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-4">
                    {participants.length === 0 && (
                      <button
                        onClick={createLiveRaffle}
                        disabled={loading}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200"
                      >
                        {loading ? 'Criando...' : 'Criar Sorteio'}
                      </button>
                    )}

                    {participants.length >= 2 && !isStarting && !isEliminating && !game?.ended_at && (
                      <button
                        onClick={startElimination}
                        className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200"
                      >
                        <Play className="h-4 w-4 inline mr-2" />
                        Iniciar Eliminação
                      </button>
                    )}

                    {(isStarting || isEliminating) && (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
                        <span className="text-gray-700 font-medium">
                          {isStarting ? 'Iniciando...' : 'Eliminação em andamento...'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Number Grid */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {game.started_at ? 'Sorteio em andamento' : 'Escolha seu número da sorte (1-50)'}
                  </h3>
                  {game.started_at && (
                    <p className="text-sm text-gray-600 mt-1">
                      O sorteio já começou! Não é mais possível escolher números.
                    </p>
                  )}
                </div>
                
                {userParticipant && (
                  <div className="text-right">
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                      Seu número: #{userParticipant.lucky_number}
                    </span>
                    <p className="text-xs text-gray-600 mt-1">Você está participando!</p>
                  </div>
                )}
                
                {!userParticipant && !game.started_at && !game.ended_at && (
                  <div className="text-right">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                      Escolha 1 número
                    </span>
                    <p className="text-xs text-gray-600 mt-1">Apenas um por sorteio</p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 sm:gap-2 mb-6">
                {Array.from({ length: 50 }, (_, i) => {
                  const number = i + 1;
                  const participant = participants.find(p => p.lucky_number === number);
                  const isTaken = !!participant;
                  const isEliminated = participant?.status === 'eliminated';
                  const isUserNumber = userParticipant?.lucky_number === number;

                  // Verificar se o usuário já está participando
                  const userAlreadyParticipating = userParticipant !== undefined;
                  const canSelect = !isTaken && !isAdmin && !loading && !game?.ended_at && !game?.started_at && !userAlreadyParticipating;

                  return (
                    <button
                      key={number}
                      onClick={() => canSelect && joinRaffle(number)}
                      disabled={!canSelect}
                      className={`
                        w-16 h-16 sm:w-12 sm:h-12 rounded-xl sm:rounded-lg font-bold text-lg sm:text-sm transition-all duration-200 flex items-center justify-center
                        ${isTaken && !isEliminated ? 'bg-purple-500 text-white shadow-lg shadow-purple-200' : ''}
                        ${isEliminated ? 'bg-red-500 text-white shadow-lg shadow-red-200' : ''}
                        ${isUserNumber ? 'bg-green-500 text-white ring-4 ring-green-300 shadow-lg shadow-green-200' : ''}
                        ${!isTaken && !isEliminated && !isUserNumber && canSelect ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md' : ''}
                        ${!canSelect ? 'cursor-not-allowed opacity-50' : 'cursor-pointer active:scale-95'}
                        touch-manipulation
                      `}
                    >
                      {number}
                    </button>
                  );
                })}
              </div>

              {/* Legendas */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 sm:w-4 sm:h-4 bg-gray-100 border border-gray-200 rounded-lg sm:rounded"></div>
                  <span className="text-gray-600 font-medium">Disponível</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 sm:w-4 sm:h-4 bg-purple-500 rounded-lg sm:rounded shadow-sm"></div>
                  <span className="text-gray-600 font-medium">Escolhido</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 sm:w-4 sm:h-4 bg-green-500 rounded-lg sm:rounded shadow-sm"></div>
                  <span className="text-gray-600 font-medium">Seu número</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 sm:w-4 sm:h-4 bg-red-500 rounded-lg sm:rounded shadow-sm"></div>
                  <span className="text-gray-600 font-medium">Eliminado</span>
                </div>
              </div>
              
              {/* Regra do jogo */}
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 font-medium">
                  📋 <strong>Regra do Resta Um:</strong> Cada participante pode escolher apenas <strong>1 número</strong> por sorteio. 
                  Uma vez escolhido, você não pode trocar ou escolher outro número.
                </p>
              </div>
            </div>

            {/* Participants List */}
            {participants.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Participantes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className={`p-4 rounded-lg border ${
                        participant.status === 'eliminated'
                          ? 'bg-red-50 border-red-200 text-red-800' 
                          : 'bg-green-50 border-green-200 text-green-800'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{participant.user_name}</span>
                        <span className="text-lg font-bold">#{participant.lucky_number}</span>
                      </div>
                      {participant.status === 'eliminated' && (
                        <p className="text-sm mt-1 text-red-600">💀 Eliminado</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Winner */}
            {game?.winner_id && (
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-8 text-center shadow-lg">
                <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-yellow-900 mb-2">🏆 VENCEDOR!</h2>
                <p className="text-xl text-yellow-800 font-semibold">
                  {(() => {
                    const winner = participants.find(p => p.user_id === game.winner_id);
                    return winner ? `${winner.user_name} com o número #${winner.lucky_number}` : 'Vencedor!';
                  })()}
                </p>
              </div>
            )}
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default LiveRafflePage;
