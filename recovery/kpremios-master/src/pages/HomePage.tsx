import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import NumberSelection from '../components/user/NumberSelection';
import RegistrationForm from '../components/user/RegistrationForm';
import SuccessModal from '../components/shared/SuccessModal';
import VipGrantedModal from '../components/vip/VipGrantedModal';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { useSocket } from '../hooks/useSocket';
import { ChevronDown, Play, Trophy, Ticket, MonitorPlay, Calendar, MapPin, Clock, Target, MessageCircle, DollarSign, Users } from 'lucide-react';
import { CruzeiroGame } from '../types';
import PoolBetModal from '../components/pool/PoolBetModal';
import AdvertisementCarousel from '../components/shared/AdvertisementCarousel';

function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentUser, selectFreeNumber, numbers } = useData();
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successNumber, setSuccessNumber] = useState<number | null>(null);
  const [hasActiveRaffle, setHasActiveRaffle] = useState(false);
  const [activePoolsCount, setActivePoolsCount] = useState(0);
  const [poolWinnersCount, setPoolWinnersCount] = useState(0);
  const [nextGame, setNextGame] = useState<CruzeiroGame | null>(null);
  const [loadingGame, setLoadingGame] = useState(true);
  const [hasActiveLive, setHasActiveLive] = useState(false);
  const [activePool, setActivePool] = useState<any>(null);
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const [vipExpiresAt, setVipExpiresAt] = useState<string | undefined>();
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);

  // Verificar se o usuário está logado
  const isLoggedIn = user && currentUser;
  // Verificar se é admin
  const isAdmin = currentUser?.is_admin || false;

  // ✅ MIGRAÇÃO: Usar Socket.io para atualizações de bolões quando houver stream ativa
  const { socket, isConnected, on, off, joinStream, leaveStream } = useSocket({
    streamId: activeStreamId || undefined,
    autoConnect: !!activeStreamId
  });

  // Verificar se há sorteios ativos e carregar dados
  useEffect(() => {
    checkActivePools();
    loadPoolWinnersCount();
    loadNextGame();
    checkActiveLive();
    // Verificar bolão independente da live (pode haver bolão sem live ativa)
    checkActivePool();

    // Subscribe para mudanças em live_streams (via Realtime ainda - menos crítico)
    const liveChannel = supabase
      .channel('home-live-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_streams'
      }, () => {
        checkActiveLive();
        // Verificar bolão novamente quando live mudar
        checkActivePool();
      })
      .subscribe();

    // ✅ MIGRAÇÃO: Usar Socket.io para atualizações de match_pools quando houver stream ativa
    // Para bolões sem stream, ainda usamos queries diretas (polling ou Realtime)

    // Escutar atualizações de bolões via Socket.io (quando houver stream ativa)
    let poolUpdateHandler: ((data: any) => void) | null = null;
    let poolBetUpdateHandler: ((data: any) => void) | null = null;

    if (activeStreamId && isConnected) {
      joinStream(activeStreamId);

      // Escutar atualizações de match_pools via Socket.io
      poolUpdateHandler = (data: { eventType: string; pool: any; oldPool: any }) => {
        console.log('📡 HomePage: Mudança em match_pools via Socket.io:', data.eventType, data.pool?.id);

        // Atualizar estado quando bolão muda
        if (data.eventType === 'INSERT' || data.eventType === 'UPDATE') {
          if (data.pool?.is_active && data.pool?.live_stream_id === activeStreamId) {
            setActivePool(data.pool);
            checkActivePools();
          } else if (data.pool?.live_stream_id === activeStreamId && !data.pool?.is_active) {
            // Bolão desativado
            checkActivePool(activeStreamId);
            checkActivePools();
          }
        } else if (data.eventType === 'DELETE') {
          // Bolão deletado
          checkActivePool(activeStreamId);
          checkActivePools();
        } else {
          // Fallback: sempre verificar novamente
          checkActivePool(activeStreamId);
          checkActivePools();
        }
      };

      // Escutar atualizações de pool_bets via Socket.io
      poolBetUpdateHandler = (data: { eventType: string; bet: any; oldBet: any; poolId: string }) => {
        console.log('📡 HomePage: Mudança em pool_bets via Socket.io:', data.eventType);

        // Atualizar contador de ganhadores quando houver mudanças
        loadPoolWinnersCount();
      };

      on('pool-updated', poolUpdateHandler);
      on('pool-bet-updated', poolBetUpdateHandler);
    }

    // ✅ FALLBACK: Manter subscription Realtime para bolões sem stream ativa (caso raro)
    // Isso garante que mesmo sem stream, ainda recebemos atualizações
    const poolChannel = supabase
      .channel('home-pool-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'match_pools'
      }, (payload) => {
        // Se não temos stream ativa, usar Realtime
        if (!activeStreamId || !isConnected) {
          console.log('📡 Mudança detectada em match_pools (Realtime fallback):', payload.eventType, payload.new);
          checkActivePool();
          checkActivePools();
        }
        // Se temos stream ativa, Socket.io já cuida disso
      })
      .subscribe();

    // ✅ FALLBACK: Manter subscription Realtime para pool_bets sem stream ativa
    const poolBetsChannel = supabase
      .channel('home-pool-bets-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pool_bets'
      }, () => {
        // Se não temos stream ativa, usar Realtime
        if (!activeStreamId || !isConnected) {
          loadPoolWinnersCount();
        }
        // Se temos stream ativa, Socket.io já cuida disso
      })
      .subscribe();

    // Subscribe para mudanças em cruzeiro_games - Atualização em tempo real do banner
    const gamesChannel = supabase
      .channel('home-games-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cruzeiro_games'
      }, () => {
        console.log('📡 Mudança detectada em cruzeiro_games, recarregando...');
        loadNextGame();
      })
      .subscribe();

    return () => {
      // Limpar listeners Socket.io
      if (poolUpdateHandler) {
        off('pool-updated', poolUpdateHandler);
      }
      if (poolBetUpdateHandler) {
        off('pool-bet-updated', poolBetUpdateHandler);
      }
      if (activeStreamId) {
        leaveStream(activeStreamId);
      }

      // Limpar subscriptions Realtime
      supabase.removeChannel(liveChannel);
      supabase.removeChannel(poolChannel);
      supabase.removeChannel(poolBetsChannel);
      supabase.removeChannel(gamesChannel);
    };
  }, [activeStreamId, isConnected, on, off, joinStream, leaveStream]);

  // Listener para evento de VIP concedido
  useEffect(() => {
    const handleVipGranted = (event: CustomEvent) => {
      const { expiresAt } = event.detail;
      setVipExpiresAt(expiresAt);
      setShowVipModal(true);
    };

    window.addEventListener('vipGranted', handleVipGranted as EventListener);

    return () => {
      window.removeEventListener('vipGranted', handleVipGranted as EventListener);
    };
  }, []);

  const checkActiveLive = async () => {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select('id, is_active')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setHasActiveLive(true);
        setActiveStreamId(data.id);
        // Verificar se há bolão ativo para esta live
        checkActivePool(data.id);
      } else {
        setHasActiveLive(false);
        setActiveStreamId(null);
        // Não resetar activePool aqui - deixar checkActivePool gerenciar
        checkActivePool();
      }
    } catch (err) {
      console.error('Erro ao verificar live:', err);
      setHasActiveLive(false);
      setActivePool(null);
    }
  };

  const checkActivePool = async (streamId?: string) => {
    try {
      // Primeiro, tentar buscar bolão ativo para a stream específica (se fornecida)
      let query = supabase
        .from('match_pools')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      // Se tem streamId específico, PRIORIZAR bolão dessa stream
      if (streamId) {
        const { data: streamPool, error: streamError } = await query.eq('live_stream_id', streamId).maybeSingle();

        if (!streamError && streamPool) {
          console.log('✅ HomePage: Bolão ativo encontrado para stream atual:', {
            id: streamPool.id,
            match_title: streamPool.match_title,
            is_active: streamPool.is_active,
            stream_id: streamPool.live_stream_id
          });
          setActivePool(streamPool);
          return;
        }
      }

      // Se não encontrou para a stream específica, buscar QUALQUER bolão ativo
      const { data, error } = await supabase
        .from('match_pools')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        console.log('✅ HomePage: Bolão ativo encontrado:', {
          id: data.id,
          match_title: data.match_title,
          is_active: data.is_active,
          stream_id: data.live_stream_id
        });
        setActivePool(data);
      } else {
        if (error) {
          console.error('❌ HomePage: Erro ao buscar bolão:', error);
        } else {
          console.log('❌ HomePage: Nenhum bolão ativo encontrado');
        }
        setActivePool(null);
      }
    } catch (err) {
      console.error('HomePage: Erro ao verificar bolão:', err);
      setActivePool(null);
    }
  };

  // Verificar bolões ativos
  const checkActivePools = async () => {
    try {
      const { data, error } = await supabase
        .from('match_pools')
        .select('id', { count: 'exact' })
        .eq('is_active', true);

      if (!error && data !== null) {
        setActivePoolsCount(data.length || 0);
      } else {
        setActivePoolsCount(0);
      }
    } catch (error) {
      console.error('Erro ao verificar bolões ativos:', error);
      setActivePoolsCount(0);
    }
  };

  // Contar ganhadores de bolões
  const loadPoolWinnersCount = async () => {
    try {
      const { data, error } = await supabase
        .from('pool_bets')
        .select('id', { count: 'exact' })
        .eq('is_winner', true)
        .eq('payment_status', 'approved');

      if (!error && data !== null) {
        setPoolWinnersCount(data.length || 0);
      } else {
        setPoolWinnersCount(0);
      }
    } catch (error) {
      console.error('Erro ao contar ganhadores de bolões:', error);
      setPoolWinnersCount(0);
    }
  };


  const loadNextGame = async () => {
    try {
      setLoadingGame(true);
      const { data, error } = await supabase
        .from('cruzeiro_games')
        .select('*')
        .neq('status', 'finished')
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setNextGame(data);
      }
    } catch (error) {
      console.error('Error loading next game:', error);
    } finally {
      setLoadingGame(false);
    }
  };

  const handleRegistrationSuccess = () => {
    setSuccessNumber(selectedNumber);
    setShowSuccess(true);
  };

  const handleNumberSelection = async (number: number) => {
    if (isLoggedIn) {
      const success = await selectFreeNumber(number);
      if (success) {
        setSelectedNumber(number);
        setSuccessNumber(number);
        setShowSuccess(true);
      }
    } else {
      setSelectedNumber(number);
    }
  };

  const handleUpsellClick = () => {
    setShowSuccess(false);
    navigate('/my-numbers');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow w-full relative">
        {/* Background Patterns (Optional specifics) */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>

        {/* Hero Section - O MAIOR DE MINAS */}
        <div className="relative w-full">
          {/* Hero Background with Gradient/Image */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-primary-dark to-black opacity-90"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent"></div>

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32 flex flex-col items-center text-center">

            {/* Stars Decoration */}
            <div className="flex gap-4 mb-6 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-accent text-3xl sm:text-4xl drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">★</span>
              ))}
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-9xl font-display font-black text-white mb-6 tracking-tighter drop-shadow-2xl italic">
              O MAIOR <br className="sm:hidden" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white">DE MINAS</span>
            </h1>

            <p className="text-blue-100 text-lg sm:text-2xl max-w-2xl font-light mb-10 leading-relaxed">
              Acompanhe todas as emoções do Cruzeiro em um só lugar. Lives, bolões e prêmios exclusivos para a maior torcida de Minas.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              {activePool && activePool.is_active && (
                <button
                  onClick={() => setShowPoolModal(true)}
                  className="btn btn-primary px-10 py-4 text-lg shadow-emerald-500/50 hover:shadow-emerald-400/60 bg-gradient-to-r from-emerald-600 to-emerald-500 border-0 relative"
                >
                  <span className="relative z-10">PARTICIPAR DO BOLÃO</span>
                  <span className="absolute inset-0 rounded-lg bg-emerald-400 opacity-20 animate-ping"></span>
                </button>
              )}
              <Link
                to="/zk-tv"
                className={`btn px-10 py-4 text-lg border-white/40 hover:bg-white/10 relative overflow-hidden group/live ${hasActiveLive ? 'bg-blue-600/20 border-blue-500/50' : 'btn-outline'}`}
              >
                <div className="flex items-center gap-3">
                  {hasActiveLive && (
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter animate-pulse">
                        AO VIVO
                      </span>
                    </div>
                  )}
                  <span>ASSISTIR LIVES</span>
                </div>
              </Link>
            </div>

            <div className="mt-8">
              <a
                href="https://wa.me/message/K7PI44C5HL7FG1"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full font-bold uppercase tracking-widest text-sm shadow-lg shadow-green-600/30 transition-all hover:scale-105"
              >
                <MessageCircle className="w-5 h-5" />
                PARA CENTRAL DE SUPORTE
              </a>
            </div>

            {/* Admin Managed Game Banner */}
            {!loadingGame && nextGame?.banner_url && (
              <div className="mt-12 w-full max-w-4xl mx-auto px-4 z-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="relative group overflow-hidden rounded-[2rem] sm:rounded-[3rem] border border-white/10 shadow-2xl shadow-blue-500/10">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity duration-700"></div>
                  <img
                    src={nextGame.banner_url}
                    alt="Próximo Jogo"
                    className="w-full h-auto min-h-[150px] object-cover transition-transform duration-1000 group-hover:scale-110"
                  />

                  {/* Banner Content (Optional info overlay) */}
                  <div className="absolute bottom-6 left-6 right-6 z-20 flex flex-col items-start text-left">
                    <span className="px-3 py-1 rounded-full bg-blue-600/80 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-white mb-2">Próxima Partida</span>
                    <h4 className="text-xl sm:text-3xl font-black text-white italic uppercase tracking-tight">
                      Cruzeiro <span className="text-blue-400">vs</span> {nextGame.opponent}
                    </h4>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats / Info Bar */}
        <div className="glass-panel border-y border-white/10 relative z-10 backdrop-blur-xl bg-white/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center text-white">
            <div className="transform hover:scale-105 transition-transform">
              <p className="text-4xl font-black text-accent">{activePoolsCount}</p>
              <p className="text-xs sm:text-sm uppercase tracking-widest opacity-70">Bolões Ativos</p>
            </div>
            <div className="transform hover:scale-105 transition-transform">
              <p className="text-4xl font-black text-white">{poolWinnersCount}</p>
              <p className="text-xs sm:text-sm uppercase tracking-widest opacity-70">Ganhadores</p>
            </div>
            <div className="transform hover:scale-105 transition-transform">
              <p className="text-4xl font-black text-white">💯%</p>
              <p className="text-xs sm:text-sm uppercase tracking-widest opacity-70">Segurança</p>
            </div>
            <div className="transform hover:scale-105 transition-transform">
              <p className="text-4xl font-black text-accent">24h</p>
              <p className="text-xs sm:text-sm uppercase tracking-widest opacity-70">Suporte</p>
            </div>
          </div>
        </div>

        {/* Main Content Areas */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">

          {/* LIVE STREAM BANNER - MODERN & PROFESSIONAL */}
          <section className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-blue-400 to-emerald-400 rounded-[2.5rem] blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div
              className="relative block rounded-[2.5rem] overflow-hidden border border-white/10 glass-panel shadow-2xl transition-all duration-500 hover:shadow-blue-500/20"
            >
              <div className="absolute inset-0 bg-slate-900/40 opacity-60"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(59,130,246,0.15),transparent)]"></div>

              <div className="relative p-8 sm:p-14 flex flex-col lg:flex-row items-center justify-between gap-10">
                <div className="flex-1 flex flex-col lg:flex-row items-center gap-8 text-center lg:text-left">
                  {/* Decorative Icon */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center border border-white/20 shadow-xl group-hover:scale-110 transition-transform duration-500">
                      <MonitorPlay className="w-12 h-12 text-white" />
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-4">
                      <span className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">ZK TV</span>
                      {hasActiveLive && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.15em]">Ao Vivo</span>
                        </div>
                      )}
                    </div>
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 italic tracking-tight uppercase leading-none">
                      ASSISTA TODOS OS <br className="hidden sm:block" />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-blue-400">JOGOS AO VIVO</span>
                    </h2>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="flex -space-x-4 mb-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="w-12 h-12 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-xs font-bold text-blue-400 shadow-xl overflow-hidden glass-panel">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="viewer" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <div className="w-12 h-12 rounded-full border-2 border-slate-900 bg-blue-600 flex items-center justify-center text-[10px] font-black text-white shadow-xl">
                      +1.2k
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/zk-tv');
                    }}
                    className="bg-white text-blue-900 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-50 transition-colors shadow-xl shadow-white/5 active:scale-95 duration-200"
                  >
                    {hasActiveLive ? 'Entrar na Live' : 'Acessar ZK TV'}
                  </button>

                  {/* Botão Participar do Bolão - Aparece apenas se houver bolão ativo */}
                  {activePool && activePool.is_active && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPoolModal(true);
                      }}
                      className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-xl shadow-emerald-600/20 active:scale-95 duration-200 flex items-center gap-2"
                    >
                      <Target className="w-4 h-4" />
                      Participar do Bolão
                    </button>
                  )}
                </div>
              </div>

              {/* Decorative scanline effect */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] opacity-20"></div>
            </div>
          </section>

          {/* Cards Grid */}
          <section className={`grid grid-cols-1 md:grid-cols-2 ${activePool && activePool.is_active ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-8`}>
            {/* Card 1: BOLÃO ATIVO - Mostra apenas quando há bolão ativo - PRIMEIRA POSIÇÃO */}
            {activePool && activePool.is_active && (
              <div className="glass-panel p-6 rounded-3xl text-center relative overflow-hidden group hover:bg-white/5 transition-all duration-300 hover:-translate-y-2 border-2 border-emerald-500/30 shadow-2xl shadow-emerald-900/30">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 animate-pulse"></div>

                {/* Badge "Ao Vivo" - REMOVIDO: Não exibir para usuários */}

                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 rounded-full flex items-center justify-center mb-4 text-emerald-300 group-hover:scale-110 transition-transform group-hover:from-emerald-500/40 group-hover:to-emerald-600/40 relative mt-2">
                  <Target className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tight">Bolão Ativo</h3>

                {/* Informação da Partida */}
                {(activePool.home_team || activePool.away_team) && (
                  <div className="mb-4 text-xs text-emerald-300/80 font-semibold line-clamp-1">
                    {activePool.home_team || ''} {activePool.home_team && activePool.away_team ? 'vs' : ''} {activePool.away_team || ''}
                  </div>
                )}

                {/* Informações do Bolão */}
                <div className="space-y-3 mb-4">
                  {/* Valor do Prêmio - DESTAQUE PRINCIPAL (somente o prêmio disponível para o usuário final) */}
                  <div className="bg-gradient-to-br from-emerald-500/15 via-emerald-600/10 to-emerald-700/15 border-2 border-emerald-500/40 rounded-xl p-4 relative overflow-hidden">
                    <div className="relative">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <p className="text-emerald-400 text-[10px] font-black uppercase tracking-wider">Prêmio Disponível</p>
                      </div>
                      <p className="text-3xl sm:text-4xl font-black text-emerald-300 mb-1 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                        R$ {((activePool.total_pool_amount || 0) * 0.70 + (activePool.accumulated_amount || 0)).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>

                  {/* Mostrar Resultado e Ganhadores se houver */}
                  {(activePool.result_home_score !== null && activePool.result_away_score !== null) && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mt-3">
                      <div className="text-center mb-2">
                        <p className="text-[10px] text-blue-300 font-bold uppercase mb-1">Resultado Final</p>
                        <div className="flex items-center justify-center gap-3">
                          <div className="text-center">
                            <p className="text-[9px] text-blue-400 mb-0.5">{activePool.home_team}</p>
                            <p className="text-2xl font-black text-blue-300">{activePool.result_home_score}</p>
                          </div>
                          <span className="text-blue-400 font-black text-xl">x</span>
                          <div className="text-center">
                            <p className="text-[9px] text-blue-400 mb-0.5">{activePool.away_team}</p>
                            <p className="text-2xl font-black text-blue-300">{activePool.result_away_score}</p>
                          </div>
                        </div>
                      </div>

                      {/* Mostrar Ganhadores */}
                      {activePool.winners_count > 0 ? (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 mt-2">
                          <div className="flex items-center justify-center gap-1.5 mb-1">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                            <p className="text-[10px] text-yellow-300 font-black uppercase">Ganhadores!</p>
                          </div>
                          <p className="text-xs text-yellow-200 text-center font-bold">
                            {activePool.winners_count} ganhador{activePool.winners_count !== 1 ? 'es' : ''}
                          </p>
                          {activePool.prize_per_winner > 0 && (
                            <p className="text-[10px] text-yellow-300/80 text-center mt-0.5">
                              R$ {activePool.prize_per_winner.toFixed(2).replace('.', ',')} por ganhador
                            </p>
                          )}
                          <Link
                            to="/winners"
                            className="block text-center mt-2 text-[9px] text-yellow-400 hover:text-yellow-300 font-bold underline"
                          >
                            Ver Ganhadores →
                          </Link>
                        </div>
                      ) : (
                        <div className="bg-slate-800/50 rounded-lg p-2 mt-2">
                          <p className="text-[9px] text-slate-400 text-center">
                            Nenhum ganhador com placar exato
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPoolModal(true);
                  }}
                  className="btn bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:via-emerald-400 hover:to-emerald-500 text-white w-full border-0 shadow-xl shadow-emerald-600/30 rounded-xl font-black uppercase tracking-widest text-xs py-3 transform hover:scale-105 transition-all duration-200 relative"
                >
                  <span className="relative z-10">Participar Agora</span>
                  <span className="absolute inset-0 rounded-xl bg-emerald-400 opacity-20 animate-ping"></span>
                </button>
              </div>
            )}

            {/* Card 2: GANHADORES */}
            <div className="glass-panel p-8 rounded-3xl text-center relative overflow-hidden group hover:bg-white/5 transition-all duration-300 hover:-translate-y-2">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-yellow-600"></div>
              <div className="w-20 h-20 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center mb-6 text-accent group-hover:scale-110 transition-transform group-hover:bg-yellow-500/30">
                <Trophy className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Hall da Fama</h3>
              <p className="text-blue-200 mb-8 text-sm leading-relaxed">Veja quem já faturou prêmios incríveis.</p>
              <Link to="/winners" className="btn btn-outline w-full border-yellow-400/30 hover:bg-yellow-500/20 text-accent hover:text-white rounded-xl">
                VER GANHADORES
              </Link>
            </div>

            {/* Card 3: RANKING */}
            <div className="glass-panel p-8 rounded-3xl text-center relative overflow-hidden group hover:bg-white/5 transition-all duration-300 hover:-translate-y-2">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
              <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-6 text-green-300 group-hover:scale-110 transition-transform group-hover:bg-green-500/30">
                <MonitorPlay className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Tabela</h3>
              <p className="text-blue-200 mb-8 text-sm leading-relaxed">Acompanhe o Cabuloso no campeonato.</p>
              <button
                onClick={() => navigate('/competicoes')}
                className="btn btn-outline w-full border-green-400/30 hover:bg-green-500/20 text-green-300 hover:text-white rounded-xl"
              >
                VER TABELA
              </button>
            </div>

            {/* Card 4: LIVES PREMIADAS */}
            <div className="glass-panel p-8 rounded-3xl text-center relative overflow-hidden group hover:bg-white/5 transition-all duration-300 hover:-translate-y-2">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-purple-600"></div>
              <div className="w-20 h-20 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-6 text-purple-300 group-hover:scale-110 transition-transform group-hover:bg-purple-500/30">
                <Play className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Lives Resta Um</h3>
              <p className="text-blue-200 mb-8 text-sm leading-relaxed">Participe dos jogos ao vivo. A emoção do Cruzeiro agora nas suas mãos.</p>
              <button
                onClick={() => navigate('/live-games')}
                className="btn btn-outline w-full border-purple-400/30 hover:bg-purple-500/20 text-purple-300 hover:text-white rounded-xl"
              >
                PARTICIPAR
              </button>
            </div>
          </section>

          {/* Banners de Patrocinadores */}
          <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
            <AdvertisementCarousel position="homepage" autoPlay={true} autoPlayInterval={5000} />
          </section>

        </div>
      </main>

      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="🎉 Número Selecionado!"
        message={`Seu número gratuito #${successNumber} foi reservado com sucesso!`}
        selectedNumber={successNumber || undefined}
        autoClose={false}
        autoCloseTime={8000}
        showUpsell={true}
        onUpsellClick={handleUpsellClick}
      />

      {/* Modal do Bolão */}
      {activePool && (
        <PoolBetModal
          isOpen={showPoolModal}
          onClose={() => setShowPoolModal(false)}
          poolId={activePool.id}
          matchTitle={activePool.match_title}
          homeTeam={activePool.home_team}
          awayTeam={activePool.away_team}
        />
      )}

      {/* Modal de VIP Concedido */}
      <VipGrantedModal
        isOpen={showVipModal}
        onClose={() => {
          setShowVipModal(false);
          // Recarregar dados do usuário após fechar o modal
          if (isLoggedIn) {
            window.location.reload(); // Recarregar para atualizar o status VIP
          }
        }}
        expiresAt={vipExpiresAt}
      />

      <Footer />
    </div>
  );
}

export default HomePage;
