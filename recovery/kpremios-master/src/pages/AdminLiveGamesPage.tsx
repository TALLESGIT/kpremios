import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Edit3, Download, Trash2, Eye, Play, Gamepad2, Plus, Settings } from 'lucide-react';
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
  elimination_interval?: number;
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
      const { error } = await supabase
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
    try {
      // Buscar informações do jogo antes de deletar
      const { data: gameData, error: fetchError } = await supabase
        .from('live_games')
        .select(`
          *,
          live_participants(count)
        `)
        .eq('id', gameId)
        .single();

      if (fetchError) throw fetchError;
      if (!gameData) {
        toast.error('Jogo não encontrado');
        return;
      }

      const participantsCount = gameData.live_participants?.[0]?.count || 0;
      const isActive = gameData.status === 'active';
      const gameTitle = gameData.title;

      // PROTEÇÃO: Não permitir exclusão se o jogo estiver ativo
      if (isActive) {
        toast.error(`⚠️ Não é possível excluir "${gameTitle}" enquanto está ATIVO! Finalize o jogo primeiro.`, {
          duration: 6000,
          icon: '🚫'
        });
        return;
      }

      // PROTEÇÃO: Confirmação obrigatória com informações detalhadas
      let confirmMessage = `⚠️ EXCLUIR JOGO: "${gameTitle}"\n\n`;

      if (participantsCount > 0) {
        confirmMessage += `🚨 ATENÇÃO: Este jogo tem ${participantsCount} participante(s)!\n\n`;
        confirmMessage += `Ao excluir, TODOS os participantes serão PERMANENTEMENTE removidos.\n\n`;
        confirmMessage += `Esta ação NÃO PODE ser desfeita!\n\n`;
      } else {
        confirmMessage += `Este jogo não tem participantes.\n\n`;
      }

      confirmMessage += `Deseja realmente excluir este jogo?`;

      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) {
        toast('Exclusão cancelada');
        return;
      }

      // Segunda confirmação para jogos com participantes
      if (participantsCount > 0) {
        const secondConfirm = window.confirm(
          `🚨 ÚLTIMA CHANCE!\n\nVocê está prestes a excluir "${gameTitle}" e remover ${participantsCount} participante(s) permanentemente.\n\nTem CERTEZA ABSOLUTA?`
        );
        if (!secondConfirm) {
          toast('Exclusão cancelada');
          return;
        }
      }

      // Deletar o jogo (CASCADE vai deletar os participantes automaticamente)
      const { error } = await supabase
        .from('live_games')
        .delete()
        .eq('id', gameId);

      if (error) throw error;

      if (participantsCount > 0) {
        toast.success(`Jogo "${gameTitle}" excluído. ${participantsCount} participante(s) foram removidos.`, {
          duration: 6000,
          icon: '⚠️'
        });
      } else {
        toast.success(`Jogo "${gameTitle}" excluído com sucesso!`);
      }

      loadGames();
    } catch (error) {
      console.error('Erro ao excluir jogo:', error);
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


  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900 font-sans">
        <Header />
        <main className="flex-grow flex items-center justify-center relative overflow-hidden">
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-[500px] bg-blue-600/10 blur-[100px]" />
            <div className="absolute bottom-0 right-0 w-full h-[500px] bg-blue-900/20 blur-[100px]" />
          </div>
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20 animate-pulse">
              <Gamepad2 className="h-8 w-8 text-blue-400" />
            </div>
            <p className="text-blue-200/60 text-lg font-medium animate-pulse">Carregando lives...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 font-sans">
      <Header />
      <main className="flex-grow w-full relative overflow-hidden">
        {/* Decorative Background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-900/20 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
            <div>
              <h1 className="text-4xl lg:text-6xl font-black text-white mb-4 tracking-tight">
                ADMIN <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">LIVES</span>
              </h1>
              <p className="text-blue-200/60 text-lg lg:text-xl font-medium max-w-2xl">
                Controle total sobre os jogos de "Resta Um". Crie novos eventos, gerencie participantes e comande a live.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black rounded-[2rem] transition-all duration-300 shadow-xl shadow-blue-600/20 hover:-translate-y-1 active:scale-[0.98] uppercase tracking-wider italic text-sm"
            >
              <Play className="h-5 w-5 mr-3 fill-current" />
              Criar Novo Jogo
            </button>
          </div>

          {/* Games Grid */}
          {games.length === 0 ? (
            <div className="glass-panel p-20 rounded-[3rem] text-center border border-white/5 bg-slate-800/50 backdrop-blur-xl max-w-2xl mx-auto">
              <div className="w-24 h-24 bg-blue-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-blue-500/20">
                <Gamepad2 className="h-12 w-12 text-blue-400" />
              </div>
              <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">Sem lives no momento</h3>
              <p className="text-blue-200/60 mb-10 text-lg">Comece criando um novo jogo "Resta Um" para seus usuários participarem.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Criar Primeiro Jogo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="glass-panel group relative flex flex-col h-full rounded-[2.5rem] border border-white/5 bg-slate-800/40 backdrop-blur-md hover:bg-slate-800/60 hover:border-white/10 transition-all duration-500"
                >
                  {/* Status Overlay */}
                  <div className="absolute top-6 right-6 z-20">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border backdrop-blur-md ${game.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                      : game.status === 'waiting'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                      {game.status === 'active' ? '● Ao Vivo' : game.status === 'waiting' ? 'Aguardando' : 'Finalizado'}
                    </span>
                  </div>

                  <div className="p-8 pb-0 flex-grow">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-600 group-hover:border-blue-500 transition-all duration-500">
                        <Gamepad2 className="h-6 w-6 text-blue-400 group-hover:text-white transition-colors" />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditGame(game)}
                          className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExportParticipants(game)}
                          className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteGame(game.id)}
                          className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-2xl font-black text-white mb-2 leading-tight uppercase italic group-hover:text-blue-400 transition-colors uppercase italic">{game.title}</h3>
                    <p className="text-slate-400 text-sm font-medium mb-8 line-clamp-2">{game.description || 'Nenhuma descrição fornecida.'}</p>

                    <div className="space-y-4">
                      <div className="p-5 rounded-3xl bg-slate-900/50 border border-white/5 group-hover:bg-slate-900 transition-colors">
                        <div className="flex justify-between items-end mb-2">
                          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none">Participação</p>
                          <p className="text-xs font-black text-white">{game.participants_count || 0} / {game.max_participants}</p>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000"
                            style={{ width: `${Math.min(100, ((game.participants_count || 0) / game.max_participants) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 pt-6">
                    <div className="flex gap-3">
                      <Link
                        to={`/admin/live-games/${game.id}/control`}
                        className="flex-[2] flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black rounded-2xl transition-all duration-300 shadow-lg shadow-blue-600/10 uppercase italic text-sm"
                      >
                        <Settings className="w-4 h-4" />
                        Painel Controle
                      </Link>
                      <Link
                        to={`/live-games/${game.id}`}
                        className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-700 hover:bg-slate-600 text-white font-black rounded-2xl transition-all duration-300 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Game Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
            <div className="glass-panel p-0 rounded-[2.5rem] border border-white/10 bg-slate-800 w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Gamepad2 className="h-6 w-6 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase italic">Novo Jogo</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-slate-400"
                >
                  <Eye className="h-6 w-6" /> {/* Using eye as close for now if X is missing */}
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-200/40 uppercase tracking-[0.2em] ml-1">Título do Evento</label>
                  <input
                    type="text"
                    value={newGame.title}
                    onChange={(e) => setNewGame({ ...newGame, title: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-900/50 border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold placeholder-slate-600"
                    placeholder="Ex: Resta Um Especial Sábado"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-200/40 uppercase tracking-[0.2em] ml-1">Descrição Curta</label>
                  <textarea
                    value={newGame.description}
                    onChange={(e) => setNewGame({ ...newGame, description: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-900/50 border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium resize-none placeholder-slate-600"
                    rows={3}
                    placeholder="Regras ou prêmios..."
                  />
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black text-blue-200/40 uppercase tracking-[0.2em] ml-1">Vagas (10 - 1000)</label>
                    <span className="text-lg font-black text-blue-400">{maxInput}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    step="10"
                    value={maxInput}
                    onChange={(e) => {
                      setMaxInput(e.target.value);
                      setNewGame({ ...newGame, max_participants: parseInt(e.target.value) });
                    }}
                    className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>10</span>
                    <span>1000</span>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-900/30 border-t border-white/5 flex gap-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white font-black rounded-2xl transition-all uppercase text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={createGame}
                  className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-600/25 uppercase italic text-xs tracking-wider"
                >
                  Criar Evento Live
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Common Modals */}
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
    </div>
  );
};

export default AdminLiveGamesPage;