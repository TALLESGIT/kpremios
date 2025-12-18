import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { Edit3, Download, Trash2, Eye, Play, Gamepad2 } from 'lucide-react';
import EditRaffleModal from '../components/admin/EditRaffleModal';
import ExportParticipantsModal from '../components/admin/ExportParticipantsModal';
import SimpleEditModal from '../components/admin/SimpleEditModal';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

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
    max_participants: 50
  });
  const [maxInput, setMaxInput] = useState<string>('50');

  useEffect(() => {
    loadGames();
  }, []);

  // (Campos de imagem removidos por não serem necessários nesta tela)

  const loadGames = async () => {
    try {

      const { data, error } = await supabase
        .from('live_games')
        .select(`
          *,
          live_participants(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Processar os dados para extrair o count corretamente
      const processedGames = (data || []).map(game => ({
        ...game,
        participants_count: game.live_participants?.[0]?.count || 0
      }));
      
      setGames(processedGames);
    } catch (error) {

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

      const { data, error } = await supabase
        .from('live_games')
        .insert({
          title: newGame.title,
          description: newGame.description,
          max_participants: newGame.max_participants,
          status: 'waiting',
          created_by: user?.id
        })
        .select();

      if (error) throw error;

      toast.success('Jogo criado com sucesso!');
      setShowCreateModal(false);
      setNewGame({
        title: '',
        description: '',
        max_participants: 50
      });
      loadGames();
    } catch (error) {

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

      toast.error('Erro ao excluir jogo');
    }
  };

  const handleEditGame = (game: LiveGame) => {
    setSelectedGame(game);
    setShowEditModal(true);

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
        return <span className="px-3 py-1 text-xs font-bold bg-yellow-100 text-yellow-700 border-2 border-yellow-300 rounded-full">Aguardando</span>;
      case 'active':
        return <span className="px-3 py-1 text-xs font-bold bg-green-100 text-green-700 border-2 border-green-300 rounded-full">Ativo</span>;
      case 'finished':
        return <span className="px-3 py-1 text-xs font-bold bg-gray-100 text-gray-700 border-2 border-gray-300 rounded-full">Finalizado</span>;
      default:
        return <span className="px-3 py-1 text-xs font-bold bg-gray-100 text-gray-700 border-2 border-gray-300 rounded-full">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl mb-4 shadow-lg"
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-4xl font-black text-white"
              >
                ZK
              </motion.span>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-gray-700 text-xl font-semibold"
            >
              Carregando jogos...
            </motion.p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <Header />
      <main className="flex-grow w-full py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-6 mb-6"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
              <div className="mb-4 sm:mb-0">
                <div className="flex items-center space-x-3 mb-2">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg"
                  >
                    <Gamepad2 className="h-6 w-6 text-white" />
                  </motion.div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                      Lives Admin
                    </h1>
                    <p className="text-gray-600 text-sm font-semibold">
                      Gerencie jogos de "Resta Um" ao vivo
                    </p>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg"
              >
                <Play className="h-5 w-5 mr-2" />
                Criar Novo Jogo
              </motion.button>
            </div>
          </motion.div>

          {/* Games Grid */}
          {games.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-8 text-center"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Gamepad2 className="h-8 w-8 text-blue-600" />
              </motion.div>
              <h3 className="text-lg font-black text-gray-900 mb-2">Nenhum jogo criado ainda</h3>
              <p className="text-gray-600 mb-6 font-semibold">Crie seu primeiro jogo "Resta Um" para começar</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-all duration-200 shadow-lg"
              >
                <Play className="h-5 w-5 inline mr-2" />
                Criar Primeiro Jogo
              </motion.button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 overflow-hidden hover:shadow-xl transition-all duration-300"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 border-b-2 border-blue-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-black text-white mb-2">{game.title}</h3>
                        <p className="text-blue-100 text-sm mb-3">{game.description || 'Jogo "Resta Um"'}</p>
                        <motion.span
                          whileHover={{ scale: 1.1 }}
                          className="inline-block"
                        >
                          {getStatusBadge(game.status)}
                        </motion.span>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleEditGame(game)}
                          className="text-white hover:text-blue-200 transition-colors p-2 bg-white/20 rounded-lg"
                          title="Editar jogo"
                        >
                          <Edit3 className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleExportParticipants(game)}
                          className="text-white hover:text-blue-200 transition-colors p-2 bg-white/20 rounded-lg"
                          title="Exportar participantes"
                        >
                          <Download className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deleteGame(game.id)}
                          className="text-white hover:text-red-200 transition-colors p-2 bg-white/20 rounded-lg"
                          title="Excluir jogo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6 bg-white">
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
                        <span className="text-gray-700 text-sm font-semibold">Máx. Participantes:</span>
                        <span className="text-gray-900 font-bold text-sm">{game.max_participants}</span>
                      </div>
                      <div className="flex justify-between items-center bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
                        <span className="text-gray-700 text-sm font-semibold">Participantes:</span>
                        <span className="text-gray-900 font-bold text-sm">{game.participants_count || 0}</span>
                      </div>
                      <div className="flex justify-between items-center bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
                        <span className="text-gray-700 text-sm font-semibold">Criado em:</span>
                        <span className="text-gray-900 font-bold text-sm">
                          {new Date(game.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Link
                        to={`/admin/live-games/${game.id}/control`}
                        className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white py-3 px-4 rounded-lg font-bold transition-all duration-200 text-center flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Play className="w-4 h-4" />
                        Controlar
                      </Link>
                      <Link
                        to={`/live-games/${game.id}`}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-4 rounded-lg font-bold transition-all duration-200 text-center flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Eye className="w-4 h-4" />
                        Visualizar
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Create Game Modal */}
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed z-50 inset-0 overflow-y-auto backdrop-blur-md"
          >
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity">
                <div className="absolute inset-0 bg-black/60"></div>
              </div>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-block align-bottom bg-white rounded-2xl px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border-2 border-blue-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Gamepad2 className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900">Criar Novo Jogo</h3>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Título do Jogo
                    </label>
                    <input
                      type="text"
                      value={newGame.title}
                      onChange={(e) => setNewGame({...newGame, title: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900"
                      placeholder="Ex: Sorteio Especial de Natal"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Descrição (opcional)
                    </label>
                    <textarea
                      value={newGame.description}
                      onChange={(e) => setNewGame({...newGame, description: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900"
                      rows={3}
                      placeholder="Descrição do jogo..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Máximo de Participantes
                    </label>
                  <div className="relative">
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min="10"
                        max="1000"
                        value={maxInput}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          setMaxInput(digits);
                        }}
                        onBlur={() => {
                          const parsed = parseInt(maxInput || '0');
                          const clamped = isNaN(parsed) ? 50 : Math.max(10, Math.min(1000, parsed));
                          setNewGame({ ...newGame, max_participants: clamped });
                          setMaxInput(String(clamped));
                        }}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-center text-lg font-semibold text-gray-900"
                        placeholder="50"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                        números
                      </div>
                    </div>
                    <p className="text-gray-500 text-xs mt-1 text-center">
                      Números disponíveis de 1 a {newGame.max_participants}
                    </p>
                  </div>

                  {/* Seção de imagem removida por não ser necessária */}

                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold transition-all duration-200 hover:bg-gray-50"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={createGame}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-3 rounded-lg font-bold transition-all duration-200 shadow-lg"
                  >
                    Criar Jogo
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </motion.div>
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
      </main>
      <Footer />
      <Toaster position="top-right" />
    </div>
  );
};

export default AdminLiveGamesPage;