import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
      console.log('Fallback: verificando jogos periodicamente...');
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
        console.log('Live games subscription triggered:', payload);
        loadGames();
      })
      .subscribe((status) => {
        console.log('Live games subscription status:', status);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadGames = async () => {
    try {
      console.log('Loading live games...');
      const { data, error } = await supabase
        .from('live_games')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar jogos:', error);
        throw error;
      }
      
      console.log('Live games loaded:', data);
      setGames(data || []);
    } catch (error) {
      console.error('Erro ao carregar jogos:', error);
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
      console.error('Erro ao carregar participantes:', error);
    }
  };

  const handleJoinGame = async (game: LiveGame) => {
    console.log('handleJoinGame called with game:', game);
    setSelectedGame(game);
    await loadParticipants(game.id);
    console.log('Setting showJoinModal to true');
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
      console.error('Erro ao entrar no jogo:', error);
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
      case 'waiting': return 'bg-yellow-500';
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
          <button
            onClick={() => handleJoinGame(game)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 text-sm sm:text-base"
          >
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">Participar</span>
            <span className="sm:hidden">Entrar</span>
          </button>
        ) : (
          <button
            onClick={() => navigate(`/live-games/${game.id}`)}
            className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-bold transition-colors flex items-center gap-2 text-sm sm:text-base"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Assistir</span>
            <span className="sm:hidden">Ver</span>
          </button>
        );
      case 'active':
        return (
          <button
            onClick={() => navigate(`/live-games/${game.id}`)}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-bold transition-colors flex items-center gap-2 animate-pulse text-sm sm:text-base"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Ao Vivo</span>
            <span className="sm:hidden">Live</span>
          </button>
        );
      case 'finished':
        return (
          <button
            onClick={() => navigate(`/live-games/${game.id}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-bold transition-colors flex items-center gap-2 text-sm sm:text-base"
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Ver Resultado</span>
            <span className="sm:hidden">Resultado</span>
          </button>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full px-2 sm:px-4 lg:px-8">
        <Header />
        <div className="flex-grow bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-white text-xl">Carregando...</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full px-2 sm:px-4 lg:px-8">
      <Header />
      
      <main className="flex-grow bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-8 sm:py-12 lg:py-16 relative overflow-hidden">
          {/* Geometric Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23F59E0B' fill-opacity='0.1'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>
          
          {/* Geometric Accent Lines */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500"></div>
          <div className="absolute bottom-0 right-0 w-1 h-full bg-gradient-to-b from-amber-500 via-amber-400 to-amber-500"></div>
          
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl shadow-amber-500/25">
                <Gamepad2 className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 sm:mb-6 tracking-tight">
                Lives - Resta Um
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Participe das brincadeiras ao vivo e concorra a prêmios!
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-8">

          {/* Filtros */}
          <div className="flex justify-center mb-8">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-1 flex flex-wrap gap-1 max-w-full">
              {[
                { key: 'all', label: 'Todas' },
                { key: 'waiting', label: 'Aguardando' },
                { key: 'active', label: 'Ao Vivo' },
                { key: 'finished', label: 'Finalizadas' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                    filter === key
                      ? 'bg-amber-600 text-white shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de jogos */}
          <div className="space-y-4 sm:space-y-6">
            {filteredGames.length === 0 ? (
              <div className="text-center py-12">
                <Gamepad2 className="w-12 h-12 sm:w-16 sm:h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-slate-400 mb-2">Nenhum jogo encontrado</h3>
                <p className="text-sm sm:text-base text-slate-500">Não há jogos disponíveis no momento.</p>
              </div>
            ) : (
              filteredGames.map((game) => (
                <div key={game.id} className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4 sm:p-6 hover:border-amber-500/50 transition-all duration-300">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Informações do jogo */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                          <Hash className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-white">{game.title}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(game.status)}`}>
                              {getStatusText(game.status)}
                            </span>
                            <span className="text-slate-400 text-xs sm:text-sm">
                              {new Date(game.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {game.description && (
                        <p className="text-slate-300 mb-4 text-sm sm:text-base">{game.description}</p>
                      )}
                      
                      {/* Barra de progresso de participantes */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs sm:text-sm text-slate-400">Participantes</span>
                          <span className="text-xs sm:text-sm text-slate-300">
                            {game.current_participants || 0} / {game.max_participants}
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-amber-500 to-amber-600 h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min(((game.current_participants || 0) / game.max_participants) * 100, 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Ações */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      {getActionButton(game)}
                    </div>
                  </div>
                </div>
              ))
            )}
        </div>

          {/* Estatísticas das lives */}
          {games.length > 0 && (
            <div className="mt-8 sm:mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center border border-slate-700">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-2">{games.length}</div>
                <div className="text-slate-400 text-xs sm:text-sm">Total de Lives</div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center border border-slate-700">
                <div className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-2">
                  {games.filter(g => g.status === 'waiting').length}
                </div>
                <div className="text-slate-400 text-xs sm:text-sm">Aguardando</div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center border border-slate-700">
                <div className="text-2xl sm:text-3xl font-bold text-green-400 mb-2">
                  {games.filter(g => g.status === 'active').length}
                </div>
                <div className="text-slate-400 text-xs sm:text-sm">Ao Vivo</div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center border border-slate-700">
                <div className="text-2xl sm:text-3xl font-bold text-red-400 mb-2">
                  {games.filter(g => g.status === 'finished').length}
                </div>
                <div className="text-slate-400 text-xs sm:text-sm">Finalizadas</div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />

      {/* Modal de Seleção de Números */}
      {showJoinModal && selectedGame && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Escolha seu Número da Sorte</h3>
              <button
                onClick={() => setShowJoinModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-2">{selectedGame.title}</h4>
              <p className="text-slate-300 text-sm mb-4">
                Escolha um número de 1 a {selectedGame.max_participants} para participar do jogo.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Número da Sorte (1-{selectedGame.max_participants})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedGame.max_participants}
                    value={luckyNumber}
                    onChange={(e) => setLuckyNumber(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Digite seu número"
                  />
                </div>

                {/* Números já escolhidos */}
                {participants.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Números já escolhidos:
                    </label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto no-scrollbar">
                      {participants.map((participant) => (
                        <span
                          key={participant.id}
                          className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-sm border border-red-600/30"
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
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={joinGame}
                disabled={joining || !luckyNumber}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {joining ? 'Participando...' : 'Participar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}