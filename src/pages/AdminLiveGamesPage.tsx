import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { Edit3, Download, Trash2, Eye, Play } from 'lucide-react';
import EditRaffleModal from '../components/admin/EditRaffleModal';
import ExportParticipantsModal from '../components/admin/ExportParticipantsModal';
import SimpleEditModal from '../components/admin/SimpleEditModal';

interface LiveGame {
  id: string;
  title: string;
  description: string;
  max_participants: number;
  status: 'waiting' | 'active' | 'finished';
  created_at: string;
  participants_count: number;
  winner_number?: number;
  winner_user_id?: string;
}

const AdminLiveGamesPage: React.FC = () => {
  const { user } = useAuth();
  const [games, setGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState<LiveGame | null>(null);
  const [newGame, setNewGame] = useState({
    title: '',
    description: '',
    max_participants: 50,
    elimination_interval: 60 // segundos
  });

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      console.log('Loading live games...');
      const { data, error } = await supabase
        .from('live_games')
        .select(`
          *,
          live_participants(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Live games loaded:', data);
      
      // Processar os dados para extrair o count corretamente
      const processedGames = (data || []).map(game => ({
        ...game,
        participants_count: game.live_participants?.[0]?.count || 0
      }));
      
      setGames(processedGames);
    } catch (error) {
      console.error('Erro ao carregar jogos:', error);
      toast.error('Erro ao carregar jogos');
    } finally {
      setLoading(false);
    }
  };

  const createGame = async () => {
    if (!newGame.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    try {
      console.log('Creating new game:', newGame);
      const { data, error } = await supabase
        .from('live_games')
        .insert({
          title: newGame.title,
          description: newGame.description,
          max_participants: newGame.max_participants,
          elimination_interval: newGame.elimination_interval,
          status: 'waiting'
        })
        .select();

      if (error) throw error;
      console.log('Game created successfully:', data);

      toast.success('Jogo criado com sucesso!');
      setShowCreateModal(false);
      setNewGame({
        title: '',
        description: '',
        max_participants: 50,
        elimination_interval: 60
      });
      loadGames();
    } catch (error) {
      console.error('Erro ao criar jogo:', error);
      toast.error('Erro ao criar jogo');
    }
  };

  const deleteGame = async (gameId: string) => {
    if (!confirm('Tem certeza que deseja excluir este jogo?')) return;

    try {
      const { error } = await supabase
        .from('live_games')
        .delete()
        .eq('id', gameId);

      if (error) throw error;
      toast.success('Jogo excluído com sucesso!');
      loadGames();
    } catch (error) {
      console.error('Erro ao excluir jogo:', error);
      toast.error('Erro ao excluir jogo');
    }
  };

  const handleEditGame = (game: LiveGame) => {
    setSelectedGame(game);
    setShowEditModal(true);
    console.log('Editando jogo:', game);
  };

  const handleExportParticipants = (game: LiveGame) => {
    setSelectedGame(game);
    setShowExportModal(true);
  };

  const handleCloseModals = () => {
    setShowEditModal(false);
    setShowExportModal(false);
    setSelectedGame(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Aguardando</span>;
      case 'active':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Ativo</span>;
      case 'finished':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Finalizado</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full px-2 sm:px-4 lg:px-8">
      <div className="flex-grow bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
                🎮 Lives Admin
              </h1>
              <p className="text-slate-300 text-sm sm:text-base">
                Gerencie jogos de "Resta Um" ao vivo
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-amber-500/25"
            >
              ➕ Criar Novo Jogo
            </button>
          </div>
        </div>

        {/* Games Grid */}
        {games.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-xl font-semibold text-white mb-2">Nenhum jogo criado ainda</h3>
            <p className="text-slate-400 mb-6">Crie seu primeiro jogo "Resta Um" para começar</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300"
            >
              Criar Primeiro Jogo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <div key={game.id} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 hover:border-amber-400/50 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{game.title}</h3>
                    <p className="text-slate-300 text-sm mb-3">{game.description || 'Jogo "Resta Um"'}</p>
                    {getStatusBadge(game.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditGame(game)}
                      className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                      title="Editar jogo"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleExportParticipants(game)}
                      className="text-green-400 hover:text-green-300 transition-colors p-1"
                      title="Exportar participantes"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteGame(game.id)}
                      className="text-red-400 hover:text-red-300 transition-colors p-1"
                      title="Excluir jogo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Máx. Participantes:</span>
                    <span className="text-white font-medium">{game.max_participants}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Participantes:</span>
                    <span className="text-white font-medium">{game.participants_count || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Criado em:</span>
                    <span className="text-white font-medium">
                      {new Date(game.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Link
                    to={`/admin/live-games/${game.id}/control`}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-2 sm:py-2 px-4 rounded-lg font-medium transition-all duration-300 text-center flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Controlar
                  </Link>
                  <Link
                    to={`/live-games/${game.id}`}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2 sm:py-2 px-4 rounded-lg font-medium transition-all duration-300 text-center flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Visualizar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Game Modal */}
        {showCreateModal && (
          <div className="fixed z-50 inset-0 overflow-y-auto backdrop-blur-md">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity">
                <div className="absolute inset-0 bg-black/60"></div>
              </div>
              <div className="inline-block align-bottom bg-white rounded-2xl px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">🎮 Criar Novo Jogo</h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Título do Jogo
                    </label>
                    <input
                      type="text"
                      value={newGame.title}
                      onChange={(e) => setNewGame({...newGame, title: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                      placeholder="Ex: Sorteio Especial de Natal"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrição (opcional)
                    </label>
                    <textarea
                      value={newGame.description}
                      onChange={(e) => setNewGame({...newGame, description: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                      rows={3}
                      placeholder="Descrição do jogo..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Máximo de Participantes
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      value={newGame.max_participants}
                      onChange={(e) => setNewGame({...newGame, max_participants: parseInt(e.target.value) || 50})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Intervalo de Eliminação
                    </label>
                    <select
                      value={newGame.elimination_interval}
                      onChange={(e) => setNewGame({...newGame, elimination_interval: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    >
                      <option value={30}>30 segundos</option>
                      <option value={60}>1 minuto</option>
                      <option value={120}>2 minutos</option>
                      <option value={300}>5 minutos</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium transition-all duration-300 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={createGame}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 py-3 rounded-xl font-bold transition-all duration-300"
                  >
                    Criar Jogo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        <SimpleEditModal
          isOpen={showEditModal}
          onClose={handleCloseModals}
          game={selectedGame}
          onUpdate={loadGames}
        />

        <ExportParticipantsModal
          isOpen={showExportModal}
          onClose={handleCloseModals}
          raffle={selectedGame}
        />

      </div>
      <Toaster position="top-right" />
    </div>
  );
};

export default AdminLiveGamesPage;