import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useLiveGameRealtime } from '../hooks/useLiveGameRealtime';
import LiveGameNumberGrid from '../components/user/LiveGameNumberGrid';

interface LiveGame {
  id: string;
  title: string;
  description: string;
  status: 'waiting' | 'active' | 'finished';
  max_participants: number;
  winner_number?: number;
  winner_user_id?: string;
  created_at: string;
}

interface Participant {
  id: string;
  user_id: string;
  lucky_number: number;
  status: 'active' | 'eliminated';
  eliminated_at?: string;
  user_name?: string;
}

const LiveParticipationPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
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
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  // Mostrar modal de eliminação quando o usuário for eliminado
  useEffect(() => {
    if (isEliminated) {
      setShowEliminationModal(true);
    }
  }, [isEliminated]);

  const joinGame = async () => {
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
      console.error('Erro ao entrar no jogo:', error);
      toast.error('Erro ao entrar no jogo');
    } finally {
      setJoining(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'finished': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Jogo não encontrado</h2>
          <button
            onClick={() => navigate('/live-games')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300"
          >
            Voltar para Lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full px-2 sm:px-4 lg:px-8">
      <div className="flex-grow bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate('/live-games')}
            className="text-purple-400 hover:text-purple-300 mb-4 flex items-center gap-2 transition-colors text-sm sm:text-base"
          >
            ← Voltar para Lista
          </button>
          
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">
                  🎮 {game.title}
                </h1>
                <p className="text-slate-300 text-sm sm:text-base">
                  {game.description || 'Jogo "Resta Um" - Seja o último participante!'}
                </p>
              </div>
              <div className="flex flex-col sm:text-right gap-2">
                <div className={`inline-block px-3 py-2 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold border ${getStatusColor(game.status)} text-center`}>
                  {getStatusText(game.status)}
                </div>
                <div className="text-slate-300 text-xs sm:text-sm text-center sm:text-right">
                  {participants.length}/{game.max_participants} participantes
                </div>
              </div>
            </div>

            {/* Winner Announcement */}
            {game.status === 'finished' && game.winner_number && (
              <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-4 mb-4">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl mb-2">🏆</div>
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2">
                    Jogo Finalizado!
                  </h3>
                  <p className="text-purple-300 text-sm sm:text-base">
                    Número vencedor: <span className="font-bold text-xl sm:text-2xl text-yellow-400">{game.winner_number}</span>
                  </p>
                  {isWinner && (
                    <div className="mt-3 text-green-400 font-bold text-sm sm:text-base lg:text-lg">
                      🎉 Parabéns! Você é o vencedor! 🎉
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* My Participation Status */}
            {myParticipation && (
              <div className={`rounded-xl p-3 sm:p-4 mb-4 border ${
                myParticipation.status === 'active' 
                  ? 'bg-green-500/20 border-green-500/30 text-green-400'
                  : 'bg-red-500/20 border-red-500/30 text-red-400'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="font-bold text-sm sm:text-base">
                      Seu número da sorte: {myParticipation.lucky_number}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm">
                    {myParticipation.status === 'active' ? '✅ Ativo' : '❌ Eliminado'}
                  </div>
                </div>
                {myParticipation.status === 'eliminated' && myParticipation.eliminated_at && (
                  <div className="text-xs sm:text-sm mt-2 opacity-75">
                    Eliminado em: {new Date(myParticipation.eliminated_at).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
            )}

            {/* Elimination Alert */}
            {isEliminated && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-4 animate-pulse">
                <div className="text-center">
                  <div className="text-4xl mb-2">💀</div>
                  <h3 className="text-lg font-bold text-red-400 mb-2">
                    Você foi eliminado!
                  </h3>
                  <p className="text-red-300 text-sm">
                    Infelizmente sua sorte não foi desta vez. Continue participando dos próximos jogos!
                  </p>
                </div>
              </div>
            )}

            {/* Join Button */}
            {canJoin && (
              <div className="text-center">
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 w-full sm:w-auto"
                >
                  🎯 Participar do Jogo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Number Grid */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
            🎯 Números da Sorte (1-{game.max_participants})
          </h3>
          
          <LiveGameNumberGrid
            participants={participants}
            currentUserId={user?.id}
            onNumberClick={canJoin ? (number) => {
              setLuckyNumber(number.toString());
              setShowJoinModal(true);
            } : undefined}
            disabled={!canJoin}
            maxNumbers={game.max_participants}
          />
        </div>

        {/* Participants Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Active Participants */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
              ✅ Participantes Ativos ({activeParticipants.length})
            </h3>
            
            {activeParticipants.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 max-h-80 sm:max-h-96 overflow-y-auto">
                {activeParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all duration-300 ${
                      participant.user_id === user?.id
                        ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                        : 'border-slate-600 bg-slate-700/50 text-white'
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
                        <div className="text-xs text-purple-400 mt-1">
                          (Você)
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-slate-400 text-sm sm:text-base">
                Nenhum participante ativo
              </div>
            )}
          </div>

          {/* Eliminated Participants */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
              ❌ Participantes Eliminados ({eliminatedParticipants.length})
            </h3>
            
            {eliminatedParticipants.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 max-h-80 sm:max-h-96 overflow-y-auto">
                {eliminatedParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 opacity-60 transition-all duration-300 ${
participant.user_id === user?.id
                        ? 'border-red-500 bg-red-500/20 text-red-300'
                        : 'border-slate-600 bg-slate-700/50 text-slate-400'
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
              <div className="text-center py-6 sm:py-8 text-slate-400 text-sm sm:text-base">
                Nenhum participante eliminado ainda
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Join Game Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md border border-slate-700">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">
              🎯 Escolha seu Número da Sorte
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-bold mb-2">
                  Número da Sorte (1-{game.max_participants})
                </label>
                <input
                  type="number"
                  min="1"
                  max={game.max_participants}
                  value={luckyNumber}
                  onChange={(e) => setLuckyNumber(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg sm:rounded-xl px-3 sm:px-4 py-3 text-white text-center text-xl sm:text-2xl font-bold placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="7"
                  autoFocus
                />
                <p className="text-slate-400 text-xs mt-2 text-center">
                  Escolha um número que ainda não foi selecionado
                </p>
              </div>

              {/* Grid de números no modal */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Selecione um número disponível:
                </label>
                <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto border border-slate-600 rounded-lg p-3 bg-slate-700/50">
                  {Array.from({ length: game.max_participants }, (_, i) => {
                    const number = i + 1;
                    const isTaken = participants.some(p => p.lucky_number === number);
                    const isSelected = parseInt(luckyNumber) === number;
                    
                    return (
                      <button
                        key={number}
                        onClick={() => !isTaken && setLuckyNumber(number.toString())}
                        disabled={isTaken}
                        className={`
                          w-8 h-8 rounded text-xs font-bold transition-all duration-200
                          ${isSelected 
                            ? 'bg-amber-500 text-white border-2 border-amber-400' 
                            : isTaken 
                              ? 'bg-red-500 text-white border-2 border-red-400 cursor-not-allowed opacity-60'
                              : 'bg-slate-600 text-slate-300 border-2 border-slate-500 hover:bg-slate-500 hover:border-slate-400'
                          }
                        `}
                      >
                        {number}
                      </button>
                    );
                  })}
                </div>
                <p className="text-slate-400 text-xs mt-2">
                  Números em vermelho já foram escolhidos
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-6">
              <button
                onClick={() => setShowJoinModal(false)}
                disabled={joining}
                className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white px-4 py-3 rounded-lg sm:rounded-xl font-bold transition-all duration-300 text-sm sm:text-base"
              >
                Cancelar
              </button>
              <button
                onClick={joinGame}
                disabled={joining || !luckyNumber}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-4 py-3 rounded-lg sm:rounded-xl font-bold transition-all duration-300 text-sm sm:text-base"
              >
                {joining ? 'Entrando...' : 'Participar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Elimination Modal */}
      {showEliminationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-red-500/30 animate-bounce">
            <div className="text-center">
              <div className="text-6xl mb-4">💀</div>
              <h2 className="text-2xl font-bold text-red-400 mb-4">
                Você foi eliminado!
              </h2>
              <p className="text-slate-300 mb-6">
                Infelizmente sua sorte não foi desta vez. Continue participando dos próximos jogos!
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowEliminationModal(false);
                  }}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300"
                >
                  Entendi
                </button>
                <button
                  onClick={() => navigate('/live-games')}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300"
                >
                  Ver Outros Jogos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveParticipationPage;