import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Target, Play, Square, Trophy, Users, DollarSign, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface PoolManagerProps {
  streamId: string;
}

interface MatchPool {
  id: string;
  match_title: string;
  home_team: string;
  away_team: string;
  is_active: boolean;
  result_home_score: number | null;
  result_away_score: number | null;
  total_participants: number;
  total_pool_amount: number;
  winners_count: number;
  prize_per_winner: number;
}

const PoolManager: React.FC<PoolManagerProps> = ({ streamId }) => {
  const { user } = useAuth();
  const [pool, setPool] = useState<MatchPool | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [formData, setFormData] = useState({
    match_title: '',
    home_team: '',
    away_team: ''
  });
  const [resultData, setResultData] = useState({
    home_score: '',
    away_score: ''
  });

  useEffect(() => {
    loadPool();
  }, [streamId]);

  const loadPool = async () => {
    try {
      const { data, error } = await supabase
        .from('match_pools')
        .select('*')
        .eq('live_stream_id', streamId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setPool(data || null);
    } catch (err) {
      console.error('Erro ao carregar bolão:', err);
    }
  };

  const createPool = async () => {
    if (!formData.match_title || !formData.home_team || !formData.away_team) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('match_pools')
        .insert({
          live_stream_id: streamId,
          match_title: formData.match_title,
          home_team: formData.home_team,
          away_team: formData.away_team,
          is_active: false
        })
        .select()
        .single();

      if (error) throw error;

      setPool(data);
      setShowCreateModal(false);
      setFormData({ match_title: '', home_team: '', away_team: '' });
      toast.success('Bolão criado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao criar bolão:', err);
      toast.error(err.message || 'Erro ao criar bolão');
    } finally {
      setLoading(false);
    }
  };

  const togglePool = async () => {
    if (!pool) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('match_pools')
        .update({ is_active: !pool.is_active })
        .eq('id', pool.id);

      if (error) throw error;

      await loadPool();
      toast.success(`Bolão ${!pool.is_active ? 'ativado' : 'desativado'}!`);
    } catch (err: any) {
      console.error('Erro ao atualizar bolão:', err);
      toast.error('Erro ao atualizar bolão');
    } finally {
      setLoading(false);
    }
  };

  const setResult = async () => {
    const home = parseInt(resultData.home_score);
    const away = parseInt(resultData.away_score);

    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      toast.error('Digite placares válidos');
      return;
    }

    if (!pool) return;

    try {
      setLoading(true);
      // Atualizar resultado
      const { error: updateError } = await supabase
        .from('match_pools')
        .update({
          result_home_score: home,
          result_away_score: away,
          is_active: false // Desativar bolão após resultado
        })
        .eq('id', pool.id);

      if (updateError) throw updateError;

      // Calcular ganhadores
      const { data: winnersData, error: winnersError } = await supabase.rpc('calculate_pool_winners', {
        p_pool_id: pool.id
      });

      if (winnersError) {
        console.error('Erro ao calcular ganhadores:', winnersError);
        toast.error('Resultado salvo, mas erro ao calcular ganhadores');
      } else {
        toast.success(`Resultado salvo! ${winnersData?.winners_count || 0} ganhador(es) encontrado(s).`);
      }

      await loadPool();
      setShowResultModal(false);
      setResultData({ home_score: '', away_score: '' });
    } catch (err: any) {
      console.error('Erro ao definir resultado:', err);
      toast.error(err.message || 'Erro ao definir resultado');
    } finally {
      setLoading(false);
    }
  };

  if (!pool && !showCreateModal) {
    return (
      <div className="bg-slate-800/40 p-6 rounded-[2rem] border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-black text-white uppercase italic">Bolão de Resultados</h3>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl uppercase text-xs"
          >
            Criar Bolão
          </button>
        </div>
        <p className="text-slate-400 text-sm">Nenhum bolão criado para esta live.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-800/40 p-6 rounded-[2rem] border border-white/5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-black text-white uppercase italic">Bolão de Resultados</h3>
          </div>
          {pool && (
            <button
              onClick={togglePool}
              disabled={loading}
              className={`px-6 py-3 font-black rounded-xl uppercase text-xs transition-all ${
                pool.is_active
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {pool.is_active ? (
                <>
                  <Square className="w-4 h-4 inline mr-2" />
                  Desativar
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 inline mr-2" />
                  Ativar
                </>
              )}
            </button>
          )}
        </div>

        {pool && (
          <>
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-slate-400 text-sm mb-1">Partida</p>
                <p className="text-white font-bold">{pool.match_title}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-slate-400 text-sm mb-1">Casa</p>
                  <p className="text-white font-bold">{pool.home_team}</p>
                </div>
                <span className="text-blue-400 font-black text-xl">vs</span>
                <div className="flex-1">
                  <p className="text-slate-400 text-sm mb-1">Visitante</p>
                  <p className="text-white font-bold">{pool.away_team}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-slate-900/50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <p className="text-slate-400 text-xs">Participantes</p>
                  </div>
                  <p className="text-2xl font-black text-white">{pool.total_participants}</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <p className="text-slate-400 text-xs">Prêmio Total</p>
                  </div>
                  <p className="text-2xl font-black text-white">R$ {(pool.total_pool_amount * 0.70).toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1">de R$ {pool.total_pool_amount.toFixed(2)} arrecadado</p>
                </div>
              </div>

              {pool.result_home_score !== null && pool.result_away_score !== null && (
                <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <p className="text-green-400 font-bold text-sm">Resultado Final</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black text-white">{pool.result_home_score}</span>
                    <span className="text-green-400 font-black text-xl">x</span>
                    <span className="text-2xl font-black text-white">{pool.result_away_score}</span>
                  </div>
                  {pool.winners_count > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-500/20">
                      <p className="text-green-400 text-sm">
                        {pool.winners_count} ganhador(es) - R$ {pool.prize_per_winner.toFixed(2)} cada
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {pool.result_home_score === null && (
              <button
                onClick={() => setShowResultModal(true)}
                className="w-full px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-black rounded-xl uppercase text-xs"
              >
                Definir Resultado
              </button>
            )}
          </>
        )}
      </div>

      {/* Modal Criar Bolão */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-8 rounded-[2.5rem] border border-white/10 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black text-white uppercase italic mb-6">Criar Bolão</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-white font-bold mb-2 text-sm">Título da Partida</label>
                <input
                  type="text"
                  value={formData.match_title}
                  onChange={(e) => setFormData({ ...formData, match_title: e.target.value })}
                  placeholder="Ex: Cruzeiro x Atlético"
                  className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-white font-bold mb-2 text-sm">Time da Casa</label>
                <input
                  type="text"
                  value={formData.home_team}
                  onChange={(e) => setFormData({ ...formData, home_team: e.target.value })}
                  placeholder="Ex: Cruzeiro"
                  className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-white font-bold mb-2 text-sm">Time Visitante</label>
                <input
                  type="text"
                  value={formData.away_team}
                  onChange={(e) => setFormData({ ...formData, away_team: e.target.value })}
                  placeholder="Ex: Atlético"
                  className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-white font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ match_title: '', home_team: '', away_team: '' });
                  }}
                  className="py-3 bg-slate-700 text-white rounded-xl font-black uppercase text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={createPool}
                  disabled={loading}
                  className="py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs disabled:opacity-50"
                >
                  {loading ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Definir Resultado */}
      {showResultModal && pool && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-8 rounded-[2.5rem] border border-white/10 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black text-white uppercase italic mb-6">Definir Resultado</h3>
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-slate-400 text-sm mb-2">{pool.match_title}</p>
                <div className="flex items-center justify-center gap-4">
                  <span className="text-white font-bold">{pool.home_team}</span>
                  <span className="text-blue-400 font-black">vs</span>
                  <span className="text-white font-bold">{pool.away_team}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-bold mb-2 text-sm">{pool.home_team}</label>
                  <input
                    type="number"
                    min="0"
                    value={resultData.home_score}
                    onChange={(e) => setResultData({ ...resultData, home_score: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-white text-center text-2xl font-black"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-white font-bold mb-2 text-sm">{pool.away_team}</label>
                  <input
                    type="number"
                    min="0"
                    value={resultData.away_score}
                    onChange={(e) => setResultData({ ...resultData, away_score: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-white text-center text-2xl font-black"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="bg-yellow-900/20 border border-yellow-500/30 p-3 rounded-xl">
                <p className="text-yellow-400 text-xs text-center">
                  ⚠️ Após definir o resultado, o bolão será desativado e os ganhadores serão calculados automaticamente.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setShowResultModal(false);
                    setResultData({ home_score: '', away_score: '' });
                  }}
                  className="py-3 bg-slate-700 text-white rounded-xl font-black uppercase text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={setResult}
                  disabled={loading}
                  className="py-3 bg-yellow-600 text-white rounded-xl font-black uppercase text-xs disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar Resultado'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PoolManager;

