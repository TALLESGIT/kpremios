// Unified Public Live Stream Page v2
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Eye, Share2, X, Trophy, Calendar, ChevronRight, MessageCircle, Crown, Tv, Minimize2, Maximize2, MessageSquare, Shield, Activity, Clock, MapPin, Zap, Target, Bell, Play, Users, Info, Gamepad2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useSocket } from '../hooks/useSocket';
import { LiveViewer } from '../components/LiveViewer';
import { ViewerCountDisplay } from '../components/live/ViewerCountDisplay';
import { ChatSlot } from '../features/chat/ChatSlot';
import { FloatingChatButton } from '../features/chat/FloatingChatButton';
import { ChatDrawer } from '../features/chat/ChatDrawer';
import PollDisplay from '../components/live/PollDisplay';
import PinnedLinkOverlay from '../components/live/PinnedLinkOverlay';
import MobileLiveControls from '../components/live/MobileLiveControls';
import VipMessageOverlay from '../components/live/VipMessageOverlay';
import VipAlertOverlay from '../components/live/VipAlertOverlay';
import VipSubscriptionModal from '../components/vip/VipSubscriptionModal';
import { CastButton } from '../components/CastButton';
import { CruzeiroGame, CruzeiroStanding } from '../types';
import { useRegisterStreamId } from '../features/chat/useRegisterStreamId';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_LIVE_CHANNEL } from '../config/constants';

interface LiveStream {
  id: string;
  title: string;
  description?: string | null;
  channel_name: string;
  is_active: boolean;
  viewer_count?: number;
  created_at?: string;
  hls_url?: string | null;
}

const isLivePageDebug = () => (import.meta as any).env?.DEV === true || (import.meta as any).env?.VITE_DEBUG_LIVE === '1';
const VIEWER_COUNT_THROTTLE_MS = 2000;

const PublicLiveStreamPage: React.FC = () => {
  const { channelName } = useParams<{ channelName: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const showPerf = searchParams.get('perf') === '1';
  const { user } = useAuth();
  const { currentUser } = useData();
  const [stream, setStream] = useState<LiveStream | null>(null);
  const streamId = stream?.id;
  const lastViewerCountUpdateRef = useRef<number>(0);

  // ✅ REGISTRAR STREAM ID GLOBALMENTE
  useRegisterStreamId(streamId);

  // ✅ Socket.io
  const { socket, isConnected, on, off, joinStream, leaveStream } = useSocket({
    streamId: streamId || undefined,
    autoConnect: !!streamId
  });

  const [loading, setLoading] = useState(true);
  const [currentViewerCount, setCurrentViewerCount] = useState(0);
  const trackViewerExecutedRef = useRef(false);
  const [sessionId] = useState(() => {
    const key = `live_session_${channelName}`;
    const saved = localStorage.getItem(key);
    if (saved) return saved;
    const nuevo = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(key, nuevo);
    return nuevo;
  });

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDockedChat, setIsDockedChat] = useState(false); // State driven like ZkTVPage
  const [videoFitMode, setVideoFitMode] = useState<'contain' | 'cover'>('contain');
  const [showControls, setShowControls] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [upcomingGames, setUpcomingGames] = useState<CruzeiroGame[]>([]);
  const [standings, setStandings] = useState<CruzeiroStanding[]>([]);
  const [isVip, setIsVip] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);

  // Verificar status VIP
  useEffect(() => {
    if (user && currentUser) {
      setIsVip(currentUser.is_vip || false);
    }
  }, [user, currentUser]);

  // Handler para duplo clique
  const handleDoubleClick = () => {
    if (!videoContainerRef.current) return;
    if (isFullscreen) {
      if (document.exitFullscreen) document.exitFullscreen();
    } else {
      if (videoContainerRef.current.requestFullscreen) videoContainerRef.current.requestFullscreen();
    }
  };

  // Handler para fullscreen
  const handleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (isFullscreen) {
      if (document.exitFullscreen) document.exitFullscreen();
    } else {
      if (videoContainerRef.current.requestFullscreen) videoContainerRef.current.requestFullscreen();
    }
  };

  const updateViewerCount = useCallback(async (streamId: string) => {
    try {
      const { data: countData, error } = await supabase.rpc(
        'count_active_unique_viewers',
        { p_stream_id: streamId }
      );
      if (error) return;
      const activeCount = Number(countData) || 0;
      setCurrentViewerCount(activeCount);
    } catch (e) { }
  }, []);

  const streamRef = useRef<LiveStream | null>(null);
  useEffect(() => { streamRef.current = stream; }, [stream]);

  const trackViewer = useCallback(async () => {
    const currentStream = streamRef.current;
    if (!currentStream || !currentStream.is_active) return;

    try {
      const now = new Date().toISOString();
      await supabase
        .from('viewer_sessions')
        .upsert(
          {
            stream_id: currentStream.id,
            session_id: sessionId,
            user_id: user?.id || null,
            is_active: currentStream.is_active,
            user_agent: navigator.userAgent,
            last_heartbeat: now,
            started_at: now
          },
          { onConflict: 'session_id,stream_id' }
        );
    } catch (e) {
      console.error('Error tracking viewer', e);
    }
  }, [sessionId, user?.id]);

  // Heartbeat logic
  const heartbeatInitializedRef = useRef(false);
  const updateHeartbeat = useCallback(async () => {
    const currentStream = streamRef.current;
    if (!currentStream || !currentStream.is_active) return;

    try {
      if (!heartbeatInitializedRef.current) {
        await trackViewer();
        heartbeatInitializedRef.current = true;
        return;
      }
      const { error } = await supabase.rpc('update_viewer_heartbeat', { p_session_id: sessionId });
      if (error) {
        heartbeatInitializedRef.current = false;
        await trackViewer();
        heartbeatInitializedRef.current = true;
      }
    } catch (e) {
      heartbeatInitializedRef.current = false;
    }
  }, [sessionId, trackViewer]);

  useEffect(() => {
    if (isLivePageDebug()) console.log('🚀 PublicLiveStreamPage carregada (Versão Unificada v2)');
    if (channelName) { loadStream(); loadZkTVData(); }
  }, [channelName]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!streamId || !socket || !isConnected) return;
    joinStream(streamId);

    const handleStreamUpdate = (data: { streamId: string; updates: Partial<LiveStream> }) => {
      if (data.streamId !== streamId) return;
      const updated = { ...streamRef.current, ...data.updates } as LiveStream;
      setStream(updated);
      if (data.updates.viewer_count !== undefined) setCurrentViewerCount(data.updates.viewer_count);

      if (!updated.is_active && streamRef.current?.is_active) {
        setIsChatOpen(false);
        toast.error('A transmissão foi encerrada.');
      }
    };

    const handleViewerCountUpdate = (data: { streamId: string; count: number }) => {
      if (data.streamId !== streamId) return;
      const now = Date.now();
      if (now - lastViewerCountUpdateRef.current >= VIEWER_COUNT_THROTTLE_MS) {
        lastViewerCountUpdateRef.current = now;
        setCurrentViewerCount(data.count);
      }
    };

    on('stream-updated', handleStreamUpdate);
    on('viewer-count-updated', handleViewerCountUpdate);

    return () => {
      off('stream-updated', handleStreamUpdate);
      off('viewer-count-updated', handleViewerCountUpdate);
      leaveStream(streamId);
    };
  }, [streamId, socket, isConnected, joinStream, leaveStream, on, off]);

  useEffect(() => {
    if (!stream) return;
    if (stream.is_active) {
      trackViewer();
      updateViewerCount(stream.id);
    }
    setCurrentViewerCount(stream.viewer_count || 0);
  }, [stream?.id, stream?.is_active, trackViewer, updateViewerCount]);

  useEffect(() => {
    const currentStream = streamRef.current;
    if (!currentStream || !currentStream.is_active) return;
    const initialDelay = Math.floor(Math.random() * 5000);
    const initialTimeout = setTimeout(() => updateHeartbeat(), initialDelay);
    const baseInterval = 10000;
    const randomOffset = Math.floor(Math.random() * 4000) - 2000;
    const intervalId = setInterval(() => {
      if (streamRef.current?.is_active) updateHeartbeat();
    }, baseInterval + randomOffset);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [updateHeartbeat]);

  const loadStream = async () => {
    setLoading(true);
    try {
      const { getLiveStreamByChannel } = await import('../services/cachedLiveService');
      const data = await getLiveStreamByChannel(channelName || DEFAULT_LIVE_CHANNEL);
      if (!data) {
        toast.error('Transmissão não encontrada');
        navigate('/');
        return;
      }
      setStream(data);
    } catch (error) {
      toast.error('Erro ao carregar transmissão');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadZkTVData = async () => {
    const { data: games } = await supabase.from('cruzeiro_games').select('*').eq('status', 'upcoming').order('date', { ascending: true }).limit(3);
    const { data: table } = await supabase.from('cruzeiro_standings').select('*').order('position', { ascending: true });
    if (games) setUpcomingGames(games);
    if (table) setStandings(table);
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = stream?.title || 'Transmissão ao Vivo';
    const shareText = `Assista à transmissão ao vivo: ${shareTitle}`;
    if (navigator.share) {
      try { await navigator.share({ title: shareTitle, text: shareText, url: shareUrl }); } catch (e) { }
    } else {
      try { await navigator.clipboard.writeText(shareUrl); toast.success('Link copiado!'); } catch (e) { toast.error('Erro ao copiar link'); }
    }
  };

  // Mobile & Orientation Logic
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768);
    };
    const checkOrientation = () => {
      const landscape = window.innerWidth > window.innerHeight;
      setIsLandscape(landscape);
      if (isMobile && isFullscreen && landscape) setIsDockedChat(true);
      else if (!isFullscreen || !landscape) setIsDockedChat(false);
    };

    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (isMobile && isFs && window.innerWidth > window.innerHeight) setIsDockedChat(true);
      else if (!isFs) setIsDockedChat(false);
    };

    checkMobile();
    checkOrientation();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isMobile, isFullscreen]);

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const togglePiP = async () => {
    const video = videoContainerRef.current?.querySelector('video');
    if (video && document.pictureInPictureEnabled) {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } else {
      toast('Use o menu do navegador para PiP.', { icon: '📺' });
    }
  };

  if (loading || !stream) {
    return (
      <div className="flex-1 flex items-center justify-center">
        {loading ? (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        ) : (
          <div className="text-white text-center">
            <h2 className="text-2xl font-bold mb-2">Transmissão não encontrada</h2>
            <button onClick={() => navigate('/')} className="text-blue-400 hover:text-blue-300">Voltar para Home</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="text-white font-sans selection:bg-blue-500/30">

      <main className="flex-1 w-full p-0">
        <section className="relative pt-24 sm:pt-28 lg:pt-32 pb-12 sm:pb-16 lg:pb-20 overflow-visible">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-full bg-blue-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

          <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-8 sm:gap-10 lg:gap-12">
              <div className="w-full text-center min-w-0 px-2 sm:px-0 overflow-hidden">
                <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                  <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-white/10 rounded-full text-slate-400 text-sm font-bold hover:bg-slate-800 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </button>

                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-bold">
                    <Tv className="w-4 h-4" />
                    AO VIVO
                  </div>

                  {stream.is_active && !isVip && user && (
                    <button
                      onClick={() => setShowVipModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/40 rounded-full text-purple-300 text-sm font-bold transition-all hover:scale-105 active:scale-95"
                    >
                      <Crown className="w-4 h-4" />
                      ASSINAR VIP
                    </button>
                  )}

                  <button
                    onClick={handleShare}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-white/10 hover:bg-slate-700/50 rounded-full text-slate-300 text-sm font-bold transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    Compartilhar
                  </button>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 uppercase italic break-words max-w-full">
                  {stream.is_active ? stream.title : <span className="text-slate-500">{stream.title}</span>}
                </h1>

                <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
                  {stream.is_active
                    ? `Assista agora: ${stream.description || stream.title}.`
                    : 'A transmissão começará em breve. Fique ligado.'
                  }
                </p>

                {upcomingGames.length > 0 && (
                  <div className="inline-block bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 p-4 sm:p-6 rounded-2xl mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Próximo Jogo</span>
                    </div>
                    <div className="flex items-center justify-center gap-4 sm:gap-6">
                      <div className="text-center">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-1 font-black text-white text-xs">CRU</div>
                        <span className="text-xs font-bold text-slate-300">Cruzeiro</span>
                      </div>
                      <div className="text-slate-600 font-black text-sm">VS</div>
                      <div className="text-center">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center mx-auto mb-1 font-black text-slate-400 text-xs">
                          {upcomingGames[0].opponent.substring(0, 3).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-slate-300 truncate max-w-[80px] block mx-auto">{upcomingGames[0].opponent}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-blue-500" />
                        {new Date(upcomingGames[0].date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-blue-500" />
                        {new Date(upcomingGames[0].date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h
                      </span>
                      {upcomingGames[0].venue && (
                        <span className="flex items-center gap-1.5 truncate max-w-[120px]">
                          <MapPin className="w-3 h-3 text-blue-500 flex-shrink-0" />
                          {upcomingGames[0].venue}
                        </span>
                      )}
                    </div>
                  </div>
                )}
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
                  {stream.is_active ? (
                    <>
                      <LiveViewer
                        channelName={channelName}
                        fitMode={videoFitMode}
                        showOfflineMessage={false}
                        showPerf={showPerf}
                      />
                      <VipMessageOverlay streamId={stream.id} isActive={stream.is_active} />
                      <VipAlertOverlay streamId={stream.id} />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center z-30">
                      <div className="text-center px-6 max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <div className="mb-8 relative">
                          <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
                          <div className="relative text-8xl animate-pulse">📺</div>
                        </div>
                        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight">
                          Aguardando Transmissão
                        </h2>
                        <p className="text-lg sm:text-xl text-blue-200 mb-8 leading-relaxed">
                          O sinal ainda não foi iniciado. 📡<br />
                          Aguarde alguns instantes! ⏳✨
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                          <button
                            onClick={() => window.location.reload()}
                            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-600/30 hover:scale-105"
                          >
                            🔄 Recarregar Página
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {stream.is_active && (
                    <>
                      {/* Top Info Bar (Desktop & Mobile Fullscreen) */}
                      <div className={`absolute top-4 left-4 z-20 transition-opacity duration-300 ${showControls || !isMobile ? 'opacity-100' : 'opacity-0'}`}>
                        <ViewerCountDisplay count={currentViewerCount || stream.viewer_count || 0} />
                      </div>

                      {!isMobile && (
                        <>
                          <button
                            onClick={() => setIsChatOpen(!isChatOpen)}
                            className={`absolute bottom-4 left-4 p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl border border-white/10 transition-all z-10 group ${isFullscreen ? 'opacity-100' : (showControls ? 'opacity-100' : 'opacity-0')}`}
                            title={isChatOpen ? "Fechar chat" : "Abrir chat"}
                          >
                            <MessageSquare className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                          </button>

                          <div className={`absolute bottom-4 right-4 flex gap-2 z-10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                            <CastButton hlsUrl={stream.hls_url ? stream.hls_url : undefined} channelName={stream.channel_name} />
                            <button onClick={togglePiP} className="p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl border border-white/10 transition-all group">
                              <Tv className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                            </button>
                            <button onClick={handleFullscreen} className="p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl border border-white/10 transition-all group">
                              {isFullscreen ? <Minimize2 className="w-5 h-5 text-white" /> : <Maximize2 className="w-5 h-5 text-white" />}
                            </button>
                          </div>
                        </>
                      )}

                      {isMobile && (
                        <>
                          <MobileLiveControls
                            isActive={stream.is_active}
                            isFullscreen={isFullscreen}
                            onFullscreen={handleFullscreen}
                            onRotate={() => setIsLandscape(!isLandscape)}
                            onToggleFit={() => setVideoFitMode(p => p === 'contain' ? 'cover' : 'contain')}
                            fitMode={videoFitMode}
                            isDocked={isDockedChat}
                            onPictureInPicture={togglePiP}
                            isPictureInPicture={!!document.pictureInPictureElement}
                            containerRef={videoContainerRef}
                            onChatToggle={() => {
                              if (isFullscreen && isLandscape) setIsDockedChat(!isDockedChat);
                              else setIsChatOpen(!isChatOpen);
                            }}
                          />
                          <div className={`absolute top-4 right-4 z-10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                            <CastButton hlsUrl={stream.hls_url ? stream.hls_url : undefined} channelName={stream.channel_name} />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                {isMobile && isFullscreen && isLandscape && isDockedChat && stream.is_active && (
                  <div className="w-[400px] min-w-[350px] max-w-[45vw] h-full bg-black/90 backdrop-blur-md border-l border-white/10 flex flex-col pointer-events-auto shadow-2xl">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
                      <span className="text-sm font-black text-white uppercase italic tracking-wider">Chat da Live</span>
                      <button
                        onClick={() => setIsDockedChat(false)}
                        className="p-3 hover:bg-white/10 rounded-xl transition-all active:scale-90"
                        title="Fechar Chat"
                      >
                        <X className="w-6 h-6 text-white" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden flex flex-col">
                      <div className="flex-1 overflow-hidden">
                        <ChatSlot id="public-mobile-landscape-docked-chat" priority={90} className="h-full" />
                      </div>
                      <div className="px-3 py-2 border-t border-white/10 bg-black/40">
                        <PollDisplay streamId={stream.id} compact={true} />
                        <PinnedLinkOverlay streamId={stream.id} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="py-6 sm:py-8 lg:py-12 relative pb-12 sm:pb-16 lg:pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl xl:max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {upcomingGames.length > 0 && (
              <div className="bg-slate-800/20 p-8 rounded-[2rem] border border-white/5 space-y-6">
                <div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-blue-400" /><h3 className="text-white font-black uppercase text-xs italic tracking-widest">Próximos Jogos</h3></div>
                {upcomingGames.map(g => (
                  <div key={g.id} className="p-4 bg-white/5 rounded-2xl flex justify-between items-center group cursor-pointer hover:bg-white/10 transition-all border border-transparent hover:border-white/5">
                    <span className="text-white text-sm font-bold uppercase tracking-tight">{g.opponent}</span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  </div>
                ))}
              </div>
            )}
            {standings.length > 0 && (
              <div className="bg-slate-800/20 p-8 rounded-[2rem] border border-white/5 space-y-6">
                <div className="flex items-center gap-3"><Trophy className="w-5 h-5 text-emerald-400" /><h3 className="text-white font-black uppercase text-xs italic tracking-widest">Classificação</h3></div>
                <div className="space-y-3">
                  {standings.slice(0, 5).map(t => (
                    <div key={t.id} className="flex justify-between items-center text-xs font-medium">
                      <span className="text-slate-400">{t.position}. <span className="text-slate-200 font-bold uppercase">{t.team}</span></span>
                      <span className="text-blue-400 font-black">{t.points} PTS</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {isChatOpen && stream.is_active && !isDockedChat && !isFullscreen && (
          <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] bg-black/95 backdrop-blur-md border-l border-white/10 z-[9999] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-sm font-black text-white uppercase italic tracking-widest">Chat da Transmissão</span>
              <button onClick={() => setIsChatOpen(false)}>
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 min-h-0 h-full">
                <ChatSlot id="public-overlay-chat" priority={80} className="h-full" />
              </div>
            </div>
          </div>
        )}

        {isMobile && isFullscreen && stream && stream.is_active && (
          <>
            {isLandscape && !isDockedChat && (
              <FloatingChatButton onClick={() => setIsDockedChat(true)} />
            )}
            {!isLandscape && !isChatOpen && (
              <FloatingChatButton onClick={() => setIsChatOpen(true)} />
            )}
          </>
        )}

        {isMobile && isFullscreen && !isLandscape && stream && stream.is_active && (
          <ChatDrawer
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            streamId={stream.id}
            isActive={stream.is_active}
          />
        )}

      </main>

      <VipSubscriptionModal
        isOpen={showVipModal}
        onClose={() => setShowVipModal(false)}
        monthlyPrice={5.00}
      />
    </div>
  );
};

export default PublicLiveStreamPage;
