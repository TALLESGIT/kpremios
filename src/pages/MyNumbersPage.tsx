import { Hash, Calendar, User, Zap, Trophy, TrendingUp, Plus, CheckCircle, XCircle, Clock, Lock, Target, CheckCircle2 } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import ExtraNumbersModal from '../components/user/ExtraNumbersModal';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ExtraNumberRequest } from '../types';
import { supabase } from '../lib/supabase';

function MyNumbersPage() {
  const { getCurrentUserRequest, numbers, getUserRequestsHistory, currentUser: currentAppUser } = useData();
  const { user } = useAuth();
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [requestsHistory, setRequestsHistory] = useState<ExtraNumberRequest[]>([]);
  const [currentRange, setCurrentRange] = useState(0);
  const [poolBets, setPoolBets] = useState<any[]>([]);
  const [loadingBets, setLoadingBets] = useState(true);
  
  const currentRequest = getCurrentUserRequest();
  const userExtraNumbers = currentAppUser?.extra_numbers || [];
  const totalNumbers = userExtraNumbers.length + (currentAppUser?.free_number ? 1 : 0);
  const totalParticipants = numbers.filter(n => !n.is_available).length;
const isWinner = (currentAppUser as any)?.is_winner || false;

  // Create ranges for pagination (igual à HomePage)
  const numberRanges: Array<{ start: number; end: number; label: string }> = [];
  const maxNumbers = 1000; // Default fallback
  for (let i = 1; i <= maxNumbers; i += 100) {
    const end = Math.min(i + 99, maxNumbers);
    numberRanges.push({ start: i, end, label: `${i}-${end}` });
  }

  // Filter numbers based on current range
  const filteredExtraNumbers = userExtraNumbers.filter(num => {
    const rangeStart = numberRanges[currentRange]?.start || 1;
    const rangeEnd = numberRanges[currentRange]?.end || 100;
    return num >= rangeStart && num <= rangeEnd;
  });

  const handleRangeChange = (index: number) => {
    setCurrentRange(index);
  };

  // Load requests history
  useEffect(() => {
    const loadHistory = async () => {
      if (currentAppUser) {
        try {
          const history = await getUserRequestsHistory();
          setRequestsHistory(history);
        } catch (error) {

        }
      }
    };
    
    loadHistory();
  }, [currentAppUser, getUserRequestsHistory]);

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

  // Real-time subscription for user requests updates
  useEffect(() => {
    if (!currentAppUser) return;

    const subscription = supabase
      .channel('user-requests-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'extra_number_requests',
        filter: `user_id=eq.${currentAppUser.id}`
      }, async () => {
        console.log('Mudança detectada nas solicitações, recarregando...');
        try {
          const history = await getUserRequestsHistory();
          setRequestsHistory(history);
        } catch (error) {
          console.error('Erro ao recarregar histórico:', error);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentAppUser, getUserRequestsHistory]);

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
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Header />
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
              <Hash className="h-10 w-10 sm:h-12 sm:w-12 text-blue-400" />
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight">
              MEUS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">NÚMEROS</span>
            </h1>

            <p className="text-lg sm:text-xl text-blue-200/80 max-w-2xl mx-auto font-medium leading-relaxed">
              Confira seus números selecionados e acompanhe sua participação nos sorteios.
            </p>
          </div>
        </div>

        {/* Dashboard */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          {/* Banner de Ganhador */}
          {isWinner && (
            <div className="mb-8 glass-panel bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-400/30 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden">
              {/* Confetes animados */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-3 h-3 bg-white/30 rounded-full animate-bounce"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`,
                      animationDuration: `${2 + Math.random() * 2}s`
                    }}
                  />
                ))}
              </div>
              
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                  <Trophy className="h-10 w-10 text-white animate-pulse" />
                </div>
                
                <h2 className="text-3xl sm:text-4xl font-black mb-4">
                  🎉 PARABÉNS! VOCÊ GANHOU! 🎉
                </h2>
                
                <p className="text-xl sm:text-2xl font-bold mb-2">
                  Seu número #{currentAppUser?.free_number} foi sorteado!
                </p>
                
                <p className="text-emerald-100 text-lg mb-6">
                  Você é o ganhador do sorteio principal! Entre em contato conosco para receber seu prêmio.
                </p>
                
                <div className="bg-white/20 rounded-2xl p-4 mb-6">
                  <p className="text-white font-bold text-lg">
                    🏆 Prêmio: Sorteio Principal
                  </p>
                  <p className="text-emerald-100 text-sm">
                    Ganho em: {(currentAppUser as any)?.won_at ? new Date((currentAppUser as any).won_at).toLocaleDateString('pt-BR') : 'Data não disponível'}
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => {
                      // Aqui você pode adicionar funcionalidade para contato
                      alert('Entre em contato conosco via WhatsApp ou email para receber seu prêmio!');
                    }}
                    className="bg-white text-emerald-600 font-bold py-3 px-6 rounded-xl hover:bg-emerald-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <Trophy className="h-5 w-5" />
                    Receber Prêmio
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Botão de Atualização Manual */}
          <div className="text-center mb-8">
            <button
              onClick={async () => {
                try {
                  console.log('Atualizando dados manualmente...');
                  // Forçar refresh da sessão
                  await supabase.auth.refreshSession();
                  
                  // Buscar dados atualizados do usuário
                  const { data: updatedUser, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', currentAppUser?.id)
                    .single();
                  
                  if (!error && updatedUser) {
                    console.log('Dados atualizados manualmente:', updatedUser);
                    window.dispatchEvent(new CustomEvent('userDataUpdated', { 
                      detail: { user: updatedUser } 
                    }));
                    alert('Dados atualizados com sucesso!');
                  } else {
                    console.error('Erro ao atualizar dados:', error);
                    alert('Erro ao atualizar dados. Tente fazer login novamente.');
                  }
                } catch (error) {
                  console.error('Erro na atualização manual:', error);
                  alert('Erro ao atualizar dados.');
                }
              }}
              className="btn btn-outline border-white/20 hover:bg-white/10 text-white"
            >
              🔄 Atualizar Dados
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-blue-200 text-sm font-bold uppercase tracking-wider mb-1">Números Ativos</p>
                  <p className="text-4xl font-black text-white">{totalNumbers}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
                  <Hash className="w-6 h-6" />
                </div>
              </div>
              <p className="text-blue-200/60 text-sm mt-2">
                {userExtraNumbers.length > 0 ? 
                  `1 grátis + ${userExtraNumbers.length} extras` : 
                  '1 número grátis'
                }
              </p>
            </div>
            
            <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="absolute top-0 left-0 w-2 h-full bg-accent"></div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-yellow-200 text-sm font-bold uppercase tracking-wider mb-1">Chances de Ganhar</p>
                  <p className="text-4xl font-black text-white">
                    {totalParticipants > 0 ? ((totalNumbers / totalParticipants) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center text-accent">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
              <p className="text-yellow-200/60 text-sm mt-2">
                {totalNumbers} de {totalParticipants} participando
              </p>
            </div>
            
            <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="absolute top-0 left-0 w-2 h-full bg-green-500"></div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-green-200 text-sm font-bold uppercase tracking-wider mb-1">Status</p>
                  <p className="text-2xl font-black text-white">Ativo</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-400">
                  <Trophy className="w-6 h-6" />
                </div>
              </div>
              <p className="text-green-200/60 text-sm mt-2">
                Participando dos sorteios
              </p>
            </div>
          </div>

          {/* Main Number Card */}
          <div className="glass-panel p-8 rounded-3xl mb-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Hash className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Seu Número da Sorte</h3>
            <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 backdrop-blur-sm rounded-2xl p-8 inline-block mb-4 border border-amber-400/30">
              <span className="text-6xl font-black text-amber-400">
                {currentAppUser?.free_number}
              </span>
            </div>
            <p className="text-blue-200/80 text-lg font-medium">
              Número gratuito garantido!
            </p>
          </div>


          {/* Request Extra Numbers - Card Melhorado */}
          {!currentRequest ? (
            <div className="relative overflow-hidden glass-panel bg-gradient-to-br from-amber-500/20 via-amber-600/20 to-amber-700/20 border border-amber-400/30 rounded-3xl shadow-2xl mb-8">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23F59E0B' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }} />
              </div>

              {/* Content */}
              <div className="relative z-10 p-6 sm:p-8 lg:p-10">
                <div className="text-center mb-8">
                  {/* Icon */}
                  <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Zap className="h-10 w-10 text-white" />
                  </div>

                  {/* Title */}
                  <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
                    Aumente suas Chances!
                  </h3>

                  {/* Subtitle */}
                  <p className="text-xl text-amber-100 font-semibold mb-6">
                    Multiplique suas chances de ganhar prêmios incríveis!
                  </p>

                  {/* Description */}
                  <p className="text-lg text-amber-50 mb-8 max-w-2xl mx-auto leading-relaxed">
                    Solicite números extras e multiplique suas chances de ganhar. 
                    A partir de <span className="text-white font-black text-xl">R$ 10,00</span> você ganha <span className="text-white font-black text-xl">100 números aleatórios</span>!
                  </p>

                  {/* Features */}
                  <div className="grid md:grid-cols-3 gap-4 mb-8 max-w-4xl mx-auto">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                      <div className="text-2xl mb-2">💰</div>
                      <p className="text-white font-bold text-sm">Cada R$ 10,00 = 100 números extras</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                      <div className="text-2xl mb-2">🎯</div>
                      <p className="text-white font-bold text-sm">Números atribuídos automaticamente</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                      <div className="text-2xl mb-2">⚡</div>
                      <p className="text-white font-bold text-sm">Aprovação rápida pelo admin</p>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="text-center">
                  {currentAppUser?.free_number ? (
                    <button
                      onClick={() => setShowExtraModal(true)}
                      className="group inline-flex items-center px-8 py-4 bg-white text-amber-600 font-black text-lg rounded-2xl hover:bg-amber-50 transition-all duration-300 shadow-2xl hover:shadow-white/25 transform hover:-translate-y-1 hover:scale-105"
                    >
                      <Plus className="h-6 w-6 mr-3 group-hover:rotate-90 transition-transform duration-300" />
                      Solicitar Números Extras
                      <svg className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                  ) : (
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                          <Lock className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <h4 className="text-white font-bold text-lg mb-2">
                        🔒 Números Extras Bloqueados
                      </h4>
                      <p className="text-amber-100 text-sm mb-4">
                        Você precisa escolher um número grátis primeiro para poder solicitar números extras.
                      </p>
                      <Link
                        to="/"
                        className="inline-flex items-center px-6 py-3 bg-white/20 text-white font-bold rounded-xl hover:bg-white/30 transition-all duration-200"
                      >
                        <Hash className="h-4 w-4 mr-2" />
                        Escolher Número Grátis
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Accent */}
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-300 via-blue-400 to-blue-300"></div>
            </div>
          ) : (
            <div className="glass-panel p-8 rounded-3xl mb-8 border-l-4 border-blue-500">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-3">
                    Solicitação em Análise
                  </h3>
                  <div className="space-y-2 text-base text-blue-200/80 mb-4 font-medium">
                    <p>Valor: <strong className="text-white">R$ {currentRequest.payment_amount.toFixed(2)}</strong></p>
                    <p>Números solicitados: <strong className="text-white">{currentRequest.requested_quantity}</strong></p>
                    <p>Status: <strong className="text-amber-400 capitalize">{currentRequest.status}</strong></p>
                  </div>
                  <p className="text-blue-200/60 text-sm font-medium">
                    Sua solicitação está sendo analisada. Você será notificado quando for aprovada.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Requests History - Simplificado */}
          {requestsHistory.length > 0 && (
            <div className="glass-panel p-8 rounded-3xl mb-8">
              <h3 className="text-2xl font-bold text-white mb-6">
                Histórico de Solicitações
              </h3>
              
              {/* Mostrar todas as solicitações aprovadas */}
              {requestsHistory
                .filter(req => req.status === 'approved')
                .map((request, index) => (
                  <div key={request.id} className="bg-white/5 border border-emerald-400/30 rounded-xl p-6 mb-4 hover:bg-white/10 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-6 w-6 text-emerald-400" />
                        <div>
                          <p className="font-bold text-white text-lg">
                            Aprovada
                          </p>
                          <p className="text-blue-200/60 text-sm">
                            {new Date(request.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {/* Informações do sorteio */}
                          {request.raffle && (
                            <div className="mt-2 p-2 bg-blue-500/10 rounded-lg border border-blue-400/20">
                              <p className="text-blue-200 text-sm font-medium">
                                Sorteio: {request.raffle.title}
                              </p>
                              <p className="text-blue-200/60 text-xs">
                                Prêmio: {request.raffle.prize}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-lg">
                          R$ {request.payment_amount.toFixed(2)}
                        </p>
                        <p className="text-blue-200/60 text-sm">
                          {request.assigned_numbers?.length || request.requested_quantity} números
                        </p>
                        {request.assigned_numbers && request.assigned_numbers.length !== request.requested_quantity && (
                          <p className="text-amber-400 text-xs">
                            (solicitados: {request.requested_quantity})
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Números atribuídos com scroll */}
                    {request.assigned_numbers && request.assigned_numbers.length > 0 && (
                      <div className="mt-4">
                        <p className="text-emerald-300 text-sm font-medium mb-3">
                          Números atribuídos ({request.assigned_numbers.length} números):
                        </p>
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                          {/* Container com scroll - apenas no desktop */}
                          <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-500 scrollbar-track-slate-600">
                            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                              {request.assigned_numbers
                                .sort((a, b) => a - b)
                                .map((num, numIndex) => (
                                <div
                                  key={numIndex}
                                  className="h-8 w-full bg-emerald-500 rounded-lg text-xs font-bold text-white flex items-center justify-center shadow-sm hover:bg-emerald-400 transition-colors duration-200"
                                >
                                  {num}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Indicador de scroll - apenas no desktop */}
                          {request.assigned_numbers.length > 50 && (
                            <div className="mt-3 text-center hidden md:block">
                              <p className="text-blue-200/60 text-xs">
                                📜 Role para ver todos os {request.assigned_numbers.length} números
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
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
                      className={`bg-gradient-to-r rounded-2xl p-6 border-2 transition-all hover:scale-[1.02] ${
                        isWinner
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
                          <div className={`px-4 py-2 rounded-xl ${
                            isPending
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
      
      <ExtraNumbersModal 
        isOpen={showExtraModal}
        onClose={() => setShowExtraModal(false)}
      />
      <Footer />
    </div>
  );
}

export default MyNumbersPage;