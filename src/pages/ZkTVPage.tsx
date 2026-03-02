import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSocket } from '../hooks/useSocket';
import {
    Tv,
    Calendar,
    Activity,
    Shield,
    Clock,
    MapPin,
    Maximize2,
    Minimize2,
    Play,
    Eye,
    MessageSquare,
    X,
    Crown,
    Target,
    Bell,
    Trophy,
    Zap
} from 'lucide-react';
import { LiveViewer } from '../components/LiveViewer';
import MobileLiveControls from '../components/live/MobileLiveControls';
import { ChatSlot } from '../features/chat/ChatSlot';
import { FloatingChatButton } from '../features/chat/FloatingChatButton';
import { ChatDrawer } from '../features/chat/ChatDrawer';
import PollDisplay from '../components/live/PollDisplay';
import PinnedLinkOverlay from '../components/live/PinnedLinkOverlay';
import VipMessageOverlay from '../components/live/VipMessageOverlay';
import VipSubscriptionModal from '../components/vip/VipSubscriptionModal';
import PoolBetModal from '../components/pool/PoolBetModal';
import { CastButton } from '../components/CastButton';
import TeamLogo from '../components/TeamLogo';
import VipAlertOverlay from '../components/live/VipAlertOverlay';
import { ViewerCountDisplay } from '../components/live/ViewerCountDisplay';
import { CruzeiroSettings, CruzeiroGame, CruzeiroStanding, YouTubeClip } from '../types';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useRegisterStreamId } from '../features/chat/useRegisterStreamId';
import { getTeamColors } from '../utils/teamLogos';
import toast from 'react-hot-toast';
import { getYouTubeId, getYouTubeThumbnail, getYouTubeEmbedUrl } from '../utils/youtube';

interface LiveStream {
    id: string;
    title: string;
    channel_name: string;
    is_active: boolean;
    viewer_count?: number;
    hls_url?: string;
}

interface QuickStats {
    victories: number;
    goalsFor: number;
    winRate: number;
    topScorer: string;
}

const isZkTVDebug = () => (import.meta as any).env?.DEV === true || (import.meta as any).env?.VITE_DEBUG_LIVE === '1';

const ZkTVPage: React.FC = () => {
    const { user } = useAuth();
    const { currentUser } = useData();
    const [searchParams] = useSearchParams();

    // Verificar se o usuário está logado
    const isLoggedIn = !!(user && currentUser);
    // Verificar se é admin
    const isAdmin = currentUser?.is_admin || false;

    // Estados principais
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
    const [activeTab, setActiveTab] = useState<'games' | 'standings' | 'stats' | 'clips'>(() => {
        const tab = searchParams.get('tab');
        if (tab === 'standings' || tab === 'stats' || tab === 'clips') return tab as any;
        return 'games';
    });
    const [clips, setClips] = useState<YouTubeClip[]>([]);
    const [selectedClip, setSelectedClip] = useState<YouTubeClip | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isLandscape, setIsLandscape] = useState(false);
    const [videoFitMode, setVideoFitMode] = useState<'contain' | 'cover'>('contain');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isDockedChat, setIsDockedChat] = useState(false);
    const [currentViewerCount, setCurrentViewerCount] = useState(0);
    const [showControls, setShowControls] = useState(false);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const trackViewerExecutedRef = useRef(false);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const activeStreamRef = useRef<LiveStream | null>(null);

    // Novos estados para VIP e Bolão
    const [isVip, setIsVip] = useState(false);
    const [showVipModal, setShowVipModal] = useState(false);
    const [showPoolModal, setShowPoolModal] = useState(false);
    const [activePool, setActivePool] = useState<any>(null);
    const [lastPoolResult, setLastPoolResult] = useState<any>(null); // Último resultado do bolão

    const [sessionId] = useState(() => {
        const key = `zk_tv_session`;
        const saved = localStorage.getItem(key);
        if (saved) return saved;
        const newId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(key, newId);
        return newId;
    });

    // ✅ REGISTRAR STREAM ID GLOBALMENTE
    // Isso permite que o ChatHost global encontre o streamId desta página
    useRegisterStreamId(activeStream?.id);

    // ✅ MIGRAÇÃO: Usar Socket.io para atualizações de bolões quando houver stream ativa
    const { isConnected, on, off, joinStream, leaveStream } = useSocket({
        streamId: activeStream?.id || undefined,
        autoConnect: !!activeStream?.id && activeStream?.is_active
    });

    // Função para atualizar contador de viewers (reduzida frequência - deixar backend fazer)
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

            // Não atualizar na tabela - deixar o backend fazer via Socket.io
            // await supabase
            //     .from('live_streams')
            //     .update({ viewer_count: activeCount })
            //     .eq('id', streamId);
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
        loadLastPoolResult(); // Buscar último resultado do bolão

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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cruzeiro_games' }, () => {
                loadData();
                // Título é mantido como o admin definiu (não sobrescrever automaticamente)
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
        if (isZkTVDebug()) {
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
        }
    }, [activeStream]);
    const loadClips = async () => {
        try {
            const { data, error } = await supabase
                .from('youtube_clips')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setClips(data || []);
        } catch (error) {
            console.error('Error loading clips:', error);
        }
    };

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

    // Buscar último resultado do bolão (com resultado preenchido)
    const loadLastPoolResult = async () => {
        try {
            const { data, error } = await supabase
                .from('match_pools')
                .select('*')
                .not('result_home_score', 'is', null)
                .not('result_away_score', 'is', null)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!error && data) {
                setLastPoolResult(data);
            } else {
                setLastPoolResult(null);
            }
        } catch (err) {
            console.error('Erro ao buscar último resultado do bolão:', err);
        }
    };

    // ✅ MIGRAÇÃO: Usar Socket.io para atualizações de bolões quando houver stream ativa
    useEffect(() => {
        if (!activeStream?.id || !isConnected) {
            // Fallback: Usar Realtime se não houver stream ativa
            const poolChannel = supabase
                .channel('zktv-pool-updates')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'match_pools'
                }, (payload) => {
                    if (isZkTVDebug()) console.log('📡 ZkTVPage: Mudança detectada em match_pools (Realtime fallback):', payload.eventType);
                    checkActivePool();
                    loadLastPoolResult();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(poolChannel);
            };
        }

        // Usar Socket.io quando houver stream ativa
        joinStream(activeStream.id);

        const handlePoolUpdate = (data: { eventType: string; pool: any; oldPool: any }) => {
            if (isZkTVDebug()) console.log('📡 ZkTVPage: Mudança em match_pools via Socket.io:', data.eventType, data.pool?.id);

            // Atualizar estado quando bolão muda
            if (data.eventType === 'INSERT' || data.eventType === 'UPDATE') {
                if (data.pool?.is_active) {
                    setActivePool(data.pool);
                } else if (data.pool?.live_stream_id === activeStream.id && !data.pool?.is_active) {
                    // Bolão desativado para esta stream
                    checkActivePool();
                }

                // Atualizar último resultado se tiver resultado
                if (data.pool?.result_home_score !== null && data.pool?.result_away_score !== null) {
                    loadLastPoolResult();
                }
            } else if (data.eventType === 'DELETE') {
                // Bolão deletado
                checkActivePool();
                loadLastPoolResult();
            } else {
                // Fallback: sempre verificar novamente
                checkActivePool();
                loadLastPoolResult();
            }
        };

        // ✅ NOVO: Handler para atualização de contagem de viewers em tempo real
        const handleViewerCountUpdate = (data: { streamId: string; count: number }) => {
            if (data.streamId === activeStream.id) {
                if (isZkTVDebug()) console.log('👥 ZkTVPage: Viewer count atualizado via Socket.io:', data.count);
                setCurrentViewerCount(data.count);
            }
        };

        on('pool-updated', handlePoolUpdate);
        on('viewer-count-updated', handleViewerCountUpdate);

        return () => {
            off('pool-updated', handlePoolUpdate);
            off('viewer-count-updated', handleViewerCountUpdate);
            leaveStream(activeStream.id);
        };
    }, [activeStream?.id, activeStream?.is_active, isConnected, on, off, joinStream, leaveStream]);

    // ✅ OTIMIZAÇÃO: Heartbeat otimizado + randomizado para 400+ viewers
    // Evita chamar trackViewer (upsert pesado) a cada heartbeat
    const heartbeatInitializedRef = useRef(false);
    const heartbeatErrorCountRef = useRef(0);
    useEffect(() => {
        if (!activeStream?.is_active) {
            heartbeatInitializedRef.current = false; // Reset quando stream fica inativa
            return;
        }

        // ✅ Randomizar primeiro heartbeat (0-15s) para distribuir carga inicial
        const initialDelay = Math.floor(Math.random() * 15000); // 0-15 segundos

        const initialTimeout = setTimeout(async () => {
            try {
                if (activeStream?.id) {
                    // ✅ Primeira vez: criar sessão com trackViewer (faz upsert completo)
                    await trackViewer(activeStream.id);
                    heartbeatInitializedRef.current = true;
                    // trackViewer já atualiza last_heartbeat, não precisa do RPC
                }
            } catch (error) {
                console.error('Erro ao inicializar heartbeat:', error);
                heartbeatInitializedRef.current = false;
            }
        }, initialDelay);

        // ✅ Randomizar intervalo (25-35s) para distribuir heartbeats contínuos
        const baseInterval = 30000; // 30 segundos base
        const randomOffset = Math.floor(Math.random() * 10000) - 5000; // -5 a +5 segundos
        const interval = baseInterval + randomOffset;

        const heartbeatInterval = setInterval(async () => {
            try {
                if (activeStream?.id) {
                    // ✅ Depois: usar apenas RPC leve (UPDATE simples, sem SELECT/INSERT)
                    if (heartbeatInitializedRef.current) {
                        const { error } = await supabase.rpc('update_viewer_heartbeat', { p_session_id: sessionId });
                        // Se RPC falhar (sessão não existe), recriar com trackViewer
                        if (error) {
                            // ✅ CORREÇÃO: Ignorar erros de autenticação (400) para não quebrar a live
                            if (error.message?.includes('Invalid login credentials') || error.message?.includes('JWT')) {
                                if (isZkTVDebug()) console.warn('⚠️ Heartbeat: Erro de autenticação ignorado (usuário anônimo)');
                                heartbeatErrorCountRef.current++;
                                // Se muitos erros consecutivos, tentar recriar sessão
                                if (heartbeatErrorCountRef.current > 5) {
                                    if (isZkTVDebug()) console.log('🔄 Muitos erros de heartbeat, tentando recriar sessão...');
                                    heartbeatInitializedRef.current = false;
                                    heartbeatErrorCountRef.current = 0;
                                }
                                return; // Não tentar recriar a cada erro
                            }

                            if (isZkTVDebug()) console.warn('⚠️ Heartbeat RPC falhou, recriando sessão:', error.message);
                            heartbeatInitializedRef.current = false;
                            await trackViewer(activeStream.id);
                            heartbeatInitializedRef.current = true;
                            heartbeatErrorCountRef.current = 0;
                        } else {
                            // Sucesso - reset contador de erros
                            heartbeatErrorCountRef.current = 0;
                        }
                    } else {
                        // Se ainda não inicializado, usar trackViewer
                        await trackViewer(activeStream.id);
                        heartbeatInitializedRef.current = true;
                        heartbeatErrorCountRef.current = 0;
                    }
                }
            } catch (error: any) {
                // ✅ CORREÇÃO: Não quebrar a live por erros de heartbeat
                if (isZkTVDebug()) console.warn('⚠️ Erro no heartbeat (não crítico):', error?.message || error);
                heartbeatErrorCountRef.current++;

                // Apenas recriar sessão se muitos erros consecutivos
                if (heartbeatErrorCountRef.current > 5) {
                    if (isZkTVDebug()) console.log('🔄 Muitos erros de heartbeat, tentando recriar sessão...');
                    heartbeatInitializedRef.current = false;
                    heartbeatErrorCountRef.current = 0;
                }
            }
        }, interval);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(heartbeatInterval);
        };
    }, [activeStream?.id, activeStream?.is_active, sessionId, trackViewer]);

    // Sincronizar ref com state
    useEffect(() => {
        activeStreamRef.current = activeStream;
    }, [activeStream]);

    // Throttle viewer count UI: evita re-render a cada UPDATE de live_streams (reduz travamentos)
    const lastViewerCountUpdateRef = useRef<number>(0);
    const VIEWER_COUNT_THROTTLE_MS = 2000;

    // Listener GLOBAL para atualizações na tabela live_streams (Início, Fim, Viewer Count)
    useEffect(() => {
        const channel = supabase.channel('global-streams-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'live_streams'
            }, (payload) => {
                if (isZkTVDebug()) {
                    console.log('📡 ZkTVPage: Mudança detectada na tabela live_streams:', payload);
                }

                const currentStream = activeStreamRef.current;
                const newVal = payload.new as LiveStream;

                // DETECÇÃO DE START DE LIVE (INSERT ou UPDATE para active=true)
                if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && newVal?.is_active) {
                    if (!currentStream || !currentStream.is_active || currentStream.id !== newVal.id) {
                        if (isZkTVDebug()) console.log('⚡ Live iniciada/reativada! Conectando imediatamente...', newVal);
                        setActiveStream(newVal);
                    }
                }

                // DETECÇÃO DE MUDANÇA NO STREAM ATUAL (UPDATE ou DELETE)
                if (payload.eventType === 'UPDATE' && currentStream && currentStream.id === payload.new.id) {
                    if (!newVal.is_active && currentStream.is_active) {
                        if (isZkTVDebug()) console.log('🛑 Live encerrada! Desconectando imediatamente...');
                        setActiveStream(prev => prev ? { ...prev, is_active: false } : null);
                        setIsChatOpen(false);
                        toast.error('A transmissão foi encerrada.');

                        if (sessionId && currentStream.id) {
                            supabase.from('viewer_sessions')
                                .update({ is_active: false, ended_at: new Date().toISOString() })
                                .eq('session_id', sessionId)
                                .eq('stream_id', currentStream.id)
                                .then();
                        }
                    } else if (newVal.viewer_count !== undefined) {
                        const now = Date.now();
                        if (now - lastViewerCountUpdateRef.current >= VIEWER_COUNT_THROTTLE_MS) {
                            lastViewerCountUpdateRef.current = now;
                            setCurrentViewerCount(newVal.viewer_count);
                        }
                    }
                } else if (payload.eventType === 'DELETE' && currentStream && currentStream.id === payload.old.id) {
                    setActiveStream(null);
                    setCurrentViewerCount(0);
                } else if (payload.eventType === 'INSERT' && !activeStreamRef.current) {
                    loadActiveStream();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId]);
    // Removida dependência de activeStream.id para ser verdadeiramente global

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
            // ✅ OTIMIZAÇÃO: Usar cache do backend Socket.IO (reduz 99% das requisições ao Supabase)
            const { getActiveLiveStreams, getLiveStreamByChannel } = await import('../services/cachedLiveService');

            // Primeiro, tentar buscar stream ativa do cache
            const activeStreams = await getActiveLiveStreams();
            let data = activeStreams.length > 0 ? activeStreams[0] : null;

            // Se não encontrar stream ativa, buscar a stream padrão ZkOficial (mesmo que inativa)
            if (!data) {
                if (isZkTVDebug()) console.log('⚠️ Nenhuma stream ativa encontrada, buscando stream ZkOficial...');
                data = await getLiveStreamByChannel('ZkOficial');

                if (data && isZkTVDebug()) {
                    console.log('✅ Stream ZkOficial encontrada:', data);
                }
            }

            if (data) {
                setActiveStream(data as any);
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

            loadClips();

            if (settingsRes.error) {
                console.error('❌ Erro ao carregar settings:', settingsRes.error);
            }
            if (settingsRes.data) setSettings(settingsRes.data);

            if (gamesRes.error) {
                console.error('❌ Erro ao carregar jogos:', gamesRes.error);
            }
            if (gamesRes.data) {
                if (isZkTVDebug()) console.log('🎮 Jogos carregados do banco:', gamesRes.data.length, gamesRes.data);
                setGames(gamesRes.data);
            } else {
                if (isZkTVDebug()) console.warn('⚠️ Nenhum jogo retornado do banco de dados');
            }

            if (standingsRes.error) {
                console.error('❌ Erro ao carregar standings:', standingsRes.error);
            }
            if (standingsRes.data) setStandings(standingsRes.data);

            // Recalcular stats após carregar todos os dados
            setTimeout(() => loadQuickStats(), 200);
        } catch (error) {
            console.error('❌ Error loading Cruzeiro data:', error);
        }
    };

    const nextGame = games.find(g => {
        if (!g || !g.date) return false;
        const gameDate = new Date(g.date);
        const now = new Date();
        return (gameDate > now || g.status === 'live');
    });

    const recentGames = games.filter(g => {
        if (!g || !g.date) return false;
        const gameDate = new Date(g.date);
        const now = new Date();
        return gameDate <= now && g.status === 'finished';
    }).reverse().slice(0, 3);

    const upcomingGames = games.filter(g => {
        if (!g || !g.date) {
            return false;
        }

        try {
            const gameDate = new Date(g.date);
            const now = new Date();
            const isFuture = gameDate.getTime() > now.getTime();
            const isNotFinished = g.status !== 'finished';

            // Mostrar todos os jogos não finalizados (independente da data)
            // Isso permite que jogos com data passada mas status "upcoming" apareçam
            const shouldShow = isNotFinished;

            // Log apenas se houver jogos mas nenhum passar no filtro
            if (games.length > 0 && isZkTVDebug()) {
                console.log('🔍 Jogo:', g.opponent, '| Data:', g.date, '| É futuro?', isFuture, '| Status:', g.status, '| Mostrar?', shouldShow);
            }

            return shouldShow;
        } catch (error) {
            console.error('❌ Erro ao processar data do jogo:', g, error);
            return false;
        }
    })
        .sort((a, b) => {
            // Ordenar: jogos futuros primeiro, depois por data
            const aDate = new Date(a.date);
            const bDate = new Date(b.date);
            const now = new Date();
            const aIsFuture = aDate > now;
            const bIsFuture = bDate > now;

            if (aIsFuture && !bIsFuture) return -1;
            if (!aIsFuture && bIsFuture) return 1;
            return aDate.getTime() - bDate.getTime();
        })
        .slice(0, 5);

    // Debug: Log dos jogos futuros
    useEffect(() => {
        if (!isZkTVDebug()) return;
        console.log('📅 Próximos jogos filtrados:', upcomingGames.length, upcomingGames);
        console.log('📅 Todos os jogos:', games.length, games);
        if (games.length > 0 && upcomingGames.length === 0) {
            console.warn('⚠️ Há jogos cadastrados mas nenhum foi filtrado como futuro!');
            games.forEach(g => {
                if (g && g.date) {
                    const gameDate = new Date(g.date);
                    const now = new Date();
                    console.log('📊 Jogo:', g.opponent, 'Data:', g.date, 'É futuro?', gameDate > now, 'Status:', g.status);
                }
            });
        }
    }, [upcomingGames, games]);

    // Na página ZK TV, sempre mostrar a live se houver stream ZkOficial
    // Mesmo que is_active = false, tenta mostrar (pode estar transmitindo mas status não sincronizado)
    const isLiveActive = activeStream ? (activeStream.is_active || activeStream.channel_name === 'ZkOficial') : !!settings?.is_live;

    // Função para mostrar controles temporariamente
    const showControlsTemporarily = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        // Esconder controles após 3 segundos de inatividade
        controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
        }, 3000);
    };

    // Cleanup do timeout ao desmontar
    useEffect(() => {
        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, []);

    // 🔍 DEBUG: Log para identificar qual chat está sendo renderizado
    useEffect(() => {
        if (isZkTVDebug()) console.log('🔍 ZkTVPage Chat Rendering State:', {
            isFullscreen,
            isMobile,
            isChatOpen,
            isDockedChat,
            isLandscape,
            isLiveActive,
            hasActiveStream: !!activeStream,
            // Condições de renderização
            shouldRenderDesktopFullscreen: isLiveActive && isFullscreen && !isMobile && isChatOpen && !!activeStream,
            shouldRenderMobileDocked: isMobile && isFullscreen && isLandscape && isDockedChat && !!activeStream,
            shouldRenderOverlay: isChatOpen && !!activeStream && !isDockedChat && !isFullscreen
        });
    }, [isFullscreen, isMobile, isChatOpen, isDockedChat, isLandscape, isLiveActive, activeStream]);

    return (
        <>

            {/* Hero Section / Live Stream */}
            <section className="relative pt-24 sm:pt-28 lg:pt-32 pb-12 sm:pb-16 lg:pb-20 overflow-visible">
                {/* Background Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-full bg-blue-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

                <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center gap-8 sm:gap-10 lg:gap-12">
                        <div className="w-full text-center min-w-0 px-2 sm:px-0 overflow-hidden">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-wrap items-center justify-center gap-3 mb-6"
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
                                className="text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-black tracking-tight mb-6 uppercase italic break-words max-w-full"
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
                                className="text-sm sm:text-base md:text-xl text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed px-4"
                            >
                                {activeStream?.is_active
                                    ? `Assista agora: ${activeStream.title}. Acompanhe ao vivo com a melhor qualidade e interatividade.`
                                    : 'Acompanhe tudo sobre o Maior de Minas. Transmissões ao vivo, estatísticas, próximos jogos e muito mais em um só lugar.'
                                }
                            </motion.p>

                            {/* Removido card duplicado daqui para manter apenas o que está no placeholder do vídeo */}

                        </div>

                        <div
                            ref={videoContainerRef}
                            onDoubleClick={handleDoubleClick}
                            onMouseEnter={() => !isMobile && showControlsTemporarily()}
                            onMouseMove={() => !isMobile && showControlsTemporarily()}
                            onMouseLeave={() => !isMobile && setShowControls(false)}
                            onClick={() => showControlsTemporarily()}
                            onTouchStart={() => isMobile && showControlsTemporarily()}
                            className={`w-full max-w-[680px] lg:max-w-[760px] mx-auto shrink-0 aspect-video bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative cursor-pointer group ${isFullscreen ? 'rounded-none fixed inset-0 z-[100] w-screen h-screen' : ''
                                } ${isDockedChat ? 'mobile-video-container docked-chat-active' : ''}`}
                            title={isMobile ? "Toque duas vezes para tela cheia" : "Duplo clique para tela cheia"}
                        >
                            <div className="relative w-full h-full flex">
                                {activeStream?.is_active ? (
                                    <>
                                        {/* Só renderiza o player quando a transmissão estiver ativa (ZK Studio) */}
                                        <LiveViewer
                                            channelName={activeStream.channel_name}
                                            fitMode={videoFitMode}
                                            showOfflineMessage={false}
                                        />
                                        {activeStream.id && (
                                            <>
                                                <VipMessageOverlay streamId={activeStream.id} isActive={activeStream.is_active} />
                                                {/* VIP Overlay */}
                                                {isLiveActive && (isFullscreen || (isMobile && !isFullscreen)) && (
                                                    <div className={`absolute ${isMobile ? 'bottom-20 left-4' : 'top-4 left-4'} z-20`}>
                                                        <ViewerCountDisplay
                                                            count={currentViewerCount}
                                                            isActive={isLiveActive}
                                                        />
                                                    </div>
                                                )}
                                                <VipAlertOverlay
                                                    streamId={activeStream?.id}
                                                    isAdmin={isAdmin}
                                                />
                                            </>
                                        )}
                                    </>
                                ) : activeStream && !activeStream.is_active ? (
                                    <>
                                        {/* Transmissão encerrada - placeholder sem carregar o player */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center z-30">
                                            <div className="text-center px-6 max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
                                                {/* Icon */}
                                                <div className="mb-8 relative">
                                                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
                                                    <div className="relative text-8xl animate-pulse">📺</div>
                                                </div>

                                                {/* Title */}
                                                <h2 className="text-2xl sm:text-4xl lg:text-6xl font-black text-white mb-4 tracking-tight">
                                                    Transmissão Encerrada
                                                </h2>

                                                {/* Message */}
                                                <p className="text-xs sm:text-lg lg:text-xl text-blue-200 mb-8 leading-relaxed">
                                                    A transmissão ao vivo foi finalizada. 🎬<br />
                                                    Obrigado por assistir! ⚽✨
                                                </p>

                                                {/* CTA */}
                                                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                                    <button
                                                        onClick={() => window.location.reload()}
                                                        className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-600/30 hover:scale-105"
                                                    >
                                                        🔄 Recarregar Página
                                                    </button>
                                                    <a
                                                        href="/"
                                                        className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all border border-white/20"
                                                    >
                                                        🏠 Voltar ao Início
                                                    </a>
                                                </div>

                                                {/* Footer */}
                                                <p className="mt-8 text-sm text-slate-400">
                                                    Fique ligado nas próximas transmissões! 🔔
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    settings?.live_url && settings.live_url.includes('/live/') ? (
                                        <LiveViewer
                                            channelName="ZkOficial"
                                            showOfflineMessage={false}
                                        />
                                    ) : settings?.live_url ? (
                                        <iframe
                                            src={settings.live_url}
                                            className="w-full h-full border-0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6 lg:p-12 text-center overflow-y-auto">
                                            {nextGame ? (
                                                <div className="w-full max-w-lg mx-auto animate-in fade-in zoom-in duration-700 py-4 px-6 rounded-[2.5rem] bg-slate-900/40 border border-white/5 backdrop-blur-xl relative overflow-hidden group">
                                                    {/* Dynamic Background Glow */}
                                                    <div
                                                        className="absolute -top-24 -right-24 w-48 h-48 blur-[100px] opacity-20 transition-all group-hover:opacity-40"
                                                        style={{ backgroundColor: getTeamColors(nextGame.opponent).primary }}
                                                    ></div>

                                                    <div className="relative z-10">
                                                        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-3 py-1 rounded-full text-white text-[10px] font-black uppercase tracking-widest shadow-lg ${nextGame.status === 'live' ? 'bg-red-500 shadow-red-500/20' :
                                                                    nextGame.status === 'finished' ? 'bg-emerald-500 shadow-emerald-500/20' :
                                                                        'bg-blue-500 shadow-blue-500/20'
                                                                    }`}>
                                                                    {nextGame.status === 'live' ? 'Ao Vivo' :
                                                                        nextGame.status === 'finished' ? 'Partida Finalizada' :
                                                                            'Próximo Jogo'}
                                                                </span>
                                                                <div className="w-1 h-1 rounded-full bg-slate-700" />
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{nextGame.competition}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-slate-500">
                                                                <MapPin className="w-3 h-3" />
                                                                <span className="text-[9px] font-bold uppercase">{nextGame.venue}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between gap-4 sm:gap-8 mb-6 sm:mb-10">
                                                            <div className="flex flex-col items-center flex-1">
                                                                <TeamLogo teamName="Cruzeiro" size="xl" />
                                                                <span className="mt-3 text-xs sm:text-sm font-black text-white uppercase tracking-tighter">Cruzeiro</span>
                                                            </div>

                                                            <div className="flex flex-col items-center justify-center">
                                                                <div className="text-3xl sm:text-4xl font-black italic text-slate-800/50 mb-2">VS</div>
                                                                <div className="h-[2px] w-8 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
                                                            </div>

                                                            <div className="flex flex-col items-center flex-1">
                                                                <TeamLogo teamName={nextGame.opponent} size="xl" />
                                                                <span className="mt-3 text-xs sm:text-sm font-black text-white uppercase tracking-tighter text-center line-clamp-1">{nextGame.opponent}</span>
                                                            </div>
                                                        </div>

                                                        <div className="pt-6 border-t border-white/5 flex items-center justify-center gap-8">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Data</span>
                                                                <div className="flex items-center gap-2 text-blue-400 font-black">
                                                                    <Calendar className="w-4 h-4" />
                                                                    <span className="text-sm">{new Date(nextGame.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                                                </div>
                                                            </div>
                                                            <div className="w-[1px] h-8 bg-white/5" />
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Horário</span>
                                                                <div className="flex items-center gap-2 text-blue-400 font-black">
                                                                    <Clock className="w-4 h-4" />
                                                                    <span className="text-sm">{new Date(nextGame.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 border border-slate-700">
                                                        <Play className="w-6 h-6 sm:w-8 sm:h-8 text-slate-600" />
                                                    </div>
                                                    <h3 className="text-lg sm:text-xl font-bold mb-2 text-slate-400">Aguardando calendário...</h3>
                                                    <p className="text-slate-500 text-xs sm:text-sm px-4">A live será exibida aqui em breve...</p>
                                                </>
                                            )}
                                        </div>
                                    )
                                )}

                                {/* Status e Viewer Count removidos daqui pois agora estão unificados no player overlay acima */}



                                {/* Desktop Fullscreen - Sidebar Lateral (Chat + Enquete) - Estilo CazéTV */}
                                {isFullscreen && !isMobile && isChatOpen && activeStream && (
                                    <div className="absolute right-4 top-4 bottom-4 z-50 w-[400px] flex flex-col gap-3 pointer-events-auto">
                                        <div className="flex-[4] min-h-0 bg-black/80 backdrop-blur-md rounded-2xl p-2 border border-white/10 overflow-hidden shadow-2xl">
                                            <ChatSlot id="zktv-desktop-fullscreen-chat" priority={100} className="h-full" />
                                        </div>
                                        <div className="flex-[1] min-h-0 pointer-events-auto bg-black/80 backdrop-blur-md rounded-2xl p-3 space-y-2 overflow-y-auto border border-white/10 custom-scrollbar shadow-2xl">
                                            <PollDisplay streamId={activeStream.id} compact={true} />
                                            <PinnedLinkOverlay streamId={activeStream.id} />
                                        </div>
                                    </div>
                                )}

                                {/* Controles Mobile e Desktop */}
                                {isLiveActive && (
                                    <>
                                        {/* Botão Chat Desktop - Sempre visível em fullscreen */}
                                        {!isMobile && (
                                            <button
                                                onClick={() => setIsChatOpen(!isChatOpen)}
                                                className={`absolute bottom-4 left-4 p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl border border-white/10 transition-all z-10 group ${isFullscreen ? 'opacity-100' : (showControls ? 'opacity-100' : 'opacity-0')
                                                    }`}
                                                title={isChatOpen ? "Fechar chat" : "Abrir chat"}
                                            >
                                                <MessageSquare className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                                            </button>
                                        )}

                                        {/* Botão Fullscreen Desktop */}
                                        {!isMobile && (
                                            <div className={`absolute bottom-4 right-4 flex gap-2 z-10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'
                                                }`}>
                                                {/* Botão Cast (Chromecast/AirPlay) - Aparece automaticamente quando disponível */}
                                                <CastButton
                                                    hlsUrl={activeStream?.hls_url}
                                                    videoUrl={settings?.live_url}
                                                    channelName={activeStream?.channel_name || 'ZkOficial'}
                                                />

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
                                            <>
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
                                                {/* Botão Cast para Mobile - Aparece automaticamente quando há TV disponível */}
                                                <div className={`absolute top-4 right-4 z-10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'
                                                    }`}>
                                                    <CastButton
                                                        hlsUrl={activeStream?.hls_url}
                                                        videoUrl={settings?.live_url}
                                                        channelName={activeStream?.channel_name || 'ZkOficial'}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Chat Docked (Mobile Fullscreen Landscape) - Aumentado para melhor visualização */}
                            {isMobile && isFullscreen && isLandscape && isDockedChat && activeStream && (
                                <div className="w-[400px] min-w-[350px] max-w-[45vw] h-full bg-black/90 backdrop-blur-md border-l border-white/10 flex flex-col pointer-events-auto shadow-2xl">
                                    {/* Header com botão de fechar */}
                                    <div className="p-3 border-b border-white/10 flex items-center justify-between shrink-0">
                                        <span className="text-xs font-black text-white uppercase italic tracking-wider">Chat</span>
                                        <button
                                            onClick={() => setIsDockedChat(false)}
                                            className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
                                        >
                                            <X className="w-4 h-4 text-white" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-hidden flex flex-col">
                                        <div className="flex-1 overflow-hidden">
                                            <ChatSlot id="zktv-mobile-landscape-docked-chat" priority={90} className="h-full" />
                                        </div>
                                        {/* Enquete em destaque no mobile landscape - Estilo CazéTV */}
                                        <div className="px-3 py-2 border-t border-white/10 bg-black/40">
                                            <PollDisplay streamId={activeStream.id} compact={true} />
                                            <PinnedLinkOverlay streamId={activeStream.id} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Chat Overlay (Desktop e Mobile não fullscreen) - NÃO renderizar se estiver em fullscreen */}
            {isChatOpen && activeStream && !isDockedChat && !isFullscreen && (
                <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] bg-black/95 backdrop-blur-md border-l border-white/10 z-[9999] flex flex-col shadow-2xl">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <span className="text-sm font-black text-white uppercase italic tracking-widest">Chat da Transmissão</span>
                        <button onClick={() => setIsChatOpen(false)}>
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="flex-1 min-h-0 h-full">
                            <ChatSlot id="zktv-overlay-chat" priority={80} className="h-full" />
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Chat Button (Mobile Fullscreen) */}
            {/* Em landscape: abre chat docked | Em portrait: abre chat drawer */}
            {isMobile && isFullscreen && activeStream && activeStream.is_active && (
                <>
                    {/* Landscape: botão só aparece se chat docked não estiver aberto */}
                    {isLandscape && !isDockedChat && (
                        <FloatingChatButton onClick={() => setIsDockedChat(true)} />
                    )}
                    {/* Portrait: botão só aparece se chat drawer não estiver aberto */}
                    {!isLandscape && !isChatOpen && (
                        <FloatingChatButton onClick={() => setIsChatOpen(true)} />
                    )}
                </>
            )}

            {/* ChatDrawer (Mobile Fullscreen Portrait) */}
            {isMobile && isFullscreen && !isLandscape && activeStream && (
                <ChatDrawer
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    streamId={activeStream.id}
                    isActive={activeStream.is_active}
                />
            )}

            {/* Content Section */}
            <section className="py-6 sm:py-8 lg:py-12 relative pb-12 sm:pb-16 lg:pb-24">
                <div className="max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Main Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">

                        {/* Sidebar: Next Match & Stats */}
                        <div className="lg:col-span-1 space-y-4 sm:space-y-6 lg:space-y-8">
                            {/* Next Match Card - Escondido no mobile */}
                            <div className="hidden md:block bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-4 sm:p-6 lg:p-8 rounded-[2rem] relative overflow-hidden group pb-6 sm:pb-8">
                                {nextGame && (
                                    <div
                                        className="absolute -top-24 -right-24 w-48 h-48 blur-[100px] opacity-10 transition-all group-hover:opacity-30"
                                        style={{ backgroundColor: getTeamColors(nextGame.opponent).primary }}
                                    ></div>
                                )}

                                <div className="absolute top-0 right-0 p-4 sm:p-6 lg:p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                    <Shield className="w-24 sm:w-32 h-24 sm:h-32 text-blue-500" />
                                </div>

                                <h3 className="text-xs sm:text-sm font-black text-blue-500 uppercase tracking-widest mb-3 sm:mb-4 lg:mb-8 relative z-10 flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    {nextGame?.status === 'live' ? 'Partida Ao Vivo' : nextGame?.status === 'finished' ? 'Partida Finalizada' : 'Próximo Jogo'}
                                </h3>

                                {nextGame ? (
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-2">
                                            <div className="flex flex-col items-center flex-1 min-w-0">
                                                <TeamLogo teamName="Cruzeiro" size="lg" />
                                                <span className="mt-3 text-[10px] font-black text-white uppercase tracking-tighter truncate w-full text-center">Cruzeiro</span>
                                            </div>
                                            <div className="flex flex-col items-center justify-center px-4">
                                                <div className="text-xl font-black italic text-slate-800/80">VS</div>
                                            </div>
                                            <div className="flex flex-col items-center flex-1 min-w-0">
                                                <TeamLogo
                                                    teamName={nextGame.opponent}
                                                    customLogo={nextGame.opponent_logo}
                                                    size="lg"
                                                />
                                                <span className="mt-3 text-[10px] font-black text-white uppercase tracking-tighter truncate w-full text-center">{nextGame.opponent}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-6 border-t border-white/5">
                                            <div className="flex items-center gap-3 text-slate-300">
                                                <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center border border-white/5">
                                                    <Trophy className="w-4 h-4 text-blue-500" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase">Competição</span>
                                                    <span className="text-xs font-bold text-white uppercase tracking-tight">{nextGame.competition}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-slate-300">
                                                <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center border border-white/5">
                                                    <Calendar className="w-4 h-4 text-blue-500" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-white">
                                                        {new Date(nextGame.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {new Date(nextGame.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-slate-300">
                                                <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center border border-white/5">
                                                    <MapPin className="w-4 h-4 text-blue-500" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase">Local</span>
                                                    <span className="text-xs font-bold text-white truncate max-w-[150px]">{nextGame.venue}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* CTA para Escalação */}
                                        <div className="mt-8 pt-6 border-t border-white/5">
                                            <Link
                                                to="/escalacao"
                                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            >
                                                <Trophy className="w-4 h-4" />
                                                Escalar Time Ideal
                                            </Link>
                                            <p className="text-center text-[10px] text-slate-500 mt-3 font-medium">Monte sua tática e compartilhe!</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-slate-500 text-center py-6 sm:py-8 text-xs sm:text-sm">Aguardando calendário...</p>
                                )}
                            </div>

                            {/* Quick Stats */}
                            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-4 sm:p-6 lg:p-8 rounded-[2rem] shadow-xl shadow-blue-600/10">
                                <div className="flex items-center justify-between mb-4 sm:mb-6 lg:mb-8">
                                    <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-widest">Estatísticas Rápidas</h3>
                                    <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200" />
                                </div>

                                <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                                    <div className="bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10">
                                        <span className="block text-blue-200 text-[10px] sm:text-xs font-bold uppercase mb-1">Vitórias</span>
                                        <span className="text-xl sm:text-2xl font-black text-white">{quickStats.victories}</span>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10">
                                        <span className="block text-blue-200 text-[10px] sm:text-xs font-bold uppercase mb-1">Gols Pró</span>
                                        <span className="text-xl sm:text-2xl font-black text-white">{quickStats.goalsFor}</span>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10">
                                        <span className="block text-blue-200 text-[10px] sm:text-xs font-bold uppercase mb-1">Aproveit.</span>
                                        <span className="text-xl sm:text-2xl font-black text-white">{quickStats.winRate}%</span>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10">
                                        <span className="block text-blue-200 text-[10px] sm:text-xs font-bold uppercase mb-1">Artilheiro</span>
                                        <span className="text-xs sm:text-sm font-black text-white break-words">{quickStats.topScorer}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content: Tabs & Tables */}
                        <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
                            {/* Tab Selector */}
                            <div className="flex flex-wrap gap-2 sm:gap-4 p-1 bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl w-full sm:w-fit">
                                {[
                                    { id: 'games', label: 'Jogos' },
                                    { id: 'standings', label: 'Tabela' },
                                    { id: 'stats', label: 'Estatísticas' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex-1 sm:flex-none px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-bold transition-all ${activeTab === tab.id
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Panels */}
                            <div className="bg-slate-900/20 rounded-xl sm:rounded-2xl border border-slate-800/50 overflow-hidden">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'games' && (
                                        <motion.div
                                            key="games"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8"
                                        >
                                            <div className="space-y-3 sm:space-y-4">
                                                <h4 className="text-base sm:text-lg font-bold flex items-center gap-2">
                                                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                                                    Próximos Confrontos
                                                </h4>
                                                <div className="grid gap-3 sm:gap-4">
                                                    {upcomingGames.map(game => {
                                                        const oppColors = getTeamColors(game.opponent);
                                                        return (
                                                            <div key={game.id} className="relative overflow-hidden group">
                                                                <div className="flex items-center justify-between p-4 sm:p-5 lg:p-6 bg-slate-900/40 border border-slate-800 rounded-2xl sm:rounded-3xl hover:border-blue-500/30 transition-all gap-4 relative z-10 backdrop-blur-sm">
                                                                    {/* Dynamic Glow */}
                                                                    <div
                                                                        className="absolute -top-12 -right-12 w-24 h-24 blur-[60px] opacity-10 group-hover:opacity-20 transition-all"
                                                                        style={{ backgroundColor: oppColors.primary }}
                                                                    ></div>

                                                                    <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
                                                                        <div className="hidden sm:flex flex-col items-center justify-center px-4 py-2 border-r border-white/5">
                                                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{new Date(game.date).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                                                            <span className="text-xl font-black text-white italic">{new Date(game.date).toLocaleDateString('pt-BR', { day: '2-digit' })}</span>
                                                                        </div>

                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20">{game.competition}</span>
                                                                                {game.status === 'live' && (
                                                                                    <span className="flex items-center gap-1 text-[9px] font-black text-rose-500 uppercase tracking-widest px-2 py-0.5 bg-rose-500/10 rounded-full border border-rose-500/20 animate-pulse">
                                                                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                                                        Ao Vivo
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            <div className="flex items-center gap-2 sm:gap-4 ml-1">
                                                                                <div className="flex items-center gap-2 flex-1 justify-end">
                                                                                    <span className="text-xs sm:text-sm font-black text-white uppercase italic tracking-tighter hidden sm:block">Cruzeiro</span>
                                                                                    <TeamLogo teamName="Cruzeiro" size="sm" showName={false} />
                                                                                </div>

                                                                                <div className="text-[10px] font-black text-slate-700 italic">VS</div>

                                                                                <div className="flex items-center gap-2 flex-1">
                                                                                    <TeamLogo teamName={game.opponent} size="sm" showName={false} />
                                                                                    <span className="text-xs sm:text-sm font-black text-white uppercase italic tracking-tighter line-clamp-1">{game.opponent}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                                                                        <div className="flex items-center gap-1 text-slate-300 font-black italic">
                                                                            <Clock className="w-3 h-3 text-blue-500" />
                                                                            <span className="text-xs sm:text-sm">{new Date(game.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h</span>
                                                                        </div>
                                                                        <div className="text-[10px] font-bold text-slate-500 max-w-[100px] truncate">{game.venue}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {upcomingGames.length === 0 && <p className="text-slate-500 text-center py-12">Nenhum jogo futuro cadastrado.</p>}
                                                </div>
                                            </div>

                                            <div className="space-y-3 sm:space-y-4">
                                                <h4 className="text-base sm:text-lg font-bold">Últimos Resultados</h4>
                                                <div className="grid gap-3 sm:gap-4">
                                                    {/* Mostrar resultado do bolão se houver */}
                                                    {lastPoolResult ? (
                                                        <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 bg-gradient-to-r from-emerald-900/30 to-blue-900/30 border border-emerald-500/30 rounded-xl sm:rounded-2xl relative overflow-visible gap-2 sm:gap-4">
                                                            <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                                                                <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-emerald-500/20 text-emerald-400 text-[8px] sm:text-[10px] font-black uppercase rounded-full border border-emerald-500/30">
                                                                    Bolão
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-1 min-w-0 pr-8 sm:pr-0">
                                                                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 flex-shrink-0" />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-[10px] sm:text-xs font-bold text-emerald-400 mb-1 uppercase truncate">{lastPoolResult.match_title}</div>
                                                                    <div className="text-xs sm:text-sm font-bold text-white break-words">
                                                                        {lastPoolResult.home_team} <span className="text-slate-500 mx-1 sm:mx-2">vs</span> {lastPoolResult.away_team}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 font-black flex-shrink-0">
                                                                <div className="px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 bg-emerald-600/20 border border-emerald-500/30 rounded-md sm:rounded-lg text-emerald-300 text-sm sm:text-base lg:text-lg">
                                                                    {lastPoolResult.result_home_score}
                                                                </div>
                                                                <span className="text-emerald-400 text-base sm:text-lg lg:text-xl">x</span>
                                                                <div className="px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 bg-emerald-600/20 border border-emerald-500/30 rounded-md sm:rounded-lg text-emerald-300 text-sm sm:text-base lg:text-lg">
                                                                    {lastPoolResult.result_away_score}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // Se não houver resultado do bolão, mostrar jogos finalizados do Cruzeiro
                                                        recentGames.map(game => {
                                                            const oppColors = getTeamColors(game.opponent);
                                                            return (
                                                                <div key={game.id} className="relative overflow-hidden group">
                                                                    <div className="flex items-center justify-between p-4 sm:p-5 lg:p-6 bg-slate-950/50 border border-slate-900 rounded-2xl sm:rounded-3xl hover:border-blue-500/20 transition-all gap-4 relative z-10 backdrop-blur-sm">
                                                                        <div
                                                                            className="absolute -top-12 -right-12 w-24 h-24 blur-[60px] opacity-5 group-hover:opacity-10 transition-all"
                                                                            style={{ backgroundColor: oppColors.primary }}
                                                                        ></div>

                                                                        <div className="flex items-center gap-3 sm:gap-5 lg:gap-8 flex-1 min-w-0">
                                                                            <div className="flex items-center gap-2 flex-1 justify-end min-w-0 text-right">
                                                                                <span className="text-xs sm:text-sm font-black text-white uppercase italic tracking-tighter truncate hidden sm:block">Cruzeiro</span>
                                                                                <TeamLogo teamName="Cruzeiro" size="sm" showName={false} />
                                                                            </div>

                                                                            <div className="flex items-center gap-1.5 sm:gap-3 font-black flex-shrink-0">
                                                                                <div className="px-3 sm:px-4 py-1 sm:py-2 bg-slate-900 border border-white/5 rounded-xl text-sm sm:text-base text-white shadow-inner">{game.score_home}</div>
                                                                                <span className="text-slate-700 text-lg sm:text-xl italic">-</span>
                                                                                <div className="px-3 sm:px-4 py-1 sm:py-2 bg-slate-900 border border-white/5 rounded-xl text-sm sm:text-base text-white shadow-inner">{game.score_away}</div>
                                                                            </div>

                                                                            <div className="flex items-center gap-2 flex-1 min-w-0 text-left">
                                                                                <TeamLogo
                                                                                    teamName={game.opponent}
                                                                                    customLogo={game.opponent_logo}
                                                                                    size="sm"
                                                                                    showName={false}
                                                                                />
                                                                                <span className="text-xs sm:text-sm font-black text-white uppercase italic tracking-tighter truncate hidden sm:block">{game.opponent}</span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="hidden md:flex flex-col items-end opacity-40">
                                                                            <span className="text-[10px] font-black uppercase tracking-widest">{game.competition}</span>
                                                                            <span className="text-[9px] font-bold">{new Date(game.date).toLocaleDateString('pt-BR')}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                    {!lastPoolResult && recentGames.length === 0 && (
                                                        <p className="text-slate-500 text-center py-8 sm:py-12 text-xs sm:text-sm">Nenhum resultado disponível.</p>
                                                    )}
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
                                                                    <TeamLogo teamName={team.team} size="sm" showName={false} />
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
                                    {activeTab === 'clips' && (
                                        <motion.div
                                            key="clips"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="p-4 sm:p-6 lg:p-8 space-y-6"
                                        >
                                            {selectedClip ? (
                                                <div className="bg-slate-900/60 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
                                                    <div className="relative aspect-video">
                                                        <iframe
                                                            src={getYouTubeEmbedUrl(selectedClip.youtube_url)}
                                                            title={selectedClip.title}
                                                            className="w-full h-full"
                                                            frameBorder="0"
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                            allowFullScreen
                                                        />
                                                        <button
                                                            onClick={() => setSelectedClip(null)}
                                                            className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black transition-all"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                    <div className="p-6">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase rounded border border-blue-500/20">
                                                                {selectedClip.category}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-xl font-bold text-white mb-2">{selectedClip.title}</h3>
                                                        <p className="text-slate-400 text-sm leading-relaxed">{selectedClip.description}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {clips.map((clip) => (
                                                        <motion.button
                                                            key={clip.id}
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            onClick={() => setSelectedClip(clip)}
                                                            className="bg-slate-900/40 border border-slate-800/50 rounded-2xl overflow-hidden text-left group transition-all hover:bg-slate-900/60"
                                                        >
                                                            <div className="relative aspect-video">
                                                                <img
                                                                    src={getYouTubeThumbnail(clip.youtube_url)}
                                                                    alt={clip.title}
                                                                    className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/40 transform scale-75 group-hover:scale-100 transition-all duration-300">
                                                                        <Play className="w-6 h-6 text-white fill-current" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="p-4">
                                                                <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-blue-400 transition-colors">{clip.title}</h4>
                                                                <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">{clip.category}</p>
                                                            </div>
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            )}

                                            {clips.length === 0 && (
                                                <div className="py-20 text-center flex flex-col items-center gap-4">
                                                    <Tv className="w-12 h-12 text-slate-800" />
                                                    <p className="text-slate-500">Nenhum clipe disponível no momento.</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                    {activeTab === 'stats' && (
                                        <motion.div
                                            key="stats"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="p-4 sm:p-6 lg:p-8"
                                        >
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl text-center">
                                                    <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                                                    <span className="block text-slate-500 text-[10px] font-black uppercase mb-1">Vitórias</span>
                                                    <span className="text-3xl font-black text-white">{quickStats.victories}</span>
                                                </div>
                                                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl text-center">
                                                    <Zap className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                                                    <span className="block text-slate-500 text-[10px] font-black uppercase mb-1">Gols Pró</span>
                                                    <span className="text-3xl font-black text-white">{quickStats.goalsFor}</span>
                                                </div>
                                                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl text-center">
                                                    <Activity className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                                                    <span className="block text-slate-500 text-[10px] font-black uppercase mb-1">Aproveit.</span>
                                                    <span className="text-3xl font-black text-white">{quickStats.winRate}%</span>
                                                </div>
                                                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl text-center">
                                                    <Target className="w-8 h-8 text-rose-500 mx-auto mb-3" />
                                                    <span className="block text-slate-500 text-[10px] font-black uppercase mb-1">Artilheiro</span>
                                                    <span className="text-lg font-black text-white line-clamp-1">{quickStats.topScorer}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

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
        </>
    );
};

export default ZkTVPage;