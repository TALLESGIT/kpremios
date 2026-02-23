import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NumberSelection from '../components/user/NumberSelection';
import RegistrationForm from '../components/user/RegistrationForm';
import SuccessModal from '../components/shared/SuccessModal';
import VipGrantedModal from '../components/vip/VipGrantedModal';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { useSocket } from '../hooks/useSocket';
import { Play, Trophy, Ticket, MonitorPlay, Target, MessageCircle, DollarSign, Instagram } from 'lucide-react';
import { CruzeiroGame } from '../types';
import PoolBetModal from '../components/pool/PoolBetModal';
import AdvertisementCarousel from '../components/shared/AdvertisementCarousel';
import { motion } from 'framer-motion';
import SocialModal from '../components/SocialModal';

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
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [socialLinks, setSocialLinks] = useState<any>({});

  // Verificar se o usuário está logado
  const isLoggedIn = !!(user && currentUser);
  // Verificar se é admin
  const isAdmin = currentUser?.is_admin || false;

  const { socket, isConnected, on, off, joinStream, leaveStream } = useSocket({
    streamId: activeStreamId || undefined,
    autoConnect: !!activeStreamId
  });

  useEffect(() => {
    checkActivePools();
    loadPoolWinnersCount();
    loadNextGame();
    checkActiveLive();
    checkActivePool();
    loadSocialLinks();

    const liveChannel = supabase
      .channel('home-live-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_streams'
      }, () => {
        checkActiveLive();
        checkActivePool();
      })
      .subscribe();

    let poolUpdateHandler: ((data: any) => void) | null = null;
    let poolBetUpdateHandler: ((data: any) => void) | null = null;

    if (activeStreamId && isConnected) {
      joinStream(activeStreamId);

      poolUpdateHandler = (data: { eventType: string; pool: any; oldPool: any }) => {
        if (data.eventType === 'INSERT' || data.eventType === 'UPDATE') {
          if (data.pool?.is_active && data.pool?.live_stream_id === activeStreamId) {
            setActivePool(data.pool);
            checkActivePools();
          } else if (data.pool?.live_stream_id === activeStreamId && !data.pool?.is_active) {
            checkActivePool(activeStreamId);
            checkActivePools();
          }
        } else if (data.eventType === 'DELETE') {
          checkActivePool(activeStreamId);
          checkActivePools();
        }
      };

      poolBetUpdateHandler = (data: { eventType: string; bet: any; oldBet: any; poolId: string }) => {
        loadPoolWinnersCount();
      };

      on('pool-updated', poolUpdateHandler);
      on('pool-bet-updated', poolBetUpdateHandler);
    }

    const poolChannel = supabase
      .channel('home-pool-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'match_pools'
      }, (payload) => {
        if (!activeStreamId || !isConnected) {
          checkActivePool();
          checkActivePools();
        }
      })
      .subscribe();

    const poolBetsChannel = supabase
      .channel('home-pool-bets-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pool_bets'
      }, () => {
        if (!activeStreamId || !isConnected) {
          loadPoolWinnersCount();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(liveChannel);
      supabase.removeChannel(poolChannel);
      supabase.removeChannel(poolBetsChannel);
      if (poolUpdateHandler) off('pool-updated', poolUpdateHandler);
      if (poolBetUpdateHandler) off('pool-bet-updated', poolBetUpdateHandler);
    };
  }, [activeStreamId, isConnected]);

  const checkActivePools = async () => {
    try {
      const { count } = await supabase
        .from('match_pools')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      setActivePoolsCount(count || 0);
    } catch (err) {
      console.error('Erro ao contar bolões:', err);
    }
  };

  const loadPoolWinnersCount = async () => {
    try {
      const { count } = await supabase
        .from('pool_bets')
        .select('*', { count: 'exact', head: true })
        .eq('is_winner', true);
      setPoolWinnersCount(count || 0);
    } catch (err) {
      console.error('Erro ao contar ganhadores:', err);
    }
  };

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
      } else {
        setHasActiveLive(false);
        setActiveStreamId(null);
      }
    } catch (err) {
      setHasActiveLive(false);
      setActiveStreamId(null);
    }
  };

  const checkActivePool = async (streamId?: string) => {
    try {
      let query = supabase
        .from('match_pools')
        .select('*')
        .eq('is_active', true);

      if (streamId) {
        query = query.eq('live_stream_id', streamId);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (!error && data) {
        setActivePool(data);
      } else {
        setActivePool(null);
      }
    } catch (err) {
      setActivePool(null);
    }
  };

  const loadNextGame = async () => {
    setLoadingGame(true);
    try {
      const { data, error } = await supabase
        .from('cruzeiro_games')
        .select('*')
        .gte('game_date', new Date().toISOString())
        .order('game_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setNextGame(data);
      }
    } catch (err) {
      console.error('Erro ao carregar próximo jogo:', err);
    } finally {
      setLoadingGame(false);
    }
  };

  const loadSocialLinks = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'social_links')
        .maybeSingle();

      if (data?.value) {
        setSocialLinks(data.value);
      }
    } catch (e) {
      console.error('Error loading social links:', e);
    }
  };

  const handleRegistrationSuccess = () => {
    setSuccessNumber(selectedNumber);
    setShowSuccess(true);
  };

  const handleNumberSelection = (num: number) => {
    setSelectedNumber(num);
  };

  const handleUpsellClick = () => {
    setShowSuccess(false);
    navigate('/dashboard');
  };

  return (
    <main className="min-h-screen bg-slate-900 overflow-x-hidden">
      <div className="relative min-h-[90vh] flex flex-col items-center justify-center pt-20 pb-16">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px]"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        </div>

        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
          >
            <span className="inline-block px-5 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-[0.3em] mb-6 shadow-lg shadow-blue-500/5">
              ⚽ O MAIOR PORTAL DO CABULOSO ⚽
            </span>
            <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black text-white italic tracking-tighter uppercase leading-[0.85] mb-8">
              ZK <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-blue-500 drop-shadow-2xl">OFICIAL</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-blue-100/70 font-medium leading-relaxed tracking-tight mb-10">
              Acompanhe o <span className="text-white font-bold">Cruzeiro</span> em tempo real, participe de bolões exclusivos e concorra a prêmios incríveis toda semana!
            </p>

            <div className="flex flex-wrap justify-center gap-5">
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

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <a
                href="https://wa.me/message/K7PI44C5HL7FG1"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full font-bold uppercase tracking-widest text-sm shadow-lg shadow-green-600/30 transition-all hover:scale-105"
              >
                <MessageCircle className="w-5 h-5" />
                CENTRAL DE SUPORTE
              </a>
              <button
                onClick={() => setShowSocialModal(true)}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full font-bold uppercase tracking-widest text-sm backdrop-blur-md transition-all hover:scale-105"
              >
                <Instagram className="w-5 h-5" />
                SIGA-NOS NAS REDES
              </button>
            </div>
          </motion.div>
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
        {/* LIVE STREAM BANNER */}
        <section className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-blue-400 to-emerald-400 rounded-[2.5rem] blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative block rounded-[2.5rem] overflow-hidden border border-white/10 glass-panel shadow-2xl transition-all duration-500 hover:shadow-blue-500/20">
            <div className="absolute inset-0 bg-slate-900/40 opacity-60"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(59,130,246,0.15),transparent)]"></div>

            <div className="relative p-8 sm:p-14 flex flex-col lg:flex-row items-center justify-between gap-10">
              <div className="flex-1 flex flex-col lg:flex-row items-center gap-8 text-center lg:text-left">
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
                  onClick={() => navigate('/zk-tv')}
                  className="bg-white text-blue-900 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-50 transition-colors shadow-xl shadow-white/5 active:scale-95 duration-200"
                >
                  {hasActiveLive ? 'Entrar na Live' : 'Acessar ZK TV'}
                </button>
                {activePool && activePool.is_active && (
                  <button
                    onClick={() => setShowPoolModal(true)}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-xl shadow-emerald-600/20 active:scale-95 duration-200 flex items-center gap-2"
                  >
                    <Target className="w-4 h-4" />
                    Participar do Bolão
                  </button>
                )}
              </div>
            </div>
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] opacity-20"></div>
          </div>
        </section>

        {/* Cards Grid */}
        <section className={`grid grid-cols-1 md:grid-cols-2 ${activePool && activePool.is_active ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-8`}>
          {activePool && activePool.is_active && (
            <div className="glass-panel p-6 rounded-3xl text-center relative overflow-hidden group hover:bg-white/5 transition-all duration-300 hover:-translate-y-2 border-2 border-emerald-500/30 shadow-2xl shadow-emerald-900/30">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 animate-pulse"></div>
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 rounded-full flex items-center justify-center mb-4 text-emerald-300 group-hover:scale-110 transition-transform group-hover:from-emerald-500/40 group-hover:to-emerald-600/40 relative mt-2">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tight">Bolão Ativo</h3>
              {(activePool.home_team || activePool.away_team) && (
                <div className="mb-4 text-xs text-emerald-300/80 font-semibold line-clamp-1">
                  {activePool.home_team || ''} {activePool.home_team && activePool.away_team ? 'vs' : ''} {activePool.away_team || ''}
                </div>
              )}
              <div className="space-y-3 mb-4">
                <div className="bg-gradient-to-br from-emerald-500/15 via-emerald-600/10 to-emerald-700/15 border-2 border-emerald-500/40 rounded-xl p-4 relative overflow-hidden">
                  <div className="relative text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <p className="text-emerald-400 text-[10px] font-black uppercase tracking-wider">Prêmio Disponível</p>
                    </div>
                    <p className="text-3xl sm:text-4xl font-black text-emerald-300 mb-1 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                      R$ {((activePool.total_pool_amount || 0) * 0.70 + (activePool.accumulated_amount || 0)).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
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
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowPoolModal(true)}
                className="btn bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:via-emerald-400 hover:to-emerald-500 text-white w-full border-0 shadow-xl shadow-emerald-600/30 rounded-xl font-black uppercase tracking-widest text-xs py-3 transform hover:scale-105 transition-all duration-200 relative"
              >
                <span className="relative z-10">Participar Agora</span>
                <span className="absolute inset-0 rounded-xl bg-emerald-400 opacity-20 animate-ping"></span>
              </button>
            </div>
          )}

          {/* Card: GANHADORES */}
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

          {/* Card: RANKING */}
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

        </section>

        {/* Banners de Patrocinadores */}
        <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <AdvertisementCarousel position="homepage" autoPlay={true} autoPlayInterval={5000} />
        </section>
      </div>

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

      <VipGrantedModal
        isOpen={showVipModal}
        onClose={() => {
          setShowVipModal(false);
          if (isLoggedIn) {
            window.location.reload();
          }
        }}
        expiresAt={vipExpiresAt}
      />

      {/* Social Media Modal */}
      <SocialModal
        isOpen={showSocialModal}
        onClose={() => setShowSocialModal(false)}
        socialLinks={socialLinks}
      />
    </main>
  );
}

export default HomePage;
