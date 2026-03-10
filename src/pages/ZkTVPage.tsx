import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useSocket } from '../hooks/useSocket';
import {
    Tv,
    Calendar,
    Activity,
    Shield,
    Play,
    Clock,
    MapPin,
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
import { ChatSlot } from '../features/chat/ChatSlot';
import { FloatingChatButton } from '../features/chat/FloatingChatButton';
import { ChatDrawer } from '../features/chat/ChatDrawer';
import PinnedLinkOverlay from '../components/live/PinnedLinkOverlay';
import VipAlertOverlay from '../components/live/VipAlertOverlay';
import VipMessageOverlay from '../components/live/VipMessageOverlay';
import VipSubscriptionModal from '../components/vip/VipSubscriptionModal';
import PoolBetModal from '../components/pool/PoolBetModal';
import { CastButton } from '../components/CastButton';
import { CruzeiroSettings, CruzeiroGame, CruzeiroStanding } from '../types';
import { useAuth } from '../context/AuthContext';
import { useRegisterStreamId } from '../features/chat/useRegisterStreamId';
import TeamLogo from '../components/TeamLogo';
import toast from 'react-hot-toast';

interface LiveStream {
    id: string;
    title: string;
    channel_name: string;
    is_active: boolean;
    viewer_count?: number;
    hls_url?: string | null;
}

interface QuickStats {
    victories: number;
    goalsFor: number;
    winRate: number;
    topScorer: string;
}

const isZkTVDebug = () => (import.meta as any).env?.DEV === true || (import.meta as any).env?.VITE_DEBUG_LIVE === '1';

const COMPETITIONS = [
    'Campeonato Brasileiro - Série A',
    'Campeonato Mineiro',
    'Copa Conmebol Libertadores',
    'Copa Conmebol Sul-Americana',
    'Copa do Brasil',
    'Amistoso'
];

const ZkTVPage: React.FC = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const urlChannel = searchParams.get('channel');

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
    const [activeTab, setActiveTab] = useState<'games' | 'standings' | 'stats'>('games');
    const [selectedComp, setSelectedComp] = useState<string>('Campeonato Brasileiro - Série A');
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

        // Handle tab parameter
        const tab = searchParams.get('tab');
        if (tab === 'standings') {
            setActiveTab('standings');
        }

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
    }, [isMobile, isFullscreen, searchParams, joinStream, leaveStream, isConnected, on, off, user?.id, updateViewerCount, trackViewer]);

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
            let activeStreams = await getActiveLiveStreams();
            let data = null;

            // PRIORIDADE 1: Se houver canal na URL, buscar ESSE canal (mesmo que inativo ou cacheado)
            if (urlChannel) {
                if (isZkTVDebug()) console.log(`🔍 ZkTVPage: Buscando canal da URL: ${urlChannel}`);
                data = await getLiveStreamByChannel(urlChannel);
            }

            // PRIORIDADE 2: Se não houver canal na URL ou não foi encontrado, pegar a primeira ativa
            if (!data && activeStreams.length > 0) {
                data = activeStreams[0];
            }

            // PRIORIDADE 3: Se ainda não encontrar nada, buscar a stream padrão ZkOficial (mesmo que inativa)
            if (!data) {
                if (isZkTVDebug()) console.log('⚠️ Nenhuma stream ativa encontrada, buscando stream ZkOficial...');
                data = await getLiveStreamByChannel('ZkOficial');

                if (data && isZkTVDebug()) {
                    console.log('✅ Stream ZkOficial encontrada:', data);
                }
            }

            if (data) {
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
        <div className="min-h-screen bg-[#030712] flex flex-col pt-16 text-white font-sans selection:bg-blue-500/30">
            <Header />

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
                                {isLiveActive ? (
                                    <>
                                        {activeStream?.title.split(' x ')[0] || 'Ao Vivo'}
                                        <span className="text-blue-500">
                                            {activeStream?.title.includes(' x ') ? ` x ${activeStream.title.split(' x ')[1]}` : ''}
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
                                className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed"
                            >
                                {isLiveActive
                                    ? `Assista agora: ${activeStream?.title || 'ZK TV'}. Acompanhe ao vivo com a melhor qualidade e interatividade.`
                                    : 'Acompanhe tudo sobre o Maior de Minas. Transmissões ao vivo, estatísticas, próximos jogos e muito mais em um só lugar.'
                                }
                            </motion.p>

                            {/* Extra 'Próximo Jogo' top card was removed here to avoid duplication with the video placeholder card */}

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
                                {isLiveActive ? (
                                    <>
                                        {/* Só renderiza o player quando a transmissão estiver ativa */}
                                        <LiveViewer
                                            channelName={activeStream?.channel_name || 'ZkOfical'}
                                            fitMode={videoFitMode}
                                            showOfflineMessage={false}
                                        />
                                        {activeStream?.id && (
                                            <VipMessageOverlay streamId={activeStream.id} isActive={isLiveActive} />
                                        )}
                                    </>
                                ) : activeStream && !isLiveActive ? (
                                    <>
                                        {/* Transmissão encerrada - placeholder sem carregar o player */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center z-30">
                                            <div className="text-center px-6 max-w-md animate-in fade-in zoom-in duration-700">
                                                <div className="w-20 h-20 mx-auto bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-black/50 border border-white/5">
                                                    <Tv className="w-10 h-10 text-slate-400" />
                                                </div>
                                                <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
                                                    Transmissão Encerrada
                                                </h2>
                                                <p className="text-slate-400 mb-8 max-w-[300px] mx-auto text-sm sm:text-base">
                                                    Obrigado por nos acompanhar! Fique ligado nas próximas transmissões.
                                                </p>
                                                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                                                    <button
                                                        onClick={() => window.location.reload()}
                                                        className="px-6 py-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:scale-105 text-sm flex items-center justify-center gap-2"
                                                    >
                                                        🔄 Atualizar
                                                    </button>
                                                    <a
                                                        href="/"
                                                        className="px-6 py-3 w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all border border-slate-700 text-sm flex items-center justify-center gap-2"
                                                    >
                                                        🏠 Início
                                                    </a>
                                                </div>
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
                                                <div className="w-full max-w-sm mx-auto animate-in fade-in zoom-in duration-700 py-2">
                                                    <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
                                                        <span className="px-2 sm:px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Próximo Jogo</span>
                                                        <span className="text-[9px] sm:text-[10px] font-black text-white/40 uppercase tracking-widest truncate">{nextGame.competition}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
                                                        <div className="flex flex-col items-center flex-1 min-w-0">
                                                            <TeamLogo
                                                                teamName="Cruzeiro"
                                                                size="lg"
                                                                showName={false}
                                                                className="mb-2 sm:mb-3"
                                                            />
                                                            <span className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider truncate w-full">Cruzeiro</span>
                                                        </div>

                                                        <div className="flex flex-col items-center flex-shrink-0">
                                                            <div className="text-lg sm:text-xl lg:text-2xl font-black italic text-white/10 uppercase mb-1">VS</div>
                                                            <div className="h-1 w-6 sm:w-8 bg-blue-500/20 rounded-full" />
                                                        </div>

                                                        <div className="flex flex-col items-center flex-1 min-w-0">
                                                            <TeamLogo
                                                                teamName={nextGame.opponent}
                                                                customLogo={nextGame.opponent_logo}
                                                                size="lg"
                                                                showName={false}
                                                                className="mb-2 sm:mb-3"
                                                            />
                                                            <span className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider truncate w-full px-1">{nextGame.opponent}</span>
                                                        </div>
                                                    </div>

                                                    <div className="pt-3 sm:pt-4 lg:pt-6 border-t border-white/5 flex items-center justify-center gap-4 sm:gap-6 lg:gap-8 pb-2">
                                                        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-black text-blue-300">
                                                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                                            <span>{new Date(nextGame.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-black text-blue-300">
                                                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                                            <span>{new Date(nextGame.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h</span>
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

                                {/* Status e Viewer Count (Apenas Fullscreen Desktop - NÃO mostrar no mobile) */}
                                {isLiveActive && isFullscreen && !isMobile && (
                                    <div className="absolute top-4 left-4 z-20">
                                        <div className="px-6 py-3 bg-slate-800/80 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <Eye className="w-4 h-4 text-slate-400" />
                                                <span className="text-white font-black">
                                                    {isLiveActive
                                                        ? (currentViewerCount || activeStream?.viewer_count || 0)
                                                        : 0
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}


                                {/* Desktop Fullscreen - Sidebar Lateral (Chat + Enquete) - Estilo CazéTV */}
                                {isFullscreen && !isMobile && isChatOpen && activeStream && (
                                    <div className="absolute right-4 top-4 bottom-4 z-50 w-[400px] flex flex-col gap-3 pointer-events-auto">
                                        <div className="flex-[4] min-h-0 bg-black/80 backdrop-blur-md rounded-2xl p-2 border border-white/10 overflow-hidden shadow-2xl">
                                            <ChatSlot id="zktv-desktop-fullscreen-chat" priority={100} className="h-full" />
                                        </div>
                                        <div className="flex-[1] min-h-0 pointer-events-auto bg-black/80 backdrop-blur-md rounded-2xl p-3 space-y-2 overflow-y-auto border border-white/10 custom-scrollbar shadow-2xl">
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

                                {/* VIP Overlays */}
                                <VipAlertOverlay streamId={activeStream?.id} />
                                <VipMessageOverlay streamId={activeStream?.id || ''} isActive={isLiveActive} />
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
                                        {/* Enquete e Link Fixado em destaque no mobile landscape */}
                                        <div className="px-3 py-2 border-t border-white/10 bg-black/40">
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
            {isMobile && isFullscreen && activeStream && isLiveActive && (
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
                    isActive={isLiveActive}
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
                            <div className="hidden md:block bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-4 sm:p-6 lg:p-8 rounded-[2rem] relative overflow-visible group pb-6 sm:pb-8">
                                <div className="absolute top-0 right-0 p-4 sm:p-6 lg:p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                    <Shield className="w-24 sm:w-32 h-24 sm:h-32 text-blue-500" />
                                </div>

                                <h3 className="text-xs sm:text-sm font-bold text-blue-500 uppercase tracking-widest mb-3 sm:mb-4 lg:mb-6">Próximo Jogo</h3>

                                {nextGame ? (
                                    <>
                                        <div className="flex items-center justify-between mb-3 sm:mb-4 lg:mb-6 gap-2 sm:gap-4">
                                            <div className="text-center flex-1 min-w-0">
                                                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg shadow-blue-600/20 font-black text-white text-xs sm:text-sm lg:text-base">CRU</div>
                                                <span className="text-xs sm:text-sm font-bold block truncate">Cruzeiro</span>
                                            </div>
                                            <div className="px-1 sm:px-2 lg:px-4 text-lg sm:text-xl lg:text-2xl font-black italic text-slate-700 flex-shrink-0">VS</div>
                                            <div className="text-center flex-1 min-w-0">
                                                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-slate-800 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3 border border-slate-700 font-black text-slate-400 text-xs sm:text-sm lg:text-base">
                                                    {nextGame.opponent.substring(0, 3).toUpperCase()}
                                                </div>
                                                <span className="text-xs sm:text-sm font-bold block truncate px-1">{nextGame.opponent}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 lg:pt-6 border-t border-slate-800/50 pb-2">
                                            <div className="flex items-center gap-2 sm:gap-3 text-slate-300">
                                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                                                <span className="text-xs sm:text-sm break-words">{new Date(nextGame.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-3 text-slate-300">
                                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                                                <span className="text-xs sm:text-sm">{new Date(nextGame.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h</span>
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-3 text-slate-300">
                                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                                                <span className="text-xs sm:text-sm break-words">{nextGame.venue}</span>
                                            </div>
                                        </div>
                                    </>
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
                            <div className="flex gap-2 sm:gap-4 p-1 bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl w-full sm:w-fit">
                                <button
                                    onClick={() => setActiveTab('games')}
                                    className={`flex-1 sm:flex-none px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-bold transition-all ${activeTab === 'games' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    Jogos
                                </button>
                                <button
                                    onClick={() => setActiveTab('standings')}
                                    className={`flex-1 sm:flex-none px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-bold transition-all ${activeTab === 'standings' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    Tabela
                                </button>
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
                                                    {upcomingGames.map(game => (
                                                        <div key={game.id} className="flex items-center justify-between p-3 sm:p-4 lg:p-6 bg-slate-900/50 border border-slate-800 rounded-xl sm:rounded-2xl hover:border-blue-500/30 transition-all group gap-2 sm:gap-4">
                                                            <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 min-w-0 flex-1">
                                                                <div className="text-[10px] sm:text-xs font-black text-slate-500 rotate-180 [writing-mode:vertical-lr] hidden sm:block flex-shrink-0">
                                                                    {new Date(game.date).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="text-xs sm:text-sm font-bold text-blue-500 mb-1">{game.competition}</div>
                                                                    {/* Mobile: duas linhas | Desktop: uma linha */}
                                                                    <div className="text-sm sm:text-base lg:text-xl font-black text-center sm:text-left">
                                                                        <span className="block sm:inline">Cruzeiro</span>
                                                                        <span className="text-slate-600 mx-1 sm:mx-2 block sm:inline">x</span>
                                                                        <span className="block sm:inline">{game.opponent}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <div className="text-xs sm:text-sm font-bold text-slate-300">{new Date(game.date).toLocaleDateString('pt-BR')}</div>
                                                                <div className="text-[10px] sm:text-xs text-slate-500 max-w-[80px] sm:max-w-none break-words">{game.venue}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {upcomingGames.length === 0 && <p className="text-slate-500 text-center py-12">Nenhum jogo futuro cadastrado.</p>}
                                                </div>
                                            </div>

                                            <div className="space-y-3 sm:space-y-4">
                                                <h4 className="text-base sm:text-lg font-bold">Últimos Resultados</h4>
                                                <div className="grid gap-3 sm:gap-4">
                                                    {/* Mostrar resultado do bolão se houver */}
                                                    {lastPoolResult ? (
                                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 lg:p-6 bg-gradient-to-r from-emerald-900/30 to-blue-900/30 border border-emerald-500/30 rounded-xl sm:rounded-2xl relative overflow-hidden gap-4">
                                                            {/* Fundo brilhoso */}
                                                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none" />

                                                            <div className="flex items-center gap-3 lg:gap-4 flex-1 min-w-0 z-10 w-full">
                                                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-900/50 rounded-xl flex items-center justify-center border border-emerald-500/30 flex-shrink-0 shadow-lg shadow-emerald-500/10">
                                                                    <Target className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1 border-b border-emerald-500/10 pb-1">
                                                                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] sm:text-[10px] font-black uppercase rounded-full border border-emerald-500/30 tracking-widest shrink-0">
                                                                            BOLÃO
                                                                        </span>
                                                                        <div className="text-[10px] sm:text-xs font-bold text-emerald-400/80 uppercase w-full">{lastPoolResult.match_title}</div>
                                                                    </div>
                                                                    <div className="text-sm sm:text-base font-bold text-white w-full mt-1">
                                                                        {lastPoolResult.home_team} <span className="text-slate-500 mx-1 font-normal text-xs sm:text-sm">vs</span> {lastPoolResult.away_team}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-center gap-2 sm:gap-4 font-black flex-shrink-0 z-10 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-white/5">
                                                                <div className="w-12 sm:w-14 lg:w-16 h-10 sm:h-12 lg:h-14 flex items-center justify-center bg-slate-900/80 border border-emerald-500/30 rounded-lg sm:rounded-xl text-emerald-400 text-lg sm:text-xl lg:text-2xl shadow-inner">
                                                                    {lastPoolResult.result_home_score}
                                                                </div>
                                                                <span className="text-emerald-500/50 text-xs sm:text-sm font-bold uppercase tracking-widest">X</span>
                                                                <div className="w-12 sm:w-14 lg:w-16 h-10 sm:h-12 lg:h-14 flex items-center justify-center bg-slate-900/80 border border-emerald-500/30 rounded-lg sm:rounded-xl text-emerald-400 text-lg sm:text-xl lg:text-2xl shadow-inner">
                                                                    {lastPoolResult.result_away_score}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // Se não houver resultado do bolão, mostrar jogos finalizados do Cruzeiro
                                                        recentGames.map(game => (
                                                            <div key={game.id} className="p-3 sm:p-4 bg-slate-950/40 border border-slate-900 rounded-xl sm:rounded-2xl transition-all hover:bg-slate-900/40">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <TeamLogo teamName={game.is_home ? 'Cruzeiro' : game.opponent} customLogo={game.is_home ? undefined : game.opponent_logo} size="xs" />
                                                                            <span className={`text-[10px] sm:text-xs font-bold truncate ${game.is_home ? 'text-blue-400' : 'text-slate-300'}`}>
                                                                                {game.is_home ? 'Cruzeiro' : game.opponent}
                                                                            </span>
                                                                        </div>

                                                                        <span className="text-[10px] text-slate-600 font-black italic">VS</span>

                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <TeamLogo teamName={game.is_home ? game.opponent : 'Cruzeiro'} customLogo={game.is_home ? game.opponent_logo : undefined} size="xs" />
                                                                            <span className={`text-[10px] sm:text-xs font-bold truncate ${!game.is_home ? 'text-blue-400' : 'text-slate-300'}`}>
                                                                                {!game.is_home ? 'Cruzeiro' : game.opponent}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-1.5 sm:gap-2 font-black flex-shrink-0">
                                                                        <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-slate-900 border border-slate-800 rounded-md text-xs sm:text-sm text-white">
                                                                            {game.score_home ?? 0}
                                                                        </div>
                                                                        <span className="text-slate-700 text-[10px] sm:text-xs">-</span>
                                                                        <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-slate-900 border border-slate-800 rounded-md text-xs sm:text-sm text-white">
                                                                            {game.score_away ?? 0}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="mt-2 text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider flex justify-between items-center opacity-60">
                                                                    <span>{game.competition}</span>
                                                                    <span>{new Date(game.date).toLocaleDateString('pt-BR')}</span>
                                                                </div>
                                                            </div>
                                                        ))
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
                                            className="space-y-6"
                                        >
                                            {/* Seletor de Competição - Estilo Pill com Scroll Horizontal */}
                                            <div className="relative group">
                                                <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 scroll-smooth">
                                                    {COMPETITIONS.map((comp) => (
                                                        <button
                                                            key={comp}
                                                            onClick={() => setSelectedComp(comp)}
                                                            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-300 border ${selectedComp === comp
                                                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30 scale-105'
                                                                : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200 hover:border-slate-600'
                                                                }`}
                                                        >
                                                            {comp}
                                                        </button>
                                                    ))}
                                                </div>
                                                {/* Gradientes de indicação de scroll */}
                                                <div className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-slate-950 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>

                                            <div className="overflow-x-auto rounded-2xl border border-slate-800/50 bg-slate-900/20 backdrop-blur-sm shadow-2xl">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10">
                                                            <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">POS</th>
                                                            <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">TIME</th>
                                                            <th className="px-4 py-5 text-xs font-black text-slate-500 uppercase tracking-widest text-center">PTS</th>
                                                            <th className="px-4 py-5 text-xs font-black text-slate-500 uppercase tracking-widest text-center">PJ</th>
                                                            <th className="px-4 py-5 text-xs font-black text-slate-500 uppercase tracking-widest text-center">V</th>
                                                            <th className="px-4 py-5 text-xs font-black text-slate-500 uppercase tracking-widest text-center">SG</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800/30">
                                                        {standings
                                                            .filter(team => team.competition === selectedComp)
                                                            .map((team) => {
                                                                const isSerieA = selectedComp === 'Campeonato Brasileiro - Série A';
                                                                const pos = team.position;

                                                                // Cores de qualificação para Série A
                                                                let posColorClass = "text-slate-400";
                                                                let posBgClass = "";

                                                                if (isSerieA) {
                                                                    if (pos <= 4) {
                                                                        posColorClass = "text-green-400"; // Libertadores
                                                                        posBgClass = "border-l-4 border-l-green-500 bg-green-500/5";
                                                                    } else if (pos <= 6) {
                                                                        posColorClass = "text-blue-400"; // Pré-Libertadores
                                                                        posBgClass = "border-l-4 border-l-blue-500 bg-blue-500/5";
                                                                    } else if (pos <= 12) {
                                                                        posColorClass = "text-orange-400"; // Sul-Americana
                                                                        posBgClass = "border-l-4 border-l-orange-500/50";
                                                                    } else if (pos >= 17) {
                                                                        posColorClass = "text-red-400"; // Rebaixamento
                                                                        posBgClass = "border-l-4 border-l-red-500/50 bg-red-500/5";
                                                                    }
                                                                }

                                                                return (
                                                                    <tr key={team.id} className={`${team.is_cruzeiro ? 'bg-blue-600/10' : posBgClass} hover:bg-slate-800/40 transition-all duration-200 group`}>
                                                                        <td className={`px-6 py-4 font-black ${posColorClass} text-sm sm:text-base`}>
                                                                            {pos}º
                                                                        </td>
                                                                        <td className="px-6 py-4 font-bold flex items-center gap-4 whitespace-nowrap">
                                                                            <TeamLogo
                                                                                teamName={team.team}
                                                                                customLogo={team.logo}
                                                                                size="sm"
                                                                                className="group-hover:scale-110 transition-transform duration-300"
                                                                            />
                                                                            <span className={`text-sm sm:text-base ${team.is_cruzeiro ? 'text-blue-400' : 'text-slate-200'}`}>
                                                                                {team.team}
                                                                            </span>
                                                                        </td>
                                                                        <td className={`px-4 py-4 text-center font-black ${team.is_cruzeiro ? 'text-blue-400' : 'text-white'} text-sm sm:text-base`}>
                                                                            {team.points}
                                                                        </td>
                                                                        <td className="px-4 py-4 text-center text-slate-400 text-xs sm:text-sm font-medium">{team.played}</td>
                                                                        <td className="px-4 py-4 text-center text-slate-400 text-xs sm:text-sm font-medium">{team.won}</td>
                                                                        <td className={`px-4 py-4 text-center text-xs sm:text-sm font-bold ${team.goals_for - team.goals_against >= 0 ? 'text-slate-400' : 'text-red-400/70'}`}>
                                                                            {team.goals_for - team.goals_against}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                    </tbody>
                                                </table>
                                                {standings.filter(team => team.competition === selectedComp).length === 0 && (
                                                    <div className="py-20 text-center bg-slate-900/40">
                                                        <Activity className="w-16 h-16 text-slate-800 mx-auto mb-4 animate-pulse opacity-20" />
                                                        <p className="text-slate-500 text-sm font-bold tracking-widest uppercase">Classificação em breve...</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Legenda para Série A */}
                                            {selectedComp === 'Campeonato Brasileiro - Série A' && (
                                                <div className="flex flex-wrap gap-4 pt-2 px-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Libertadores</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Pré-Libertadores</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Sul-Americana</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Rebaixamento</span>
                                                    </div>
                                                </div>
                                            )}
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
                    homeLogo={activePool.home_team_logo}
                    awayLogo={activePool.away_team_logo}
                    accumulatedAmount={activePool.accumulated_amount || 0}
                    totalPoolAmount={activePool.total_pool_amount || 0}
                />
            )}
        </div>
    );
};

export default ZkTVPage;
