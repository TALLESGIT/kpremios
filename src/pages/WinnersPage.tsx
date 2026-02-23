import { useState, useEffect } from 'react';
import { Trophy, Calendar, User, Target, MessageCircle, Users as UsersIcon } from 'lucide-react';
import PoolBetModal from '../components/pool/PoolBetModal';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';

interface ActivePool {
  id: string;
  match_title: string;
  home_team: string;
  away_team: string;
}

function WinnersPage() {
  const { user } = useAuth();
  const { currentUser } = useData();
  // ✅ Verificar se é admin (para mostrar botão de contatar ganhador)
  const isAdmin = currentUser?.is_admin || false;

  const [poolWinners, setPoolWinners] = useState<any[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);
  const [activePool, setActivePool] = useState<ActivePool | null>(null);
  const [showPoolModal, setShowPoolModal] = useState(false);

  useEffect(() => {
    loadPoolWinners();
    checkActivePool();
  }, []);

  // ✅ NOVO: Buscar bolão ativo completo para o modal
  const checkActivePool = async () => {
    try {
      // Buscar bolão ativo com todos os dados necessários para o modal
      const { data: poolData, error: poolError } = await supabase
        .from('match_pools')
        .select('id, match_title, home_team, away_team')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!poolError && poolData) {
        setActivePool({
          id: poolData.id,
          match_title: poolData.match_title,
          home_team: poolData.home_team,
          away_team: poolData.away_team
        });
        console.log('✅ Bolão ativo encontrado:', poolData);
      } else {
        setActivePool(null);
        console.log('ℹ️ Nenhum bolão ativo encontrado');
      }
    } catch (err) {
      console.error('Erro ao buscar bolão ativo:', err);
      setActivePool(null);
    }
  };

  // ✅ NOVO: Função para abrir o modal de participar do bolão
  const handleParticipate = () => {
    // Se usuário não estiver logado, redirecionar para login
    if (!user) {
      window.location.href = '/login';
      return;
    }

    // Se houver bolão ativo e usuário estiver logado, abrir modal
    if (activePool) {
      setShowPoolModal(true);
    } else {
      // Se não houver bolão ativo, redirecionar para home
      window.location.href = '/';
    }
  };

  const loadPoolWinners = async () => {
    try {
      setLoadingPools(true);
      // ✅ CORREÇÃO: Buscar apostas vencedoras apenas de bolões onde o resultado foi definido há menos de 7 dias
      // A contagem de 7 dias começa quando o admin define o resultado (result_set_at)
      // Se result_set_at não existir, usa updated_at como fallback
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Buscar ganhadores - primeiro tentar com result_set_at, depois com updated_at
      let { data, error } = await supabase
        .from('pool_bets')
        .select(`
          *,
          match_pools!inner (
            id,
            match_title,
            home_team,
            away_team,
            result_home_score,
            result_away_score,
            winners_count,
            prize_per_winner,
            result_set_at,
            updated_at,
            created_at
          ),
          users!inner (
            id,
            name,
            email,
            whatsapp
          )
        `)
        .eq('is_winner', true)
        .eq('payment_status', 'approved')
        .not('match_pools.result_home_score', 'is', null)
        .not('match_pools.result_away_score', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar ganhadores:', error);
        throw error;
      }

      // Filtrar no JavaScript para usar result_set_at ou updated_at como fallback
      if (data && data.length > 0) {
        data = data.filter((bet: any) => {
          const pool = bet.match_pools;
          const resultDate = pool.result_set_at || pool.updated_at; // Usa result_set_at ou updated_at

          if (!resultDate) return false;

          const resultDateObj = new Date(resultDate);
          return resultDateObj >= sevenDaysAgo;
        });
      }

      console.log('📊 Ganhadores encontrados (após filtro de 7 dias):', data?.length || 0, data);
      setPoolWinners(data || []);
    } catch (err) {
      console.error('Erro ao carregar ganhadores do bolão:', err);
    } finally {
      setLoadingPools(false);
    }
  };

  // ✅ NOVO: Agrupar ganhadores por jogo/bolão
  const groupedWinners = poolWinners.reduce((acc: any, bet: any) => {
    const poolId = bet.match_pools.id;
    if (!acc[poolId]) {
      acc[poolId] = {
        pool: bet.match_pools,
        winners: []
      };
    }
    acc[poolId].winners.push(bet);
    return acc;
  }, {});

  const poolsArray = Object.values(groupedWinners) as any[];

  return (
    <>
      <main className="flex-grow w-full relative overflow-hidden">
        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-[500px] bg-blue-600/10 blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-full h-[500px] bg-blue-900/20 blur-[100px]" />
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        </div>

        {/* Hero Section */}
        <div className="relative py-12 sm:py-20 lg:py-24">
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 mb-6 ring-1 ring-blue-400/20 backdrop-blur-md shadow-2xl shadow-blue-500/10">
              <Trophy className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-400" />
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight">
              GALERIA DE <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">GANHADORES</span>
            </h1>

            <p className="text-lg sm:text-xl text-blue-200/80 max-w-2xl mx-auto font-medium leading-relaxed">
              Confira todos os sortudos que já foram contemplados em nossos bolões.
              Transparência e credibilidade em cada resultado.
            </p>
          </div>
        </div>

        {/* Pool Winners Section - Agrupado por Jogo */}
        {poolsArray.length > 0 && (
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 space-y-8">
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-8 h-8 text-emerald-400" />
              <h2 className="text-3xl font-black text-white uppercase">Ganhadores do Bolão</h2>
            </div>

            {/* ✅ NOVO: Loop por jogo/bolão */}
            {poolsArray.map((group: any) => {
              const pool = group.pool;
              const winners = group.winners;
              const poolDate = pool.created_at ? new Date(pool.created_at) : null;

              return (
                <div key={pool.id} className="glass-panel rounded-3xl overflow-hidden border border-emerald-500/20 bg-slate-800/40 backdrop-blur-md">
                  {/* Cabeçalho do Jogo */}
                  <div className="relative bg-gradient-to-r from-blue-600/20 to-blue-700/20 p-6 border-b border-blue-500/30">
                    <div className="flex items-center gap-3 mb-4">
                      <Target className="w-6 h-6 text-blue-400" />
                      <h3 className="text-xl sm:text-2xl font-black text-white uppercase">
                        {pool.home_team} X {pool.away_team}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Times e Placar */}
                      <div className="flex items-center justify-between sm:col-span-2">
                        <div className="text-center flex-1">
                          <p className="text-xs font-medium text-slate-300 mb-2">{pool.home_team}</p>
                          <p className="text-3xl font-black text-blue-400">{pool.result_home_score}</p>
                        </div>
                        <span className="text-blue-400 font-black text-2xl mx-3">x</span>
                        <div className="text-center flex-1">
                          <p className="text-xs font-medium text-slate-300 mb-2">{pool.away_team}</p>
                          <p className="text-3xl font-black text-blue-400">{pool.result_away_score}</p>
                        </div>
                      </div>

                      {/* Info do Bolão */}
                      <div className="flex flex-col items-center sm:items-end justify-center gap-2 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l border-blue-500/20 sm:pl-4">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-yellow-400" />
                          <span className="text-xs font-bold text-yellow-400">{winners.length} Ganhador(es)</span>
                        </div>
                        {poolDate && (
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Calendar className="h-3 w-3" />
                            {poolDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lista de Ganhadores */}
                  <div className="p-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {winners.map((bet: any) => {
                        const winner = bet.users;

                        return (
                          <div
                            key={bet.id}
                            className="p-4 rounded-2xl bg-slate-700/30 border border-emerald-500/10 hover:border-emerald-500/30 transition-all"
                          >
                            {/* Winner Info */}
                            <div className="flex items-start gap-3 mb-4">
                              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
                                <User className="h-5 w-5 text-emerald-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-400 mb-1">Ganhador(a)</p>
                                <p className="font-bold text-white text-base leading-tight truncate">
                                  {winner?.name || 'Nome não disponível'}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  Palpite: {bet.predicted_home_score} x {bet.predicted_away_score}
                                </p>
                              </div>
                            </div>

                            {/* Prize Info */}
                            <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10 mb-3">
                              <div className="flex items-center justify-between mb-1">
                                <Trophy className="h-3 w-3 text-yellow-400" />
                                <span className="text-xs text-slate-400">{pool.winners_count} ganhador(es)</span>
                              </div>
                              <p className="text-xl font-black text-yellow-400">
                                R$ {bet.prize_amount?.toFixed(2) || pool.prize_per_winner?.toFixed(2) || '0.00'}
                              </p>
                            </div>

                            {/* WhatsApp Button - ✅ Só aparece para admin */}
                            {isAdmin && winner?.whatsapp && (
                              <button
                                onClick={() => {
                                  const message = `Parabéns! Você ganhou o bolão "${pool.match_title}"! 🎉\n\nSua aposta: ${bet.predicted_home_score} x ${bet.predicted_away_score}\nResultado: ${pool.result_home_score} x ${pool.result_away_score}\n\nVocê dividiu o prêmio de R$ ${pool.total_pool_amount?.toFixed(2) || '0.00'} com ${pool.winners_count} ganhador(es) e recebeu R$ ${bet.prize_amount?.toFixed(2) || pool.prize_per_winner?.toFixed(2) || '0.00'}.\n\nEntre em contato para receber seu prêmio!`;
                                  const whatsappUrl = `https://wa.me/${winner.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
                                  window.open(whatsappUrl, '_blank');
                                }}
                                className="w-full px-3 py-2 text-xs font-bold text-white bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg transition-all border border-emerald-500/30"
                              >
                                Contatar Ganhador
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {poolWinners.length === 0 && (
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
            <div className="glass-panel p-12 sm:p-16 rounded-3xl text-center max-w-2xl mx-auto border border-white/5 bg-slate-800/50 backdrop-blur-xl">
              <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="h-12 w-12 text-blue-400/50" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Ainda não temos ganhadores
              </h2>
              <p className="text-blue-200/60 max-w-md mx-auto text-base sm:text-lg mb-8">
                {activePool
                  ? 'Participe agora do bolão ativo e concorra a prêmios incríveis!'
                  : 'Os primeiros bolões ainda não foram finalizados. Seja um dos primeiros a participar e garanta sua chance!'}
              </p>
              <button
                onClick={handleParticipate}
                className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl hover:from-blue-500 hover:to-blue-400 hover:shadow-lg hover:shadow-blue-500/25"
              >
                {activePool ? 'Participar do Bolão' : 'Participar Agora'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Participar do Bolão - Apenas se usuário estiver logado */}
      {activePool && user && (
        <PoolBetModal
          isOpen={showPoolModal}
          onClose={() => setShowPoolModal(false)}
          poolId={activePool.id}
          matchTitle={activePool.match_title}
          homeTeam={activePool.home_team}
          awayTeam={activePool.away_team}
        />
      )}
    </>
  );
}

export default WinnersPage;