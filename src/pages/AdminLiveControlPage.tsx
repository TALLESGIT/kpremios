import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useWhatsApp } from '../hooks/useWhatsApp';
import EliminationNotification from '../components/shared/EliminationNotification';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { Gamepad2, Users, XCircle, CheckCircle, Play, Square, Lock } from 'lucide-react';

interface LiveGame {
  id: string;
  title: string;
  description: string;
  max_participants: number;
  status: 'waiting' | 'active' | 'finished';
  winner_id?: string;
  elimination_interval?: number;
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
  const [eliminationTimer, setEliminationTimer] = useState<any>(null);
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
        // Trigger automated cleanup first
        try {
          await supabase.rpc('cleanup_old_data');
        } catch (e) {
          console.warn('Cleanup function not found in Supabase. Run the migration script.');
        }

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
      toast('🎯 Resta apenas 1 participante! Use o botão "Finalizar Jogo" para declarar o vencedor.');
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
              Carregando controle do jogo...
            </motion.p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-black text-gray-900 mb-4">Jogo não encontrado</h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-all duration-200 shadow-lg"
            >
              Voltar para Lista
            </motion.button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const activeParticipants = participants.filter(p => p.status === 'active');
  const eliminatedParticipants = participants.filter(p => p.status === 'eliminated');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <Header />
      <main className="flex-grow w-full py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(-1)}
                  className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2 transition-colors font-bold"
                >
                  ← Voltar para Lista
                </motion.button>
                <div className="flex items-center space-x-3 mb-2">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg"
                  >
                    <Gamepad2 className="h-6 w-6 text-white" />
                  </motion.div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
                      {game.title}
                    </h1>
                    <p className="text-gray-600 text-sm font-semibold">
                      {game.description || 'Controle do jogo "Resta Um"'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <motion.span
                  whileHover={{ scale: 1.1 }}
                  className="inline-block mb-2"
                >
                  {getStatusBadge(game.status)}
                </motion.span>
                <div className="text-gray-700 text-sm font-bold">
                  {activeParticipants.length} participantes ativos
                </div>
              </div>
            </div>
          </motion.div>

          {/* Game Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-6 mb-6"
          >
            <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-blue-600" />
              Controles do Jogo
            </h2>
            <div className="flex flex-wrap gap-4">
              {!gameActive && game.status === 'waiting' && (
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <motion.button
                    whileHover={{ scale: activeParticipants.length >= 2 ? 1.05 : 1 }}
                    whileTap={{ scale: activeParticipants.length >= 2 ? 0.95 : 1 }}
                    onClick={startGame}
                    disabled={activeParticipants.length < 2}
                    className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all duration-200 ${activeParticipants.length < 2
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg'
                      }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Play className="h-5 w-5" />
                      {activeParticipants.length < 2
                        ? `Aguardando Participantes (${activeParticipants.length}/2)`
                        : `Iniciar Jogo (${activeParticipants.length} participantes)`
                      }
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: activeParticipants.length > 0 ? 1.05 : 1 }}
                    whileTap={{ scale: activeParticipants.length > 0 ? 0.95 : 1 }}
                    onClick={closeSystem}
                    disabled={activeParticipants.length === 0}
                    className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all duration-200 ${activeParticipants.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg'
                      }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Lock className="h-5 w-5" />
                      Fechar Sistema para Sorteio Manual
                    </div>
                  </motion.button>
                </div>
              )}

              {gameActive && (
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={endGame}
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-lg font-bold transition-all duration-200 shadow-lg"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Square className="h-5 w-5" />
                      Finalizar Jogo
                    </div>
                  </motion.button>

                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 text-center">
                    <p className="text-green-700 font-bold flex items-center justify-center gap-2">
                      <Lock className="h-5 w-5" />
                      Sistema Fechado
                    </p>
                    <p className="text-green-600 text-sm font-semibold mt-1">Novos participantes não podem entrar</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Instructions for Manual Draw */}
          {gameActive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-blue-50 rounded-2xl shadow-lg border-2 border-blue-200 p-6 mb-6"
            >
              <h2 className="text-xl font-black text-gray-900 mb-4">📋 Instruções para Sorteio Manual</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                  <h3 className="font-bold text-blue-700 mb-2">1. Exportar Lista de Participantes</h3>
                  <p className="text-sm text-gray-700">Use o botão "Exportar Participantes" para gerar uma lista em PDF com todos os números e nomes.</p>
                </div>
                <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                  <h3 className="font-bold text-blue-700 mb-2">2. Fazer Sorteio Manual</h3>
                  <p className="text-sm text-gray-700">Use a lista exportada para fazer o sorteio manual fora do sistema.</p>
                </div>
                <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                  <h3 className="font-bold text-blue-700 mb-2">3. Eliminar Participantes</h3>
                  <p className="text-sm text-gray-700">Use os controles abaixo para eliminar participantes conforme o sorteio manual.</p>
                </div>
                <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                  <h3 className="font-bold text-blue-700 mb-2">4. Finalizar Jogo</h3>
                  <p className="text-sm text-gray-700">Quando restar apenas 1 participante, clique em "Finalizar Jogo" para declarar o vencedor.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Manual Elimination */}
          {gameActive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-6 mb-6"
            >
              <h2 className="text-xl font-black text-gray-900 mb-4">🎯 Eliminação Manual</h2>
              <p className="text-gray-700 mb-4 font-semibold">Selecione os números para eliminar manualmente:</p>

              <div className="grid grid-cols-8 sm:grid-cols-12 lg:grid-cols-16 gap-2 mb-4">
                {activeParticipants.map((participant) => (
                  <motion.button
                    key={participant.lucky_number}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleNumberSelection(participant.lucky_number)}
                    className={`w-12 h-12 rounded-lg font-bold transition-all duration-200 ${selectedNumbers.includes(participant.lucky_number)
                      ? 'bg-red-500 text-white border-2 border-red-400 shadow-lg'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-2 border-blue-300 hover:border-blue-400'
                      }`}
                  >
                    {participant.lucky_number}
                  </motion.button>
                ))}
              </div>

              {selectedNumbers.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={eliminateSelectedParticipants}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-lg font-bold transition-all duration-200 shadow-lg"
                >
                  <div className="flex items-center justify-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Eliminar Selecionados ({selectedNumbers.length})
                  </div>
                </motion.button>
              )}
            </motion.div>
          )}

          {/* Participants */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Participants */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-lg border-2 border-green-200 p-6"
            >
              <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                Participantes Ativos ({activeParticipants.length})
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activeParticipants.map((participant, index) => (
                  <motion.div
                    key={participant.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-200 ${selectedNumbers.includes(participant.lucky_number)
                      ? 'border-red-400 bg-red-50'
                      : 'border-green-200 bg-green-50 hover:border-green-300'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {participant.lucky_number}
                      </div>
                      <div>
                        <div className="text-gray-900 font-bold">{participant.user_name || 'Usuário'}</div>
                        <div className="text-gray-600 text-sm font-semibold">{participant.user_phone || 'Sem telefone'}</div>
                      </div>
                    </div>
                    <div className="text-green-600 text-sm font-bold">Ativo</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Eliminated Participants */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl shadow-lg border-2 border-red-200 p-6"
            >
              <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                <XCircle className="h-6 w-6 text-red-600" />
                Eliminados ({eliminatedParticipants.length})
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {eliminatedParticipants.map((participant, index) => (
                  <motion.div
                    key={participant.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg border-2 border-red-200 bg-red-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {participant.lucky_number}
                      </div>
                      <div>
                        <div className="text-gray-900 font-bold">{participant.user_name || 'Usuário'}</div>
                        <div className="text-gray-600 text-sm font-semibold">{participant.user_phone || 'Sem telefone'}</div>
                      </div>
                    </div>
                    <div className="text-red-600 text-sm font-bold">
                      {participant.eliminated_at
                        ? new Date(participant.eliminated_at).toLocaleTimeString('pt-BR')
                        : 'Eliminado'
                      }
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Winner */}
          {game.status === 'finished' && game.winner_id && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-6 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl shadow-lg border-2 border-yellow-300 p-8"
            >
              <h2 className="text-2xl font-black text-gray-900 mb-4 text-center">🎉 Vencedor!</h2>
              <div className="text-center">
                {(() => {
                  const winner = participants.find(p => p.user_id === game.winner_id);
                  return winner ? (
                    <>
                      <div className="text-4xl font-black text-yellow-600 mb-2">
                        Número {winner.lucky_number}
                      </div>
                      <div className="text-gray-900 text-lg font-bold">
                        {winner.user_name}
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-900 text-lg font-bold">
                      Parabéns ao vencedor!
                    </div>
                  );
                })()}
              </div>
            </motion.div>
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
      </main>

      <Footer />
    </div>
  );
};

export default AdminLiveControlPage;