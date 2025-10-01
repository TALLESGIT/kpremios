import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useWhatsApp } from '../hooks/useWhatsApp';
import EliminationNotification from '../components/shared/EliminationNotification';

interface LiveGame {
  id: string;
  title: string;
  description: string;
  max_participants: number;
  status: 'waiting' | 'active' | 'finished';
  winner_id?: string;
  created_at: string;
}

interface Participant {
  id: string;
  user_id: string;
  lucky_number: number;
  status: 'active' | 'eliminated';
  eliminated_at?: string;
  user_name?: string;
  user_phone?: string;
}

const AdminLiveControlPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<LiveGame | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameActive, setGameActive] = useState(false);
  const [eliminationTimer, setEliminationTimer] = useState<number | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [recentEliminations, setRecentEliminations] = useState<Array<{
    user_name: string;
    lucky_number: number;
    eliminated_at: string;
  }>>([]);
  const { sendWhatsAppMessage } = useWhatsApp();

  useEffect(() => {
    if (gameId) {
      const loadData = async () => {
        await Promise.all([loadGame(), loadParticipants()]);
        setLoading(false);
      };
      loadData();
    }
  }, [gameId]);

  useEffect(() => {
    if (gameActive && game?.elimination_interval) {
      const interval = setInterval(() => {
        eliminateRandomParticipant();
      }, game.elimination_interval * 1000);
      
      setEliminationTimer(interval);
      return () => clearInterval(interval);
    } else if (eliminationTimer) {
      clearInterval(eliminationTimer);
      setEliminationTimer(null);
    }
  }, [gameActive, game?.elimination_interval]);

  const loadGame = async () => {
    try {

      const { data, error } = await supabase
        .from('live_games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) throw error;

      setGame(data);
      setGameActive(data.status === 'active');
    } catch (error) {

      toast.error('Erro ao carregar jogo');
    }
  };

  const loadParticipants = async () => {
    try {

      const { data, error } = await supabase
        .from('live_participants')
        .select(`
          *,
          users!inner(name, whatsapp)
        `)
        .eq('game_id', gameId)
        .order('lucky_number');

      if (error) throw error;

      // Processar os dados para extrair as informações do usuário
      const processedParticipants = (data || []).map(participant => ({
        ...participant,
        user_name: participant.users?.name || 'Usuário',
        user_phone: participant.users?.whatsapp || 'Sem telefone'
      }));
      
      setParticipants(processedParticipants);
    } catch (error) {

      toast.error('Erro ao carregar participantes');
    }
  };

  const startGame = async () => {
    try {
      // Verificar se há participantes antes de iniciar
      const activeParticipants = participants.filter(p => p.status === 'active');
      if (activeParticipants.length === 0) {
        toast.error('Não é possível iniciar o jogo sem participantes!');
        return;
      }

      if (activeParticipants.length < 2) {
        toast.error('É necessário pelo menos 2 participantes para iniciar o jogo!');
        return;
      }

      const { error } = await supabase
        .from('live_games')
        .update({ 
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('id', gameId);

      if (error) throw error;
      
      setGameActive(true);
      toast.success(`Jogo iniciado com ${activeParticipants.length} participantes!`);
      loadGame();
    } catch (error) {

      toast.error('Erro ao iniciar jogo');
    }
  };

  const closeSystem = async () => {
    try {
      const { error } = await supabase
        .from('live_games')
        .update({
          status: 'active', // Mudar para 'active' para impedir novos participantes
          started_at: new Date().toISOString()
        })
        .eq('id', gameId);

      if (error) throw error;

      setGameActive(true);
      toast.success('🔒 Sistema fechado! Novos participantes não podem mais entrar. Agora você pode fazer o sorteio manual.');
      loadGame();
    } catch (error) {

      toast.error('Erro ao fechar sistema');
    }
  };

  const endGame = async () => {
    try {
      const activeParticipants = participants.filter(p => p.status === 'active');
      if (activeParticipants.length === 1) {
        const winner = activeParticipants[0];

        const { error: gameError } = await supabase
          .from('live_games')
          .update({
            status: 'finished',
            winner_id: winner.user_id,
            finished_at: new Date().toISOString()
          })
          .eq('id', gameId);

        if (gameError) throw gameError;

        toast.success(`🎉 Vencedor: ${winner.user_name} - Número ${winner.lucky_number}!`);
      } else {
        const { error } = await supabase
          .from('live_games')
          .update({
            status: 'finished',
            finished_at: new Date().toISOString()
          })
          .eq('id', gameId);

        if (error) throw error;
        toast.success('Jogo finalizado!');
      }

      setGameActive(false);
      loadGame();
    } catch (error) {

      toast.error('Erro ao finalizar jogo');
    }
  };

  const eliminateRandomParticipant = async () => {
    const activeParticipants = participants.filter(p => p.status === 'active');
    if (activeParticipants.length <= 1) {
      // Não finalizar automaticamente - deixar o admin decidir
      toast.info('🎯 Resta apenas 1 participante! Use o botão "Finalizar Jogo" para declarar o vencedor.');
      return;
    }

    const randomIndex = Math.floor(Math.random() * activeParticipants.length);
    const participantToEliminate = activeParticipants[randomIndex];

    try {
      const { error } = await supabase
        .from('live_participants')
        .update({ 
          status: 'eliminated',
          eliminated_at: new Date().toISOString()
        })
        .eq('id', participantToEliminate.id);

      if (error) throw error;
      
      // Enviar notificação por WhatsApp
      await sendEliminationNotification(participantToEliminate);
      
      // Adicionar à lista de eliminações recentes para notificação visual
      setRecentEliminations(prev => [...prev, {
        user_name: participantToEliminate.user_name || 'Usuário',
        lucky_number: participantToEliminate.lucky_number,
        eliminated_at: new Date().toISOString()
      }]);
      
      toast.error(`❌ ${participantToEliminate.user_name} (${participantToEliminate.lucky_number}) foi eliminado!`);
      loadParticipants();
    } catch (error) {

      toast.error('Erro ao eliminar participante');
    }
  };

  const eliminateSelectedParticipants = async () => {
    if (selectedNumbers.length === 0) {
      toast.error('Selecione pelo menos um participante');
      return;
    }

    try {
      // Encontrar participantes que serão eliminados
      const participantsToEliminate = participants.filter(p => 
        selectedNumbers.includes(p.lucky_number) && p.status === 'active'
      );

      const { error } = await supabase
        .from('live_participants')
        .update({ 
          status: 'eliminated',
          eliminated_at: new Date().toISOString()
        })
        .eq('game_id', gameId)
        .in('lucky_number', selectedNumbers);

      if (error) throw error;
      
      // Enviar notificações por WhatsApp para todos os eliminados
      for (const participant of participantsToEliminate) {
        await sendEliminationNotification(participant);
        
        // Adicionar à lista de eliminações recentes
        setRecentEliminations(prev => [...prev, {
          user_name: participant.user_name || 'Usuário',
          lucky_number: participant.lucky_number,
          eliminated_at: new Date().toISOString()
        }]);
      }
      
      toast.success(`${selectedNumbers.length} participantes eliminados!`);
      setSelectedNumbers([]);
      loadParticipants();
    } catch (error) {

      toast.error('Erro ao eliminar participantes');
    }
  };

  const sendEliminationNotification = async (participant: Participant) => {
    try {
      if (!participant.user_phone) {

        return;
      }

      const message = `💀 *ELIMINAÇÃO NO JOGO RESTA UM* 💀

❌ *Você foi eliminado!*

🎮 *Jogo:* ${game?.title || 'Resta Um'}
🔢 *Seu número:* ${participant.lucky_number}
⏰ *Eliminado em:* ${new Date().toLocaleString('pt-BR')}

😔 Infelizmente sua sorte não foi desta vez, mas continue participando dos próximos jogos!

🎯 *Próximos jogos:* Acesse o app para ver quando haverá novos sorteios.

Obrigado por participar! 🎉`;

      await sendWhatsAppMessage(participant.user_phone, message);

    } catch (error) {

    }
  };

  const toggleNumberSelection = (number: number) => {
    setSelectedNumbers(prev => 
      prev.includes(number) 
        ? prev.filter(n => n !== number)
        : [...prev, number]
    );
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Jogo não encontrado</h2>
          <button
            onClick={() => navigate(-1)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300"
          >
            Voltar para Lista
          </button>
        </div>
      </div>
    );
  }

  const activeParticipants = participants.filter(p => p.status === 'active');
  const eliminatedParticipants = participants.filter(p => p.status === 'eliminated');

  return (
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full px-2 sm:px-4 lg:px-8">
      <div className="flex-grow bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <button
                onClick={() => navigate(-1)}
                className="text-amber-400 hover:text-amber-300 mb-2 flex items-center gap-2 transition-colors"
              >
                ← Voltar para Lista
              </button>
              <h1 className="text-4xl font-bold text-white mb-2">
                🎮 {game.title}
              </h1>
              <p className="text-slate-300">
                {game.description || 'Controle do jogo "Resta Um"'}
              </p>
            </div>
            <div className="text-right">
              {getStatusBadge(game.status)}
              <div className="text-slate-400 text-sm mt-2">
                {activeParticipants.length} participantes ativos
              </div>
            </div>
          </div>
        </div>

        {/* Game Controls */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">🎯 Controles do Jogo</h2>
          <div className="flex flex-wrap gap-4">
            {!gameActive && game.status === 'waiting' && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={startGame}
                  disabled={activeParticipants.length < 2}
                  className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                    activeParticipants.length < 2
                      ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
                  }`}
                >
                  {activeParticipants.length < 2 
                    ? `⏳ Aguardando Participantes (${activeParticipants.length}/2)`
                    : `▶️ Iniciar Jogo (${activeParticipants.length} participantes)`
                  }
                </button>
                
                <button
                  onClick={closeSystem}
                  disabled={activeParticipants.length === 0}
                  className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                    activeParticipants.length === 0
                      ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white'
                  }`}
                >
                  🔒 Fechar Sistema para Sorteio Manual
                </button>
              </div>
            )}
            
            {gameActive && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={endGame}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300"
                >
                  ⏹️ Finalizar Jogo
                </button>
                
                <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 text-center">
                  <p className="text-green-400 font-medium">🔒 Sistema Fechado</p>
                  <p className="text-green-300 text-sm">Novos participantes não podem entrar</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions for Manual Draw */}
        {gameActive && (
          <div className="bg-blue-500/20 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-blue-500/30">
            <h2 className="text-xl font-bold text-white mb-4">📋 Instruções para Sorteio Manual</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">
              <div>
                <h3 className="font-semibold text-blue-400 mb-2">1. Exportar Lista de Participantes</h3>
                <p className="text-sm">Use o botão "Exportar Participantes" para gerar uma lista em PDF com todos os números e nomes.</p>
              </div>
              <div>
                <h3 className="font-semibold text-blue-400 mb-2">2. Fazer Sorteio Manual</h3>
                <p className="text-sm">Use a lista exportada para fazer o sorteio manual fora do sistema.</p>
              </div>
              <div>
                <h3 className="font-semibold text-blue-400 mb-2">3. Eliminar Participantes</h3>
                <p className="text-sm">Use os controles abaixo para eliminar participantes conforme o sorteio manual.</p>
              </div>
              <div>
                <h3 className="font-semibold text-blue-400 mb-2">4. Finalizar Jogo</h3>
                <p className="text-sm">Quando restar apenas 1 participante, clique em "Finalizar Jogo" para declarar o vencedor.</p>
              </div>
            </div>
          </div>
        )}

        {/* Manual Elimination */}
        {gameActive && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">🎯 Eliminação Manual</h2>
            <p className="text-slate-300 mb-4">Selecione os números para eliminar manualmente:</p>
            
            <div className="grid grid-cols-8 sm:grid-cols-12 lg:grid-cols-16 gap-2 mb-4">
              {activeParticipants.map((participant) => (
                <button
                  key={participant.lucky_number}
                  onClick={() => toggleNumberSelection(participant.lucky_number)}
                  className={`w-12 h-12 rounded-lg font-bold transition-all duration-300 ${
                    selectedNumbers.includes(participant.lucky_number)
                      ? 'bg-red-500 text-white border-2 border-red-400'
                      : 'bg-slate-700 text-white hover:bg-slate-600 border-2 border-transparent hover:border-amber-400'
                  }`}
                >
                  {participant.lucky_number}
                </button>
              ))}
            </div>
            
            {selectedNumbers.length > 0 && (
              <button
                onClick={eliminateSelectedParticipants}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300"
              >
                🗑️ Eliminar Selecionados ({selectedNumbers.length})
              </button>
            )}
          </div>
        )}

        {/* Participants */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Participants */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">
              ✅ Participantes Ativos ({activeParticipants.length})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activeParticipants.map((participant) => (
                <div
                  key={participant.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${
                    selectedNumbers.includes(participant.lucky_number)
                      ? 'border-red-400 bg-red-500/20'
                      : 'border-slate-600 bg-slate-800/50 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {participant.lucky_number}
                    </div>
                    <div>
                      <div className="text-white font-medium">{participant.user_name || 'Usuário'}</div>
                      <div className="text-slate-400 text-sm">{participant.user_phone || 'Sem telefone'}</div>
                    </div>
                  </div>
                  <div className="text-green-400 text-sm">Ativo</div>
                </div>
              ))}
            </div>
          </div>

          {/* Eliminated Participants */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">
              ❌ Eliminados ({eliminatedParticipants.length})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {eliminatedParticipants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-600 bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {participant.lucky_number}
                    </div>
                    <div>
                      <div className="text-white font-medium">{participant.user_name || 'Usuário'}</div>
                      <div className="text-slate-400 text-sm">{participant.user_phone || 'Sem telefone'}</div>
                    </div>
                  </div>
                  <div className="text-red-400 text-sm">
                    {participant.eliminated_at 
                      ? new Date(participant.eliminated_at).toLocaleTimeString('pt-BR')
                      : 'Eliminado'
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Winner */}
        {game.status === 'finished' && game.winner_id && (
          <div className="mt-8 bg-gradient-to-r from-amber-500/20 to-amber-600/20 backdrop-blur-sm rounded-2xl p-6 border border-amber-400/50">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">🎉 Vencedor!</h2>
            <div className="text-center">
              {(() => {
                const winner = participants.find(p => p.user_id === game.winner_id);
                return winner ? (
                  <>
                    <div className="text-4xl font-bold text-amber-400 mb-2">
                      Número {winner.lucky_number}
                    </div>
                    <div className="text-white text-lg">
                      {winner.user_name}
                    </div>
                  </>
                ) : (
                  <div className="text-white text-lg">
                    Parabéns ao vencedor!
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Notificações de Eliminação */}
        {recentEliminations.map((elimination, index) => (
          <EliminationNotification
            key={`${elimination.lucky_number}-${elimination.eliminated_at}-${index}`}
            participant={elimination}
            onClose={() => {
              setRecentEliminations(prev => 
                prev.filter((_, i) => i !== index)
              );
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AdminLiveControlPage;