import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useLiveGameRealtime, LiveGame, Participant } from '../hooks/useLiveGameRealtime';
import LiveGameNumberGrid from '../components/user/LiveGameNumberGrid';

const LiveParticipationPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const { currentUser: currentAppUser } = useData();
  const navigate = useNavigate();
  const [luckyNumber, setLuckyNumber] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joining, setJoining] = useState(false);
  const [showEliminationModal, setShowEliminationModal] = useState(false);

  // Hook de tempo real
  const { game, participants, loading, isEliminated, refreshData } = useLiveGameRealtime(
    gameId || '',
    user?.id
  );

  // Encontrar participação do usuário atual
  const myParticipation = participants.find(p => p.user_id === user?.id) || null;

  useEffect(() => {
    // Aguardar o carregamento completo antes de redirecionar
    if (loading) return;

    // Se for admin, redirecionar para página de controle
    if (currentAppUser?.is_admin) {
      navigate(`/admin/live-games/${gameId}/control`);
      return;
    }
  }, [user, currentAppUser, loading, navigate, gameId]);

  // Mostrar modal de eliminação quando o usuário for eliminado
  useEffect(() => {
    if (isEliminated) {
      setShowEliminationModal(true);
    }
  }, [isEliminated]);

  const joinGame = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!luckyNumber || isNaN(parseInt(luckyNumber))) {
      toast.error('Por favor, escolha um número da sorte válido');
      return;
    }

    const number = parseInt(luckyNumber);
    if (number < 1 || number > 999) {
      toast.error('O número deve estar entre 1 e 999');
      return;
    }

    // Verificar se o jogo ainda está aceitando participantes
    if (game?.status !== 'waiting') {
      toast.error('Este jogo não está mais aceitando participantes');
      return;
    }

    // Verificar se o número já foi escolhido
    const numberTaken = participants.some(p => p.lucky_number === number);
    if (numberTaken) {
      toast.error('Este número já foi escolhido por outro participante');
      return;
    }

    setJoining(true);
    try {
      const { error } = await supabase
        .from('live_participants')
        .insert({
          game_id: gameId,
          user_id: user?.id,
          lucky_number: number,
          status: 'active'
        });

      if (error) throw error;

      toast.success(`Você entrou no jogo com o número ${number}!`);
      setShowJoinModal(false);
      setLuckyNumber('');

      // Atualizar dados em tempo real
      refreshData();
    } catch (error) {

      toast.error('Erro ao entrar no jogo');
    } finally {
      setJoining(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300';
      case 'active': return 'bg-green-100 text-green-700 border-2 border-green-300';
      case 'finished': return 'bg-blue-100 text-blue-700 border-2 border-blue-300';
      default: return 'bg-gray-100 text-gray-700 border-2 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Aguardando Participantes';
      case 'active': return 'Jogo em Andamento';
      case 'finished': return 'Jogo Finalizado';
      default: return 'Status Desconhecido';
    }
  };

  const activeParticipants = participants.filter(p => p.status === 'active');
  const eliminatedParticipants = participants.filter(p => p.status === 'eliminated');
  const isWinner = game?.winner_user_id === user?.id;
  const canJoin = game?.status === 'waiting' && !myParticipation && participants.length < (game?.max_participants || 0);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-600 font-semibold">Carregando...</p>
        </motion.div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex-grow flex items-center justify-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Jogo não encontrado</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg"
          >
            Voltar para Lista
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <main className="flex-grow w-full py-4 sm:py-6 lg:py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8"
          >
            <motion.button
              whileHover={{ x: -5 }}
              onClick={() => navigate(-1)}
              className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2 transition-colors text-sm sm:text-base font-semibold"
            >
              ← Voltar para Lista
            </motion.button>

            <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 mb-2">
                    🎮 {game.title}
                  </h1>
                  <p className="text-gray-600 text-sm sm:text-base">
                    {game.description || 'Jogo "Resta Um" - Seja o último participante!'}
                  </p>
                </div>
                <div className="flex flex-col sm:text-right gap-2">
                  <div className={`inline-block px-3 py-2 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold ${getStatusColor(game.status)} text-center`}>
                    {getStatusText(game.status)}
                  </div>
                  <div className="text-gray-600 text-xs sm:text-sm font-semibold text-center sm:text-right">
                    {participants.length}/{game.max_participants} participantes
                  </div>
                </div>
              </div>

              {/* Winner Announcement */}
              {game.status === 'finished' && game.winner_number && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-gradient-to-r from-blue-100 to-blue-200 border-2 border-blue-300 rounded-xl p-4 mb-4"
                >
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                      className="text-3xl sm:text-4xl mb-2"
                    >
                      🏆
                    </motion.div>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-gray-900 mb-2">
                      Jogo Finalizado!
                    </h3>
                    <p className="text-blue-700 text-sm sm:text-base font-semibold">
                      Número vencedor: <span className="font-black text-xl sm:text-2xl text-yellow-600">{game.winner_number}</span>
                    </p>
                    {isWinner && (
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="mt-3 text-green-600 font-black text-sm sm:text-base lg:text-lg"
                      >
                        🎉 Parabéns! Você é o vencedor! 🎉
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* My Participation Status */}
              {myParticipation && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`rounded-xl p-3 sm:p-4 mb-4 border-2 ${myParticipation.status === 'active'
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-red-50 border-red-300 text-red-700'
                    }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <span className="font-bold text-sm sm:text-base">
                        Seu número da sorte: {myParticipation.lucky_number}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm font-semibold">
                      {myParticipation.status === 'active' ? '✅ Ativo' : '❌ Eliminado'}
                    </div>
                  </div>
                  {myParticipation.status === 'eliminated' && myParticipation.eliminated_at && (
                    <div className="text-xs sm:text-sm mt-2 opacity-75">
                      Eliminado em: {new Date(myParticipation.eliminated_at).toLocaleString('pt-BR')}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Elimination Alert */}
              {isEliminated && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-4"
                >
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="text-4xl mb-2"
                    >
                      💀
                    </motion.div>
                    <h3 className="text-lg font-black text-red-600 mb-2">
                      Você foi eliminado!
                    </h3>
                    <p className="text-red-700 text-sm font-semibold">
                      Infelizmente sua sorte não foi desta vez. Continue participando dos próximos jogos!
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Join Button */}
              {canJoin && (
                <div className="text-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (!user) {
                        navigate('/login');
                        return;
                      }
                      setShowJoinModal(true);
                    }}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-black text-base sm:text-lg transition-all duration-300 shadow-lg hover:shadow-xl w-full sm:w-auto"
                  >
                    🎯 Participar do Jogo
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Number Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-4 sm:p-6 mb-6"
          >
            <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
              🎯 Números da Sorte (1-{game.max_participants})
            </h3>

            <LiveGameNumberGrid
              participants={participants}
              currentUserId={user?.id}
              onNumberClick={canJoin ? (number) => {
                if (!user) {
                  navigate('/login');
                  return;
                }
                setLuckyNumber(number.toString());
                setShowJoinModal(true);
              } : undefined}
              disabled={!canJoin}
              maxNumbers={game.max_participants}
            />
          </motion.div>

          {/* Participants Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Active Participants */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg border-2 border-green-200 p-4 sm:p-6"
            >
              <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                ✅ Participantes Ativos ({activeParticipants.length})
              </h3>

              {activeParticipants.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 max-h-80 sm:max-h-96 overflow-y-auto no-scrollbar">
                  {activeParticipants.map((participant) => (
                    <div
                      key={participant.id}
                      className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all duration-300 ${participant.user_id === user?.id
                        ? 'border-blue-500 bg-blue-100 text-blue-700'
                        : 'border-gray-200 bg-gray-50 text-gray-700'
                        }`}
                    >
                      <div className="text-center">
                        <div className="text-lg sm:text-xl font-bold mb-1">
                          {participant.lucky_number}
                        </div>
                        <div className="text-xs truncate">
                          {participant.user_name}
                        </div>
                        {participant.user_id === user?.id && (
                          <div className="text-xs text-blue-600 font-bold mt-1">
                            (Você)
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8 text-gray-400 text-sm sm:text-base">
                  Nenhum participante ativo
                </div>
              )}
            </motion.div>

            {/* Eliminated Participants */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-lg border-2 border-red-200 p-4 sm:p-6"
            >
              <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                ❌ Participantes Eliminados ({eliminatedParticipants.length})
              </h3>

              {eliminatedParticipants.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 max-h-80 sm:max-h-96 overflow-y-auto no-scrollbar">
                  {eliminatedParticipants.map((participant) => (
                    <div
                      key={participant.id}
                      className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 opacity-60 transition-all duration-300 ${participant.user_id === user?.id
                        ? 'border-red-500 bg-red-100 text-red-700'
                        : 'border-gray-200 bg-gray-50 text-gray-400'
                        }`}
                    >
                      <div className="text-center">
                        <div className="text-lg sm:text-xl font-bold mb-1 line-through">
                          {participant.lucky_number}
                        </div>
                        <div className="text-xs truncate">
                          {participant.user_name}
                        </div>
                        {participant.user_id === user?.id && (
                          <div className="text-xs text-red-400 mt-1">
                            (Você)
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8 text-gray-400 text-sm sm:text-base">
                  Nenhum participante eliminado ainda
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </>
  );
};

export default LiveParticipationPage;