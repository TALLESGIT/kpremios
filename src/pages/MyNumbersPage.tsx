import { Calendar, User, Trophy, Clock, Target, CheckCircle2 } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

function MyNumbersPage() {
  const { currentUser: currentAppUser } = useData();
  const { user } = useAuth();
  const [poolBets, setPoolBets] = useState<any[]>([]);
  const [loadingBets, setLoadingBets] = useState(true);

  // Load pool bets
  useEffect(() => {
    const loadPoolBets = async () => {
      if (!user || !currentAppUser) {
        setLoadingBets(false);
        return;
      }

      try {
        setLoadingBets(true);
        const { data, error } = await supabase
          .from('pool_bets')
          .select(`
            *,
            match_pools!inner (
              id,
              match_title,
              home_team,
              away_team,
              is_active,
              result_home_score,
              result_away_score,
              winners_count,
              prize_per_winner,
              total_pool_amount,
              created_at
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPoolBets(data || []);
      } catch (err) {
        console.error('Erro ao carregar palpites do bolão:', err);
        setPoolBets([]);
      } finally {
        setLoadingBets(false);
      }
    };

    loadPoolBets();
  }, [user, currentAppUser]);


  // Real-time subscription for user data updates (extra_numbers)
  useEffect(() => {
    if (!currentAppUser) return;

    const userSubscription = supabase
      .channel('user-data-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${currentAppUser.id}`
      }, async (payload) => {
        console.log('Mudança detectada nos dados do usuário:', payload);
        // Recarregar dados do usuário sem recarregar a página
        try {
          // Verificar sessão antes de fazer a query
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !session) {
            console.warn('Sessão inválida, tentando refresh...');
            await supabase.auth.refreshSession();
          }

          const { data: updatedUser, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentAppUser.id)
            .single();

          if (!error && updatedUser) {
            console.log('Dados atualizados do usuário:', updatedUser);
            // Atualizar o contexto de dados
            window.dispatchEvent(new CustomEvent('userDataUpdated', {
              detail: { user: updatedUser }
            }));
          } else {
            console.error('Erro ao buscar dados atualizados:', error);
            // Fallback: recarregar a página se houver erro de autenticação
            if (error?.message?.includes('403') || error?.message?.includes('Forbidden')) {
              console.log('Erro 403 detectado, recarregando página...');
              window.location.reload();
            }
          }
        } catch (error) {
          console.error('Erro ao recarregar dados do usuário:', error);
        }
      })
      .subscribe();

    return () => {
      userSubscription.unsubscribe();
    };
  }, [currentAppUser]);

  // Redirect if user hasn't registered
  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
            <div className="inline-flex p-4 rounded-3xl bg-emerald-500/10 mb-6 ring-1 ring-emerald-400/20 backdrop-blur-md shadow-2xl shadow-emerald-500/10">
              <Target className="h-10 w-10 sm:h-12 sm:w-12 text-emerald-400" />
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight">
              MINHAS <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">APOSTAS</span>
            </h1>

            <p className="text-lg sm:text-xl text-blue-200/80 max-w-2xl mx-auto font-medium leading-relaxed">
              Acompanhe suas apostas e resultados dos bolões.
            </p>
          </div>
        </div>

        {/* Dashboard */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">

          {/* Botão de Atualização Manual */}
          <div className="text-center mb-8">
            <button
              onClick={async () => {
                try {
                  setLoadingBets(true);
                  // Recarregar apostas do bolão
                  const { data, error } = await supabase
                    .from('pool_bets')
                    .select(`
                      *,
                      match_pools!inner (
                        id,
                        match_title,
                        home_team,
                        away_team,
                        is_active,
                        result_home_score,
                        result_away_score,
                        winners_count,
                        prize_per_winner,
                        total_pool_amount,
                        created_at
                      )
                    `)
                    .eq('user_id', user?.id)
                    .order('created_at', { ascending: false });

                  if (!error && data) {
                    setPoolBets(data);
                    alert('Dados atualizados com sucesso!');
                  }
                } catch (error) {
                  console.error('Erro na atualização:', error);
                  alert('Erro ao atualizar dados.');
                } finally {
                  setLoadingBets(false);
                }
              }}
              className="btn btn-outline border-white/20 hover:bg-white/10 text-white"
            >
              🔄 Atualizar Dados
            </button>
          </div>

          {/* Empty State - Se não houver apostas */}
          {!loadingBets && poolBets.length === 0 && (
            <div className="glass-panel p-12 rounded-3xl mb-8 text-center">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-black text-white mb-4">
                Você ainda não fez apostas
              </h3>
              <p className="text-blue-200/60 text-lg mb-6">
                Participe dos bolões ativos para começar a apostar!
              </p>
              <Link
                to="/"
                className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all"
              >
                Ver Bolões Ativos
              </Link>
            </div>
          )}

          {/* Pool Bets Section */}
          {poolBets.length > 0 && (
            <div className="glass-panel p-8 rounded-3xl mb-8 border-l-4 border-emerald-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase">Meus Palpites do Bolão</h2>
                  <p className="text-emerald-200/60 text-sm">Acompanhe suas apostas e resultados</p>
                </div>
              </div>

              <div className="space-y-4">
                {poolBets.map((bet) => {
                  const pool = bet.match_pools;
                  const isFinished = pool.result_home_score !== null && pool.result_away_score !== null;
                  const isWinner = bet.is_winner && bet.payment_status === 'approved';
                  const isPending = bet.payment_status === 'pending';
                  const isApproved = bet.payment_status === 'approved';

                  return (
                    <div
                      key={bet.id}
                      className={`bg-gradient-to-r rounded-2xl p-6 border-2 transition-all hover:scale-[1.02] ${isWinner
                          ? 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/50'
                          : isFinished && !isWinner
                            ? 'from-slate-800/50 to-slate-900/50 border-slate-700/50'
                            : 'from-emerald-500/10 to-emerald-600/10 border-emerald-500/30'
                        }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* Match Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {isWinner && (
                              <Trophy className="w-5 h-5 text-yellow-400 animate-pulse" />
                            )}
                            {isPending && (
                              <Clock className="w-5 h-5 text-blue-400" />
                            )}
                            {isApproved && !isFinished && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            )}
                            <h3 className="text-lg font-black text-white">{pool.match_title}</h3>
                          </div>

                          <div className="flex items-center gap-4 mb-3">
                            <div className="text-center">
                              <p className="text-xs text-slate-400 mb-1">{pool.home_team}</p>
                              <p className={`text-3xl font-black ${isWinner ? 'text-yellow-400' : 'text-white'}`}>
                                {bet.predicted_home_score}
                              </p>
                            </div>
                            <span className="text-slate-400 font-black text-xl">x</span>
                            <div className="text-center">
                              <p className="text-xs text-slate-400 mb-1">{pool.away_team}</p>
                              <p className={`text-3xl font-black ${isWinner ? 'text-yellow-400' : 'text-white'}`}>
                                {bet.predicted_away_score}
                              </p>
                            </div>
                          </div>

                          {isFinished && (
                            <div className="mt-3 pt-3 border-t border-slate-700/50">
                              <p className="text-xs text-slate-400 mb-1">Resultado Real</p>
                              <div className="flex items-center gap-4">
                                <span className="text-lg font-black text-slate-300">
                                  {pool.result_home_score} x {pool.result_away_score}
                                </span>
                                {isWinner ? (
                                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-black uppercase">
                                    🏆 Ganhador!
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 bg-slate-700/50 text-slate-400 rounded-full text-xs font-bold">
                                    Não acertou
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Status & Prize Info */}
                        <div className="flex flex-col gap-3 md:items-end">
                          <div className={`px-4 py-2 rounded-xl ${isPending
                              ? 'bg-blue-500/20 text-blue-400'
                              : isApproved && !isFinished
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : isWinner
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-slate-700/50 text-slate-400'
                            }`}>
                            <p className="text-xs font-bold uppercase mb-1">Status</p>
                            <p className="text-sm font-black">
                              {isPending
                                ? 'Aguardando Pagamento'
                                : isApproved && !isFinished
                                  ? 'Aguardando Resultado'
                                  : isWinner
                                    ? 'Ganhador!'
                                    : 'Finalizado'}
                            </p>
                          </div>

                          {isWinner && bet.prize_amount > 0 && (
                            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-3 text-center">
                              <p className="text-xs text-yellow-200 mb-1">Seu Prêmio</p>
                              <p className="text-2xl font-black text-yellow-400">
                                R$ {bet.prize_amount.toFixed(2)}
                              </p>
                              {pool.winners_count > 1 && (
                                <p className="text-xs text-yellow-200/60 mt-1">
                                  Dividido entre {pool.winners_count} ganhador(es)
                                </p>
                              )}
                            </div>
                          )}

                          <div className="text-xs text-slate-400">
                            {new Date(bet.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* User Info Card */}
          <div className="glass-panel p-8 rounded-3xl">
            <h2 className="text-2xl font-bold text-white mb-6">
              Informações da Conta
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-200/60 font-medium">Nome Completo</p>
                  <p className="font-bold text-white text-lg">
                    {currentAppUser?.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-500 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-200/60 font-medium">Data de Cadastro</p>
                  <p className="font-bold text-white text-base">
                    {new Date(currentAppUser?.created_at || '').toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default MyNumbersPage;