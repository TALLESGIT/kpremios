import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
    Eye,
    MessageSquare,
    Crown,
    Target,
    Bell,
    Trophy,
    Share2,
    Check,
    DollarSign,
    Zap
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
import { MatchSettings, MatchGame, MatchStanding } from '../types';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useRegisterStreamId } from '../features/chat/useRegisterStreamId';
import TeamLogo from '../components/TeamLogo';
import toast from 'react-hot-toast';
import { getActiveLiveStreams, getLiveStreamByChannel } from '../services/cachedLiveService';
import { StatusBar } from '@capacitor/status-bar';
import { NavigationBar } from '@hugotomazi/capacitor-navigation-bar';
import { Capacitor } from '@capacitor/core';


interface LiveStream {
    id: string;
    title: string;
    channel_name: string;
    is_active: boolean;
    viewer_count?: number;
    hls_url?: string | null;
    club_slug?: string | null;
}

interface QuickStats {
    victories: number;
    goalsFor: number;
    winRate: number;
    topScorer: string;
}

const isZkTVDebug = () => (import.meta as any).env?.DEV === true || (import.meta as any).env?.VITE_DEBUG_LIVE === '1';

const CACHE_KEY_NEXT_GAME = 'zktv_cached_next_game';
const CACHE_KEY_STATS = 'zktv_cached_stats';

const NextMatchSkeleton = () => (
    <div className="w-full animate-pulse">
        <div className="flex items-center justify-between mb-6 gap-2">
            <div className="w-20 h-4 bg-white/5 rounded-full" />
            <div className="w-24 h-4 bg-white/5 rounded-full" />
        </div>
        <div className="flex items-center justify-between gap-6 mb-8">
            <div className="flex flex-col items-center flex-1">
                <div className="w-16 h-16 bg-white/5 rounded-2xl mb-3" />
                <div className="w-16 h-3 bg-white/5 rounded-full" />
            </div>
            <div className="flex flex-col items-center">
                <div className="w-8 h-4 bg-white/5 rounded mb-1" />
                <div className="h-1 w-8 bg-indigo-500/10 rounded-full" />
            </div>
            <div className="flex flex-col items-center flex-1">
                <div className="w-16 h-16 bg-white/5 rounded-2xl mb-3" />
                <div className="w-16 h-3 bg-white/5 rounded-full" />
            </div>
        </div>
        <div className="pt-6 border-t border-white/5 flex items-center justify-center gap-8">
            <div className="w-20 h-4 bg-white/5 rounded-full" />
            <div className="w-16 h-4 bg-white/5 rounded-full" />
        </div>
    </div>
);

const StatsSkeleton = () => (
    <div className="grid grid-cols-2 gap-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 h-20" />
        ))}
    </div>
);

const LiveTimeline: React.FC<{ events: any[] }> = ({ events }) => {
    if (!events || events.length === 0) return null;

    return (
        <div className="space-y-3 mt-6 animate-in fade-in slide-in-from-bottom duration-500">
            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Zap className="w-3 h-3 text-indigo-400" />
                Destaques da Partida
            </h4>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {events.map((event, idx) => (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={event.id || idx}
                        className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors group"
                    >
                        <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-[10px] font-black text-indigo-400 shrink-0 border border-white/10 group-hover:border-indigo-500/30 transition-colors">
                            {event.elapsed}'
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-xl shrink-0">
                                    {event.type === 'Goal' ? '⚽' : event.type === 'Card' && event.detail?.includes('Yellow') ? '🟨' : event.type === 'Card' ? '🟥' : '🔄'}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-white truncate uppercase tracking-tight">
                                        {event.player_name || 'Evento'}
                                    </p>
                                    <p className="text-[9px] font-bold text-white/40 truncate uppercase tracking-widest">
                                        {event.detail || event.type} {event.team_name ? `• ${event.team_name}` : ''}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};


const ZkTVPage: React.FC = () => {
    const { user } = useAuth();
    const { currentUser, loading: dataLoading, setGuestClub } = useData();
    const [searchParams] = useSearchParams();
    const urlChannel = searchParams.get('channel');

    // Estados principais
    const [settings, setSettings] = useState<MatchSettings | null>(null);
    const [games, setGames] = useState<MatchGame[]>([]);
    const [standings, setStandings] = useState<MatchStanding[]>([]);
    const [activeStream, setActiveStream] = useState<LiveStream | null>(null);
    const isLiveActive = activeStream ? activeStream.is_active : !!settings?.is_live;
    
    // ✅ Cache States para carregamento instantâneo - Carregados via useEffect para serem club-aware
    const [cachedNextGame, setCachedNextGame] = useState<MatchGame | null>(null);
    const [quickStats, setQuickStats] = useState<QuickStats>({
        victories: 0,
        goalsFor: 0,
        winRate: 0,
        topScorer: 'N/A'
    });

    // ✅ Inicializar userClub IMEDIATAMENTE com base na URL ou sessionStorage para evitar flash
    const [userClub, setUserClub] = useState<string | null>(() => {
        const params = new URLSearchParams(window.location.search);
        const channel = params.get('channel');
        if (channel) {
            const channelLower = channel.toLowerCase();
            if (channelLower.includes('atletico') || channelLower.includes('galo') || channelLower.includes('mg')) {
                // Salvar canal completo para reuso ao navegar entre páginas
                sessionStorage.setItem('session_channel', channel);
                return 'atletico-mg';
            }
        }
        // Fallback: verificar se há sessão ativa do Galo (navegação entre páginas)
        const sessionClub = sessionStorage.getItem('session_club');
        if (sessionClub === 'atletico-mg') {
            return 'atletico-mg';
        }
        return 'cruzeiro';
    });
    
    const isGaloVisitor = userClub === 'atletico-mg' && !currentUser?.is_admin;
    
    const [clubInfo, setClubInfo] = useState<{ name: string; logo_url: string } | null>(null);
    const [isLinkCopied, setIsLinkCopied] = useState(false);

    // Função para copiar o link profissional
    const handleCopyLink = () => {
        const params = new URLSearchParams(window.location.search);
        const channel = params.get('channel');
        
        // Usar a nova rota profissional /ao-vivo/
        const baseUrl = window.location.origin;
        const professionalLink = channel 
            ? `${baseUrl}/ao-vivo/${channel}`
            : `${baseUrl}/zk-tv`;

        navigator.clipboard.writeText(professionalLink).then(() => {
            setIsLinkCopied(true);
            toast.success('Link profissional copiado!');
            setTimeout(() => setIsLinkCopied(false), 2000);
        }).catch(err => {
            console.error('Erro ao copiar link:', err);
            toast.error('Erro ao copiar link');
        });
    };

    // Sincronizar userClub com o currentUser e carregar info do clube
    // ✅ REGRA: O contexto de clube na ZkTV só muda para Galo se houver canal na URL OU sessão ativa do Galo.
    useEffect(() => {
        let resolvedClub = 'cruzeiro'; // Padrão sempre Cruzeiro

        if (urlChannel) {
            // ✅ Se acessou via link direto de canal, inferir o clube pelo nome
            const channelLower = urlChannel.toLowerCase();
            if (channelLower.includes('atletico') || channelLower.includes('galo') || channelLower.includes('mg')) {
                resolvedClub = 'atletico-mg';
                // Salvar canal completo para reuso
                sessionStorage.setItem('session_channel', urlChannel);
            } else if (channelLower.includes('cruzeiro') || channelLower.includes('raposa')) {
                resolvedClub = 'cruzeiro';
            }
        } else {
            // Sem canal na URL: verificar sessão ativa do Galo
            const sessionClub = sessionStorage.getItem('session_club');
            if (sessionClub === 'atletico-mg') {
                resolvedClub = 'atletico-mg';
            } else if (currentUser?.club_slug && currentUser.club_slug !== 'atletico-mg') {
                resolvedClub = currentUser.club_slug;
            } else if (!dataLoading) {
                const savedClub = localStorage.getItem('preferred_club');
                if (savedClub && savedClub !== 'atletico-mg') {
                    resolvedClub = savedClub;
                }
            }
        }

        setUserClub(resolvedClub);
        setGuestClub(resolvedClub);
        loadClubInfo(resolvedClub);
    }, [currentUser, dataLoading]);

    // Recarregar caches quando o userClub mudar
    useEffect(() => {
        if (!userClub) return;
        
        const nextGameKey = `${CACHE_KEY_NEXT_GAME}_${userClub}`;
        const statsKey = `${CACHE_KEY_STATS}_${userClub}`;
        
        const savedGame = localStorage.getItem(nextGameKey);
        const savedStats = localStorage.getItem(statsKey);
        
        try {
            if (savedGame) setCachedNextGame(JSON.parse(savedGame));
            else setCachedNextGame(null);
            
            if (savedStats) setQuickStats(JSON.parse(savedStats));
            else setQuickStats({ victories: 0, goalsFor: 0, winRate: 0, topScorer: 'N/A' });
        } catch {
            console.warn('Erro ao carregar cache do clube:', userClub);
        }
    }, [userClub]);

    const loadClubInfo = async (slug: string) => {
        try {
            const { data, error } = await supabase
                .from('clubs_config')
                .select('name, logo_url')
                .eq('slug', slug)
                .single();
            if (!error && data) {
                setClubInfo(data);
            }
        } catch (err) {
            console.error('Erro ao carregar info do clube:', err);
        }
    };

    const [activeTab, setActiveTab] = useState<'games' | 'standings' | 'clips'>('games');
    const [selectedComp] = useState<string>('Campeonato Brasileiro - Série A');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isLandscape, setIsLandscape] = useState(false);
    const [videoFitMode, setVideoFitMode] = useState<'contain' | 'cover'>('contain');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isDockedChat, setIsDockedChat] = useState(false);
    const [isChatManuallyClosed, setIsChatManuallyClosed] = useState(false);
    const [currentViewerCount, setCurrentViewerCount] = useState(0);
    const [showControls, setShowControls] = useState(false);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const trackViewerExecutedRef = useRef(false);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const activeStreamRef = useRef<LiveStream | null>(null);
    const [showPerf] = useState(false); // Para debug de performance
    const [isPageLoading, setIsPageLoading] = useState(true); // Loading state para renderização rápida

    // Novos estados para VIP e Bolão
    const [isVip, setIsVip] = useState(false);
    const [showVipModal, setShowVipModal] = useState(false);
    const [showPoolModal, setShowPoolModal] = useState(false);
    const [activePool, setActivePool] = useState<any>(null);
    const [lastPoolResult, setLastPoolResult] = useState<any>(null); // Último resultado do bolão
    const [selectedStandingComp, setSelectedStandingComp] = useState<string | null>(null);
    const [stableIsLiveActive, setStableIsLiveActive] = useState(false); // ✅ Começa false - só ativa quando confirmar stream ativa
    const [isPip, setIsPip] = useState(false); // Estado para Picture-in-Picture nativo
    const lastLiveStatusRef = useRef(false);

    // Live Match Data (API-Football)
    const [liveScore, setLiveScore] = useState<{ home: number, away: number } | null>(null);
    const [liveEvents, setLiveEvents] = useState<any[]>([]);
    const [matchStatus, setMatchStatus] = useState<string | null>(null);
    const [elapsedTime, setElapsedTime] = useState<number | null>(null);

    // Sincronizar isVip com o currentUser
    useEffect(() => {
        if (currentUser) {
            setIsVip(currentUser.is_vip || false);
        } else {
            setIsVip(false);
        }
    }, [currentUser]);


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

    // ========== EFFECT 1: Data Loading (When club is ready) ==========
    useEffect(() => {
        const loadAll = async () => {
            if (dataLoading && !currentUser) return;
            if (!userClub) return;

            // Safety timeout: Não deixar a tela de loading travada por mais de 8 segundos
            const safetyTimer = setTimeout(() => {
                setIsPageLoading(false);
                if (isZkTVDebug()) console.warn('⚠️ ZkTVPage: Loading safety timeout atingido (V2)');
                toast.error('O carregamento está demorando mais que o esperado. Tentando recuperar...', { id: 'loading-slow' });
            }, 8000);

            try {
                if (isZkTVDebug()) console.log('🚀 ZkTVPage: Iniciando carregamento de dados (Native-Safe Mode)');
                
                // Carregar dados em paralelo com timeouts individuais
                await Promise.allSettled([
                    // Adicionar uma pequena margem para garantir que não trave o thread
                    new Promise(resolve => setTimeout(async () => {
                        await loadData();
                        resolve(true);
                    }, 50)),
                    loadActiveStream(),
                    checkVipStatus(),
                    checkActivePool(),
                    loadLastPoolResult()
                ]);

                if (isZkTVDebug()) console.log('✅ ZkTVPage: Carregamento concluído');
            } catch (err) {
                console.error('Erro no carregamento inicial:', err);
            } finally {
                clearTimeout(safetyTimer);
                setIsPageLoading(false);
            }
        };
        loadAll();
    }, [userClub, dataLoading]); // Roda quando o clube ou estado de carregamento muda

    // ========== EFFECT 2: Mobile detection & Initial Chat State ==========
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
        };
        checkMobile();

        // Garantir que chat comece fechado e resetar estados intrusivos
        setIsChatOpen(false);
        setIsDockedChat(false);
        setIsChatManuallyClosed(false);

        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // ========== EFFECT 3: Tab parameter ==========
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'standings') {
            setActiveTab('standings');
        }
    }, [searchParams]);

    // ========== EFFECT 4: Orientation + Fullscreen listeners ==========
    useEffect(() => {
        const checkOrientation = () => {
            // No iOS/Safari o screen.orientation pode ser undefined. Usar window dimensions como fallback.
            const isLandscapeMode = window.innerHeight < window.innerWidth;
            setIsLandscape(isLandscapeMode);

            const currentIsMobile = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const currentIsFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
            if (currentIsMobile && videoContainerRef.current) {
                // Se virou para paisagem e NÃO está em fullscreen, ativa automaticamente
                if (isLandscapeMode && !isFullscreen && !currentIsFs && isLiveActive) {
                    console.log('🔄 Giro para paisagem detectado: Ativando fullscreen automático');
                    handleFullscreen();
                } 
                // Se voltou para retrato e ESTÁ em fullscreen, sai do fullscreen (opcional, mas comum em apps de vídeo)
                else if (!isLandscapeMode && isFullscreen && isLiveActive) {
                    console.log('🔄 Giro para retrato detectado: Saindo do fullscreen');
                    handleFullscreen();
                }
            }
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);
        
        // No iPhone, a mudança de dimensões demora um pouco para estabilizar após a rotação
        const orientationWithDelay = () => setTimeout(checkOrientation, 500);
        window.addEventListener('orientationchange', orientationWithDelay);

        const handleFullscreenChange = () => {
            const isFs = !!document.fullscreenElement;
            setIsFullscreen(isFs);

            const isLandscapeMode = window.screen?.orientation?.type.startsWith('landscape') ?? (window.innerWidth > window.innerHeight);
            setIsLandscape(isLandscapeMode);

            if (!isFs) {
                setIsDockedChat(false);
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
            window.removeEventListener('orientationchange', orientationWithDelay);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []); // Sem deps - os handlers lêem diretamente do DOM

    // ========== EFFECT 4.5: Native PiP Listener (Android) ==========
    useEffect(() => {
        const handlePipChange = (e: any) => {
            if (isZkTVDebug()) console.log('📺 PiP State Change (Native):', e.detail);
            const isInPip = typeof e.detail === 'boolean' ? e.detail : e.detail?.isInPip;
            setIsPip(!!isInPip);
            
            if (isInPip) {
                // Se entrar em PiP, garantir que o chat e modais estejam fechados
                setIsChatOpen(false);
                setIsDockedChat(false);
                setShowVipModal(false);
                setShowPoolModal(false);
            }
        };

        window.addEventListener('pipStateChange', handlePipChange);
        return () => window.removeEventListener('pipStateChange', handlePipChange);
    }, []);

    // ========== EFFECT 5: Realtime subscriptions ==========
    useEffect(() => {
        const settingsSub = supabase
            .channel('zk-tv-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'match_settings' }, () => loadSettings())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'match_games' }, () => {
                loadData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'match_standings' }, () => {
                loadData();
            })
            .subscribe();

        return () => {
            settingsSub.unsubscribe();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                .eq('club_slug', userClub)
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
                .eq('club_slug', userClub)
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
        const channel = supabase.channel('live-stream-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, async (payload) => {
                if (isZkTVDebug()) console.log('🔔 Realtime: live_streams update', payload);

                const newVal = payload.new as LiveStream;
                const oldVal = payload.old as LiveStream;
                const currentStream = activeStreamRef.current;

                if (payload.eventType === 'INSERT' || (payload.eventType === 'UPDATE' && newVal?.is_active && (!currentStream || !currentStream.is_active))) {
                    // Nova live ou reativada
                    if (!currentStream || currentStream.id !== newVal.id) {
                        loadActiveStream();
                    }
                } else if (payload.eventType === 'UPDATE') {
                    // Ignorar se não for a stream atual
                    if (currentStream && currentStream.id !== newVal.id) return;

                    // Se a stream ficar inativa (status mudou de active para inactive)
                    if (newVal.is_active === false && (!oldVal || oldVal.is_active !== false)) {
                        if (isZkTVDebug()) console.log('🛑 Live encerrada! Desconectando imediatamente...');
                        setActiveStream(prev => prev ? { ...prev, is_active: false } : null);
                        setIsChatOpen(false);
                        setIsDockedChat(false);
                        toast.error('A transmissão foi encerrada.');

                        if (sessionId && currentStream?.id) {
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
                } else if (payload.eventType === 'DELETE' && activeStreamRef.current && activeStreamRef.current.id === payload.old.id) {
                    setActiveStream(null);
                    setCurrentViewerCount(0);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId]);

    // Sync isFullscreen with native events
    useEffect(() => {
        const handleFsChange = () => {
            const nativeFs = !!(document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).mozFullScreenElement ||
                (document as any).msFullscreenElement);

            if (nativeFs !== isFullscreen) {
                setIsFullscreen(nativeFs);

                // Se sair do fullscreen, fechamos o chat se for mobile
                if (!nativeFs && isMobile) {
                    setIsChatOpen(false); // ✅ Garantir que o chat overlay também feche
                    setIsDockedChat(false);
                    
                    if (Capacitor.isNativePlatform()) {
                        StatusBar.show().catch(e => console.error('StatusBar show error', e));
                        NavigationBar.show().catch(e => console.error('NavigationBar show error', e));
                    }
                }
            }
        };

        document.addEventListener('fullscreenchange', handleFsChange);
        document.addEventListener('webkitfullscreenchange', handleFsChange);
        document.addEventListener('mozfullscreenchange', handleFsChange);
        document.addEventListener('MSFullscreenChange', handleFsChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFsChange);
            document.removeEventListener('webkitfullscreenchange', handleFsChange);
            document.removeEventListener('mozfullscreenchange', handleFsChange);
            document.removeEventListener('MSFullscreenChange', handleFsChange);
        };
    }, [isFullscreen, isMobile]);

    // Handler para duplo clique - Cobrir tela (Zoom)
    const handleDoubleClick = () => {
        // Se estiver no mobile, o duplo clique alterna o modo de preenchimento (Zoom)
        if (isMobile) {
            setVideoFitMode(prev => prev === 'contain' ? 'cover' : 'contain');
            toast(videoFitMode === 'contain' ? 'Modo Zoom: Cobrir Tela' : 'Modo Original: Ajustar', {
                icon: '🔍',
                duration: 1500,
                position: 'bottom-center'
            });
        } else {
            // No desktop, mantém o comportamento de alternar fullscreen
            handleFullscreen();
        }
    };

    // Handler para fullscreen
    const handleFullscreen = useCallback(async () => {
        if (!videoContainerRef.current) return;
        const element = videoContainerRef.current;
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const video = (window as any).activeVideoElement as HTMLVideoElement;

        try {
            if (!isFullscreen) {
                // Fechar chat ao entrar em fullscreen - o usuário deve abrir manualmente
                setIsChatOpen(false);
                setIsDockedChat(false);

                // Tentar bloquear orientação em landscape no mobile
                if (isMobile && (window.screen as any).orientation?.lock) {
                    try {
                        await (window.screen.orientation as any).lock('landscape').catch(() => {
                            console.log('Orientation lock not supported');
                        });
                    } catch (e) {
                        console.log('Orientation lock not supported');
                    }
                }

                // iOS: Fullscreen API nativa em DIVs não existe. 
                // Tentamos webkitEnterFullscreen no VIDEO ou usamos o modo CSS Premium.
                if (isIOS) {
                    if (video && (video as any).webkitEnterFullscreen) {
                        console.log('📱 iOS: Usando webkitEnterFullscreen no elemento de vídeo');
                        (video as any).webkitEnterFullscreen();
                        return; // O evento nativo do iOS cuidará do retorno se necessário
                    }
                    
                    setIsFullscreen(true);
                    if (Capacitor.isNativePlatform()) {
                        StatusBar.hide().catch(e => console.error('StatusBar hide error', e));
                        NavigationBar.hide().catch(e => console.error('NavigationBar hide error', e));
                    }
                    return;
                }

                // Android / Desktop: usar Fullscreen API nativo
                const requestFs = element.requestFullscreen ||
                    (element as any).webkitRequestFullscreen ||
                    (element as any).mozRequestFullScreen ||
                    (element as any).msRequestFullscreen;

                if (requestFs) {
                    try {
                        await requestFs.call(element);
                    } catch (e) {
                        console.log('ℹ️ Erro na chamada nativa, usando modo CSS');
                        setIsFullscreen(true);
                    }
                } else {
                    setIsFullscreen(true);
                }
            } else {
                // Saindo do fullscreen
                if ((window.screen as any).orientation?.unlock) {
                    (window.screen as any).orientation.unlock();
                }

                if (isIOS) {
                    if (video && (video as any).webkitExitFullscreen) {
                        (video as any).webkitExitFullscreen();
                    }
                    setIsFullscreen(false);
                    return;
                }

                const exitFs = document.exitFullscreen || (document as any).webkitExitFullscreen || (document as any).mozCancelFullScreen;
                if (exitFs && (document.fullscreenElement || (document as any).webkitFullscreenElement)) {
                    await exitFs.call(document);
                } else {
                    setIsFullscreen(false);
                }
            }
        } catch (err) {
            console.error('Fullscreen error:', err);
            setIsFullscreen(!isFullscreen);
        }
    }, [isFullscreen, isMobile, isChatManuallyClosed]);

    // Handler para Picture-in-Picture
    const togglePiP = useCallback(async () => {
        try {
            // ✅ Restrição: PiP apenas quando ao vivo (pedido pelo usuário)
            if (!isLiveActive) {
                toast('O modo flutuante (PiP) só está disponível quando há uma transmissão ao vivo ativa.', { 
                    icon: '📺',
                    duration: 3000
                });
                return;
            }

            const video = videoContainerRef.current?.querySelector('video');
            if (!video || !document.pictureInPictureEnabled) {
                toast('Seu navegador não suporta modo flutuante (PiP). Para transmitir, use o menu do navegador (Cast).', { icon: '📺' });
                return;
            }

            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await video.requestPictureInPicture();
            }
        } catch (error) {
            console.error('Erro ao alternar PiP:', error);
        }
    }, [isLiveActive]);

    // Recalcular estatísticas quando games ou standings mudarem
    useEffect(() => {
        if (games.length > 0 || standings.length > 0) {
            loadQuickStats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [games.length, standings.length]);

    const loadSettings = async () => {
        const { data } = await supabase.from('match_settings').select('*').single();
        if (data) setSettings(data);
    };

    const loadActiveStream = async () => {
        try {

            let data = null;

            if (urlChannel) {
                // ✅ Acessou via link direto: buscar a stream específica do canal
                data = await getLiveStreamByChannel(urlChannel);
                
                // Se encontrou e o clube é diferente, sincronizar (link-only do Galo)
                if (data?.club_slug && data.club_slug !== userClub) {
                    if (isZkTVDebug()) console.log(`🎯 ZkTVPage: Sincronizando clube via link direto: ${data.club_slug}`);
                    setUserClub(data.club_slug);
                    setGuestClub(data.club_slug);
                    loadClubInfo(data.club_slug);
                }
            } else {
                // ✅ Sem canal na URL: buscar APENAS streams do clube atual (cruzeiro por padrão)
                let activeStreams = await getActiveLiveStreams();
                
                // Filtrar por clube para não mostrar live do Galo na ZkTV pública
                if (userClub) {
                    activeStreams = activeStreams.filter(s => s.club_slug === userClub);
                }
                
                if (activeStreams.length > 0) {
                    data = activeStreams[0];
                }
            }

            // Fallback: buscar canal padrão ZkOficial
            if (!data) {
                data = await getLiveStreamByChannel('ZkOficial');
            }

            if (data) {
                // Só atualiza se houver mudança real ou se não houver stream atual
                const current = activeStreamRef.current;
                if (!current || current.id !== data.id || current.is_active !== data.is_active || current.hls_url !== data.hls_url) {
                    if (isZkTVDebug()) console.log('🎬 ZkTVPage: Atualizando activeStream:', data.channel_name, 'Live:', data.is_active);
                    setActiveStream(data);
                    setCurrentViewerCount(data.viewer_count || 0);
                }

                if (data.is_active) {
                    trackViewer(data.id);
                    trackViewerExecutedRef.current = true;
                }
            } else if (activeStreamRef.current) {
                // Se tínhamos uma stream e agora não veio nada, talvez seja um erro transitório
                // Não limpamos imediatamente para evitar flickering, a menos que tenhamos certeza
                if (isZkTVDebug()) console.warn('⚠️ ZkTVPage: Nenhuma stream encontrada no loadActiveStream, mantendo anterior para evitar flickering');
            } else {
                setActiveStream(null);
                setCurrentViewerCount(0);
                trackViewerExecutedRef.current = false;
            }
        } catch (err) {
            console.error('Erro ao carregar live ativa:', err);
            // Em caso de erro, mantém o que está para evitar queda da live por erro de API
        }
    };

    const loadQuickStats = async (compFilter?: string) => {
        try {
            const currentComp = compFilter || selectedComp;

            // Filtrar jogos pela competição selecionada
            const finishedGames = games.filter(g =>
                g.status === 'finished' &&
                (!currentComp || g.competition === currentComp)
            );

            // Se não há jogos carregados ainda (primeiro carregamento), buscar do banco com filtro
            if (finishedGames.length === 0 && games.length === 0) {
                let query = supabase
                    .from('match_games')
                    .select('*')
                    .eq('status', 'finished');

                if (currentComp) {
                    query = query.eq('competition', currentComp);
                }

                const { data: gamesData } = await query;

                if (!gamesData || gamesData.length === 0) {
                    // Tentar buscar o artilheiro mesmo sem jogos (pode vir do sync anterior)
                    const { data: topScorersData } = await supabase
                        .from('site_settings')
                        .select('value')
                        .eq('key', 'match_top_scorers')
                        .maybeSingle();

                    const topScorerName = topScorersData?.value?.leagues?.[currentComp]?.name || 'N/A';

                    setQuickStats({ victories: 0, goalsFor: 0, winRate: 0, topScorer: topScorerName });
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
                    .from('match_standings')
                    .select('*')
                    .eq('is_primary_team', true)
                    .eq('competition', currentComp)
                    .maybeSingle();

                let winRate = 0;
                if (standingsData && standingsData.played > 0) {
                    winRate = Math.round((standingsData.points / (standingsData.played * 3)) * 100);
                } else if (gamesData.length > 0) {
                    const draws = gamesData.filter(g => g.score_home === g.score_away).length;
                    const totalPoints = victories * 3 + draws;
                    winRate = Math.round((totalPoints / (gamesData.length * 3)) * 100);
                }

                // Buscar artilheiro por competição do site_settings
                const { data: topScorersData } = await supabase
                    .from('site_settings')
                    .select('value')
                    .eq('key', 'match_top_scorers')
                    .eq('club_slug', userClub)
                    .maybeSingle();

                const topScorerName = topScorersData?.value?.leagues?.[currentComp]?.name || 'N/A';

                setQuickStats({
                    victories,
                    goalsFor,
                    winRate,
                    topScorer: topScorerName
                });
                return;
            }

            // Calcular com dados JÁ carregados no estado 'games' e 'standings'
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

            const primaryStanding = standings.find(s => s.is_primary_team && s.competition === currentComp);
            let winRate = 0;
            if (primaryStanding && primaryStanding.played > 0) {
                winRate = Math.round((primaryStanding.points / (primaryStanding.played * 3)) * 100);
            } else if (finishedGames.length > 0) {
                const draws = finishedGames.filter(g => g.score_home === g.score_away).length;
                const totalPoints = victories * 3 + draws;
                winRate = Math.round((totalPoints / (finishedGames.length * 3)) * 100);
            }

            // Buscar artilheiro por liga
            const { data: topScorersData } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'match_top_scorers')
                .eq('club_slug', userClub)
                .maybeSingle();

            const topScorerName = topScorersData?.value?.leagues?.[currentComp]?.name || 'N/A';

            const statsData = {
                victories,
                goalsFor,
                winRate,
                topScorer: topScorerName
            };

            setQuickStats(statsData);
            // ✅ Salvar no cache isolado por clube
            if (userClub) {
                localStorage.setItem(`${CACHE_KEY_STATS}_${userClub}`, JSON.stringify(statsData));
            }
        } catch (err) {
            console.error('Erro ao carregar estatísticas:', err);
        }
    };

    // Recarregar estatísticas quando a competição mudar
    useEffect(() => {
        if (games.length > 0) {
            loadQuickStats(selectedComp);
        }
    }, [selectedComp, games, standings]);

    const loadData = async () => {
        try {
            const [settingsRes, gamesRes, standingsRes] = await Promise.all([
                supabase.from('match_settings').select('*').eq('club_slug', userClub).maybeSingle(),
                supabase.from('match_games').select('*').eq('club_slug', userClub).order('date', { ascending: true }),
                supabase.from('match_standings').select('*').eq('club_slug', userClub).order('position', { ascending: true })
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
                
                // ✅ Encontrar e salvar próximo jogo no cache
                const foundNext = gamesRes.data.find((g: any) => {
                    const gameDate = new Date(g.date);
                    const now = new Date();
                    return (gameDate > now || g.status === 'live');
                });
                if (foundNext) {
                    setCachedNextGame(foundNext);
                    if (userClub) {
                        localStorage.setItem(`${CACHE_KEY_NEXT_GAME}_${userClub}`, JSON.stringify(foundNext));
                    }
                }
            } else {
                if (isZkTVDebug()) console.warn('⚠️ Nenhum jogo retornado do banco de dados');
            }

            if (standingsRes.error) {
                console.error('❌ Erro ao carregar standings:', standingsRes.error);
            }
            if (standingsRes.data) setStandings(standingsRes.data);

            // Recalcular stats após carregar todos os dados
            setTimeout(() => loadQuickStats(selectedComp), 200);
        } catch (error) {
            console.error('❌ Error loading football data:', error);
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

    // ✅ Jogo para exibição (Prioriza o real, fallback para cache)
    const displayGame = nextGame || cachedNextGame;

    // ✅ ESTABILIDADE: Evitar que a live saia e volte no mobile por flutuações de rede/banco
    useEffect(() => {
        if (isLiveActive) {
            setStableIsLiveActive(true);
            lastLiveStatusRef.current = true;
        } else {
            // Se a live cair, espera 4 segundos antes de realmente mostrar a tela de "Encerrada"
            // Isso cobre oscilações de sinal e atualizações de banco transientes
            const timer = setTimeout(() => {
                if (!lastLiveStatusRef.current) {
                    setStableIsLiveActive(false);
                }
            }, 10000); // Aumentado para 10s para maior estabilidade
            
            lastLiveStatusRef.current = false;
            return () => clearTimeout(timer);
        }
    }, [isLiveActive]);

    // ✅ BUSCAR EVENTOS E PLACAR REAL (VIA EDGE FUNCTION)
    const fetchLiveMatchData = useCallback(async (fixtureId: number) => {
        try {
            if (isZkTVDebug()) console.log('⚽ ZkTV: Sincronizando eventos do jogo via Edge Function...', fixtureId);
            
            const { data, error } = await supabase.functions.invoke('sync-match-events', {
                body: { fixtureId }
            });

            if (error) throw error;
            
            if (data?.match) {
                const match = data.match;
                setLiveScore({
                    home: match.goals.home ?? 0,
                    away: match.goals.away ?? 0
                });
                setMatchStatus(match.fixture.status.short);
                setElapsedTime(match.fixture.status.elapsed);
            }
        } catch (error) {
            console.warn('Erro ao sincronizar dados live via Edge Function:', error);
            // Fallback para os estados existentes se falhar
        }
    }, []);

    // ✅ LISTENER REALTIME PARA EVENTOS DO JOGO
    useEffect(() => {
        const fixtureId = displayGame?.api_fixture_id;
        if (!fixtureId) return;

        if (isZkTVDebug()) console.log('📡 ZkTV: Iniciando Realtime para eventos do fixture:', fixtureId);

        // Buscar eventos iniciais do banco
        supabase.from('match_events')
            .select('*')
            .eq('fixture_id', fixtureId)
            .order('elapsed', { ascending: false })
            .limit(20)
            .then(({ data }) => {
                if (data) setLiveEvents(data);
            });

        const channel = supabase.channel(`match-events-${fixtureId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'match_events',
                filter: `fixture_id=eq.${fixtureId}`
            }, (payload) => {
                if (isZkTVDebug()) console.log('⚽ NOVO EVENTO RECEBIDO:', payload.new);
                setLiveEvents(prev => [payload.new, ...prev].slice(0, 20));
                
                // Toast especial para gols
                if (payload.new.type === 'Goal') {
                    toast.success(`GOOOOL! ${payload.new.player_name} (${payload.new.elapsed}')`, {
                        icon: '⚽',
                        duration: 5000,
                        position: 'top-center'
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [displayGame?.api_fixture_id]);

    useEffect(() => {
        const fixtureId = displayGame?.api_fixture_id;
        if (fixtureId && (isLiveActive || displayGame.status === 'live')) {
            fetchLiveMatchData(fixtureId);
            const interval = setInterval(() => fetchLiveMatchData(fixtureId), 30000); // 30s
            return () => clearInterval(interval);
        }
    }, [displayGame?.api_fixture_id, isLiveActive, fetchLiveMatchData]);

    // Agrupar classificações por competição
    const groupedStandings = useMemo(() => {
        const groups: Record<string, MatchStanding[]> = {};
        standings.forEach(s => {
            const comp = s.competition || 'Outros';
            if (!groups[comp]) groups[comp] = [];
            groups[comp].push(s);
        });

        // Ordenar cada grupo por posição
        Object.values(groups).forEach(group => {
            group.sort((a, b) => a.position - b.position);
        });

        const sortedEntries = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));

        // Tentar definir a competição inicial se ainda não estiver definida
        if (sortedEntries.length > 0 && !selectedStandingComp) {
            setSelectedStandingComp(sortedEntries[0][0]);
        }

        return sortedEntries;
    }, [standings, selectedStandingComp]);

    // Renderizar tabela de classificação de um grupo
    // Função auxiliar para obter a cor da zona baseada na posição e competição
    const getZoneColor = (position: number, competition: string) => {
        const comp = competition.toLowerCase();
        if (!comp.includes('série a') && !comp.includes('brasileirão') && !comp.includes('brasileiro')) return '';

        if (position <= 4) return 'bg-blue-600'; // Libertadores
        if (position <= 6) return 'bg-cyan-500'; // Pré-Libertadores
        if (position >= 7 && position <= 12) return 'bg-amber-500'; // Sul-Americana
        if (position >= 17) return 'bg-rose-600'; // Rebaixamento
        return '';
    };

    const renderStandingTable = (competitionName: string, competitionStandings: MatchStanding[]) => (
        <div key={competitionName} className="mb-12 last:mb-0">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-indigo-600 rounded-full" />
                <h3 className="text-xl font-black text-white uppercase tracking-wider">{competitionName}</h3>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/5 bg-zinc-900/50 backdrop-blur-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/5">
                            <th className="px-3 py-4 text-[11px] font-black text-white/40 uppercase tracking-widest text-center">Pos</th>
                            <th className="px-6 py-4 text-[11px] font-black text-white/40 uppercase tracking-widest text-left">Time</th>
                            <th className="px-6 py-4 text-[11px] font-black text-white/40 uppercase tracking-widest text-center">Pts</th>
                            <th className="px-6 py-4 text-[11px] font-black text-white/40 uppercase tracking-widest text-center">J</th>
                            <th className="px-6 py-4 text-[11px] font-black text-white/40 uppercase tracking-widest text-center">V</th>
                            <th className="px-6 py-4 text-[11px] font-black text-white/40 uppercase tracking-widest text-center">E</th>
                            <th className="px-6 py-4 text-[11px] font-black text-white/40 uppercase tracking-widest text-center">D</th>
                            <th className="px-6 py-4 text-[11px] font-black text-white/40 uppercase tracking-widest text-center">SG</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {competitionStandings.map((team) => (
                            <tr
                                key={team.id}
                                className={`group hover:bg-white/5 transition-colors ${team.is_primary_team ? 'bg-indigo-600/10' : ''}`}
                            >
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white ${getZoneColor(team.position, competitionName) || 'bg-white/5 text-white/40'}`}>
                                            {team.position}º
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-white/5 group-hover:scale-110 transition-transform flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                                            <TeamLogo
                                                teamName={team.team}
                                                customLogo={team.logo}
                                                size="sm"
                                            />
                                        </div>
                                        <span className={`font-bold text-sm sm:text-base ${team.is_primary_team ? 'text-indigo-400' : 'text-white'}`}>
                                            {team.team}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center font-black text-white">{team.points}</td>
                                <td className="px-6 py-4 text-center font-bold text-white/60">{team.played}</td>
                                <td className="px-6 py-4 text-center text-white/60">{team.won}</td>
                                <td className="px-6 py-4 text-center text-white/60">{team.drawn}</td>
                                <td className="px-6 py-4 text-center text-white/60">{team.lost}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold ${team.goals_for - team.goals_against >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                        {team.goals_for - team.goals_against > 0 ? '+' : ''}{team.goals_for - team.goals_against}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // Renderizar cards de classificação mobile de um grupo
    const renderMobileStandingGroup = (competitionName: string, competitionStandings: MatchStanding[]) => (
        <div key={`mobile-${competitionName}`} className="mb-10 last:mb-0">
            <div className="flex items-center gap-3 mb-4 px-1">
                <div className="w-1 h-6 bg-indigo-600 rounded-full" />
                <h3 className="text-lg font-black text-white uppercase tracking-wider">{competitionName}</h3>
            </div>

            <div className="space-y-3">
                {competitionStandings.map((team) => (
                    <div
                        key={team.id}
                        className={`p-4 rounded-xl border-l-[4px] border border-white/5 bg-zinc-900/50 backdrop-blur-sm ${team.is_primary_team ? 'ring-1 ring-indigo-500/30' : ''} ${getZoneColor(team.position, competitionName) ? getZoneColor(team.position, competitionName).replace('bg-', 'border-') : 'border-l-white/5'}`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <span className={`text-2xl font-black italic min-w-[32px] text-center ${getZoneColor(team.position, competitionName) ? getZoneColor(team.position, competitionName).replace('bg-', 'text-') : 'text-white/20'}`}>
                                    {team.position}º
                                </span>
                                <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden shadow-xl ring-4 ring-black/20">
                                    <TeamLogo
                                        teamName={team.team}
                                        customLogo={team.logo}
                                        size="md"
                                    />
                                </div>
                                <div className="ml-1">
                                    <h4 className={`font-black text-base leading-tight ${team.is_primary_team ? 'text-indigo-400' : 'text-white'}`}>
                                        {team.team}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{team.points} PTS</span>
                                        <div className="w-1 h-1 rounded-full bg-white/20" />
                                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{team.played} JOGOS</span>
                                    </div>
                                </div>
                            </div>
                            <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${team.goals_for - team.goals_against >= 0 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                SG {team.goals_for - team.goals_against > 0 ? '+' : ''}{team.goals_for - team.goals_against}
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/5">
                            <div className="text-center">
                                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">V</div>
                                <div className="text-xs font-bold text-white">{team.won}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">E</div>
                                <div className="text-xs font-bold text-white">{team.drawn}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">D</div>
                                <div className="text-xs font-bold text-white">{team.lost}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">SG</div>
                                <div className="text-xs font-bold text-white">{team.goals_for - team.goals_against}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

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

    if (isPageLoading) {
        return (
            <div className="min-h-screen bg-[#030712] flex flex-col pt-16 text-white font-sans">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-pulse">
                    <div className="text-white/40 text-sm font-bold animate-bounce">CARREGANDO ZK TV...</div>
                    <div className="w-48 h-8 bg-white/5 rounded-full" />
                    <div className="w-full max-w-3xl aspect-video bg-white/5 rounded-3xl" />
                    <div className="w-full max-w-4xl space-y-4">
                        <div className="h-4 bg-white/5 rounded-full w-3/4 mx-auto" />
                        <div className="h-4 bg-white/5 rounded-full w-1/2 mx-auto" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#030712] flex flex-col pt-16 text-white font-sans selection:bg-indigo-500/30">
            <Header />

            {/* Hero Section / Live Stream */}
            <section className="relative pt-24 sm:pt-28 lg:pt-32 pb-12 sm:pb-16 lg:pb-20 overflow-visible">
                {/* Background Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-full bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none -z-10" />

                <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center gap-8 sm:gap-10 lg:gap-12">
                        <div className="w-full text-center min-w-0 px-2 sm:px-0 overflow-hidden">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-wrap items-center justify-center gap-3 mb-6"
                            >
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-sm font-bold">
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

                                {/* Botão Copiar Link Profissional */}
                                <button
                                    onClick={handleCopyLink}
                                    className={`inline-flex items-center gap-2 px-4 py-2 border rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95 ${
                                        isLinkCopied 
                                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'
                                    }`}
                                >
                                    {isLinkCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                                    {isLinkCopied ? 'COPIADO' : 'COPIAR LINK'}
                                </button>
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-black tracking-tight mb-6 uppercase italic break-words max-w-full"
                            >
                                {isLiveActive ? (
                                    <>
                                        {(activeStream?.title || 'Ao Vivo').split(' x ')[0]}
                                        <span className="text-indigo-500">
                                            {activeStream?.title?.includes(' x ') ? ` x ${activeStream.title.split(' x ')[1]}` : ''}
                                        </span>
                                    </>
                                ) : (
                                    <>ZK <span className="text-indigo-500">TV</span></>
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
                                    : 'Acompanhe as transmissões ao vivo, estatísticas, jogos e muito mais em um só lugar premium para os maiores fãs.'
                                }
                            </motion.p>

                            {/* Extra 'Próximo Jogo' top card was removed here to avoid duplication with the video placeholder card */}

                        </div>
                        {/* Video Player Container */}
                        <motion.div
                            ref={videoContainerRef}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            onDoubleClick={handleDoubleClick}
                            onTouchStart={() => isMobile && showControlsTemporarily()}
                            className={`${(isFullscreen || isPip) ? 'fixed inset-0 z-[100] w-screen h-screen bg-black rounded-none' : 'w-full max-w-[680px] lg:max-w-[760px] mx-auto shrink-0 aspect-video bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl'} overflow-hidden relative cursor-pointer group ${isDockedChat ? 'mobile-video-container docked-chat-active' : ''}`}
                            title={isMobile ? "Toque duas vezes para tela cheia" : "Duplo clique para tela cheia"}
                        >
                            {/* LIVE SCORE BAR (ESTILO PREMIER LEAGUE / CAZÉTV) */}
                            {isLiveActive && liveScore && (
                                <motion.div 
                                    initial={{ y: -50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="absolute top-0 left-0 right-0 z-[60] p-2 sm:p-4 bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none"
                                >
                                    <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
                                        <div className="flex items-center justify-center gap-2 sm:gap-6 w-full">
                                            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-tighter">
                                                    {matchStatus === 'HT' ? 'Intervalo' : matchStatus === 'FT' ? 'Encerrado' : `LIVE ${elapsedTime}'`}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3 sm:gap-8 bg-black/90 backdrop-blur-xl px-6 sm:px-12 py-3 sm:py-4 rounded-[2rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
                                                <div className="flex items-center gap-3 sm:gap-5">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-white font-black text-xs sm:text-lg uppercase tracking-tight leading-none">
                                                            {displayGame?.is_home ? (settings?.team_name?.substring(0,3) || clubInfo?.name?.substring(0, 3)) : displayGame?.opponent?.substring(0,3)}
                                                        </span>
                                                        <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-0.5">CASA</span>
                                                    </div>
                                                    <div className="w-12 sm:w-16 h-10 sm:h-14 bg-white/5 flex items-center justify-center rounded-2xl text-xl sm:text-3xl font-black text-white shadow-inner border border-white/5">
                                                        {displayGame?.is_home ? liveScore.home : liveScore.away}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="text-white/20 font-black italic text-xs">VS</div>
                                                    <div className="h-4 w-[1px] bg-white/10"></div>
                                                </div>

                                                <div className="flex items-center gap-3 sm:gap-5">
                                                    <div className="w-12 sm:w-16 h-10 sm:h-14 bg-white/5 flex items-center justify-center rounded-2xl text-xl sm:text-3xl font-black text-white shadow-inner border border-white/5">
                                                        {displayGame?.is_home ? liveScore.away : liveScore.home}
                                                    </div>
                                                    <div className="flex flex-col items-start">
                                                        <span className="text-white/60 font-black text-xs sm:text-lg uppercase tracking-tight leading-none">
                                                            {displayGame?.is_home ? displayGame?.opponent?.substring(0,3) : (settings?.team_name?.substring(0,3) || clubInfo?.name?.substring(0, 3))}
                                                        </span>
                                                        <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-0.5">FORA</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* MINI TIMELINE NO HEADER (DESKTOP) */}
                                        {!isMobile && liveEvents.length > 0 && (
                                            <motion.div 
                                                initial={{ y: -20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                className="hidden lg:flex items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 hover:bg-white/10 transition-colors cursor-default"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs">
                                                        {liveEvents[0].type === 'Goal' ? '⚽' : liveEvents[0].type === 'Card' ? '🟨' : '🔄'}
                                                    </span>
                                                    <span className="text-[10px] font-black text-white uppercase tracking-tight">
                                                        Último Evento: {liveEvents[0].player_name} ({liveEvents[0].elapsed}')
                                                    </span>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                            <div className="relative w-full h-full flex">
                                {stableIsLiveActive ? (
                                    <>
                                        {/* Renderiza o player principal enquanto estiver estável */}
                                        <LiveViewer
                                            streamId={activeStream?.id}
                                            channelName={activeStream?.channel_name || 'ZkOficial'}
                                            hlsUrl={activeStream?.hls_url}
                                            isActive={isLiveActive}
                                            isAdmin={currentUser?.is_admin}
                                            isVip={isVip}
                                            showPerf={showPerf}
                                            showOfflineMessage={false}
                                            fitMode={videoFitMode}
                                        />
                                    </>
                                ) : settings?.live_url && settings.live_url.includes('/live/') ? (
                                    <LiveViewer
                                        channelName="ZkOficial"
                                        showOfflineMessage={false}
                                        isAdmin={currentUser?.is_admin}
                                        isVip={isVip}
                                        showPerf={showPerf}
                                        fitMode={videoFitMode}
                                    />
                                ) : settings?.live_url ? (
                                    <div className="w-full h-full bg-black">
                                        <iframe
                                            src={settings.live_url}
                                            className="w-full h-full border-0"
                                            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center z-30">
                                        {!userClub || isPageLoading ? (
                                            <div className="w-full max-w-sm mx-auto p-6">
                                                <NextMatchSkeleton />
                                            </div>
                                        ) : displayGame ? (
                                            <div className="w-full max-w-sm mx-auto animate-in fade-in zoom-in duration-700 py-2">
                                                <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
                                                    <span className={`px-2 sm:px-3 py-1 rounded-full font-black uppercase tracking-widest text-[9px] sm:text-[10px] ${
                                                        isLiveActive 
                                                        ? "bg-red-500/20 border border-red-500/30 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse" 
                                                        : "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                                                    }`}>
                                                        {isLiveActive ? "Partida Ao Vivo" : "Próximo Jogo"}
                                                    </span>
                                                    <span className="text-[9px] sm:text-[10px] font-black text-white/40 uppercase tracking-widest truncate">{displayGame.competition}</span>
                                                </div>

                                                <div className="flex items-center justify-between gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
                                                    <div className="flex flex-col items-center flex-1 min-w-0">
                                                        <TeamLogo
                                                            teamName={clubInfo?.name || (userClub === 'cruzeiro' ? 'Cruzeiro' : 'Atlético-MG')}
                                                            customLogo={clubInfo?.logo_url}
                                                            size="lg"
                                                            showName={false}
                                                            className="mb-2 sm:mb-3"
                                                        />
                                                        <span className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider truncate w-full">{clubInfo?.name || (userClub === 'cruzeiro' ? 'Cruzeiro' : 'Atlético-MG')}</span>
                                                    </div>

                                                    <div className="flex flex-col items-center flex-shrink-0">
                                                        <div className="text-lg sm:text-xl lg:text-2xl font-black italic text-white/10 uppercase mb-1">VS</div>
                                                        <div className="h-1 w-6 sm:w-8 bg-blue-500/20 rounded-full" />
                                                    </div>

                                                    <div className="flex flex-col items-center flex-1 min-w-0">
                                                        <TeamLogo
                                                            teamName={displayGame.opponent}
                                                            customLogo={displayGame.opponent_logo}
                                                            size="lg"
                                                            showName={false}
                                                            className="mb-2 sm:mb-3"
                                                        />
                                                        <span className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider truncate w-full px-1">{displayGame.opponent}</span>
                                                    </div>
                                                </div>

                                                <div className="pt-3 sm:pt-4 lg:pt-6 border-t border-white/5 flex items-center justify-center gap-4 sm:gap-6 lg:gap-8 pb-2">
                                                    <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-black text-blue-300">
                                                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                                        <span>{new Date(displayGame.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-black text-blue-300">
                                                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                                        <span>{new Date(displayGame.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : isPageLoading ? (
                                            <div className="w-full max-w-sm mx-auto p-6">
                                                <NextMatchSkeleton />
                                            </div>
                                        ) : (
                                            <div className="text-center px-6 max-w-sm animate-in fade-in zoom-in duration-700">
                                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-lg border border-white/5 mx-auto">
                                                    <Tv className="w-10 h-10 text-slate-400" />
                                                </div>
                                                <h2 className="text-2xl font-black text-white mb-3">Transmissão Encerrada</h2>
                                                <p className="text-slate-400 text-sm mb-6">Obrigado por nos acompanhar! Fique ligado nas próximas lives.</p>
                                                <button
                                                    onClick={() => window.location.reload()}
                                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all text-sm"
                                                >
                                                    🔄 Recarregar
                                                </button>
                                            </div>
                                        )}
                                    </div>
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
                                                    viewerCount={currentViewerCount}
                                                    onToggleAudio={() => {
                                                        const video = (window as any).activeVideoElement || (window as any).hlsVideoElement;
                                                        if (video) {
                                                            video.muted = !video.muted;
                                                            if (!video.muted) {
                                                                video.volume = 1.0;
                                                                video.play().catch(() => {});
                                                            }
                                                        }
                                                    }}
                                                    isAudioEnabled={(() => {
                                                        const video = (window as any).activeVideoElement || (window as any).hlsVideoElement;
                                                        return video ? !video.muted : false;
                                                    })()}
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
                                <div 
                                    className="w-[400px] min-w-[350px] max-w-[45vw] h-full bg-black/90 backdrop-blur-md border-l border-white/10 flex flex-col pointer-events-auto shadow-2xl"
                                    style={{ paddingRight: 'env(safe-area-inset-right)' }}
                                >
                                    {/* O cabeçalho foi movido diretamente para o componente Chat via ChatSlot */}
                                    <div className="flex-1 overflow-hidden flex flex-col">
                                        <div className="flex-1 overflow-hidden">
                                            <ChatSlot 
                                                id="zktv-mobile-landscape-docked-chat" 
                                                priority={90} 
                                                className="h-full" 
                                                showHeader={true}
                                                onClose={() => {
                                                    setIsDockedChat(false);
                                                    setIsChatOpen(false);
                                                    setIsChatManuallyClosed(true);
                                                }}
                                            />
                                        </div>
                                        {/* Enquete e Link Fixado em destaque no mobile landscape */}
                                        <div className="px-3 py-2 border-t border-white/10 bg-black/40">
                                            <PinnedLinkOverlay streamId={activeStream.id} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                        
                        {/* ✅ LIVE TIMELINE INTEGRADA (ABAIXO DO PLAYER) */}
                        {isLiveActive && liveEvents.length > 0 && (
                            <div className="w-full max-w-[760px] mx-auto hidden sm:block">
                                <LiveTimeline events={liveEvents} />
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Chat Overlay (Desktop e Mobile não fullscreen) - NÃO renderizar se estiver em fullscreen */}
            {isChatOpen && activeStream && !isDockedChat && !isFullscreen && (
                <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] bg-black/95 backdrop-blur-md border-l border-white/10 z-[9999] flex flex-col shadow-2xl">
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="flex-1 min-h-0 h-full">
                            <ChatSlot 
                                id="zktv-overlay-chat" 
                                priority={80} 
                                className="h-full" 
                                showHeader={true}
                                onClose={() => setIsChatOpen(false)}
                            />
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
            <section className="py-6 sm:py-8 lg:py-12 relative pb-4 tracking-tight">
                <div className="max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Main Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">

                        {/* Sidebar: Bolão, Next Match & Stats */}
                        <div className="lg:col-span-1 space-y-4 sm:space-y-6 lg:space-y-8">
                            
                            {/* Card: Bolão Ativo (Exclusivo Galo ou se houver bolão ativo geral) */}
                            {activePool && activePool.is_active && (
                                <motion.div 
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="glass-panel p-6 rounded-[2rem] text-center relative overflow-hidden group hover:bg-white/5 transition-all duration-300 border-2 border-emerald-500/30 shadow-2xl shadow-emerald-900/30"
                                >
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 animate-pulse"></div>
                                    <div className="w-12 h-12 mx-auto bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 rounded-full flex items-center justify-center mb-3 text-emerald-300 group-hover:scale-110 transition-transform relative">
                                        <Target className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-black text-white mb-4 uppercase tracking-tight">Bolão Ativo</h3>
                                    
                                    <div className="mb-6 flex items-center justify-center gap-4">
                                        <div className="flex flex-col items-center gap-1">
                                            <TeamLogo teamName={activePool.home_team} customLogo={activePool.home_team_logo} size="sm" showName={false} />
                                            <span className="text-[8px] font-black text-white uppercase tracking-tighter truncate max-w-[50px]">{activePool.home_team}</span>
                                        </div>
                                        <div className="text-[10px] font-black italic text-slate-700">VS</div>
                                        <div className="flex flex-col items-center gap-1">
                                            <TeamLogo teamName={activePool.away_team} customLogo={activePool.away_team_logo} size="sm" showName={false} />
                                            <span className="text-[8px] font-black text-white uppercase tracking-tighter truncate max-w-[50px]">{activePool.away_team}</span>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-emerald-500/15 via-emerald-600/10 to-emerald-700/15 border border-emerald-500/30 rounded-2xl p-4 mb-4">
                                        <div className="flex items-center justify-center gap-1.5 mb-1 opacity-70">
                                            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                                            <p className="text-emerald-400 text-[9px] font-black uppercase tracking-widest">Prêmio Atual</p>
                                        </div>
                                        <p className="text-2xl font-black text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                                            R$ {((activePool.total_pool_amount || 0) * 0.70 + (activePool.accumulated_amount || 0)).toFixed(2).replace('.', ',')}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setShowPoolModal(true)}
                                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-600/20"
                                    >
                                        PARTICIPAR AGORA
                                    </button>
                                </motion.div>
                            )}

                            {/* Next Match Card - Escondido no mobile */}
                            <div className="hidden md:block bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-4 sm:p-6 lg:p-8 rounded-[2rem] relative overflow-visible group pb-6 sm:pb-8">
                                <div className="absolute top-0 right-0 p-4 sm:p-6 lg:p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                    <Shield className="w-24 sm:w-32 h-24 sm:h-32 text-blue-500" />
                                </div>

                                <h3 className={`text-xs sm:text-sm font-bold uppercase tracking-widest mb-3 sm:mb-4 lg:mb-6 ${isLiveActive ? 'text-red-500 animate-pulse' : 'text-blue-500'}`}>
                                    {isLiveActive ? 'Partida Ao Vivo' : 'Próximo Jogo'}
                                </h3>

                                {displayGame ? (
                                    <>
                                        <div className="flex items-center justify-between mb-3 sm:mb-4 lg:mb-6 gap-2 sm:gap-4">
                                            <div className="text-center flex-1 min-w-0">
                                                <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg font-black text-white text-xs sm:text-sm lg:text-base ${
                                                    userClub === 'cruzeiro' 
                                                    ? 'bg-blue-600 shadow-blue-600/20' 
                                                    : 'bg-slate-900 border border-slate-700 shadow-none'
                                                }`}>
                                                    {clubInfo?.name?.substring(0, 3).toUpperCase() || (userClub === 'cruzeiro' ? "CRU" : "CAM")}
                                                </div>
                                                <span className="text-xs sm:text-sm font-bold block truncate">{settings?.team_name || clubInfo?.name || (userClub === 'cruzeiro' ? "Cruzeiro" : "Atlético-MG")}</span>
                                            </div>
                                            <div className="px-1 sm:px-2 lg:px-4 text-lg sm:text-xl lg:text-2xl font-black italic text-slate-700 flex-shrink-0">VS</div>
                                            <div className="text-center flex-1 min-w-0">
                                                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-slate-800 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3 border border-slate-700 font-black text-slate-400 text-xs sm:text-sm lg:text-base">
                                                    {displayGame.opponent.substring(0, 3).toUpperCase()}
                                                </div>
                                                <span className="text-xs sm:text-sm font-bold block truncate px-1">{displayGame.opponent}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 lg:pt-6 border-t border-slate-800/50 pb-2">
                                            <div className="flex items-center gap-2 sm:gap-3 text-slate-300">
                                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                                                <span className="text-xs sm:text-sm break-words">{new Date(displayGame.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-3 text-slate-300">
                                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                                                <span className="text-xs sm:text-sm">{new Date(displayGame.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h</span>
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-3 text-slate-300">
                                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                                                <span className="text-xs sm:text-sm break-words">{displayGame.venue}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : isPageLoading ? (
                                    <NextMatchSkeleton />
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

                                {isPageLoading && quickStats.victories === 0 ? (
                                    <StatsSkeleton />
                                ) : (
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
                                )}
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
                                {!isGaloVisitor && (
                                    <button
                                        onClick={() => setActiveTab('clips')}
                                        className={`flex-1 sm:flex-none px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-bold transition-all ${activeTab === 'clips' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        Clipes
                                    </button>
                                )}
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
                                                                        <span className="block sm:inline">{clubInfo?.name || (userClub === 'cruzeiro' ? 'Cruzeiro' : 'Atlético-MG')}</span>
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
                                                        // Se não houver resultado do bolão, mostrar últimos jogos
                                                        recentGames.map(game => (
                                                            <div key={game.id} className="p-3 sm:p-4 bg-slate-950/40 border border-slate-900 rounded-xl sm:rounded-2xl transition-all hover:bg-slate-900/40">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <TeamLogo 
                                                                                teamName={game.is_home 
                                                                                    ? (game.club_slug === 'cruzeiro' ? 'Cruzeiro' : 'Atlético-MG') 
                                                                                    : game.opponent} 
                                                                                customLogo={game.is_home ? undefined : game.opponent_logo} 
                                                                                size="xs" 
                                                                            />
                                                                            <span className={`text-[10px] sm:text-xs font-bold truncate ${game.is_home ? 'text-blue-400' : 'text-slate-300'}`}>
                                                                                {game.is_home 
                                                                                    ? (game.club_slug === 'cruzeiro' ? 'Cruzeiro' : 'Atlético-MG') 
                                                                                    : game.opponent}
                                                                            </span>
                                                                        </div>

                                                                        <span className="text-[10px] text-slate-600 font-black italic">VS</span>

                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <TeamLogo 
                                                                                teamName={!game.is_home 
                                                                                    ? (game.club_slug === 'cruzeiro' ? 'Cruzeiro' : 'Atlético-MG') 
                                                                                    : game.opponent} 
                                                                                customLogo={!game.is_home ? undefined : game.opponent_logo} 
                                                                                size="xs" 
                                                                            />
                                                                            <span className={`text-[10px] sm:text-xs font-bold truncate ${!game.is_home ? 'text-blue-400' : 'text-slate-300'}`}>
                                                                                {!game.is_home 
                                                                                    ? (game.club_slug === 'cruzeiro' ? 'Cruzeiro' : 'Atlético-MG') 
                                                                                    : game.opponent}
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
                                            {standings.length === 0 ? (
                                                <div className="text-center py-12 bg-slate-900/50 rounded-3xl border border-slate-800">
                                                    <Trophy className="w-12 h-12 text-slate-700 mx-auto mb-4 opacity-20" />
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest">Tabela indisponível</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-8">
                                                    {/* Menu de Competições */}
                                                    <div className="flex flex-wrap gap-2 pb-4 border-b border-white/5">
                                                        {groupedStandings.map(([comp]) => (
                                                            <button
                                                                key={comp}
                                                                onClick={() => setSelectedStandingComp(comp)}
                                                                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all relative overflow-hidden group ${selectedStandingComp === comp
                                                                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 scale-105 z-10'
                                                                        : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                                                                    }`}
                                                            >
                                                                {selectedStandingComp === comp && (
                                                                    <motion.div
                                                                        layoutId="activeTabGlow"
                                                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"
                                                                    />
                                                                )}
                                                                {comp}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Legenda de Cores (Apenas para Brasileiro/Série A) */}
                                                    {(selectedStandingComp?.toLowerCase().includes('brasileir') || selectedStandingComp?.toLowerCase().includes('série a')) && (
                                                        <div className="flex flex-wrap gap-4 px-2 py-3 bg-white/5 rounded-2xl border border-white/5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-blue-600" />
                                                                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Libertadores</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-cyan-500" />
                                                                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Pré-Libertadores</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                                                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Sul-Americana</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-rose-600" />
                                                                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Rebaixamento</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="space-y-12">
                                                        {isMobile
                                                            ? groupedStandings
                                                                .filter(([comp]) => !selectedStandingComp || comp === selectedStandingComp)
                                                                .map(([comp, teams]) => renderMobileStandingGroup(comp, teams))
                                                            : groupedStandings
                                                                .filter(([comp]) => !selectedStandingComp || comp === selectedStandingComp)
                                                                .map(([comp, teams]) => renderStandingTable(comp, teams))
                                                        }
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

            {!isGaloVisitor && <Footer />}

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
