import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Eye, Share2, X, Trophy, Calendar, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ZKViewer from '../components/ZKViewer';
import LiveChat from '../components/live/LiveChat';
import MobileLiveControls from '../components/live/MobileLiveControls';
import VipMessageOverlay from '../components/live/VipMessageOverlay';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { CruzeiroGame, CruzeiroStanding } from '../types';

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

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [videoFitMode, setVideoFitMode] = useState<'contain' | 'cover'>('contain');
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [upcomingGames, setUpcomingGames] = useState<CruzeiroGame[]>([]);
  const [standings, setStandings] = useState<CruzeiroStanding[]>([]);

  // Handler para duplo clique - tela cheia
  const handleDoubleClick = () => {
    if (!videoContainerRef.current) return;
    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      videoContainerRef.current.requestFullscreen();
    }
  };

  // Função para atualizar contador de viewers
  const updateViewerCount = useCallback(async (streamId: string) => {
    try {
      console.log('📊 Atualizando viewer_count para stream:', streamId);
      
      const { data: countData, error } = await supabase.rpc(
        'count_active_unique_viewers',
        { p_stream_id: streamId }
      );

      if (error) {
        console.error('❌ Erro ao contar viewers:', error);
        // Fallback: contar diretamente
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: sessions } = await supabase
          .from('viewer_sessions')
          .select('session_id')
          .eq('stream_id', streamId)
          .eq('is_active', true)
          .gte('last_heartbeat', fiveMinutesAgo);

        const uniqueSessions = new Set(sessions?.map(s => s.session_id) || []);
        const activeCount = uniqueSessions.size;
        
        await supabase
          .from('live_streams')
          .update({ viewer_count: activeCount })
          .eq('id', streamId);
        
        setCurrentViewerCount(activeCount);
        setStream(prev => prev ? { ...prev, viewer_count: activeCount } : null);
        console.log('✅ Viewer count atualizado (fallback):', activeCount);
        return;
      }

      if (countData !== null) {
        const activeCount = Number(countData) || 0;
        console.log('✅ Viewer count (RPC):', activeCount);
        
        await supabase
          .from('live_streams')
          .update({ viewer_count: activeCount })
          .eq('id', streamId);
        
        setCurrentViewerCount(activeCount);
        setStream(prev => prev ? { ...prev, viewer_count: activeCount } : null);
      }
    } catch (e) {
      console.error('❌ Erro ao atualizar viewer_count:', e);
    }
  }, []);

  // Função para criar/atualizar viewer session
  const trackViewer = useCallback(async () => {
    if (!stream) return;
    
    try {
      const now = new Date().toISOString();

      // Usar upsert diretamente (mais eficiente)
      const { error } = await supabase
        .from('viewer_sessions')
        .upsert({
          stream_id: stream.id,
          session_id: sessionId,
          user_id: user?.id || null,
          is_active: stream.is_active,
          user_agent: navigator.userAgent,
          last_heartbeat: now,
          started_at: now
        }, {
          onConflict: 'session_id,stream_id'
        });
      
      if (error) {
        // Se upsert falhar, tentar update
        const { error: updateError } = await supabase
          .from('viewer_sessions')
          .update({
            is_active: stream.is_active,
            last_heartbeat: now,
            user_id: user?.id || null,
            user_agent: navigator.userAgent
          })
          .eq('session_id', sessionId)
          .eq('stream_id', stream.id);
        
        if (updateError) {
          console.error('❌ Erro ao atualizar viewer_session:', updateError);
        }
      }
      
      // Sempre atualizar contador após criar/atualizar sessão
      updateViewerCount(stream.id);
    } catch (e: any) {
      console.error('❌ Erro geral ao track viewer:', e);
    }
  }, [stream, sessionId, user?.id, updateViewerCount]);

  // Função para atualizar heartbeat
  const updateHeartbeat = useCallback(async () => {
    if (!stream || !stream.is_active) return;
    try {
      const { error } = await supabase.rpc('update_viewer_heartbeat', { p_session_id: sessionId });
      if (error) {
        console.error('Erro ao atualizar heartbeat:', error);
      }
    } catch (e) {
      console.error('Erro no heartbeat:', e);
    }
  }, [stream, sessionId]);

  useEffect(() => {
    if (channelName) { loadStream(); loadZkTVData(); }
  }, [channelName]);

  useEffect(() => {
    if (!stream) return;

    // Assinatura Realtime para mudanças na live
    const channel = supabase.channel(`public_stream_${stream.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_streams', filter: `id=eq.${stream.id}` },
        (payload) => {
          const updated = payload.new as LiveStream;
          setStream(updated);
          if (!updated.is_active) {
            setIsChatOpen(false);
            supabase.from('viewer_sessions')
              .update({ is_active: false, ended_at: new Date().toISOString() })
              .eq('session_id', sessionId)
              .eq('stream_id', stream.id);
          } else {
            trackViewer();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stream?.id, sessionId, trackViewer]);

  useEffect(() => {
    if (!stream || trackViewerExecutedRef.current) return;
    
    // Marcar como executado para esta stream
    trackViewerExecutedRef.current = true;
    
    // Inicializar contador
    setCurrentViewerCount(stream.viewer_count || 0);
    
    // Criar sessão imediatamente quando a página carrega (apenas uma vez)
    trackViewer();
    
    // Atualizar contador imediatamente
    updateViewerCount(stream.id);
    
    // Reset quando stream mudar
    return () => {
      trackViewerExecutedRef.current = false;
    };
  }, [stream?.id, trackViewer, updateViewerCount]);

  // Heartbeat separado para não recriar a sessão toda vez
  useEffect(() => {
    if (!stream || !stream.is_active) return;
    
    const heartbeat = setInterval(() => {
      updateHeartbeat();
      updateViewerCount(stream.id);
    }, 30000);
    
    return () => {
      clearInterval(heartbeat);
    };
  }, [stream?.id, stream?.is_active, updateHeartbeat, updateViewerCount]);

  // Listener para atualizações do viewer_count em tempo real
  useEffect(() => {
    if (!stream) return;

    const channel = supabase.channel(`viewer_count_${stream.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_streams', filter: `id=eq.${stream.id}` },
        (payload) => {
          const updated = payload.new as LiveStream;
          if (updated.viewer_count !== undefined) {
            console.log('🔄 Viewer count atualizado via Realtime:', updated.viewer_count);
            setCurrentViewerCount(updated.viewer_count);
            setStream(prev => prev ? { ...prev, viewer_count: updated.viewer_count } : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stream?.id]);

  const loadStream = async () => {
    setLoading(true);
    const { data } = await supabase.from('live_streams').select('*').eq('channel_name', channelName).maybeSingle();
    if (!data) { toast.error('Não encontrada'); navigate('/'); return; }
    setStream(data);
    setLoading(false);
  };

  const loadZkTVData = async () => {
    const { data: games } = await supabase.from('cruzeiro_games').select('*').eq('status', 'upcoming').order('date', { ascending: true }).limit(3);
    const { data: table } = await supabase.from('cruzeiro_standings').select('*').order('position', { ascending: true });
    if (games) setUpcomingGames(games);
    if (table) setStandings(table);
  };

  // Função para compartilhar a live
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = stream?.title || 'Transmissão ao Vivo';
    const shareText = `Assista à transmissão ao vivo: ${shareTitle}`;

    try {
      // Tentar usar Web Share API (disponível em dispositivos móveis e alguns navegadores)
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast.success('Compartilhado com sucesso!');
      } else {
        // Fallback: copiar link para área de transferência
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copiado para a área de transferência!');
      }
    } catch (error: any) {
      // Se o usuário cancelar o compartilhamento, não mostrar erro
      if (error.name !== 'AbortError') {
        // Se falhar, tentar copiar para área de transferência
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Link copiado para a área de transferência!');
        } catch (clipboardError) {
          console.error('Erro ao compartilhar:', clipboardError);
          toast.error('Erro ao compartilhar. Tente copiar o link manualmente.');
        }
      }
    }
  };

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
      setIsMobile(mobile);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    const handleRotation = () => {
      if (!isMobile) return;
      const landscape = window.innerWidth > window.innerHeight;
      setIsLandscape(landscape);

      if (landscape && !isFullscreen && videoContainerRef.current) {
        const el = videoContainerRef.current;
        try {
          if (el.requestFullscreen) el.requestFullscreen();
          else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
        } catch (e) {
          console.warn('Auto-fullscreen bloqueado pelo navegador:', e);
        }
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleRotation, 200);
    });

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [isMobile, isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('toggle-chat', () => setIsChatOpen(p => !p));
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (isMobile && isFullscreen && isLandscape) setVideoFitMode(isChatOpen ? 'contain' : 'cover');
    else if (!isFullscreen) setVideoFitMode('contain');
  }, [isMobile, isFullscreen, isLandscape, isChatOpen]);

  if (loading || !stream) return null;

  const isDockedChat = isMobile && isFullscreen && isLandscape && isChatOpen;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 lg:p-12 space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="space-y-4">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <div>
              <h1 className="text-4xl lg:text-5xl font-black text-white italic uppercase tracking-tighter">{stream.title}</h1>
              <p className="text-blue-400 font-bold text-xs uppercase tracking-[0.3em]">{stream.channel_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-6 py-3 bg-slate-800/40 rounded-2xl border border-white/5 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${stream.is_active ? 'bg-rose-500' : 'bg-slate-500'}`} />
                <span className={`${stream.is_active ? 'text-rose-400' : 'text-slate-500'} text-xs font-black uppercase`}>
                  {stream.is_active ? 'Ao Vivo' : 'Offline'}
                </span>
              </div>
              <div className="w-[1px] h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-500" />
                <span className="text-white font-black">{currentViewerCount || stream.viewer_count || 0}</span>
              </div>
            </div>
            <button 
              onClick={handleShare}
              className="p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95"
              title="Compartilhar transmissão"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-10">
            <div
              ref={videoContainerRef}
              onDoubleClick={handleDoubleClick}
              className={`relative bg-black shadow-2xl overflow-hidden transition-all duration-500 isolate cursor-pointer
                ${isFullscreen ? 'rounded-none fixed inset-0 z-[100] w-screen h-screen' : 'rounded-3xl border border-white/10 aspect-video'}
                ${isDockedChat ? 'flex' : ''}`}
              title="Duplo clique para tela cheia"
            >
              <div className={`relative h-full ${isDockedChat ? 'flex-1' : 'w-full'}`}>
                <ZKViewer
                  channel={stream.channel_name}
                  fitMode={videoFitMode}
                  enabled={stream.is_active}
                />

                {/* Overlay de mensagens VIP na tela */}
                {stream.is_active && (
                  <VipMessageOverlay streamId={stream.id} isActive={stream.is_active} />
                )}

                {/* Overlay quando live encerrada */}
                {!stream.is_active && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
                    <div className="text-center space-y-4 px-8">
                      <div className="text-6xl">📡</div>
                      <h2 className="text-3xl font-black text-white uppercase italic">Live Encerrada</h2>
                      <p className="text-slate-400 text-sm font-bold">A transmissão foi finalizada</p>
                      <div className="w-16 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto"></div>
                    </div>
                  </div>
                )}

                <MobileLiveControls
                  isActive={stream.is_active}
                  isFullscreen={isFullscreen}
                  onFullscreen={() => isFullscreen ? document.exitFullscreen() : videoContainerRef.current?.requestFullscreen()}
                  onRotate={() => setIsLandscape(!isLandscape)}
                  onToggleFit={() => setVideoFitMode(p => p === 'contain' ? 'cover' : 'contain')}
                  fitMode={videoFitMode}
                  isDocked={isDockedChat}
                />
              </div>
              {isDockedChat && (
                <div className="w-[300px] h-full bg-black/40 backdrop-blur-md border-l border-white/10 flex flex-col pointer-events-auto shadow-2xl animate-in slide-in-from-right duration-300">
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <span className="text-[10px] font-black text-white uppercase italic tracking-widest">Chat da Transmissão</span>
                    <button onClick={() => setIsChatOpen(false)}><X className="w-4 h-4 text-white" /></button>
                  </div>
                  <div className="flex-1 overflow-hidden"><LiveChat streamId={stream.id} /></div>
                </div>
              )}
            </div>

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
          </div>

          <div className="lg:col-span-4 h-[650px] flex flex-col sticky top-24">
            <div className="flex-1 bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
              <LiveChat streamId={stream.id} isActive={stream.is_active} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PublicLiveStreamPage;
