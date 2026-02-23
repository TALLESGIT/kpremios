import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { Play, Trophy, Clock, Eye, Gamepad2, ArrowLeft, Hash } from 'lucide-react';
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
    if (loading) return;
    if (!currentAppUser) {
      navigate('/login');
    }
  }, [currentAppUser, loading, navigate]);

  // Carregar jogos
  useEffect(() => {
    loadGames();
  }, []);

  // Fallback: verificar jogos periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      loadGames();
    }, 10000);

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
      }, () => {
        loadGames();
      })
      .subscribe();

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

      if (error) throw error;

      setGames(data || []);
    } catch {
      // Silent error
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
    } catch {
      // Silent error
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

    if (selectedGame.status !== 'waiting') {
      toast.error('Este jogo não está mais aceitando participantes');
      return;
    }

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
      loadGames();
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
      case 'waiting': return 'bg-accent text-primary-dark border-accent';
      case 'active': return 'bg-green-500 text-white border-green-400';
      case 'finished': return 'bg-blue-500 text-white border-blue-400';
      case 'cancelled': return 'bg-red-500 text-white border-red-400';
      default: return 'bg-gray-500 text-white';
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

  const getActionButton = (game: LiveGame) => {
    switch (game.status) {
      case 'waiting':
        return game.current_participants < game.max_participants ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleJoinGame(game)}
            className="btn btn-primary w-full py-3 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Play className="w-5 h-5" />
            <span className="font-bold">Participar</span>
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/live-games/${game.id}`)}
            className="btn btn-outline border-white/20 hover:bg-white/10 text-white w-full py-3 flex items-center justify-center gap-2"
          >
            <Eye className="w-5 h-5" />
            <span className="font-bold">Observar</span>
          </motion.button>
        );
      case 'active':
        return (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            onClick={() => navigate(`/live-games/${game.id}`)}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-xl font-bold transition-all w-full flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
          >
            <Eye className="w-5 h-5" />
            <span>Assistir Live</span>
          </motion.button>
        );
      case 'finished':
        return (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/live-games/${game.id}`)}
            className="btn btn-outline border-white/20 hover:bg-white/10 text-white w-full py-3 flex items-center justify-center gap-2"
          >
            <Trophy className="w-5 h-5" />
            <span>Ver Resultado</span>
          </motion.button>
        );
      default:
        return null;
    }
  };

  const filteredGames = games.filter(game => {
    if (filter === 'all') return true;
    return game.status === filter;
  });

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-accent"></div>
      </div>
    );
  }

  return (
    <>
      <main className="flex-grow w-full">
        {/* Hero Section */}
        <div className="relative py-12 lg:py-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-primary to-black opacity-90"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-accent to-yellow-600 rounded-2xl shadow-xl shadow-accent/20 mb-6 transform -rotate-3">
                <Gamepad2 className="w-10 h-10 text-white drop-shadow-md" />
              </div>
              <h1 className="text-4xl lg:text-6xl font-black text-white mb-4 uppercase tracking-tighter italic">
                Lives <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-yellow-300">Premiadas</span>
              </h1>
              <p className="text-lg text-blue-100 max-w-2xl mx-auto font-light border-l-4 border-accent pl-4 ml-auto mr-auto text-left md:text-center md:border-l-0 md:pl-0">
                Participe dos jogos ao vivo. A emoção do Cruzeiro agora nas suas mãos.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-8 relative z-20">
          {/* Filtros */}
          <div className="flex justify-center mb-8">
            <div className="glass-panel p-1.5 rounded-2xl flex flex-wrap gap-1 shadow-2xl">
              {[
                { key: 'all', label: 'Todas' },
                { key: 'waiting', label: 'Aguardando' },
                { key: 'active', label: 'Ao Vivo' },
                { key: 'finished', label: 'Encerradas' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={`px-6 py-2.5 rounded-xl font-bold transition-all duration-300 text-sm md:text-base ${filter === key
                    ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-lg transform scale-105'
                    : 'text-blue-200 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de jogos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGames.length === 0 ? (
              <div className="col-span-full py-16 text-center glass-panel rounded-3xl">
                <Gamepad2 className="w-16 h-16 text-blue-500/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Sem Jogos no Momento</h3>
                <p className="text-blue-200/60">Fique atento, logo teremos novidades!</p>
              </div>
            ) : (
              filteredGames.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-panel rounded-3xl overflow-hidden group hover:border-accent/30 transition-colors"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-primary/80 to-primary-dark/80 p-6 border-b border-white/5">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${getStatusColor(game.status)}`}>
                        {getStatusText(game.status)}
                      </div>
                      <span className="text-blue-200/60 text-xs font-mono">
                        {new Date(game.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-1" title={game.title}>{game.title}</h3>
                    <p className="text-blue-200/70 text-sm line-clamp-2 min-h-[40px]">{game.description || 'Sem descrição.'}</p>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 bg-black/20">
                    <div className="mb-6">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs text-blue-200 uppercase font-bold tracking-wider">Lotação</span>
                        <span className="text-lg font-black text-white">
                          {game.current_participants} <span className="text-blue-200/50 text-sm font-normal">/ {game.max_participants}</span>
                        </span>
                      </div>
                      <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden border border-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(((game.current_participants || 0) / game.max_participants) * 100, 100)}%`
                          }}
                          className="bg-gradient-to-r from-accent to-yellow-500 h-full shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                        />
                      </div>
                    </div>

                    {getActionButton(game)}
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Stats Bar */}
          {games.length > 0 && (
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total', value: games.length, icon: Gamepad2, color: 'text-blue-400' },
                { label: 'Aguardando', value: games.filter(g => g.status === 'waiting').length, icon: Clock, color: 'text-yellow-400' },
                { label: 'Ao Vivo', value: games.filter(g => g.status === 'active').length, icon: Eye, color: 'text-green-400' },
                { label: 'Finalizadas', value: games.filter(g => g.status === 'finished').length, icon: Trophy, color: 'text-white' },
              ].map((stat, i) => (
                <div key={i} className="glass-panel p-4 rounded-2xl flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">{stat.value}</p>
                    <p className="text-xs text-blue-200 uppercase font-bold tracking-wider">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Join Modal */}
      {showJoinModal && selectedGame && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel-dark w-full max-w-md rounded-3xl overflow-hidden border border-white/20 shadow-2xl"
          >
            <div className="bg-gradient-to-r from-primary to-primary-dark p-6 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-black text-white">Entrar no Jogo</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-white/60 hover:text-white transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8">
              <div className="text-center mb-8">
                <p className="text-blue-200 text-sm uppercase tracking-widest font-bold mb-2">Você está entrando em</p>
                <h4 className="text-2xl font-bold text-white mb-2">{selectedGame.title}</h4>
                <div className="inline-block px-4 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold">
                  Escolha de 1 a {selectedGame.max_participants}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-blue-200 uppercase tracking-widest mb-2 pl-1">
                    Seu Número da Sorte
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
                    <input
                      type="number"
                      min="1"
                      max={selectedGame.max_participants}
                      value={luckyNumber}
                      onChange={(e) => setLuckyNumber(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-lg font-mono"
                      placeholder="000"
                    />
                  </div>
                </div>

                {participants.length > 0 && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <p className="text-xs font-bold text-red-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      Números Indisponíveis
                    </p>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                      {participants.map((participant) => (
                        <span key={participant.id} className="px-2 py-1 bg-red-500/20 text-red-200 rounded text-xs font-mono border border-red-500/30">
                          {participant.lucky_number}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={joinGame}
                  disabled={joining || !luckyNumber}
                  className="btn btn-primary w-full py-4 text-lg shadow-lg shadow-blue-900/40"
                >
                  {joining ? 'Processando...' : 'Confirmar Participação'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}