import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import VipGrantedModal from '../components/vip/VipGrantedModal';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { useSocket } from '../hooks/useSocket';
import { Trophy, MonitorPlay, Target, MessageCircle, DollarSign, Instagram, Users, Play } from 'lucide-react';
import { MatchGame } from '../types';
import PoolBetModal from '../components/pool/PoolBetModal';
import AdvertisementCarousel from '../components/shared/AdvertisementCarousel';
import TeamLogo from '../components/TeamLogo';
import { motion } from 'framer-motion';
import SocialModal from '../components/SocialModal';
import { getTeamColors } from '../utils/teamLogos';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentUser, loading: dataLoading } = useData();
  const [activePoolsCount, setActivePoolsCount] = useState(0);
  const [poolWinnersCount, setPoolWinnersCount] = useState(0);
  const [nextGameCruzeiro, setNextGameCruzeiro] = useState<MatchGame | null>(null);
  const [nextGameGalo, setNextGameGalo] = useState<MatchGame | null>(null);
  const [loadingGame, setLoadingGame] = useState(true);
  const [hasActiveLiveCruzeiro, setHasActiveLiveCruzeiro] = useState(false);
  const [hasActiveLiveGalo, setHasActiveLiveGalo] = useState(false);
  const [activePoolCruzeiro, setActivePoolCruzeiro] = useState<any>(null);
  const [activePoolGalo, setActivePoolGalo] = useState<any>(null);
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [selectedPool, setSelectedPool] = useState<any>(null);
  const [showVipModal, setShowVipModal] = useState(false);
  const [vipExpiresAt, setVipExpiresAt] = useState<string | undefined>();
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [socialLinks, setSocialLinks] = useState<any>({});
  const [viewerCount, setViewerCount] = useState<number>(0);
  // Lives ao vivo para o banner ZK TV
  const [liveGames, setLiveGames] = useState<any[]>([]);

  const isLoggedIn = !!(user && currentUser);

  const { isConnected, on, off, joinStream } = useSocket({
    streamId: activeStreamId || undefined,
    autoConnect: !!activeStreamId
  });

  useEffect(() => {
    checkActivePools();
    loadPoolWinnersCount();
    loadNextGames();
    checkActiveLives();
    checkActivePools_both();
    loadSocialLinks();
    loadLiveGames();

    const liveChannel = supabase
      .channel('home-live-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_streams'
      }, () => {
        checkActiveLives();
        checkActivePools_both();
        loadLiveGames();
      })
      .subscribe();

    const poolChannel = supabase
      .channel('home-pool-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'match_pools'
      }, (_payload) => {
        if (!activeStreamId || !isConnected) {
          checkActivePools_both();
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

    let poolUpdateHandler: ((data: any) => void) | null = null;
    let poolBetUpdateHandler: ((data: any) => void) | null = null;
    let viewerCountHandler: ((data: any) => void) | null = null;

    if (activeStreamId && isConnected) {
      joinStream(activeStreamId);

      poolUpdateHandler = (data: { eventType: string; pool: any; oldPool: any }) => {
        if (data.eventType === 'INSERT' || data.eventType === 'UPDATE') {
          if (data.pool?.is_active && data.pool?.live_stream_id === activeStreamId) {
            if (data.pool.club_slug === 'cruzeiro') setActivePoolCruzeiro(data.pool);
            if (data.pool.club_slug === 'atletico-mg') setActivePoolGalo(data.pool);
            checkActivePools();
          } else if (data.pool?.live_stream_id === activeStreamId && !data.pool?.is_active) {
            checkActivePools_both();
            checkActivePools();
          }
        } else if (data.eventType === 'DELETE') {
          checkActivePools_both();
          checkActivePools();
        }
      };

      poolBetUpdateHandler = (_data: { eventType: string; bet: any; oldBet: any; poolId: string }) => {
        loadPoolWinnersCount();
      };

      viewerCountHandler = (data: { streamId: string; count: number }) => {
        if (data.streamId === activeStreamId) {
          setViewerCount(data.count);
        }
      };

      on('pool-updated', poolUpdateHandler);
      on('pool-bet-updated', poolBetUpdateHandler);
      on('viewer-count-updated', viewerCountHandler);
    }

    return () => {
      supabase.removeChannel(liveChannel);
      supabase.removeChannel(poolChannel);
      supabase.removeChannel(poolBetsChannel);
      if (poolUpdateHandler) off('pool-updated', poolUpdateHandler);
      if (poolBetUpdateHandler) off('pool-bet-updated', poolBetUpdateHandler);
      if (viewerCountHandler) off('viewer-count-updated', viewerCountHandler);
    };
  }, [activeStreamId, isConnected, currentUser?.club_slug, dataLoading]);

  useEffect(() => {
    const handleVipGranted = (event: CustomEvent) => {
      setVipExpiresAt(event.detail.expiresAt);
      setShowVipModal(true);
    };

    window.addEventListener('vipGranted', handleVipGranted as EventListener);
    return () => window.removeEventListener('vipGranted', handleVipGranted as EventListener);
  }, []);

  // Contar bolões ativos APENAS de Cruzeiro e Galo
  const checkActivePools = async () => {
    try {
      if (dataLoading && !currentUser) return;
      const { count } = await supabase
        .from('match_pools')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .in('club_slug', ['cruzeiro', 'atletico-mg']);
      setActivePoolsCount(count || 0);
    } catch (err) {
      console.error('Erro ao contar bolões:', err);
    }
  };

  const loadPoolWinnersCount = async () => {
    try {
      if (dataLoading && !currentUser) return;
      const { count } = await supabase
        .from('pool_bets')
        .select(`
          *,
          match_pools!inner(club_slug)
        `, { count: 'exact', head: true })
        .eq('is_winner', true)
        .in('match_pools.club_slug', ['cruzeiro', 'atletico-mg']);
      setPoolWinnersCount(count || 0);
    } catch (err) {
      console.error('Erro ao contar ganhadores:', err);
    }
  };

  // Verificar lives de AMBOS os clubes
  const checkActiveLives = async () => {
    try {
      if (dataLoading && !currentUser) return;

      const { data, error } = await supabase
        .from('live_streams')
        .select('id, is_active, club_slug')
        .eq('is_active', true);

      if (!error && data) {
        const cruzLive = data.find(l => l.club_slug === 'cruzeiro');
        const galoLive = data.find(l => l.club_slug === 'atletico-mg');
        
        setHasActiveLiveCruzeiro(!!cruzLive);
        setHasActiveLiveGalo(!!galoLive);
        
        // Usar a primeira live ativa para o socket
        if (cruzLive) {
          setActiveStreamId(cruzLive.id);
        } else if (galoLive) {
          setActiveStreamId(galoLive.id);
        } else {
          setActiveStreamId(null);
        }
      } else {
        setHasActiveLiveCruzeiro(false);
        setHasActiveLiveGalo(false);
        setActiveStreamId(null);
      }
    } catch (err) {
      setHasActiveLiveCruzeiro(false);
      setHasActiveLiveGalo(false);
      setActiveStreamId(null);
    }
  };

  // Buscar bolões ativos de ambos os clubes
  const checkActivePools_both = async () => {
    try {
      if (dataLoading && !currentUser) return;

      // Bolão do Cruzeiro
      const { data: cruzPool } = await supabase
        .from('match_pools')
        .select('*')
        .eq('is_active', true)
        .eq('club_slug', 'cruzeiro')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setActivePoolCruzeiro(cruzPool || null);

      // Bolão do Galo
      const { data: galoPool } = await supabase
        .from('match_pools')
        .select('*')
        .eq('is_active', true)
        .eq('club_slug', 'atletico-mg')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setActivePoolGalo(galoPool || null);
    } catch (err) {
      setActivePoolCruzeiro(null);
      setActivePoolGalo(null);
    }
  };

  // Buscar próximos jogos de AMBOS os clubes
  const loadNextGames = async () => {
    setLoadingGame(true);
    try {
      if (dataLoading && !currentUser) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Próximo jogo do Cruzeiro
      const { data: cruzLive } = await supabase
        .from('match_games')
        .select('*')
        .eq('status', 'live')
        .eq('club_slug', 'cruzeiro')
        .limit(1)
        .maybeSingle();

      if (cruzLive) {
        setNextGameCruzeiro(cruzLive);
      } else {
        const { data: cruzNext } = await supabase
          .from('match_games')
          .select('*')
          .eq('club_slug', 'cruzeiro')
          .neq('status', 'finished')
          .gte('date', today.toISOString())
          .order('date', { ascending: true })
          .limit(1)
          .maybeSingle();
        setNextGameCruzeiro(cruzNext || null);
      }

      // Próximo jogo do Galo
      const { data: galoLive } = await supabase
        .from('match_games')
        .select('*')
        .eq('status', 'live')
        .eq('club_slug', 'atletico-mg')
        .limit(1)
        .maybeSingle();

      if (galoLive) {
        setNextGameGalo(galoLive);
      } else {
        const { data: galoNext } = await supabase
          .from('match_games')
          .select('*')
          .eq('club_slug', 'atletico-mg')
          .neq('status', 'finished')
          .gte('date', today.toISOString())
          .order('date', { ascending: true })
          .limit(1)
          .maybeSingle();
        setNextGameGalo(galoNext || null);
      }
    } catch (err) {
      console.error('Erro ao carregar próximos jogos:', err);
    } finally {
      setLoadingGame(false);
    }
  };

  // Buscar jogos ao vivo para o banner ZK TV
  const loadLiveGames = async () => {
    try {
      const { data } = await supabase
        .from('live_streams')
        .select('*, match_games(*)')
        .eq('is_active', true);
      setLiveGames(data || []);
    } catch {
      setLiveGames([]);
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

  const hasAnyActiveLive = hasActiveLiveCruzeiro || hasActiveLiveGalo;

  const openPoolModal = (pool: any) => {
    setSelectedPool(pool);
    setShowPoolModal(true);
  };

  // Componente de banner de próxima partida
  const NextGameBanner = ({ game, clubName, hasLive }: { game: MatchGame; clubName: string; hasLive: boolean }) => (
    <Link 
      to={`/zk-tv?club=${game.club_slug}`}
      className={`relative group overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl bg-slate-900/40 backdrop-blur-xl flex-1 min-h-[280px] cursor-pointer transition-all duration-500 hover:border-amber-500/30 ${
        hasLive ? 'ring-2 ring-red-600/50 shadow-[0_0_30px_rgba(231,14,14,0.3)] animate-pulse-subtle' : ''
      }`}
    >
      {/* Background Banner Image */}
      {game.banner_url && (
        <>
          <img
            src={game.banner_url}
            alt="Banner do Jogo"
            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-110 opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-950/80 to-slate-800/40"></div>
        </>
      )}

      {/* Dynamic Glow */}
      <div
        className="absolute -top-24 -right-24 w-64 h-64 blur-[120px] opacity-10 group-hover:opacity-30 transition-all duration-700"
        style={{ backgroundColor: getTeamColors(game.opponent).primary }}
      ></div>

      {/* Live Glow Effect & Border */}
      {hasLive && (
        <>
          <div className="absolute inset-0 z-30 pointer-events-none border-[3px] border-red-600 rounded-[2rem] animate-flash-red shadow-[0_0_40px_rgba(239,68,68,0.3)]"></div>
          <div className="absolute inset-0 z-10 bg-red-600/10 animate-pulse pointer-events-none"></div>
        </>
      )}

      <div className="relative z-20 p-5 sm:p-8 flex flex-col items-center justify-center gap-4 h-full">
        <span className={`px-4 py-1.5 rounded-full backdrop-blur-md text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all ${
          hasLive ? 'bg-red-600 animate-pulse shadow-red-500/50' :
          game.status === 'finished' ? 'bg-emerald-600/80 shadow-emerald-500/20' :
          'bg-slate-600/80 shadow-slate-500/20'
        }`}>
          {hasLive ? '🔴 AO VIVO AGORA' :
            game.status === 'finished' ? 'Partida Finalizada' :
            'Próxima Partida'}
        </span>

        {/* Botão Central de Destaque para Live */}
        {hasLive && (
          <button
            onClick={() => navigate('/zk-tv')}
            className="w-full max-w-[200px] py-3 bg-white text-red-600 hover:bg-red-50 rounded-2xl font-black text-sm uppercase tracking-tighter flex items-center justify-center gap-2 shadow-2xl transition-all active:scale-95 group/btn relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-red-600/10 -translate-x-full group-hover/btn:animate-shimmer" />
             <Play className="w-4 h-4 fill-current" />
             ASSISTIR AGORA
          </button>
        )}

        <div className="flex items-center justify-center gap-4 w-full">
          <div className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105">
            <TeamLogo 
              teamName={game.is_home 
                ? (game.club_slug === 'cruzeiro' ? 'Cruzeiro' : 'Atlético-MG') 
                : game.opponent} 
              size="lg" 
              showName={false} 
            />
            <span className="text-[9px] sm:text-xs font-black text-white uppercase tracking-tighter text-center line-clamp-1 max-w-[80px]">
              {game.is_home 
                ? clubName
                : game.opponent}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="text-lg sm:text-xl font-black italic text-white/20">VS</div>
            <div className="h-[1px] w-6 bg-gradient-to-r from-transparent via-white/10 to-transparent mt-1" />
          </div>

          <div className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105">
            <TeamLogo
              teamName={!game.is_home 
                ? (game.club_slug === 'cruzeiro' ? 'Cruzeiro' : 'Atlético-MG') 
                : game.opponent}
              customLogo={!game.is_home ? undefined : game.opponent_logo}
              size="lg"
              showName={false}
            />
            <span className="text-[9px] sm:text-xs font-black text-white uppercase tracking-tighter text-center line-clamp-1 max-w-[80px]">
              {!game.is_home 
                ? clubName
                : game.opponent}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className="text-sm sm:text-base bg-slate-700/60 px-4 py-1.5 rounded-xl border border-slate-500/30 backdrop-blur-md text-slate-200 font-black shadow-xl shadow-black/20">
            {new Date(game.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {new Date(game.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h
          </span>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-950/40 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
            {game.competition?.includes('Serie A') || game.competition?.includes('Série A') ? 'Campeonato Brasileiro - Série A' : game.competition}
          </span>
        </div>
      </div>
    </Link>
  );

  // Componente de card de bolão
  const PoolCard = ({ pool, clubName }: { pool: any; clubName: string }) => (
    <div className="glass-panel p-6 rounded-3xl text-center relative overflow-hidden group hover:bg-white/5 transition-all duration-300 hover:-translate-y-2 border-2 border-emerald-500/30 shadow-2xl shadow-emerald-900/30">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 animate-pulse"></div>
      <div className="w-14 h-14 mx-auto bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 rounded-full flex items-center justify-center mb-3 text-emerald-300 group-hover:scale-110 transition-transform relative mt-2">
        <Target className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-black text-white mb-1 uppercase tracking-tight">Bolão {clubName}</h3>
      <div className="mb-4 flex items-center justify-center gap-3">
        <div className="flex flex-col items-center gap-1">
          <TeamLogo teamName={pool.home_team} customLogo={pool.home_team_logo} size="md" showName={false} />
          <span className="text-[8px] font-black text-white uppercase tracking-tighter truncate max-w-[55px]">{pool.home_team}</span>
        </div>
        <div className="text-xs font-black italic text-slate-700">VS</div>
        <div className="flex flex-col items-center gap-1">
          <TeamLogo teamName={pool.away_team} customLogo={pool.away_team_logo} size="md" showName={false} />
          <span className="text-[8px] font-black text-white uppercase tracking-tighter truncate max-w-[55px]">{pool.away_team}</span>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="bg-gradient-to-br from-emerald-500/15 via-emerald-600/10 to-emerald-700/15 border-2 border-emerald-500/40 rounded-xl p-3 relative overflow-hidden">
          <div className="relative text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <DollarSign className="w-3 h-3 text-emerald-400 animate-pulse" />
              <p className="text-emerald-400 text-[10px] font-black uppercase tracking-wider">Prêmio</p>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-300 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
              R$ {((pool.total_pool_amount || 0) * 0.70 + (pool.accumulated_amount || 0)).toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>
        {(pool.result_home_score !== null && pool.result_away_score !== null) && (
          <div className="bg-slate-500/10 border border-slate-500/30 rounded-xl p-2 mt-2">
            <p className="text-[10px] text-slate-300 font-bold uppercase mb-1">Resultado</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-xl font-black text-slate-200">{pool.result_home_score}</span>
              <span className="text-slate-400 font-black">x</span>
              <span className="text-xl font-black text-slate-200">{pool.result_away_score}</span>
            </div>
          </div>
        )}
      </div>
      <button
        onClick={() => openPoolModal(pool)}
        className="btn bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:via-emerald-400 hover:to-emerald-500 text-white w-full border-0 shadow-xl shadow-emerald-600/30 rounded-xl font-black uppercase tracking-widest text-xs py-3 transform hover:scale-105 transition-all duration-200 relative"
      >
        <span className="relative z-10">Participar Agora</span>
        <span className="absolute inset-0 rounded-xl bg-emerald-400 opacity-20 animate-ping"></span>
      </button>
    </div>
  );


  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <Header />
      <main className="flex-grow w-full relative bg-[#030712] overflow-x-hidden pt-[calc(4rem+env(safe-area-inset-top,0px))]">
        <div className="relative min-h-[90vh] flex flex-col items-center justify-center pb-16">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px]"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          </div>

          <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8"
            >
              <span className="inline-block px-5 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-[0.3em] mb-6 shadow-lg shadow-amber-500/5">
                ⚽ O MAIOR PORTAL DE ESPORTES ⚽
              </span>
              <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black text-white italic tracking-tighter uppercase leading-[0.85] mb-8">
                ZK <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-white to-amber-500 drop-shadow-2xl">TV</span>
              </h1>
              <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-300/70 font-medium leading-relaxed tracking-tight mb-10">
                Acompanhe seu <span className="text-white font-bold">time do coração</span> em tempo real, participe de bolões exclusivos e concorra a prêmios incríveis toda semana!
              </p>

              <div className="flex flex-wrap justify-center gap-3 sm:gap-5">
                {(activePoolCruzeiro || activePoolGalo) && (
                <button
                  onClick={() => {
                    if (activePoolCruzeiro && activePoolGalo) {
                      document.getElementById('bolao-section')?.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      openPoolModal(activePoolCruzeiro || activePoolGalo);
                    }
                  }}
                  className="px-6 sm:px-10 py-3 sm:py-5 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-lg transition-all duration-300 backdrop-blur-md border border-emerald-400/50 flex items-center justify-center gap-2 sm:gap-3 overflow-hidden relative group active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] animate-pulse-subtle"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <Trophy className="w-4 h-4 sm:w-6 sm:h-6 text-white group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                  PARTICIPAR DO BOLÃO
                </button>
                )}
                <Link
                  to="/competicoes"
                  className="px-6 sm:px-10 py-3 sm:py-5 bg-gradient-to-br from-white/10 to-transparent hover:bg-white/15 text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-lg transition-all duration-300 backdrop-blur-md border border-white/10 flex items-center justify-center gap-2 sm:gap-3 overflow-hidden relative group active:scale-95 sm:hidden"
                >
                  <Target className="w-4 h-4 sm:w-6 sm:h-6 text-slate-400 group-hover:scale-110 transition-transform" />
                  VER CLASSIFICAÇÃO
                </Link>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                <a
                  href="https://wa.me/message/K7PI44C5HL7FG1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center justify-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full font-bold uppercase tracking-widest text-sm shadow-lg shadow-green-600/30 transition-all hover:scale-105"
                >
                  <MessageCircle className="w-5 h-5" />
                  CENTRAL DE SUPORTE
                </a>
                <button
                  onClick={() => setShowSocialModal(true)}
                  className="hidden sm:inline-flex items-center justify-center gap-2 px-8 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full font-bold uppercase tracking-widest text-sm backdrop-blur-md transition-all hover:scale-105"
                >
                  <Instagram className="w-5 h-5" />
                  SIGA-NOS NAS REDES
                </button>
              </div>

            </motion.div>
          </div>


          {/* ====== BANNERS DE PRÓXIMA PARTIDA - LADO A LADO ====== */}
          {!loadingGame && (nextGameCruzeiro || nextGameGalo) && (
            <div className="w-full max-w-5xl mx-auto px-4 z-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className={`grid gap-4 ${(nextGameCruzeiro && nextGameGalo) ? 'grid-cols-2 md:grid-cols-2' : 'grid-cols-1 max-w-2xl mx-auto'}`}>
                {nextGameCruzeiro && (
                  <NextGameBanner game={nextGameCruzeiro} clubName="Cruzeiro" hasLive={hasActiveLiveCruzeiro} />
                )}
                {nextGameGalo && (
                  <NextGameBanner game={nextGameGalo} clubName="Atlético-MG" hasLive={hasActiveLiveGalo} />
                )}
              </div>
            </div>
          )}

          {/* ====== BANNER ZK TV ====== */}
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-12">
            <section className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-slate-400 to-emerald-400 rounded-[2.5rem] blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative block rounded-[2.5rem] overflow-hidden border border-white/10 glass-panel shadow-2xl transition-all duration-500 hover:shadow-amber-500/20">
                <div className="absolute inset-0 bg-slate-900/40 opacity-60"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(245,158,11,0.10),transparent)]"></div>

                <div className="relative p-8 sm:p-14 flex flex-col lg:flex-row items-center justify-between gap-10">
                  <div className="flex-1 flex flex-col lg:flex-row items-center gap-8 text-center lg:text-left">
                    <div className="relative">
                      <div className="absolute inset-0 bg-amber-500 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
                      <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-slate-700 to-slate-500 flex items-center justify-center border border-amber-500/30 shadow-xl group-hover:scale-110 transition-transform duration-500">
                        <MonitorPlay className="w-12 h-12 text-amber-400" />
                      </div>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-4">
                        <span className="px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">ZK TV</span>
                        {hasAnyActiveLive && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.15em]">Ao Vivo</span>
                          </div>
                        )}
                      </div>
                      <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 italic tracking-tight uppercase leading-none">
                        ASSISTA TODOS OS <br className="hidden sm:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-white to-amber-400">JOGOS AO VIVO</span>
                      </h2>

                      {/* Se houver jogos ao vivo, mostrar mini-banners */}
                      {liveGames.length > 0 && (
                        <div className="flex flex-wrap gap-3 mt-4 justify-center lg:justify-start">
                          {liveGames.map((live) => (
                            <div key={live.id} className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
                              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                              <span className="text-xs font-black text-white uppercase">
                                {live.club_slug === 'cruzeiro' ? 'Cruzeiro' : 'Galo'} - AO VIVO
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    {hasAnyActiveLive && (
                      <div className="flex flex-col items-center sm:items-end gap-2">
                        <div className="flex -space-x-4 mb-1">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-xs font-bold text-amber-400 shadow-xl overflow-hidden glass-panel">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="viewer" className="w-full h-full object-cover" />
                            </div>
                          ))}
                          <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-amber-600 flex items-center justify-center text-[10px] font-black text-white shadow-xl">
                            {viewerCount > 0 ? (viewerCount >= 1000 ? `+${(viewerCount / 1000).toFixed(1)}k` : viewerCount) : '0'}
                          </div>
                        </div>

                        <div className="flex flex-col items-center sm:items-end">
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full mb-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">
                              {viewerCount > 0 ? `${viewerCount} ONLINE` : 'LIVE ATIVA'}
                            </span>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Pessoas Assistindo</span>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => navigate('/zk-tv')}
                      className="bg-amber-500 text-slate-900 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-amber-400 transition-colors shadow-xl shadow-amber-500/20 active:scale-95 duration-200 w-full"
                    >
                      {hasAnyActiveLive ? 'Entrar na Live' : 'Acessar ZK TV'}
                    </button>
                  </div>
                </div>
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] opacity-20"></div>
              </div>
            </section>
          </div>
        </div>

        {/* Stats / Info Bar */}
        <div className="glass-panel border-y border-white/10 relative z-10 backdrop-blur-xl bg-white/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center text-white">
            <div className="transform hover:scale-105 transition-transform">
              <p className="text-4xl font-black text-amber-400">{activePoolsCount}</p>
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
              <p className="text-4xl font-black text-amber-400">24h</p>
              <p className="text-xs sm:text-sm uppercase tracking-widest opacity-70">Suporte</p>
            </div>
          </div>
        </div>

        {/* Main Content Areas */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
          {/* Cards Grid */}
          <section id="bolao-section" className={`grid grid-cols-1 md:grid-cols-2 ${(activePoolCruzeiro && activePoolGalo) ? 'lg:grid-cols-4' : (activePoolCruzeiro || activePoolGalo) ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-8`}>
            {/* Bolão Cruzeiro */}
            {activePoolCruzeiro && activePoolCruzeiro.is_active && (
              <PoolCard pool={activePoolCruzeiro} clubName="Cruzeiro" />
            )}

            {/* Bolão Galo */}
            {activePoolGalo && activePoolGalo.is_active && (
              <PoolCard pool={activePoolGalo} clubName="Galo" />
            )}

            {/* Card: ESCALAÇÃO */}
            <div className="glass-panel p-8 rounded-3xl text-center relative overflow-hidden group hover:bg-white/5 transition-all duration-300 hover:-translate-y-2 border border-slate-500/20">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-400 to-slate-600"></div>
              <div className="w-20 h-20 mx-auto bg-slate-500/20 rounded-full flex items-center justify-center mb-6 text-slate-300 group-hover:scale-110 transition-transform group-hover:bg-slate-500/30">
                <Users className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 italic uppercase tracking-tighter">Escale o Time</h3>
              <p className="text-slate-300 mb-8 text-sm leading-relaxed">Monte sua escalação ideal e compartilhe com a torcida.</p>
              <button
                onClick={() => navigate('/escalacao')}
                className="btn btn-primary w-full bg-slate-700 hover:bg-slate-600 border-none rounded-xl font-black uppercase tracking-widest text-xs py-4 shadow-lg shadow-slate-700/20"
              >
                MONTAR TIME
              </button>
            </div>

            {/* Card: GANHADORES */}
            <div className="glass-panel p-8 rounded-3xl text-center relative overflow-hidden group hover:bg-white/5 transition-all duration-300 hover:-translate-y-2">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600"></div>
              <div className="w-20 h-20 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center mb-6 text-amber-400 group-hover:scale-110 transition-transform group-hover:bg-amber-500/30">
                <Trophy className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Hall da Fama</h3>
              <p className="text-slate-300 mb-8 text-sm leading-relaxed">Veja quem já faturou prêmios incríveis.</p>
              <button
                onClick={() => navigate('/winners')}
                className="btn btn-outline w-full border-amber-400/30 hover:bg-amber-500/20 text-amber-400 hover:text-white rounded-xl py-4"
              >
                VER GANHADORES
              </button>
            </div>
          </section>


          {/* Banners de Patrocinadores */}
          <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
            <AdvertisementCarousel position="homepage" autoPlay={true} autoPlayInterval={5000} />
          </section>
        </div>

        {/* Pool Bet Modal */}
        {selectedPool && (
          <PoolBetModal
            isOpen={showPoolModal}
            onClose={() => { setShowPoolModal(false); setSelectedPool(null); }}
            poolId={selectedPool?.id || ""}
            matchTitle={selectedPool?.match_title || ""}
            homeTeam={selectedPool?.home_team || ""}
            awayTeam={selectedPool?.away_team || ""}
            homeLogo={selectedPool?.home_team_logo || ""}
            awayLogo={selectedPool?.away_team_logo || ""}
            accumulatedAmount={selectedPool?.accumulated_amount || 0}
            totalPoolAmount={selectedPool?.total_pool_amount || 0}
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
      <Footer />
    </div>
  );
}

export default HomePage;
