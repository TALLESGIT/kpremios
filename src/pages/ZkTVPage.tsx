import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    Minimize2,
    Eye,
    MessageSquare,
    X,
    Crown,
    Target,
    Bell
} from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { LiveViewer } from '../components/LiveViewer';
import MobileLiveControls from '../components/live/MobileLiveControls';
import LiveChat from '../components/live/LiveChat';
import VipMessageOverlay from '../components/live/VipMessageOverlay';
import VipSubscriptionModal from '../components/vip/VipSubscriptionModal';
import PoolBetModal from '../components/pool/PoolBetModal';
import { CruzeiroSettings, CruzeiroGame, CruzeiroStanding } from '../types';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { updateLiveTitle } from '../services/liveTitleService';

interface LiveStream {
    id: string;
    title: string;
    channel_name: string;
    is_active: boolean;
    viewer_count?: number;
}

interface QuickStats {
    victories: number;
    goalsFor: number;
    winRate: number;
    topScorer: string;
}

const ZkTVPage: React.FC = () => {
    const { user } = useAuth();
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
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isDockedChat, setIsDockedChat] = useState(false);
    const [currentViewerCount, setCurrentViewerCount] = useState(0);
    const trackViewerExecutedRef = useRef(false);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const activeStreamRef = useRef<LiveStream | null>(null);

    // Novos estados para VIP e Bolão
    const [isVip, setIsVip] = useState(false);
    const [showVipModal, setShowVipModal] = useState(false);
    const [showPoolModal, setShowPoolModal] = useState(false);
    const [activePool, setActivePool] = useState<any>(null);

    const [sessionId] = useState(() => {
        const key = `zk_tv_session`;
        const saved = localStorage.getItem(key);
        if (saved) return saved;
        const newId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(key, newId);
        return newId;
    });

    // Função para atualizar contador de viewers
    const updateViewerCount = useCallback(async (streamId: string) => {
        try {
            const { data: countData, error } = await supabase.rpc(
                'count_active_unique_viewers',
                { p_stream_id: streamId }
            );

            if (error) {
                console.error('❌ Erro ao contar viewers:', error);
                return;
            }

            const activeCount = Number(countData) || 0;
            setCurrentViewerCount(activeCount);

            // Atualizar na tabela
            await supabase
                .from('live_streams')
                .update({ viewer_count: activeCount })
                .eq('id', streamId);
        } catch (e) {
            console.error('❌ Erro ao atualizar viewer_count:', e);
        }
    }, []);

    // Função para criar/atualizar viewer session
    const trackViewer = useCallback(async (streamId: string) => {
        if (!activeStream) return;

        try {
            const now = new Date().toISOString();

            const { error } = await supabase
                .from('viewer_sessions')
                .upsert({
                    stream_id: streamId,
                    session_id: sessionId,
                    user_id: user?.id || null,
                    is_active: activeStream.is_active,
                    user_agent: navigator.userAgent,
                    last_heartbeat: now,
                    started_at: now
                }, {
                    onConflict: 'session_id,stream_id'
                });

            if (error) {
                const { error: updateError } = await supabase
                    .from('viewer_sessions')
                    .update({
                        is_active: activeStream.is_active,
                        last_heartbeat: now,
                        user_id: user?.id || null,
                        user_agent: navigator.userAgent
                    })
                    .eq('session_id', sessionId)
                    .eq('stream_id', streamId);

                if (updateError) {
                    console.error('❌ Erro ao atualizar viewer_session:', updateError);
                }
            }

            updateViewerCount(streamId);
        } catch (e: any) {
            console.error('❌ Erro geral ao track viewer:', e);
        }
    }, [activeStream, sessionId, user?.id, updateViewerCount]);

    useEffect(() => {
        loadData();
        loadActiveStream();
        checkVipStatus();
        checkActivePool(); // Verificar bolão ao carregar

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

            // Em mobile fullscreen paisagem, ativar chat docked
            if (isMobile && isFullscreen && landscape) {
                setIsDockedChat(true);
            } else if (!isFullscreen || !landscape) {
                setIsDockedChat(false);
            }
        };
        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        // Listener para fullscreen
        const handleFullscreenChange = () => {
            const isFs = !!document.fullscreenElement;
            setIsFullscreen(isFs);
            // Em mobile fullscreen paisagem, ativar chat docked
            if (isMobile && isFs && window.innerWidth > window.innerHeight) {
                setIsDockedChat(true);
            } else if (!isFs) {
                setIsDockedChat(false);
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        // Subscribe to changes
        const settingsSub = supabase
            .channel('zk-tv-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cruzeiro_settings' }, () => loadSettings())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, () => {
                loadActiveStream();
                // Atualizar título quando live stream muda
                loadActiveStream().then(() => {
                    // Recarregar dados para pegar novo título
                    loadData();
                });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cruzeiro_games' }, () => {
                loadData();
                // Quando jogo muda, atualizar título da live se estiver ativa
                if (activeStream?.is_active && activeStream?.id) {
                    updateLiveTitle(activeStream.id, activeStream.channel_name).catch(err => {
                        console.error('Erro ao atualizar título da live:', err);
                    });
                }
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
    }, [isMobile, isFullscreen]);

    // Log quando VipMessageOverlay deve ser renderizado
    useEffect(() => {
        if (activeStream?.is_active && activeStream?.id) {
            console.log('🎬 ZkTVPage: Condições para renderizar VipMessageOverlay:', {
                streamId: activeStream.id,
                isActive: activeStream.is_active,
                channel: activeStream.channel_name
            });
        } else {
            console.log('⚠️ ZkTVPage: VipMessageOverlay NÃO será renderizado:', {
                hasActiveStream: !!activeStream,
                isActive: activeStream?.is_active,
                hasId: !!activeStream?.id
            });
        }
    }, [activeStream]);

    // Verificar status VIP
    const checkVipStatus = async () => {
        if (!user) {
            setIsVip(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('users')
                .select('is_vip')
                .eq('id', user.id)
                .single();

            if (!error && data) {
                setIsVip(data.is_vip || false);
            }
        } catch (error) {
            console.error('Erro ao verificar VIP:', error);
        }
    };

    // Verificar Bolão Ativo
    const checkActivePool = async () => {
        try {
            const { data, error } = await supabase
                .from('match_pools')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!error && data) {
                setActivePool(data);
            } else {
                setActivePool(null);
            }
        } catch (err) {
            console.error('Erro ao verificar bolão:', err);
        }
    };

    // Subscribe to pool updates
    useEffect(() => {
        const poolChannel = supabase
            .channel('zktv-pool-updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'match_pools'
            }, () => {
                checkActivePool();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(poolChannel);
        };
    }, []);

    // Atualizar heartbeat periodicamente
    useEffect(() => {
        if (!activeStream?.is_active) return;

        // Executar imediatamente ao montar
        const executeHeartbeat = async () => {
            try {
                // Garantir que a sessão existe primeiro
                if (activeStream?.id) {
                    await trackViewer(activeStream.id);
                    await supabase.rpc('update_viewer_heartbeat', { p_session_id: sessionId });
                    updateViewerCount(activeStream.id);
                }
            } catch (error) {
                console.error('Erro ao atualizar heartbeat:', error);
                // Em caso de erro, tentar criar/atualizar a sessão
                if (activeStream?.id) {
                    await trackViewer(activeStream.id);
                }
            }
        };

        executeHeartbeat();

        // Depois executar a cada 30 segundos
        const heartbeatInterval = setInterval(async () => {
            try {
                if (activeStream?.id) {
                    await trackViewer(activeStream.id);
                    await supabase.rpc('update_viewer_heartbeat', { p_session_id: sessionId });
                    updateViewerCount(activeStream.id);
                }
            } catch (error) {
                console.error('Erro ao atualizar heartbeat:', error);
            }
        }, 30000); // A cada 30 segundos

        return () => clearInterval(heartbeatInterval);
    }, [activeStream?.id, activeStream?.is_active, sessionId, updateViewerCount, trackViewer]);

    // Sincronizar ref com state
    useEffect(() => {
        activeStreamRef.current = activeStream;
    }, [activeStream]);

    // Listener GLOBAL para atualizações na tabela live_streams (Início, Fim, Viewer Count)
    useEffect(() => {
        // Subscrever a qualquer mudança na tabela live_streams
        const channel = supabase.channel('global-streams-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'live_streams'
            }, (payload) => {
                console.log('📡 ZkTVPage: Mudança detectada na tabela live_streams:', payload);

                // Otimização: Se for o stream atual sendo encerrado, atualizar UI imediatamente
                const currentStream = activeStreamRef.current;

                // DETECÇÃO DE START DE LIVE (INSERT ou UPDATE para active=true)
                const newVal = payload.new as LiveStream;
                if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && newVal.is_active) {
                    // Se não tem stream atual, ou é um stream NOVO, ou o atual foi reativado
                    // Use optional chaining just in case
                    if (!currentStream?.is_active || currentStream.id !== newVal.id) {
                        console.log('⚡ Live iniciada/reativada! Conectando imediatamente...', newVal);
                        setActiveStream(newVal);
                    }
                }

                if (payload.eventType === 'UPDATE' && currentStream?.id === payload.new.id) {
                    // Reusing newVal declaration is fine if scopes are correct, but I declared it above.
                    // const newVal = payload.new as LiveStream; -> Remove this redeclaration in target?
                    // Wait, I am rewriting the block. I can structure it cleanly.

                    if (!newVal.is_active && currentStream && currentStream.is_active) {
                        console.log('🛑 Live encerrada! Desconectando imediatamente...');
                        setActiveStream(prev => prev ? { ...prev, is_active: false } : null);
                        setIsChatOpen(false);
                        toast.error('A transmissão foi encerrada.');

                        // Atualizar sessão (opcional, pois loadActiveStream fará isso eventualmente, mas aqui é instantâneo)
                        if (sessionId && currentStream.id) {
                            supabase.from('viewer_sessions')
                                .update({ is_active: false, ended_at: new Date().toISOString() })
                                .eq('session_id', sessionId)
                                .eq('stream_id', currentStream.id)
                                .then();
                        }
                    } else if (newVal.viewer_count !== undefined) {
                        setCurrentViewerCount(newVal.viewer_count);
                    }
                }

                // Recarregar qual é a stream ativa (pega a mais recente)
                loadActiveStream();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId]); // Removida dependência de activeStream.id para ser verdadeiramente global

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

    // Handler para Picture-in-Picture
    const togglePiP = async () => {
        const video = videoContainerRef.current?.querySelector('video');
        if (video && document.pictureInPictureEnabled) {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    await video.requestPictureInPicture();
                }
            } catch (err) {
                console.error('Erro ao alternar PiP:', err);
                toast.error('Recurso não suportado neste navegador');
            }
        } else {
            toast('Para transmitir, use o menu do seu navegador (Cast/Transmitir).', { icon: '📺' });
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
            // Primeiro, tentar buscar stream ativa
            let { data, error } = await supabase
                .from('live_streams')
                .select('id, title, channel_name, is_active, viewer_count')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            // Se não encontrar stream ativa, buscar a stream zktv (mesmo que inativa)
            if (!data || error) {
                console.log('⚠️ Nenhuma stream ativa encontrada, buscando stream zktv...');
                const { data: zktvData, error: zktvError } = await supabase
                    .from('live_streams')
                    .select('id, title, channel_name, is_active, viewer_count')
                    .eq('channel_name', 'zktv')
                    .maybeSingle();

                if (!zktvError && zktvData) {
                    data = zktvData;
                    error = null;
                    console.log('✅ Stream zktv encontrada:', zktvData);
                }
            }

            if (!error && data) {
                setActiveStream(data);
                setCurrentViewerCount(data.viewer_count || 0);
                // Sempre rastrear quando a stream estiver ativa
                if (data.is_active) {
                    trackViewer(data.id);
                    if (!trackViewerExecutedRef.current) {
                        trackViewerExecutedRef.current = true;
                    }
                }
            } else {
                setActiveStream(null);
                setCurrentViewerCount(0);
                trackViewerExecutedRef.current = false;
            }
        } catch (err) {
            console.error('Erro ao carregar live ativa:', err);
            setActiveStream(null);
            setCurrentViewerCount(0);
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

    // Na página ZK TV, sempre mostrar a live se houver stream zktv
    // Mesmo que is_active = false, tenta mostrar (pode estar transmitindo mas status não sincronizado)
    const isLiveActive = activeStream ? (activeStream.is_active || activeStream.channel_name === 'zktv') : !!settings?.is_live;

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
                                className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-6"
                            >
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-bold">
                                    <Tv className="w-4 h-4" />
                                    ZK TV
                                </div>

                                {/* Botão Assinar VIP (Se não for VIP) */}
                                {!isVip && (
                                    <button
                                        onClick={() => setShowVipModal(true)}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/40 rounded-full text-purple-300 text-sm font-bold transition-all hover:scale-105 active:scale-95"
                                    >
                                        <Crown className="w-4 h-4" />
                                        ASSINAR VIP
                                    </button>
                                )}

                                {/* Botão Bolão (Se houver bolão ativo) */}
                                <button
                                    onClick={() => setShowPoolModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/40 rounded-full text-emerald-400 text-sm font-bold transition-all hover:scale-105 active:scale-95"
                                >
                                    <Target className="w-4 h-4" />
                                    PARTICIPAR DO BOLÃO
                                </button>


                                {/* Botão Notificações WhatsApp */}
                                <a
                                    href="https://whatsapp.com/channel/0029Vb9wQUfCsU9TJrWZcM3L"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-500/30 hover:bg-green-600/40 rounded-full text-green-400 text-sm font-bold transition-all hover:scale-105 active:scale-95"
                                >
                                    <Bell className="w-4 h-4" />
                                    RECEBER NOTIFICAÇÕES
                                </a>
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-5xl md:text-7xl font-black tracking-tight mb-6 uppercase italic"
                            >
                                {activeStream?.is_active ? (
                                    <>
                                        {activeStream.title.split(' x ')[0]}
                                        <span className="text-blue-500">
                                            {activeStream.title.includes(' x ') ? ` x ${activeStream.title.split(' x ')[1]}` : ''}
                                        </span>
                                    </>
                                ) : (
                                    <>ZK <span className="text-blue-500">TV</span></>
                                )}
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto lg:mx-0 mb-8 leading-relaxed"
                            >
                                {activeStream?.is_active
                                    ? `Assista agora: ${activeStream.title}. Acompanhe ao vivo com a melhor qualidade e interatividade.`
                                    : 'Acompanhe tudo sobre o Maior de Minas. Transmissões ao vivo, estatísticas, próximos jogos e muito mais em um só lugar.'
                                }
                            </motion.p>


                        </div>

                        <div
                            ref={videoContainerRef}
                            onDoubleClick={handleDoubleClick}
                            className={`w-full lg:w-[600px] aspect-video bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative cursor-pointer ${isFullscreen ? 'rounded-none fixed inset-0 z-[100] w-screen h-screen' : ''
                                } ${isDockedChat ? 'mobile-video-container docked-chat-active' : ''}`}
                            title={isMobile ? "Toque duas vezes para tela cheia" : "Duplo clique para tela cheia"}
                        >
                            <div className="relative w-full h-full flex">
                                {activeStream ? (
                                    <>
                                        {/* LiveViewer inteligente: escolhe HLS (mobile) ou RTC (desktop) automaticamente */}
                                        {/* showOfflineMessage=false para sempre tentar mostrar o player, mesmo se is_active=false */}
                                        <LiveViewer
                                            channelName={activeStream.channel_name}
                                            fitMode={videoFitMode}
                                            showOfflineMessage={false}
                                        />
                                        {/* Overlay de mensagens VIP na tela - só mostra se realmente ativa */}
                                        {activeStream.is_active && activeStream.id && (
                                            <VipMessageOverlay streamId={activeStream.id} isActive={activeStream.is_active} />
                                        )}

                                        {/* Overlay de Bolão Ativo */}
                                        <AnimatePresence>
                                            {activePool && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                                                    className="absolute top-20 right-4 z-30 max-w-[200px]"
                                                >
                                                    <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-3 rounded-xl shadow-xl shadow-emerald-900/50 border border-white/20 backdrop-blur-md">
                                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                                                            <Target className="w-4 h-4 text-white animate-pulse" />
                                                            <span className="text-xs font-black text-white uppercase tracking-wider">Bolão Ativo</span>
                                                        </div>
                                                        <div className="text-center mb-2">
                                                            <div className="text-[10px] text-white/80 uppercase font-bold mb-1">{activePool.match_title}</div>
                                                            <div className="flex items-center justify-center gap-2 font-black text-white text-sm">
                                                                <span>{activePool.home_team.substring(0, 3).toUpperCase()}</span>
                                                                <span className="text-emerald-300 italic">vs</span>
                                                                <span>{activePool.away_team.substring(0, 3).toUpperCase()}</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowPoolModal(true);
                                                            }}
                                                            className="w-full py-1.5 bg-white text-emerald-700 rounded-lg text-xs font-black uppercase hover:bg-emerald-50 transition-colors shadow-lg"
                                                        >
                                                            Participar
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                ) : (
                                    settings?.live_url && settings.live_url.includes('/live/') ? (
                                        <LiveViewer channelName="zktv" showOfflineMessage={false} />
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
                                )}

                                {/* Status e Viewer Count (Apenas Fullscreen Desktop - NÃO mostrar no mobile) */}
                                {isLiveActive && isFullscreen && !isMobile && (
                                    <div className="absolute top-4 left-4 z-20">
                                        <div className="px-6 py-3 bg-slate-800/80 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                                <span className="text-rose-400 text-xs font-black uppercase">
                                                    {activeStream?.is_active ? 'Ao Vivo' : 'Offline'}
                                                </span>
                                            </div>
                                            <div className="w-[1px] h-4 bg-white/10" />
                                            <div className="flex items-center gap-2">
                                                <Eye className="w-4 h-4 text-slate-400" />
                                                <span className="text-white font-black">
                                                    {activeStream?.is_active
                                                        ? (currentViewerCount || activeStream?.viewer_count || 0)
                                                        : 0
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Controles Mobile e Desktop */}
                                {isLiveActive && (
                                    <>
                                        {/* Botão Chat Desktop */}
                                        {!isMobile && (
                                            <button
                                                onClick={() => setIsChatOpen(!isChatOpen)}
                                                className="absolute bottom-4 left-4 p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl border border-white/10 transition-all z-10 group"
                                                title="Abrir chat"
                                            >
                                                <MessageSquare className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                                            </button>
                                        )}

                                        {/* Botão Fullscreen Desktop */}
                                        {!isMobile && (
                                            <div className="absolute bottom-4 right-4 flex gap-2 z-10">
                                                {/* Botão Picture-in-Picture / Cast Hint */}
                                                <button
                                                    onClick={togglePiP}
                                                    className="p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl border border-white/10 transition-all group"
                                                    title="Mini Player / Transmitir"
                                                >
                                                    <Tv className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                                                </button>

                                                <button
                                                    onClick={handleFullscreen}
                                                    className="p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl border border-white/10 transition-all group"
                                                    title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                                                >
                                                    {isFullscreen ? (
                                                        <Minimize2 className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                                                    ) : (
                                                        <Maximize2 className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        {/* Controles Mobile */}
                                        {isMobile && (
                                            <MobileLiveControls
                                                isActive={isLiveActive}
                                                isFullscreen={isFullscreen}
                                                onFullscreen={handleFullscreen}
                                                onRotate={() => setIsLandscape(!isLandscape)}
                                                onToggleFit={() => setVideoFitMode(p => p === 'contain' ? 'cover' : 'contain')}
                                                fitMode={videoFitMode}
                                                isDocked={isDockedChat}
                                                onPictureInPicture={togglePiP}
                                                isPictureInPicture={!!document.pictureInPictureElement}
                                                onChatToggle={() => {
                                                    if (isFullscreen && isLandscape) {
                                                        setIsDockedChat(!isDockedChat);
                                                    } else {
                                                        setIsChatOpen(!isChatOpen);
                                                    }
                                                }}
                                            />
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Chat Docked (Mobile Fullscreen Landscape) - Aumentado para melhor visualização */}
                            {isMobile && isFullscreen && isLandscape && isDockedChat && activeStream && (
                                <div className="w-[400px] min-w-[350px] max-w-[45vw] h-full bg-black/90 backdrop-blur-md border-l border-white/10 flex flex-col pointer-events-auto shadow-2xl">
                                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                        <span className="text-xs font-black text-white uppercase italic tracking-widest">Chat ao Vivo</span>
                                        <button onClick={() => setIsDockedChat(false)} className="p-1 hover:bg-white/10 rounded transition-colors">
                                            <X className="w-5 h-5 text-white" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-hidden flex flex-col">
                                        {activePool && (
                                            <div className="p-3 bg-emerald-600/20 border-b border-emerald-500/20 flex flex-col gap-2 shrink-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-emerald-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                                                        <Target className="w-3 h-3" />
                                                        Bolão Ativo
                                                    </span>
                                                    <span className="text-white font-bold text-xs truncate max-w-[150px]">{activePool.match_title}</span>
                                                </div>
                                                <button
                                                    onClick={() => setShowPoolModal(true)}
                                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
                                                >
                                                    PARTICIPAR AGORA
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex-1 overflow-hidden">
                                            <LiveChat streamId={activeStream.id} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Chat Overlay (Desktop e Mobile não fullscreen) */}
            {isChatOpen && activeStream && !isDockedChat && (
                <div className="fixed inset-0 md:inset-auto md:right-0 md:top-0 md:bottom-0 md:w-[450px] bg-black/95 backdrop-blur-md border-l border-white/10 z-[9999] flex flex-col shadow-2xl">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <span className="text-sm font-black text-white uppercase italic tracking-widest">Chat da Transmissão</span>
                        <button onClick={() => setIsChatOpen(false)}>
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {activePool && (
                            <div className="p-3 bg-emerald-600/20 border-b border-emerald-500/20 flex flex-col gap-2 shrink-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-emerald-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                                        <Target className="w-3 h-3" />
                                        Bolão Ativo
                                    </span>
                                    <span className="text-white font-bold text-xs truncate max-w-[150px]">{activePool.match_title}</span>
                                </div>
                                <button
                                    onClick={() => setShowPoolModal(true)}
                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
                                >
                                    PARTICIPAR AGORA
                                </button>
                            </div>
                        )}
                        <div className="flex-1 overflow-hidden">
                            <LiveChat streamId={activeStream.id} />
                        </div>
                    </div>
                </div>
            )}

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

            {/* Modals */}
            <VipSubscriptionModal
                isOpen={showVipModal}
                onClose={() => setShowVipModal(false)}
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
        </div>
    );
};

export default ZkTVPage;
