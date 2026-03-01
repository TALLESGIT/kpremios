import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Target, Play, Square, Trophy, Users, DollarSign } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { whatsappService } from '../../services/whatsappService';
import CustomToast from '../shared/CustomToast';

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
  accumulated_amount: number;
  home_team_logo?: string;
  away_team_logo?: string;
}

const PoolManager: React.FC<PoolManagerProps> = ({ streamId }) => {
  const [pool, setPool] = useState<MatchPool | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [formData, setFormData] = useState({
    match_title: '',
    home_team: '',
    away_team: '',
    home_team_logo: '',
    away_team_logo: ''
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

  const fetchLatestGame = async () => {
    try {
      const { data: latestGame, error } = await supabase
        .from('cruzeiro_games')
        .select('*')
        .order('date', { ascending: false })
        .maybeSingle();

      if (error) throw error;

      if (latestGame) {
        setFormData({
          match_title: latestGame.is_home ? `Cruzeiro x ${latestGame.opponent}` : `${latestGame.opponent} x Cruzeiro`,
          home_team: latestGame.is_home ? 'Cruzeiro' : latestGame.opponent,
          away_team: latestGame.is_home ? latestGame.opponent : 'Cruzeiro',
          home_team_logo: latestGame.is_home ? 'https://logodetimes.com/times/cruzeiro/logo-cruzeiro-256.png' : (latestGame.opponent_logo || ''),
          away_team_logo: latestGame.is_home ? (latestGame.opponent_logo || '') : 'https://logodetimes.com/times/cruzeiro/logo-cruzeiro-256.png'
        });
        toast.success('Sugestão do último jogo carregada!');
      }
    } catch (err) {
      console.error('Erro ao buscar jogo recente:', err);
      toast.error('Não foi possível carregar sugestão do último jogo');
    }
  };

  const createPool = async () => {
    if (!formData.match_title || !formData.home_team || !formData.away_team) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      setLoading(true);

      const { data: newPool, error } = await supabase
        .from('match_pools')
        .insert({
          live_stream_id: streamId,
          match_title: formData.match_title,
          home_team: formData.home_team,
          home_team_logo: formData.home_team_logo,
          away_team: formData.away_team,
          away_team_logo: formData.away_team_logo,
          is_active: false
          // accumulated_amount será definido automaticamente pelo trigger before_insert_match_pool
        })
        .select()
        .single();

      if (error) throw error;

      setPool(newPool);
      setShowCreateModal(false);
      setFormData({
        match_title: '',
        home_team: '',
        home_team_logo: '',
        away_team: '',
        away_team_logo: ''
      });
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

      // Atualizar resultado (tentar com result_set_at; se coluna não existir, tentar sem)
      const updatePayload: Record<string, unknown> = {
        result_home_score: home,
        result_away_score: away,
        is_active: false,
        result_set_at: new Date().toISOString()
      };

      let { error: updateError } = await supabase
        .from('match_pools')
        .update(updatePayload)
        .eq('id', pool.id);

      if (updateError) {
        const msg = (updateError as { message?: string }).message || '';
        if (msg.includes('result_set_at') || msg.includes('does not exist') || (updateError as { code?: string }).code === '42703') {
          delete updatePayload.result_set_at;
          const retry = await supabase.from('match_pools').update(updatePayload).eq('id', pool.id);
          updateError = retry.error;
          if (!updateError) {
            console.warn('Coluna result_set_at não existe. Execute a migration 20260115_add_result_set_at_to_match_pools.sql no Supabase.');
          }
        }
      }

      if (updateError) {
        console.error('Erro ao salvar resultado do bolão:', updateError);
        throw new Error((updateError as { message?: string }).message || 'Erro ao salvar resultado');
      }

      // Calcular ganhadores
      const { data: winnersData, error: winnersError } = await supabase.rpc('calculate_pool_winners', {
        p_pool_id: pool.id
      });

      if (winnersError) {
        const errMsg = (winnersError as { message?: string }).message || '';
        const errCode = (winnersError as { code?: string }).code || '';
        console.error('Erro ao calcular ganhadores:', { message: errMsg, code: errCode, full: winnersError });
        toast.custom(() => (
          <CustomToast
            type="error"
            title="ERRO AO CALCULAR GANHADORES"
            message={errMsg.includes('result_set_at') || errMsg.includes('does not exist')
              ? 'Resultado salvo. Execute no Supabase (SQL) a migration: 20260115_add_result_set_at_to_match_pools.sql'
              : 'Resultado salvo, mas houve erro ao calcular ganhadores. Veja o console.'}
          />
        ), { duration: 5000 });
      } else {
        const winnersCount = winnersData?.winners_count || 0;

        // Mensagem informando se houve ganhador(es)
        if (winnersCount > 0) {
          toast.custom(() => (
            <CustomToast
              type="success"
              title="RESULTADO DEFINIDO COM SUCESSO!"
              message={`${winnersCount} ganhador(es) encontrado(s)! As notificações serão enviadas automaticamente.`}
            />
          ), { duration: 4000 });
        } else {
          toast.custom(() => (
            <CustomToast
              type="warning"
              title="RESULTADO DEFINIDO"
              message="Nenhum ganhador encontrado para este resultado."
            />
          ), { duration: 3000 });
        }

        // Enviar notificações automáticas para ganhadores
        if (winnersCount > 0) {
          try {
            // Buscar dados dos ganhadores
            const { data: winners, error: winnersFetchError } = await supabase
              .from('pool_bets')
              .select(`
                users!inner (
                  name,
                  whatsapp
                ),
                predicted_home_score,
                predicted_away_score,
                prize_amount
              `)
              .eq('pool_id', pool.id)
              .eq('is_winner', true)
              .eq('payment_status', 'approved');

            if (!winnersFetchError && winners && winners.length > 0) {
              let successCount = 0;
              let errorCount = 0;

              // Enviar notificações para cada ganhador
              for (const winner of winners) {
                try {
                  // Ajuste para lidar com o fato de 'users' poder vir como objeto ou array
                  const userData: any = Array.isArray(winner.users) ? winner.users[0] : winner.users;

                  if (userData?.whatsapp && userData?.name) {
                    // Teste: verificar se é o número de teste (33) 999030124
                    const testWhatsApp = '33999030124';
                    const winnerWhatsApp = userData.whatsapp.replace(/\D/g, '');

                    const result = await whatsappService.sendMessage({
                      to: userData.whatsapp,
                      message: '',
                      type: 'pool_winner',
                      name: userData.name,
                      matchTitle: pool.match_title,
                      predictedScore: `${winner.predicted_home_score} x ${winner.predicted_away_score}`,
                      realScore: `${pool.result_home_score} x ${pool.result_away_score}`,
                      prize: winner.prize_amount?.toString() || '0',
                      totalAmount: pool.total_pool_amount?.toString() || '0',
                      winnersCount: winnersCount.toString()
                    } as any);

                    if (result.success) {
                      successCount++;
                      // Se for o número de teste, mostrar mensagem especial
                      if (winnerWhatsApp === testWhatsApp) {
                        toast.custom(() => (
                          <CustomToast
                            type="success"
                            title="MENSAGEM DE TESTE ENVIADA!"
                            message={`Mensagem enviada com sucesso para ${userData.name} (${userData.whatsapp})`}
                          />
                        ), { duration: 4000 });
                      }
                    } else {
                      errorCount++;
                      console.error(`Erro ao enviar notificação para ${userData.name}:`, result.error);
                    }

                    // Pequena pausa entre mensagens para evitar rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                } catch (err) {
                  errorCount++;
                  console.error('Erro ao enviar notificação:', err);
                }
              }

              if (successCount > 0) {
                toast.custom(() => (
                  <CustomToast
                    type="success"
                    title="NOTIFICAÇÕES ENVIADAS"
                    message={`${successCount} mensagem(ns) enviada(s) para ganhadores!`}
                  />
                ), { duration: 3000 });
              }
              if (errorCount > 0) {
                toast.custom(() => (
                  <CustomToast
                    type="error"
                    title="ERRO AO ENVIAR NOTIFICAÇÕES"
                    message={`${errorCount} mensagem(ns) falharam. Verifique os números de WhatsApp.`}
                  />
                ), { duration: 3000 });
              }
            }
          } catch (notifError) {
            console.error('Erro ao enviar notificações para ganhadores:', notifError);
            // Não bloquear o fluxo se falhar o envio de notificações
          }
        }
      }

      // Finalizar automaticamente o jogo principal vinculado a esta stream (se houver)
      try {
        const { data: activeGames } = await supabase
          .from('live_games')
          .select('id')
          .eq('status', 'active')
          .eq('stream_id', streamId)
          .limit(1);

        if (activeGames && activeGames.length > 0) {
          await supabase
            .from('live_games')
            .update({
              status: 'finished',
              finished_at: new Date().toISOString()
            })
            .eq('id', activeGames[0].id);

          toast.success('Jogo principal finalizado automaticamente! 🏁');
        }
      } catch (gameErr) {
        console.error('Erro ao finalizar jogo principal:', gameErr);
      }

      await loadPool();

      // Enviar notificações via Edge Function (Push + Winners)
      try {
        await supabase.functions.invoke('notify-pool-result', {
          body: { poolId: pool.id }
        });
      } catch (notifErr) {
        console.error('Erro ao chamar notify-pool-result:', notifErr);
      }

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
              className={`px-6 py-3 font-black rounded-xl uppercase text-xs transition-all ${pool.is_active
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
                  <p className="text-2xl font-black text-white">R$ {((pool.total_pool_amount * 0.70) + (pool.accumulated_amount || 0)).toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1">Base: R$ {(pool.total_pool_amount * 0.70).toFixed(2)} + Acumulado: R$ {(pool.accumulated_amount || 0).toFixed(2)}</p>
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

            <div className="flex gap-3 mt-4">
              {pool.result_home_score === null && (
                <button
                  onClick={() => setShowResultModal(true)}
                  className="flex-1 px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-black rounded-xl uppercase text-xs"
                >
                  Definir Resultado
                </button>
              )}

              {(pool.result_home_score !== null) && (
                <button
                  onClick={() => {
                    setPool(null);
                    setShowCreateModal(true);
                  }}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl uppercase text-xs animate-pulse shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                >
                  Criar Próximo Bolão
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal Criar Bolão */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-8 rounded-[2.5rem] border border-white/10 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-white uppercase italic">Criar Bolão</h3>
              <button
                onClick={fetchLatestGame}
                className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-2 border border-blue-500/20"
              >
                <Trophy size={14} />
                Sugerir Próximo Jogo
              </button>
            </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="block text-white font-bold text-sm">Time da Casa</label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {formData.home_team_logo ? (
                        <img src={formData.home_team_logo} alt="Home Logo" className="w-10 h-10 object-contain" />
                      ) : (
                        <Trophy className="w-6 h-6 text-slate-700" />
                      )}
                    </div>
                    <input
                      type="text"
                      value={formData.home_team}
                      onChange={(e) => setFormData({ ...formData, home_team: e.target.value })}
                      placeholder="Nome"
                      className="flex-1 px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-white font-bold"
                    />
                  </div>
                  <input
                    type="text"
                    value={formData.home_team_logo}
                    onChange={(e) => setFormData({ ...formData, home_team_logo: e.target.value })}
                    placeholder="URL Logo"
                    className="w-full px-4 py-2 bg-slate-900/50 border border-white/5 rounded-lg text-white text-[10px]"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-white font-bold text-sm">Visitante</label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {formData.away_team_logo ? (
                        <img src={formData.away_team_logo} alt="Away Logo" className="w-10 h-10 object-contain" />
                      ) : (
                        <Trophy className="w-6 h-6 text-slate-700" />
                      )}
                    </div>
                    <input
                      type="text"
                      value={formData.away_team}
                      onChange={(e) => setFormData({ ...formData, away_team: e.target.value })}
                      placeholder="Nome"
                      className="flex-1 px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-white font-bold"
                    />
                  </div>
                  <input
                    type="text"
                    value={formData.away_team_logo}
                    onChange={(e) => setFormData({ ...formData, away_team_logo: e.target.value })}
                    placeholder="URL Logo"
                    className="w-full px-4 py-2 bg-slate-900/50 border border-white/5 rounded-lg text-white text-[10px]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ match_title: '', home_team: '', home_team_logo: '', away_team: '', away_team_logo: '' });
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

