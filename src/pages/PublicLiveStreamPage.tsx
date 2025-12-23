import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Eye, Share2, X, Trophy, Calendar, ChevronRight, MessageCircle, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import ZKViewer from '../components/ZKViewer';
import LiveChat from '../components/live/LiveChat';
import MobileLiveControls from '../components/live/MobileLiveControls';
import VipMessageOverlay from '../components/live/VipMessageOverlay';
import VipSubscriptionModal from '../components/vip/VipSubscriptionModal';
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
  const { currentUser } = useData();
  const [stream, setStream] = useState<LiveStream | null>(null);
  const streamId = stream?.id; // Alias estável para efeitos
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
  const [isVip, setIsVip] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  
  // Verificar status VIP
  useEffect(() => {
    if (user && currentUser) {
      setIsVip(currentUser.is_vip || false);
    }
  }, [user, currentUser]);

  // Handler para duplo clique - tela cheia
  const handleDoubleClick = () => {
    if (!videoContainerRef.current) return;
    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      videoContainerRef.current.requestFullscreen();
    }
  };

  // Função para atualizar contador de viewers (Apenas Local)
  const updateViewerCount = useCallback(async (streamId: string) => {
    try {
      const { data: countData, error } = await supabase.rpc(
        'count_active_unique_viewers',
        { p_stream_id: streamId }
      );

      if (error) {
        // Fallback: usar 2 minutos para ser consistente com as funções RPC
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const { data: sessions } = await supabase
          .from('viewer_sessions')
          .select('session_id')
          .eq('stream_id', streamId)
          .eq('is_active', true)
          .gte('last_heartbeat', twoMinutesAgo);

        const uniqueSessions = new Set(sessions?.map(s => s.session_id) || []);
        const activeCount = uniqueSessions.size;

        setCurrentViewerCount(activeCount);
        setStream(prev => prev ? { ...prev, viewer_count: activeCount } : null);
        return;
      }

      if (countData !== null) {
        const activeCount = Number(countData) || 0;
        setCurrentViewerCount(activeCount);
        setStream(prev => prev ? { ...prev, viewer_count: activeCount } : null);
      }
    } catch (e) {
      // Silencioso
    }
  }, []);

  // Ref para acompanhar o estado atual da stream sem disparar efeitos
  const streamRef = useRef<LiveStream | null>(null);
  useEffect(() => { streamRef.current = stream; }, [stream]);

  // Função para criar/atualizar viewer session - Tornada estável usando refs
  const trackViewer = useCallback(async () => {
    const currentStream = streamRef.current;
    if (!currentStream) {
      console.warn('⚠️ trackViewer: stream não disponível');
      return;
    }

    if (!currentStream.is_active) {
      console.log('ℹ️ trackViewer: stream não está ativa, pulando tracking');
      return;
    }

    try {
      const now = new Date().toISOString();
      console.log('👤 trackViewer: Criando/atualizando sessão', {
        stream_id: currentStream.id,
        session_id: sessionId,
        is_active: currentStream.is_active
      });

      // Primeiro, verificar se já existe uma sessão (ativa ou inativa)
      const { data: existingSession } = await supabase
        .from('viewer_sessions')
        .select('id, is_active')
        .eq('session_id', sessionId)
        .eq('stream_id', currentStream.id)
        .maybeSingle();

      let data, error;
      
      if (existingSession) {
        // Se existe, fazer update
        console.log('🔄 trackViewer: Sessão existente encontrada, atualizando...', existingSession);
        const updateData: any = {
          is_active: currentStream.is_active,
          last_heartbeat: now,
          user_id: user?.id || null,
          user_agent: navigator.userAgent
        };
        
        // Se estava inativa e agora está ativa, reativar (mas manter started_at original)
        if (!existingSession.is_active && currentStream.is_active) {
          updateData.ended_at = null; // Limpar ended_at se reativando
        }
        
        const result = await supabase
          .from('viewer_sessions')
          .update(updateData)
          .eq('id', existingSession.id)
          .select();
        data = result.data;
        error = result.error;
      } else {
        // Se não existe, fazer insert
        console.log('➕ trackViewer: Criando nova sessão...');
        const result = await supabase
          .from('viewer_sessions')
          .insert({
            stream_id: currentStream.id,
            session_id: sessionId,
            user_id: user?.id || null,
            is_active: currentStream.is_active,
            user_agent: navigator.userAgent,
            last_heartbeat: now,
            started_at: now
          })
          .select();
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Erro ao criar/atualizar viewer_session:', error);
        throw error; // Re-throw para ser capturado pelo catch
      } else {
        console.log('✅ trackViewer: Sessão criada/atualizada com sucesso', data);
      }
    } catch (e: any) {
      console.error('❌ Erro geral ao track viewer:', e);
    }
  }, [sessionId, user?.id]); // Removido stream e updateViewerCount das dependências

  // Função para atualizar heartbeat
  const updateHeartbeat = useCallback(async () => {
    const currentStream = streamRef.current;
    if (!currentStream || !currentStream.is_active) return;
    try {
      // Primeiro, garantir que a sessão existe
      await trackViewer();
      
      // Depois atualizar o heartbeat
      const { error } = await supabase.rpc('update_viewer_heartbeat', { p_session_id: sessionId });
      if (error) {
        console.error('Erro ao atualizar heartbeat:', error);
        // Se falhar, tentar criar/atualizar a sessão novamente
        await trackViewer();
      }
    } catch (e) {
      console.error('Erro no heartbeat:', e);
      // Em caso de erro, tentar criar/atualizar a sessão
      await trackViewer();
    }
  }, [sessionId, trackViewer]); // Adicionado trackViewer para garantir que a sessão existe

  useEffect(() => {
    if (channelName) { loadStream(); loadZkTVData(); }
  }, [channelName]);

  // Garantir que a página fique no topo ao carregar
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Unificado: Listener para todas as mudanças na stream via Realtime
  useEffect(() => {
    if (!streamId) return;

    console.log(`🔌 Conectando Realtime para stream: ${streamId}`);

    const channel = supabase.channel(`public_stream_v2_${streamId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_streams', filter: `id=eq.${streamId}` },
        (payload) => {
          const updated = payload.new as LiveStream;
          const current = streamRef.current;
          const wasActive = current?.is_active;

          console.log('📡 Mudança na stream detectada via Realtime:', updated.is_active ? 'AO VIVO' : 'OFFLINE');

          // Atualizar estado
          setStream(updated);
          setCurrentViewerCount(updated.viewer_count || 0);

          // Lógica de tracking de sessão baseada na mudança de estado
          if (!updated.is_active && wasActive) {
            setIsChatOpen(false);
            // Marcar sessão como inativa
            supabase.from('viewer_sessions')
              .update({ is_active: false, ended_at: new Date().toISOString() })
              .eq('session_id', sessionId)
              .eq('stream_id', streamId);
          } else if (updated.is_active) {
            // Se está ativa (seja mudança ou já estava ativa), registrar/atualizar sessão
            console.log('✅ Realtime: Stream ativa, chamando trackViewer');
            trackViewer();
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Status da conexão stream: ${status}`);
      });

    return () => {
      console.log('🔌 Desconectando Realtime canal stream');
      supabase.removeChannel(channel);
    };
  }, [streamId, sessionId, trackViewer]); // Dependências estáveis

  useEffect(() => {
    if (!stream) {
      console.log('ℹ️ useEffect stream: stream não disponível');
      return;
    }

    console.log('🔄 useEffect stream: Stream carregada', {
      id: stream.id,
      is_active: stream.is_active,
      channel_name: stream.channel_name
    });

    // Sempre rastrear quando a stream estiver ativa
    if (stream.is_active) {
      console.log('✅ useEffect stream: Stream ativa, iniciando tracking');
      trackViewer();
      updateViewerCount(stream.id);
    } else {
      console.log('ℹ️ useEffect stream: Stream inativa, pulando tracking');
    }
    
    setCurrentViewerCount(stream.viewer_count || 0);
    
    // Marcar como executado apenas uma vez por stream.id
    if (!trackViewerExecutedRef.current) {
      trackViewerExecutedRef.current = true;
    }

    return () => { 
      // Reset apenas quando mudar de stream
      if (stream.id !== streamRef.current?.id) {
        trackViewerExecutedRef.current = false;
      }
    };
  }, [stream?.id, stream?.is_active, trackViewer, updateViewerCount]);

  // Heartbeat e atualização periódica do contador
  useEffect(() => {
    const currentStream = streamRef.current;
    if (!currentStream || !currentStream.is_active) return;

    // Executar imediatamente ao montar
    updateHeartbeat();
    updateViewerCount(currentStream.id);

    // Depois executar a cada 30 segundos
    const intervalId = setInterval(() => {
      const st = streamRef.current;
      if (st && st.is_active) {
        updateHeartbeat();
        updateViewerCount(st.id);
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [updateHeartbeat, updateViewerCount]); // Removido stream.id/is_active para evitar reset do timer

  const loadStream = async () => {
    setLoading(true);
    console.log('📥 loadStream: Carregando stream para channel:', channelName);
    const { data, error } = await supabase.from('live_streams').select('*').eq('channel_name', channelName).maybeSingle();
    
    if (error) {
      console.error('❌ loadStream: Erro ao carregar stream:', error);
      toast.error('Erro ao carregar transmissão');
      navigate('/');
      setLoading(false);
      return;
    }
    
    if (!data) {
      console.warn('⚠️ loadStream: Stream não encontrada');
      toast.error('Transmissão não encontrada');
      navigate('/');
      setLoading(false);
      return;
    }
    
    console.log('✅ loadStream: Stream carregada', {
      id: data.id,
      is_active: data.is_active,
      channel_name: data.channel_name
    });
    
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
                <span className="text-white font-black">
                  {stream.is_active
                    ? (currentViewerCount || stream.viewer_count || 0)
                    : 0
                  }
                </span>
              </div>
            </div>
            <button
              onClick={handleShare}
              className="p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95"
              title="Compartilhar transmissão"
            >
              <Share2 className="w-5 h-5" />
            </button>
            {/* Botão Assinar VIP - Apenas para não-VIPs (fora da tela do jogo) */}
            {stream.is_active && !isVip && user && (
              <button
                onClick={() => setShowVipModal(true)}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-purple-600/30 transition-all hover:scale-105"
              >
                <Crown className="w-5 h-5" />
                <span className="hidden sm:inline">Assinar VIP</span>
              </button>
            )}
            {/* Botão Grupo VIP WhatsApp - Apenas para VIPs (fora da tela do jogo) */}
            {stream.is_active && isVip && (
              <a
                href={import.meta.env.VITE_VIP_WHATSAPP_GROUP || 'https://chat.whatsapp.com/SEU_GRUPO_AQUI'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-green-600/30 transition-all hover:scale-105"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="hidden sm:inline">Grupo VIP</span>
              </a>
            )}
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
      
      {/* Modal de Assinatura VIP */}
      <VipSubscriptionModal
        isOpen={showVipModal}
        onClose={() => setShowVipModal(false)}
        monthlyPrice={10.00}
      />
    </div>
  );
};

export default PublicLiveStreamPage;
