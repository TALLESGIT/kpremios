import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import {
    Tv,
    Calendar,
    Activity,
    Shield,
    Play,
    Clock,
    MapPin,
    Zap,
    Maximize2,
    Minimize2
} from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import ZKViewer from '../components/ZKViewer';
import MobileLiveControls from '../components/live/MobileLiveControls';
import { CruzeiroSettings, CruzeiroGame, CruzeiroStanding } from '../types';

interface LiveStream {
    id: string;
    title: string;
    channel_name: string;
    is_active: boolean;
}

interface QuickStats {
    victories: number;
    goalsFor: number;
    winRate: number;
    topScorer: string;
}

const ZkTVPage: React.FC = () => {
    const [settings, setSettings] = useState<CruzeiroSettings | null>(null);
    const [games, setGames] = useState<CruzeiroGame[]>([]);
    const [standings, setStandings] = useState<CruzeiroStanding[]>([]);
    const [activeStream, setActiveStream] = useState<LiveStream | null>(null);
    const [quickStats, setQuickStats] = useState<QuickStats>({
        victories: 0,
        goalsFor: 0,
        winRate: 0,
        topScorer: 'N/A'
    });
    const [activeTab, setActiveTab] = useState<'games' | 'standings' | 'stats'>('games');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isLandscape, setIsLandscape] = useState(false);
    const [videoFitMode, setVideoFitMode] = useState<'contain' | 'cover'>('contain');
    const videoContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
        loadActiveStream();
        
        // Detectar mobile
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);

        // Detectar orientação
        const checkOrientation = () => {
            const landscape = window.innerWidth > window.innerHeight;
            setIsLandscape(landscape);
            
            // Auto fullscreen no mobile quando girar para paisagem
            if (isMobile && landscape && !isFullscreen && videoContainerRef.current && (activeStream?.is_active || settings?.is_live)) {
                videoContainerRef.current.requestFullscreen().catch(e => {
                    console.warn('Auto-fullscreen bloqueado:', e);
                });
            }
        };
        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        // Listener para fullscreen
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        
        // Subscribe to changes
        const settingsSub = supabase
            .channel('zk-tv-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cruzeiro_settings' }, () => loadSettings())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, () => loadActiveStream())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cruzeiro_games' }, () => {
                loadData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cruzeiro_standings' }, () => {
                loadData();
            })
            .subscribe();

        return () => {
            settingsSub.unsubscribe();
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [isMobile, isFullscreen, activeStream, settings]);

    // Handler para duplo clique - tela cheia
    const handleDoubleClick = () => {
        if (!videoContainerRef.current) return;
        if (isFullscreen) {
            document.exitFullscreen();
        } else {
            videoContainerRef.current.requestFullscreen();
        }
    };

    // Handler para fullscreen
    const handleFullscreen = () => {
        if (!videoContainerRef.current) return;
        if (isFullscreen) {
            document.exitFullscreen();
        } else {
            videoContainerRef.current.requestFullscreen();
        }
    };

    // Recalcular estatísticas quando games ou standings mudarem
    useEffect(() => {
        if (games.length > 0 || standings.length > 0) {
            loadQuickStats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [games.length, standings.length]);

    const loadSettings = async () => {
        const { data } = await supabase.from('cruzeiro_settings').select('*').single();
        if (data) setSettings(data);
    };

    const loadActiveStream = async () => {
        try {
            const { data, error } = await supabase
                .from('live_streams')
                .select('id, title, channel_name, is_active')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!error && data) {
                setActiveStream(data);
            } else {
                setActiveStream(null);
            }
        } catch (err) {
            console.error('Erro ao carregar live ativa:', err);
            setActiveStream(null);
        }
    };

    const loadQuickStats = async () => {
        try {
            // Usar jogos já carregados
            const finishedGames = games.filter(g => g.status === 'finished');
            
            // Se não há jogos carregados ainda, buscar do banco
            if (finishedGames.length === 0 && games.length === 0) {
                const { data: gamesData } = await supabase
                    .from('cruzeiro_games')
                    .select('*')
                    .eq('status', 'finished');
                
                if (!gamesData || gamesData.length === 0) {
                    setQuickStats({ victories: 0, goalsFor: 0, winRate: 0, topScorer: 'N/A' });
                    return;
                }
                
                // Calcular com dados do banco
                const victories = gamesData.filter(game => {
                    if (game.is_home) {
                        return game.score_home && game.score_away && game.score_home > game.score_away;
                    } else {
                        return game.score_home && game.score_away && game.score_away > game.score_home;
                    }
                }).length;

                const goalsFor = gamesData.reduce((total, game) => {
                    if (game.is_home && game.score_home) {
                        return total + game.score_home;
                    } else if (!game.is_home && game.score_away) {
                        return total + game.score_away;
                    }
                    return total;
                }, 0);

                const { data: standingsData } = await supabase
                    .from('cruzeiro_standings')
                    .select('*')
                    .eq('is_cruzeiro', true)
                    .maybeSingle();

                let winRate = 0;
                if (standingsData && standingsData.played > 0) {
                    winRate = Math.round((standingsData.points / (standingsData.played * 3)) * 100);
                } else if (gamesData.length > 0) {
                    const draws = gamesData.filter(g => {
                        if (g.is_home) return g.score_home === g.score_away;
                        return g.score_away === g.score_home;
                    }).length;
                    const totalPoints = victories * 3 + draws;
                    winRate = Math.round((totalPoints / (gamesData.length * 3)) * 100);
                }

                setQuickStats({
                    victories,
                    goalsFor,
                    winRate,
                    topScorer: 'Matheus P.'
                });
                return;
            }

            // Calcular com dados já carregados
            const victories = finishedGames.filter(game => {
                if (game.is_home) {
                    return game.score_home && game.score_away && game.score_home > game.score_away;
                } else {
                    return game.score_home && game.score_away && game.score_away > game.score_home;
                }
            }).length;

            const goalsFor = finishedGames.reduce((total, game) => {
                if (game.is_home && game.score_home) {
                    return total + game.score_home;
                } else if (!game.is_home && game.score_away) {
                    return total + game.score_away;
                }
                return total;
            }, 0);

            const cruzeiroStanding = standings.find(s => s.is_cruzeiro);
            let winRate = 0;
            if (cruzeiroStanding && cruzeiroStanding.played > 0) {
                winRate = Math.round((cruzeiroStanding.points / (cruzeiroStanding.played * 3)) * 100);
            } else if (finishedGames.length > 0) {
                const draws = finishedGames.filter(g => {
                    if (g.is_home) return g.score_home === g.score_away;
                    return g.score_away === g.score_home;
                }).length;
                const totalPoints = victories * 3 + draws;
                winRate = Math.round((totalPoints / (finishedGames.length * 3)) * 100);
            }

            setQuickStats({
                victories,
                goalsFor,
                winRate,
                topScorer: 'Matheus P.'
            });
        } catch (err) {
            console.error('Erro ao carregar estatísticas:', err);
        }
    };

    const loadData = async () => {
        try {
            const [settingsRes, gamesRes, standingsRes] = await Promise.all([
                supabase.from('cruzeiro_settings').select('*').single(),
                supabase.from('cruzeiro_games').select('*').order('date', { ascending: true }),
                supabase.from('cruzeiro_standings').select('*').order('position', { ascending: true })
            ]);

            if (settingsRes.data) setSettings(settingsRes.data);
            if (gamesRes.data) setGames(gamesRes.data);
            if (standingsRes.data) setStandings(standingsRes.data);
            
            // Recalcular stats após carregar todos os dados
            setTimeout(() => loadQuickStats(), 200);
        } catch (error) {
            console.error('Error loading Cruzeiro data:', error);
        }
    };

    const nextGame = games.find(g => new Date(g.date) > new Date() || g.status === 'live');
    const recentGames = games.filter(g => new Date(g.date) <= new Date() && g.status === 'finished').reverse().slice(0, 3);
    const upcomingGames = games.filter(g => new Date(g.date) > new Date()).slice(0, 5);

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
            <Header />

            {/* Hero Section / Live Stream */}
            <section className="relative pt-24 pb-12 overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-full bg-blue-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-12">
                        <div className="flex-1 text-center lg:text-left">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-bold mb-6"
                            >
                                <Tv className="w-4 h-4" />
                                ZK TV
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-5xl md:text-7xl font-black tracking-tight mb-6"
                            >
                                ZK <span className="text-blue-500">TV</span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto lg:mx-0 mb-8 leading-relaxed"
                            >
                                Acompanhe tudo sobre o Maior de Minas. Transmissões ao vivo, estatísticas,
                                próximos jogos e muito mais em um só lugar.
                            </motion.p>

                            {(settings?.is_live || activeStream?.is_active) && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center gap-4 justify-center lg:justify-start"
                                >
                                    <div className="flex items-center gap-2 px-6 py-3 bg-red-600 rounded-full font-bold animate-pulse shadow-lg shadow-red-600/20">
                                        <Activity className="w-4 h-4" />
                                        AO VIVO AGORA
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        <motion.div
                            ref={videoContainerRef}
                            onDoubleClick={handleDoubleClick}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`w-full lg:w-[600px] aspect-video bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative cursor-pointer transition-all duration-500 ${
                                isFullscreen ? 'rounded-none fixed inset-0 z-[100] w-screen h-screen' : ''
                            }`}
                            title={isMobile ? "Toque duas vezes para tela cheia" : "Duplo clique para tela cheia"}
                        >
                            <div className="relative w-full h-full">
                                {(activeStream?.is_active || settings?.is_live) ? (
                                    activeStream ? (
                                        <ZKViewer 
                                            channel={activeStream.channel_name} 
                                            fitMode={videoFitMode} 
                                            enabled={true} 
                                        />
                                    ) : settings?.live_url && settings.live_url.includes('/live/') ? (
                                        <ZKViewer channel="ZkPremios" fitMode={videoFitMode} enabled={true} />
                                    ) : settings?.live_url ? (
                                        <iframe
                                            src={settings.live_url}
                                            className="w-full h-full border-0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm p-12 text-center">
                                            <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 border border-slate-700">
                                                <Play className="w-8 h-8 text-slate-600" />
                                            </div>
                                            <h3 className="text-xl font-bold mb-2 text-slate-400">Aguardando Transmissão</h3>
                                            <p className="text-slate-500 text-sm">A live será exibida aqui em breve...</p>
                                        </div>
                                    )
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm p-12 text-center">
                                        <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 border border-slate-700">
                                            <Play className="w-8 h-8 text-slate-600" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-2 text-slate-400">Transmissão Off-line</h3>
                                        <p className="text-slate-500 text-sm">Nenhuma live ativa no momento. Fique atento às nossas notificações!</p>
                                    </div>
                                )}

                                {/* Controles Mobile e Desktop */}
                                {(activeStream?.is_active || settings?.is_live) && (
                                    <>
                                        {/* Botão Fullscreen Desktop */}
                                        {!isMobile && (
                                            <button
                                                onClick={handleFullscreen}
                                                className="absolute bottom-4 right-4 p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl border border-white/10 transition-all z-10 group"
                                                title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                                            >
                                                {isFullscreen ? (
                                                    <Minimize2 className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                                                ) : (
                                                    <Maximize2 className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                                                )}
                                            </button>
                                        )}

                                        {/* Controles Mobile */}
                                        {isMobile && (
                                            <MobileLiveControls
                                                isActive={activeStream?.is_active || settings?.is_live || false}
                                                isFullscreen={isFullscreen}
                                                onFullscreen={handleFullscreen}
                                                onRotate={() => setIsLandscape(!isLandscape)}
                                                onToggleFit={() => setVideoFitMode(p => p === 'contain' ? 'cover' : 'contain')}
                                                fitMode={videoFitMode}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Content Section */}
            <section className="py-12 relative">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Main Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Sidebar: Next Match & Stats */}
                        <div className="lg:col-span-1 space-y-8">
                            {/* Next Match Card */}
                            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-8 rounded-[2rem] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Shield className="w-32 h-32 text-blue-500" />
                                </div>

                                <h3 className="text-sm font-bold text-blue-500 uppercase tracking-widest mb-8">Próximo Jogo</h3>

                                {nextGame ? (
                                    <>
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="text-center flex-1">
                                                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-600/20 font-black text-white">CRU</div>
                                                <span className="text-sm font-bold block">Cruzeiro</span>
                                            </div>
                                            <div className="px-4 text-2xl font-black italic text-slate-700">VS</div>
                                            <div className="text-center flex-1">
                                                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-700 font-black text-slate-400">
                                                    {nextGame.opponent.substring(0, 3).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-bold block">{nextGame.opponent}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-6 border-t border-slate-800/50">
                                            <div className="flex items-center gap-3 text-slate-300">
                                                <Calendar className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm">{new Date(nextGame.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-slate-300">
                                                <Clock className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm">{new Date(nextGame.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-slate-300">
                                                <MapPin className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm">{nextGame.venue}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-slate-500 text-center py-8">Aguardando calendário...</p>
                                )}
                            </div>

                            {/* Quick Stats */}
                            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2rem] shadow-xl shadow-blue-600/10">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Estatísticas Rápidas</h3>
                                    <Activity className="w-5 h-5 text-blue-200" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                        <span className="block text-blue-200 text-xs font-bold uppercase mb-1">Vitórias</span>
                                        <span className="text-2xl font-black text-white">{quickStats.victories}</span>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                        <span className="block text-blue-200 text-xs font-bold uppercase mb-1">Gols Pró</span>
                                        <span className="text-2xl font-black text-white">{quickStats.goalsFor}</span>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                        <span className="block text-blue-200 text-xs font-bold uppercase mb-1">Aproveit.</span>
                                        <span className="text-2xl font-black text-white">{quickStats.winRate}%</span>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                        <span className="block text-blue-200 text-xs font-bold uppercase mb-1">Artilheiro</span>
                                        <span className="text-sm font-black text-white">{quickStats.topScorer}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content: Tabs & Tables */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Tab Selector */}
                            <div className="flex gap-4 p-1 bg-slate-900 border border-slate-800 rounded-2xl w-fit">
                                <button
                                    onClick={() => setActiveTab('games')}
                                    className={`px-8 py-3 rounded-xl font-bold transition-all ${activeTab === 'games' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    Jogos
                                </button>
                                <button
                                    onClick={() => setActiveTab('standings')}
                                    className={`px-8 py-3 rounded-xl font-bold transition-all ${activeTab === 'standings' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    Tabela
                                </button>
                            </div>

                            {/* Tab Panels */}
                            <div className="bg-slate-900/20 rounded-[2rem] border border-slate-800/50 overflow-hidden">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'games' && (
                                        <motion.div
                                            key="games"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="p-8 space-y-8"
                                        >
                                            <div className="space-y-4">
                                                <h4 className="text-lg font-bold flex items-center gap-2">
                                                    <Clock className="w-5 h-5 text-blue-500" />
                                                    Próximos Confrontos
                                                </h4>
                                                <div className="grid gap-4">
                                                    {upcomingGames.map(game => (
                                                        <div key={game.id} className="flex items-center justify-between p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-blue-500/30 transition-all group">
                                                            <div className="flex items-center gap-6">
                                                                <div className="text-xs font-black text-slate-500 rotate-180 [writing-mode:vertical-lr]">
                                                                    {new Date(game.date).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-bold text-blue-500 mb-1">{game.competition}</div>
                                                                    <div className="text-xl font-black">Cruzeiro <span className="text-slate-600 mx-2">VS</span> {game.opponent}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm font-bold text-slate-300">{new Date(game.date).toLocaleDateString('pt-BR')}</div>
                                                                <div className="text-xs text-slate-500">{game.venue}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {upcomingGames.length === 0 && <p className="text-slate-500 text-center py-12">Nenhum jogo futuro cadastrado.</p>}
                                                </div>
                                            </div>

                                            <div className="space-y-4 opacity-50">
                                                <h4 className="text-lg font-bold">Últimos Resultados</h4>
                                                <div className="grid gap-4">
                                                    {recentGames.map(game => (
                                                        <div key={game.id} className="flex items-center justify-between p-6 bg-slate-950 border border-slate-900 rounded-2xl">
                                                            <div className="flex items-center gap-4">
                                                                <Zap className="w-4 h-4 text-yellow-500" />
                                                                <span className="text-sm font-bold">{game.opponent}</span>
                                                            </div>
                                                            <div className="flex items-center gap-4 font-black">
                                                                <div className="px-3 py-1 bg-slate-900 rounded-lg">{game.score_home}</div>
                                                                <span className="text-slate-700">-</span>
                                                                <div className="px-3 py-1 bg-slate-900 rounded-lg">{game.score_away}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {activeTab === 'standings' && (
                                        <motion.div
                                            key="standings"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                        >
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="border-b border-slate-800 bg-slate-900/50">
                                                            <th className="px-8 py-5 text-sm font-bold text-slate-400">POS</th>
                                                            <th className="px-8 py-5 text-sm font-bold text-slate-400">TIME</th>
                                                            <th className="px-8 py-5 text-sm font-bold text-slate-400 text-center">PTS</th>
                                                            <th className="px-8 py-5 text-sm font-bold text-slate-400 text-center">PJ</th>
                                                            <th className="px-8 py-5 text-sm font-bold text-slate-400 text-center">V</th>
                                                            <th className="px-8 py-5 text-sm font-bold text-slate-400 text-center">SG</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800/50">
                                                        {standings.map((team) => (
                                                            <tr key={team.id} className={`${team.is_cruzeiro ? 'bg-blue-600/10 border-l-4 border-l-blue-500' : ''} hover:bg-slate-800/30 transition-colors`}>
                                                                <td className="px-8 py-5 font-black text-slate-500">{team.position}º</td>
                                                                <td className="px-8 py-5 font-bold flex items-center gap-3">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] ${team.is_cruzeiro ? 'bg-blue-600' : 'bg-slate-800'}`}>
                                                                        {team.is_cruzeiro ? 'CRU' : team.team.substring(0, 3).toUpperCase()}
                                                                    </div>
                                                                    {team.team}
                                                                </td>
                                                                <td className="px-8 py-5 text-center font-black text-white">{team.points}</td>
                                                                <td className="px-8 py-5 text-center text-slate-400">{team.played}</td>
                                                                <td className="px-8 py-5 text-center text-slate-400">{team.won}</td>
                                                                <td className="px-8 py-5 text-center text-slate-400">{team.goals_for - team.goals_against}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default ZkTVPage;
