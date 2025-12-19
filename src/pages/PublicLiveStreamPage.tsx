import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Eye, Share2, MessageSquare, X, Trophy, Calendar, ChevronRight, Play, MonitorPlay } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import ZKViewer from '../components/ZKViewer';
import LiveChat from '../components/live/LiveChat';
import MobileLiveControls from '../components/live/MobileLiveControls';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

interface LiveStream {
  id: string;
  title: string;
  description: string;
  channel_name: string;
  is_active: boolean;
  viewer_count: number;
  created_at: string;
}

const PublicLiveStreamPage: React.FC = () => {
  const { channelName } = useParams<{ channelName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [videoFitMode, setVideoFitMode] = useState<'contain' | 'cover'>('contain');
  const [, setControlsVisible] = useState(true);
  const controlsHideTimerRef = useRef<number | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [showStreamContent, setShowStreamContent] = useState(false);
  const [sessionId] = useState(() => {
    const storageKey = `live_session_${channelName}`;
    const savedSessionId = localStorage.getItem(storageKey);
    if (savedSessionId) return savedSessionId;
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, newSessionId);
    return newSessionId;
  });

  // Mock data for Cruzeiro features
  const upcomingGames = [
    { opponent: 'Atlético-MG', date: 'Dom, 22/12', time: '16:00', competition: 'Brasileirão', stadium: 'Mineirão', logo: 'https://upload.wikimedia.org/wikipedia/pt/d/de/Clube_Atl%C3%A9tico_Mineiro_logo.svg' },
    { opponent: 'Flamengo', date: 'Qua, 25/12', time: '21:30', competition: 'Brasileirão', stadium: 'Maracanã', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Flamengo_braz_logo.svg' }
  ];

  const championshipTable = [
    { pos: 1, team: 'Cruzeiro', pts: 72, v: 22, e: 6, d: 4 },
    { pos: 2, team: 'Botafogo', pts: 70, v: 21, e: 7, d: 4 },
    { pos: 3, team: 'Palmeiras', pts: 68, v: 20, e: 8, d: 4 },
    { pos: 4, team: 'Fortaleza', pts: 65, v: 19, e: 8, d: 5 }
  ];

  useEffect(() => {
    if (channelName) loadStream();
    return () => { if (stream) endViewerSession(); };
  }, [channelName]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = setTimeout(() => window.scrollTo(0, 0), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
      setIsMobile(mobile);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    const handleOrientationChange = () => {
      if (!isMobile) return;
      setTimeout(() => {
        const landscape = window.innerWidth > window.innerHeight;
        setIsLandscape(landscape);
        if (landscape && !isFullscreen && videoContainerRef.current) videoContainerRef.current.requestFullscreen?.();
      }, 300);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [isMobile, isFullscreen]);

  const isDockedChat = isMobile && isFullscreen && isLandscape && isChatOpen;
  const effectiveVideoFitMode: 'contain' | 'cover' = isDockedChat ? 'contain' : videoFitMode;

  const scheduleHideControls = (delayMs: number) => {
    if (controlsHideTimerRef.current) { window.clearTimeout(controlsHideTimerRef.current); }
    controlsHideTimerRef.current = window.setTimeout(() => setControlsVisible(false), delayMs);
  };

  const showControlsTemporarily = (delayMs: number = 2500) => {
    setControlsVisible(true);
    scheduleHideControls(delayMs);
  };

  useEffect(() => {
    if (isMobile && isFullscreen && isLandscape) {
      setVideoFitMode(isChatOpen ? 'contain' : 'cover');
    }
    if (!isFullscreen) setVideoFitMode('contain');
  }, [isMobile, isFullscreen, isLandscape, isChatOpen]);

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!isFullscreen) {
      if (videoContainerRef.current.requestFullscreen) {
        videoContainerRef.current.requestFullscreen();
      } else if ((videoContainerRef.current as any).webkitRequestFullscreen) {
        (videoContainerRef.current as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  const toggleChat = () => setIsChatOpen(!isChatOpen);

  useEffect(() => {
    if (!isMobile) { setControlsVisible(true); return; }
    if (stream?.is_active) showControlsTemporarily(isFullscreen ? 2000 : 2500);
    else setControlsVisible(false);
    return () => { if (controlsHideTimerRef.current) window.clearTimeout(controlsHideTimerRef.current); };
  }, [isMobile, isFullscreen, isLandscape, stream?.is_active]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreenNow = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement || (document as any).msFullscreenElement);
      setIsFullscreen(isFullscreenNow);
      if (!isFullscreenNow) setIsChatOpen(false);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Listen to custom chat events from MobileLiveControls
    const handleToggleChat = () => setIsChatOpen(prev => !prev);
    window.addEventListener('toggle-chat', handleToggleChat);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('toggle-chat', handleToggleChat);
    };
  }, []);

  useEffect(() => {
    if (stream && channelName && stream.is_active) { trackViewer(); setShowStreamContent(true); }
    else if (stream && !stream.is_active) { endViewerSession(); setShowStreamContent(false); setIsChatOpen(false); }
  }, [stream, channelName]);

  useEffect(() => {
    if (!stream || !stream.is_active) { setViewerCount(0); return; }
    updateHeartbeat();
    updateViewerCount();
    const heartbeatInterval = setInterval(() => updateHeartbeat(), 30000);
    const countInterval = setInterval(() => updateViewerCount(), 5000);
    return () => { clearInterval(heartbeatInterval); clearInterval(countInterval); };
  }, [stream]);

  const loadStream = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('live_streams').select('*').eq('channel_name', channelName).maybeSingle();
      if (error) throw error;
      if (!data) { toast.error('Transmissão não encontrada'); navigate('/'); return; }
      setStream(data);
      setViewerCount(data.viewer_count || 0);
    } catch (error) {
      toast.error('Erro ao carregar transmissão');
    } finally {
      setLoading(false);
    }
  };

  const trackViewer = async () => {
    if (!stream || !stream.is_active) return;
    try {
      const { data: existingSession } = await supabase.from('viewer_sessions').select('id, is_active, ended_at').eq('session_id', sessionId).eq('stream_id', stream.id).maybeSingle();
      if (existingSession) {
        await supabase.from('viewer_sessions').update({ is_active: true, user_id: user?.id ?? null, last_heartbeat: new Date().toISOString(), ended_at: null }).eq('session_id', sessionId).eq('stream_id', stream.id);
      } else {
        await supabase.from('viewer_sessions').insert({ stream_id: stream.id, session_id: sessionId, is_active: true, user_id: user?.id ?? null, user_agent: navigator.userAgent, last_heartbeat: new Date().toISOString() });
      }
      await updateViewerCount();
    } catch (error) {
      console.error(error);
    }
  };

  const updateHeartbeat = async () => {
    if (!stream || !stream.is_active) return;
    await supabase.rpc('update_viewer_heartbeat', { p_session_id: sessionId });
  };

  const cleanupOldSessions = async () => {
    if (!stream) return;
    await supabase.rpc('cleanup_duplicate_viewer_sessions', { p_stream_id: stream.id });
    await supabase.rpc('cleanup_inactive_viewer_sessions');
  };

  const endViewerSession = async () => {
    if (!stream) return;
    try {
      await supabase.from('viewer_sessions').update({ ended_at: new Date().toISOString(), is_active: false }).eq('session_id', sessionId).eq('stream_id', stream.id);
      localStorage.removeItem(`live_session_${channelName}`);
      await updateViewerCount();
    } catch (error) {
      console.error(error);
    }
  };

  const updatingCountRef = useRef(false);
  const lastCleanupRef = useRef(0);

  const updateViewerCount = async () => {
    if (!stream || updatingCountRef.current) return;
    if (!stream.is_active) {
      setViewerCount(0);
      await supabase.from('live_streams').update({ viewer_count: 0 }).eq('id', stream.id);
      return;
    }
    updatingCountRef.current = true;
    try {
      const now = Date.now();
      if (now - lastCleanupRef.current > 30000) { await cleanupOldSessions(); lastCleanupRef.current = now; }
      const { data: countData } = await supabase.rpc('count_active_unique_viewers', { p_stream_id: stream.id });
      const newCount = Number(countData) || 0;
      await supabase.from('live_streams').update({ viewer_count: newCount }).eq('id', stream.id);
      setViewerCount(newCount);
    } catch (error) {
      console.error(error);
    } finally {
      updatingCountRef.current = false;
    }
  };

  useEffect(() => {
    if (!stream) return;
    const channel = supabase.channel(`public_stream_${stream.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_streams', filter: `id=eq.${stream.id}` }, (payload) => {
        const updated = payload.new as LiveStream;
        if (stream.is_active && !updated.is_active) { setShowStreamContent(false); setIsChatOpen(false); endViewerSession(); }
        setStream(updated);
        setViewerCount(updated.viewer_count || 0);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [stream?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-white text-2xl font-bold mb-4">Transmissão não encontrada</h2>
            <button onClick={() => navigate('/')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">Voltar para Home</button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col overflow-x-hidden selection:bg-blue-500/30">
      <Header />

      <main className="flex-1 max-w-[1600px] mx-auto w-full p-4 lg:p-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <button onClick={() => navigate('/')} className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Voltar ao Início
            </button>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Play className="w-6 h-6 text-blue-400 fill-blue-400" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-black text-white italic uppercase tracking-tighter">{stream.title}</h1>
                  <p className="text-blue-400 font-bold text-xs uppercase tracking-[0.2em]">{stream.channel_name}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-6 py-3 rounded-2xl bg-slate-800/50 border border-white/5 flex items-center gap-4 glass-panel shadow-lg">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span className="text-rose-400 text-xs font-black uppercase tracking-[0.1em]">Ao Vivo</span>
              </div>
              <div className="w-[1px] h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-400" />
                <span className="text-white font-black text-sm">{stream.is_active ? (viewerCount || stream.viewer_count || 0) : 0}</span>
              </div>
            </div>

            <button className="p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-600/20 active:scale-95">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video & Sidebar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Video Area */}
          <div className="lg:col-span-8 space-y-6">
            <div className="relative group/video">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-emerald-600/20 rounded-[2.5rem] blur opacity-0 group-hover/video:opacity-100 transition-opacity duration-1000"></div>
              <div
                ref={videoContainerRef}
                className={`relative bg-black rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl isolate mobile-video-container ${isDockedChat ? 'docked-chat-active' : ''}`}
                style={{ aspectRatio: (isMobile && isFullscreen) ? undefined : '16/9' }}
                onClick={() => isMobile && setControlsVisible(true)}
              >
                <div className="zk-video-stage w-full h-full relative overflow-hidden">
                  {showStreamContent ? (
                    <ZKViewer channel="ZkPremios" fitMode={effectiveVideoFitMode} enabled={stream.is_active} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900/40">
                      <div className="text-center space-y-4">
                        <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-800/50 border border-white/5 flex items-center justify-center">
                          <MonitorPlay className="w-10 h-10 text-slate-500" />
                        </div>
                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">Aguardando Transmissão...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Controls Overlay */}
                {isMobile && (
                  <MobileLiveControls
                    onFullscreen={toggleFullscreen}
                    onRotate={() => setIsLandscape(!isLandscape)}
                    isFullscreen={isFullscreen}
                    isActive={stream.is_active}
                    containerRef={videoContainerRef}
                  />
                )}

                {/* Inline Chat for Landscape Fullscreen (Docked) */}
                {isDockedChat && (
                  <div className="chat-overlay-mobile flex flex-col bg-slate-900 border-l border-white/10 w-[320px] sm:w-[350px] pointer-events-auto shrink-0 relative z-10">
                    <div className="p-3 border-b border-white/5 flex items-center justify-between bg-slate-800/50">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Chat ao Vivo</span>
                      </div>
                      <button onClick={() => setIsChatOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                      <LiveChat streamId={stream.id} isAdmin={false} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stream Info Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="glass-panel-dark p-6 rounded-3xl space-y-4 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-white font-black uppercase tracking-widest text-xs italic">Próximos Jogos</h3>
                </div>
                <div className="space-y-3">
                  {upcomingGames.map((game, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <img src={game.logo} alt={game.opponent} className="w-10 h-10 object-contain brightness-110" />
                        <div>
                          <p className="text-white font-black text-sm uppercase tracking-tight">Cruzeiro x {game.opponent}</p>
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{game.date} • {game.time}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel-dark p-6 rounded-3xl space-y-4 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-white font-black uppercase tracking-widest text-xs italic">Tabela do Brasileirão</h3>
                </div>
                <div className="space-y-2">
                  {championshipTable.map((team, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${team.team === 'Cruzeiro' ? 'bg-blue-600/20 border border-blue-500/20' : 'bg-white/5 border border-transparent'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-500 w-4">{team.pos}º</span>
                        <span className={`text-xs font-black uppercase tracking-tight ${team.team === 'Cruzeiro' ? 'text-blue-400' : 'text-slate-300'}`}>{team.team}</span>
                      </div>
                      <div className="flex gap-4">
                        <div className="text-center min-w-[24px]"><p className="text-[8px] text-slate-500 uppercase font-black mb-0.5">PTS</p><p className="text-xs font-black text-white">{team.pts}</p></div>
                        <div className="text-center min-w-[24px]"><p className="text-[8px] text-slate-500 uppercase font-black mb-0.5">V</p><p className="text-xs font-black text-slate-400">{team.v}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Chat Sidebar Area */}
          <div className="lg:col-span-4 h-full min-h-[600px] flex flex-col">
            <div className="flex-1 bg-slate-800/40 rounded-[2.5rem] border border-white/10 overflow-hidden glass-panel-dark shadow-2xl relative">
              {!isMobile || isChatOpen ? (
                <LiveChat streamId={stream.id} isAdmin={false} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button onClick={() => setIsChatOpen(true)} className="flex items-center gap-3 px-8 py-4 bg-blue-600 rounded-2xl text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-600/20">
                    <MessageSquare className="w-5 h-5" />
                    Abrir Chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PublicLiveStreamPage;
