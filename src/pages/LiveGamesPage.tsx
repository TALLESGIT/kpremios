import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { Play, Users, Trophy, Clock, Eye, Gamepad2, ArrowLeft, Hash } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface LiveGame {
  id: string;
  title: string;
  description: string;
  status: 'waiting' | 'active' | 'finished' | 'cancelled';
  max_participants: number;
  current_participants: number;
  elimination_interval: number;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  winner_id?: string;
}

interface Participant {
  id: string;
  user_id: string;
  lucky_number: number;
  status: 'active' | 'eliminated';
  eliminated_at?: string;
  user_name?: string;
}

export default function LiveGamesPage() {
  const { currentUser: currentAppUser } = useData();
  const navigate = useNavigate();
  const [games, setGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'active' | 'finished'>('all');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState<LiveGame | null>(null);
  const [luckyNumber, setLuckyNumber] = useState('');
  const [joining, setJoining] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Verificar se está logado
  useEffect(() => {
    // Aguardar o carregamento completo antes de redirecionar
    if (loading) return;
    
    if (!currentAppUser) {
      navigate('/login');
    }
  }, [currentAppUser, loading, navigate]);

  // Carregar jogos
  useEffect(() => {
    loadGames();
  }, []);

  // Fallback: verificar jogos periodicamente (caso a subscription falhe)
  useEffect(() => {
    const interval = setInterval(() => {

      loadGames();
    }, 10000); // Verifica a cada 10 segundos

    return () => clearInterval(interval);
  }, []);

  // Real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel('live-games-list')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'live_games' 
      }, (payload) => {

        loadGames();
      })
      .subscribe((status) => {

      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadGames = async () => {
    try {

      const { data, error } = await supabase
        .from('live_games')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {

        throw error;
      }

      setGames(data || []);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async (gameId: string) => {
    try {
      const { data, error } = await supabase
        .from('live_participants')
        .select(`
          id,
          user_id,
          lucky_number,
          status,
          eliminated_at,
          users:user_id (name, whatsapp)
        `)
        .eq('game_id', gameId)
        .order('lucky_number', { ascending: true });

      if (error) throw error;
      
      const formattedParticipants = (data || []).map(p => ({
        ...p,
        user_name: (p.users as unknown as { name: string })?.name || 'Usuário'
      }));
      
      setParticipants(formattedParticipants);
    } catch (error) {

    }
  };

  const handleJoinGame = async (game: LiveGame) => {

    setSelectedGame(game);
    await loadParticipants(game.id);

    setShowJoinModal(true);
  };

  const joinGame = async () => {
    if (!selectedGame || !currentAppUser || !luckyNumber) return;

    const numberValue = parseInt(luckyNumber);
    if (numberValue < 1 || numberValue > 999) {
      toast.error('Número deve estar entre 1 e 999');
      return;
    }

    // Verificar se o jogo ainda está aceitando participantes
    if (selectedGame.status !== 'waiting') {
      toast.error('Este jogo não está mais aceitando participantes');
      return;
    }

    // Verificar se o número já foi escolhido
    const numberTaken = participants.some(p => p.lucky_number === numberValue);
    if (numberTaken) {
      toast.error('Este número já foi escolhido por outro participante');
      return;
    }

    setJoining(true);
    try {
      const { error } = await supabase
        .from('live_participants')
        .insert({
          game_id: selectedGame.id,
          user_id: currentAppUser.id,
          lucky_number: numberValue,
          status: 'active'
        });

      if (error) throw error;

      toast.success(`Você entrou no jogo com o número ${numberValue}!`);
      setShowJoinModal(false);
      setLuckyNumber('');
      loadGames(); // Recarregar para atualizar contadores
    } catch (error: any) {

      if (error.code === '23505') {
        toast.error('Você já está participando deste jogo');
      } else {
        toast.error('Erro ao entrar no jogo. Tente novamente.');
      }
    } finally {
      setJoining(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-400';
      case 'active': return 'bg-green-500';
      case 'finished': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Aguardando';
      case 'active': return 'Ao Vivo';
      case 'finished': return 'Finalizado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const filteredGames = games.filter(game => {
    if (filter === 'all') return true;
    return game.status === filter;
  });

  const getActionButton = (game: LiveGame) => {
    switch (game.status) {
      case 'waiting':
        return game.current_participants < game.max_participants ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleJoinGame(game)}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 text-sm sm:text-base shadow-lg shadow-blue-500/25"
          >
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">Participar</span>
            <span className="sm:hidden">Entrar</span>
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/live-games/${game.id}`)}
            className="bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 text-sm sm:text-base shadow-lg"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Assistir</span>
            <span className="sm:hidden">Ver</span>
          </motion.button>
        );
      case 'active':
        return (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            onClick={() => navigate(`/live-games/${game.id}`)}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 text-sm sm:text-base shadow-lg shadow-red-500/25"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Ao Vivo</span>
            <span className="sm:hidden">Live</span>
          </motion.button>
        );
      case 'finished':
        return (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/live-games/${game.id}`)}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 text-sm sm:text-base shadow-lg"
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Ver Resultado</span>
            <span className="sm:hidden">Resultado</span>
          </motion.button>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full px-2 sm:px-4 lg:px-8">
        <Header />
        <div className="flex-grow bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-blue-600 font-semibold">Carregando...</p>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <Header />
      
      <main className="flex-grow w-full">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 py-8 sm:py-12 lg:py-16 relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 opacity-20">
            <motion.div
              className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-300 rounded-full blur-3xl"
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            />
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <motion.div
                className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Gamepad2 className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </motion.div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-white mb-4 sm:mb-6 tracking-tight" style={{
                textShadow: '3px 3px 0px rgba(251, 191, 36, 0.8)',
              }}>
                Lives - Resta Um
              </h1>
              <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
                Participe das brincadeiras ao vivo e concorra a prêmios!
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filtros */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-8"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-1 flex flex-wrap gap-1 max-w-full shadow-lg border-2 border-blue-200">
              {[
                { key: 'all', label: 'Todas' },
                { key: 'waiting', label: 'Aguardando' },
                { key: 'active', label: 'Ao Vivo' },
                { key: 'finished', label: 'Finalizadas' }
              ].map(({ key, label }) => (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFilter(key as any)}
                  className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-bold transition-all duration-200 text-sm sm:text-base ${
                    filter === key
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  {label}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Lista de jogos */}
          <div className="space-y-4 sm:space-y-6">
            {filteredGames.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Gamepad2 className="w-12 h-12 sm:w-16 sm:h-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-blue-600 mb-2">Nenhum jogo encontrado</h3>
                <p className="text-sm sm:text-base text-blue-500">Não há jogos disponíveis no momento.</p>
              </motion.div>
            ) : (
              filteredGames.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-4 sm:p-6 hover:border-blue-400 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Informações do jogo */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                          <Hash className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900">{game.title}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${getStatusColor(game.status)}`}>
                              {getStatusText(game.status)}
                            </span>
                            <span className="text-gray-500 text-xs sm:text-sm">
                              {new Date(game.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {game.description && (
                        <p className="text-gray-600 mb-4 text-sm sm:text-base">{game.description}</p>
                      )}
                      
                      {/* Barra de progresso de participantes */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs sm:text-sm text-gray-600 font-semibold">Participantes</span>
                          <span className="text-xs sm:text-sm text-gray-700 font-bold">
                            {game.current_participants || 0} / {game.max_participants}
                          </span>
                        </div>
                        <div className="w-full bg-blue-100 rounded-full h-3">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ 
                              width: `${Math.min(((game.current_participants || 0) / game.max_participants) * 100, 100)}%` 
                            }}
                            transition={{ duration: 0.5 }}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full shadow-lg"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Ações */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      {getActionButton(game)}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
        </div>

          {/* Estatísticas das lives */}
          {games.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8 sm:mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-white rounded-2xl p-4 sm:p-6 text-center border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="text-2xl sm:text-3xl font-black text-blue-600 mb-2">{games.length}</div>
                <div className="text-gray-600 text-xs sm:text-sm font-semibold">Total de Lives</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-white rounded-2xl p-4 sm:p-6 text-center border-2 border-yellow-200 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="text-2xl sm:text-3xl font-black text-yellow-600 mb-2">
                  {games.filter(g => g.status === 'waiting').length}
                </div>
                <div className="text-gray-600 text-xs sm:text-sm font-semibold">Aguardando</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-white rounded-2xl p-4 sm:p-6 text-center border-2 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="text-2xl sm:text-3xl font-black text-green-600 mb-2">
                  {games.filter(g => g.status === 'active').length}
                </div>
                <div className="text-gray-600 text-xs sm:text-sm font-semibold">Ao Vivo</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-white rounded-2xl p-4 sm:p-6 text-center border-2 border-red-200 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="text-2xl sm:text-3xl font-black text-red-600 mb-2">
                  {games.filter(g => g.status === 'finished').length}
                </div>
                <div className="text-gray-600 text-xs sm:text-sm font-semibold">Finalizadas</div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </main>
      
      <Footer />

      {/* Modal de Seleção de Números */}
      {showJoinModal && selectedGame && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowJoinModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-md border-2 border-blue-200 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-gray-900">Escolha seu Número da Sorte</h3>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowJoinModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </motion.button>
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-bold text-blue-600 mb-2">{selectedGame.title}</h4>
              <p className="text-gray-600 text-sm mb-4">
                Escolha um número de 1 a {selectedGame.max_participants} para participar do jogo.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Número da Sorte (1-{selectedGame.max_participants})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedGame.max_participants}
                    value={luckyNumber}
                    onChange={(e) => setLuckyNumber(e.target.value)}
                    className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Digite seu número"
                  />
                </div>

                {/* Números já escolhidos */}
                {participants.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Números já escolhidos:
                    </label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto no-scrollbar">
                      {participants.map((participant) => (
                        <span
                          key={participant.id}
                          className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-sm border-2 border-red-200 font-semibold"
                        >
                          {participant.lucky_number}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowJoinModal(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Cancelar
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={joinGame}
                disabled={joining || !luckyNumber}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg"
              >
                {joining ? 'Participando...' : 'Participar'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}