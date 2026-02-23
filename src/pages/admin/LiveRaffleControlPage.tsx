import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

interface LiveRaffle {
  id: string;
  title: string;
  description: string;
  max_participants: number;
  is_active: boolean;
  participants: any[];
  current_round: number;
  winner?: any;
  created_at: string;
}

const LiveRaffleControlPage: React.FC = () => {
  const { user } = useAuth();
  const [raffles, setRaffles] = useState<LiveRaffle[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [newRaffle, setNewRaffle] = useState({
    title: '',
    description: '',
    max_participants: 50,
    elimination_interval: 60, // segundos
  });

  useEffect(() => {
    loadRaffles();
  }, []);

  const loadRaffles = async () => {
    try {
      const { data, error } = await supabase
        .from('live_raffles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRaffles(data || []);
    } catch (error) {
    }
  };

  const createRaffle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const raffleData = {
        title: newRaffle.title,
        description: newRaffle.description,
        max_participants: newRaffle.max_participants,
        is_active: true,
        admin_id: user.id,
        participants: [],
        current_round: 0,
        elimination_interval: newRaffle.elimination_interval,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('live_raffles')
        .insert([raffleData])
        .select()
        .single();

      if (error) throw error;

      setRaffles([data, ...raffles]);
      setMessage('🎉 Sorteio criado com sucesso!');
      setNewRaffle({ title: '', description: '', max_participants: 50, elimination_interval: 60 });
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Erro ao criar sorteio');
    } finally {
      setLoading(false);
    }
  };

  const startElimination = async (raffleId: string) => {
    try {
      const raffle = raffles.find(r => r.id === raffleId);
      if (!raffle || raffle.participants.length < 2) {
        setMessage('❌ Precisa de pelo menos 2 participantes para começar!');
        return;
      }

      // Atualizar sorteio para iniciar eliminação
      const { error } = await supabase
        .from('live_raffles')
        .update({ 
          current_round: 1,
          elimination_started_at: new Date().toISOString()
        })
        .eq('id', raffleId);

      if (error) throw error;

      // Iniciar processo de eliminação automática
      startAutomaticElimination(raffleId);
      
      setMessage('🚀 Eliminação iniciada!');
      loadRaffles();
    } catch (error) {
      setMessage('❌ Erro ao iniciar eliminação');
    }
  };

  const startAutomaticElimination = (raffleId: string) => {
    const raffle = raffles.find(r => r.id === raffleId);
    if (!raffle) return;

    const interval = setInterval(async () => {
      try {
        const { data: currentRaffle, error: fetchError } = await supabase
          .from('live_raffles')
          .select('*')
          .eq('id', raffleId)
          .single();

        if (fetchError) throw fetchError;

        const activeParticipants = currentRaffle.participants.filter((p: any) => !p.isEliminated);
        
        if (activeParticipants.length <= 1) {
          // Temos um vencedor!
          clearInterval(interval);
          const winner = activeParticipants[0];
          
          await supabase
            .from('live_raffles')
            .update({ 
              is_active: false, 
              winner: winner,
              ended_at: new Date().toISOString()
            })
            .eq('id', raffleId);

          setMessage(`🏆 VENCEDOR: ${winner.name} com o número ${winner.number}!`);
          loadRaffles();
          return;
        }

        // Escolher número aleatório para eliminação
        const randomIndex = Math.floor(Math.random() * activeParticipants.length);
        const eliminatedParticipant = activeParticipants[randomIndex];

        // Atualizar participante eliminado
        const updatedParticipants = currentRaffle.participants.map((p: any) => 
          p.id === eliminatedParticipant.id ? { ...p, isEliminated: true } : p
        );

        await supabase
          .from('live_raffles')
          .update({ 
            participants: updatedParticipants,
            current_round: currentRaffle.current_round + 1
          })
          .eq('id', raffleId);

        setMessage(`💀 ${eliminatedParticipant.name} (${eliminatedParticipant.number}) foi eliminado!`);
        loadRaffles();
      } catch (error) {
        clearInterval(interval);
      }
    }, raffle.elimination_interval * 1000); // Converter segundos para ms
  };

  const endRaffle = async (raffleId: string) => {
    try {
      const { error } = await supabase
        .from('live_raffles')
        .update({ 
          is_active: false,
          ended_at: new Date().toISOString()
        })
        .eq('id', raffleId);

      if (error) throw error;

      setMessage('⏹️ Sorteio finalizado!');
      loadRaffles();
    } catch (error) {
      setMessage('❌ Erro ao finalizar sorteio');
    }
  };

  const deleteRaffle = async (raffleId: string) => {
    if (!confirm('Tem certeza que deseja excluir este sorteio?')) return;

    try {
      const { error } = await supabase
        .from('live_raffles')
        .delete()
        .eq('id', raffleId);

      if (error) throw error;

      setRaffles(raffles.filter(r => r.id !== raffleId));
      setMessage('🗑️ Sorteio excluído!');
    } catch (error) {
      setMessage('❌ Erro ao excluir sorteio');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🎮 Controle de Sorteios ao Vivo</h1>
            <p className="text-gray-600 mt-2">Gerencie seus sorteios "Resta Um" com eliminação automática</p>
          </div>
          <Link
            to="/admin/dashboard"
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            ← Voltar ao Dashboard
          </Link>
        </div>

        {message && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-6">
            {message}
          </div>
        )}

        {/* Criar Novo Sorteio */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Criar Novo Sorteio</h2>
          
          <form onSubmit={createRaffle} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título do Sorteio
                </label>
                <input
                  type="text"
                  value={newRaffle.title}
                  onChange={(e) => setNewRaffle({...newRaffle, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Sorteio Live #1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Máximo de Participantes
                </label>
                <input
                  type="number"
                  value={newRaffle.max_participants}
                  onChange={(e) => setNewRaffle({...newRaffle, max_participants: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="2"
                  max="100"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                value={newRaffle.description}
                onChange={(e) => setNewRaffle({...newRaffle, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Descreva o sorteio e as regras..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intervalo de Eliminação (segundos)
              </label>
              <select
                value={newRaffle.elimination_interval}
                onChange={(e) => setNewRaffle({...newRaffle, elimination_interval: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={30}>30 segundos (Rápido)</option>
                <option value={60}>1 minuto (Normal)</option>
                <option value={120}>2 minutos (Lento)</option>
                <option value={300}>5 minutos (Muito Lento)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Criando...' : '🎮 Criar Sorteio'}
            </button>
          </form>
        </div>

        {/* Lista de Sorteios */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sorteios Criados</h2>
          
          {raffles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🎯</div>
              <p>Nenhum sorteio criado ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {raffles.map((raffle) => (
                <div key={raffle.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{raffle.title}</h3>
                      <p className="text-gray-600 text-sm">{raffle.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        raffle.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {raffle.is_active ? 'Ativo' : 'Finalizado'}
                      </span>
                      {raffle.winner && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          🏆 Finalizado
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-600">Participantes:</span>
                      <p className="font-medium">{raffle.participants.length}/{raffle.max_participants}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Ativos:</span>
                      <p className="font-medium">{raffle.participants.filter((p: any) => !p.isEliminated).length}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Rodada:</span>
                      <p className="font-medium">{raffle.current_round}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Criado:</span>
                      <p className="font-medium">{new Date(raffle.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {raffle.winner && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">🏆</span>
                        <div>
                          <p className="font-semibold text-yellow-800">VENCEDOR!</p>
                          <p className="text-yellow-700">{raffle.winner.name} - Número #{raffle.winner.number}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    {raffle.is_active && !raffle.winner && (
                      <>
                        {raffle.participants.length >= 2 && raffle.current_round === 0 && (
                          <button
                            onClick={() => startElimination(raffle.id)}
                            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-3 rounded-lg text-sm transition-colors duration-200"
                          >
                            🚀 Iniciar Eliminação
                          </button>
                        )}
                        <button
                          onClick={() => endRaffle(raffle.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-lg text-sm transition-colors duration-200"
                        >
                          ⏹️ Finalizar
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => deleteRaffle(raffle.id)}
                      className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded-lg text-sm transition-colors duration-200"
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveRaffleControlPage;

