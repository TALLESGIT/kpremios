import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Eye, Share2, X, Trophy, Calendar, ChevronRight, MessageCircle, Crown, Tv, Minimize2, Maximize2, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useSocket } from '../hooks/useSocket';
import { LiveViewer } from '../components/LiveViewer';
import { ChatSlot } from '../features/chat/ChatSlot';
import { FloatingChatButton } from '../features/chat/FloatingChatButton';
import { ChatDrawer } from '../features/chat/ChatDrawer';
import BottomOverlay from '../components/live/BottomOverlay';
import SideOverlay from '../components/live/SideOverlay';
import PinnedLinkOverlay from '../components/live/PinnedLinkOverlay';
import PollDisplay from '../components/live/PollDisplay';
import MobileLiveControls from '../components/live/MobileLiveControls';
import { useOrientation } from '../hooks/useOrientation';
import { useFullscreen } from '../hooks/useFullscreen';
import VipMessageOverlay from '../components/live/VipMessageOverlay';
import VipSubscriptionModal from '../components/vip/VipSubscriptionModal';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { CastButton } from '../components/CastButton';
import { CruzeiroGame, CruzeiroStanding } from '../types';
import { useRegisterStreamId } from '../features/chat/useRegisterStreamId';

interface LiveStream {
  id: string;
  title: string;
  description: string;
  channel_name: string;
  is_active: boolean;
  viewer_count: number;
  created_at: string;
  hls_url?: string;
}

const PublicLiveStreamPage: React.FC = () => {
  const { channelName } = useParams<{ channelName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentUser } = useData();
  const [stream, setStream] = useState<LiveStream | null>(null);
  const streamId = stream?.id; // Alias estável para efeitos

  // ✅ REGISTRAR STREAM ID GLOBALMENTE
  // Isso permite que o ChatHost global encontre o streamId desta página
  useRegisterStreamId(streamId);

  // ✅ MIGRAÇÃO: Usar Socket.io para escutar atualizações da stream
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
  const { isLandscape } = useOrientation();
  const { isFullscreen } = useFullscreen();
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

  // Handler para duplo clique - tela cheia (com suporte melhorado para mobile)
  const handleDoubleClick = () => {
    if (!videoContainerRef.current) return;

    try {
      if (isFullscreen) {
        // Sair do fullscreen
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      } else {
        // Entrar no fullscreen
        const el = videoContainerRef.current;
        if (el.requestFullscreen) {
          el.requestFullscreen();
        } else if ((el as any).webkitRequestFullscreen) {
          (el as any).webkitRequestFullscreen();
        } else if ((el as any).mozRequestFullScreen) {
          (el as any).mozRequestFullScreen();
        } else if ((el as any).msRequestFullscreen) {
          (el as any).msRequestFullscreen();
        }
      }
    } catch (error: any) {
      console.error('Erro ao alternar fullscreen (duplo clique):', error);
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

      // Usar upsert para evitar race conditions e duplicações
      // O upsert é atômico e evita o problema de verificar se existe antes de inserir
      const result = await supabase
        .from('viewer_sessions')
        .upsert(
          {
            stream_id: currentStream.id,
            session_id: sessionId,
            user_id: user?.id || null,
            is_active: currentStream.is_active,
            user_agent: navigator.userAgent,
            last_heartbeat: now,
            // started_at só será usado na criação, não no update
            started_at: now
          },
          {
            onConflict: 'session_id,stream_id'
          }
        )
        .select();

      let data = result.data;
      let error = result.error;

      // Verificar se é uma nova sessão comparando started_at com now (margem de 2 segundos)
      if (!error && data && data.length > 0) {
        const session = data[0];
        const sessionStartedAt = new Date(session.started_at).getTime();
        const isNewSession = Math.abs(sessionStartedAt - Date.now()) < 2000;

        // Se criou nova sessão e usuário está logado, tentar conceder VIP
        if (isNewSession && user?.id) {
          try {
            const { data: vipGranted, error: vipError } = await supabase.rpc('grant_free_vip_if_eligible', {
              p_user_id: user.id
            });
            if (vipGranted && !vipError) {
              console.log('✅ VIP grátis concedido ao acessar live!');
              toast.success('🎉 Parabéns! Você recebeu VIP gratuito!', {
                duration: 5000,
                icon: '💎'
              });
            }
          } catch (vipError) {
            console.error('Erro ao verificar VIP grátis:', vipError);
            // Não bloquear se houver erro
          }
        }

        // Se estava inativa e agora está ativa, limpar ended_at
        if (!session.is_active && currentStream.is_active && session.ended_at) {
          await supabase
            .from('viewer_sessions')
            .update({ ended_at: null })
            .eq('id', session.id);
        }
      }

      if (error) {
        // Tratar erros de constraint de duplicação como não-críticos (sessão já existe)
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
          console.warn('⚠️ trackViewer: Sessão já existe (duplicada), ignorando...', error.message);
          // Tentar fazer update da sessão existente
          try {
            const { data: existingSession } = await supabase
              .from('viewer_sessions')
              .select('id')
              .eq('session_id', sessionId)
              .eq('stream_id', currentStream.id)
              .maybeSingle();

            if (existingSession) {
              await supabase
                .from('viewer_sessions')
                .update({
                  is_active: currentStream.is_active,
                  last_heartbeat: now,
                  user_id: user?.id || null,
                  user_agent: navigator.userAgent
                })
                .eq('id', existingSession.id);
            }
          } catch (updateError) {
            console.warn('⚠️ Erro ao atualizar sessão existente:', updateError);
          }
          return; // Não bloquear o fluxo
        }

        // Tratar timeouts e erros de conexão como não-críticos
        if (error.message?.includes('timeout') || error.message?.includes('failed to connect') || error.code === 'PGRST116') {
          console.warn('⚠️ trackViewer: Erro de conexão/timeout, tentando novamente na próxima vez:', error.message);
          return; // Não bloquear o fluxo
        }

        console.error('❌ Erro ao criar/atualizar viewer_session:', error);
        // Não lançar erro para não quebrar o fluxo da aplicação
      } else {
        console.log('✅ trackViewer: Sessão criada/atualizada com sucesso', data);
      }
    } catch (e: any) {
      // Tratar todos os erros como não-críticos para não quebrar a aplicação
      if (e?.code === '23505' || e?.message?.includes('duplicate key') || e?.message?.includes('unique constraint')) {
        console.warn('⚠️ trackViewer: Sessão duplicada, ignorando...', e.message);
      } else if (e?.message?.includes('timeout') || e?.message?.includes('failed to connect')) {
        console.warn('⚠️ trackViewer: Erro de conexão, será tentado novamente:', e.message);
      } else {
        console.error('❌ Erro geral ao track viewer:', e);
      }
    }
  }, [sessionId, user?.id]); // Removido stream e updateViewerCount das dependências

  // ✅ OTIMIZAÇÃO: Heartbeat otimizado - evita chamar trackViewer toda vez
  // Com 400 viewers, cada heartbeat duplicado = 800 queries/min extras desnecessárias
  const heartbeatInitializedRef = useRef(false);
  const updateHeartbeat = useCallback(async () => {
    const currentStream = streamRef.current;
    if (!currentStream || !currentStream.is_active) return;

    try {
      // ✅ Primeira vez: criar sessão com trackViewer (faz upsert completo)
      if (!heartbeatInitializedRef.current) {
        await trackViewer();
        heartbeatInitializedRef.current = true;
        return; // Sair - trackViewer já atualiza last_heartbeat
      }

      // ✅ Depois: usar apenas RPC leve (muito mais rápido)
      // RPC update_viewer_heartbeat só faz UPDATE (sem SELECT/INSERT)
      const { error } = await supabase.rpc('update_viewer_heartbeat', { p_session_id: sessionId });

      // Se RPC falhar (sessão não existe), recriar com trackViewer
      if (error) {
        console.warn('⚠️ Heartbeat RPC falhou, recriando sessão:', error.message);
        heartbeatInitializedRef.current = false; // Reset para próxima tentativa
        await trackViewer();
        heartbeatInitializedRef.current = true;
      }
    } catch (e) {
      console.error('Erro no heartbeat:', e);
      // Em caso de erro crítico, recriar sessão
      heartbeatInitializedRef.current = false;
      await trackViewer();
      heartbeatInitializedRef.current = true;
    }
  }, [sessionId, trackViewer]);

  useEffect(() => {
    if (channelName) { loadStream(); loadZkTVData(); }
  }, [channelName]);

  // Garantir que a página fique no topo ao carregar
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // ✅ MIGRAÇÃO: Listener para todas as mudanças na stream via Socket.io
  useEffect(() => {
    if (!streamId || !socket || !isConnected) return;

    console.log(`🔌 Conectando Socket.io para stream: ${streamId}`);

    // Entrar na sala da stream
    joinStream(streamId);

    // Escutar evento 'stream-updated' do Socket.io
    const handleStreamUpdate = (data: { streamId: string; updates: Partial<LiveStream> }) => {
      if (data.streamId !== streamId) return;

      const current = streamRef.current;
      const wasActive = current?.is_active;
      const updated = { ...current, ...data.updates } as LiveStream;

      console.log('📡 Mudança na stream detectada via Socket.io:', updated.is_active ? 'AO VIVO' : 'OFFLINE');

      // Atualizar estado
      setStream(updated);
      if (data.updates.viewer_count !== undefined) {
        setCurrentViewerCount(data.updates.viewer_count);
      }

      // Lógica de tracking de sessão baseada na mudança de estado
      if (!updated.is_active && wasActive) {
        console.log('📡 PublicLiveStreamPage: Live encerrada detectada via Socket.io');
        setIsChatOpen(false);
        // Marcar sessão como inativa
        supabase.from('viewer_sessions')
          .update({ is_active: false, ended_at: new Date().toISOString() })
          .eq('session_id', sessionId)
          .eq('stream_id', streamId);

        // Mostrar notificação
        toast.error('A transmissão foi encerrada pelo administrador');
      } else if (updated.is_active) {
        // Se está ativa (seja mudança ou já estava ativa), registrar/atualizar sessão
        console.log('✅ Socket.io: Stream ativa, chamando trackViewer');
        trackViewer();
      }
    };

    on('stream-updated', handleStreamUpdate);

    return () => {
      console.log('🔌 Desconectando Socket.io stream');
      off('stream-updated', handleStreamUpdate);
      if (streamId) {
        leaveStream(streamId);
      }
    };
  }, [streamId, sessionId, trackViewer, socket, isConnected, on, off, joinStream, leaveStream]); // Dependências estáveis

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

  // ✅ OTIMIZAÇÃO: Heartbeat randomizado para evitar thundering herd com 70+ viewers
  // Randomiza timing para distribuir carga ao longo do tempo
  useEffect(() => {
    const currentStream = streamRef.current;
    if (!currentStream || !currentStream.is_active) return;

    // ✅ Randomizar primeiro heartbeat (0-15s) para distribuir carga inicial
    const initialDelay = Math.floor(Math.random() * 15000); // 0-15 segundos

    const initialTimeout = setTimeout(() => {
      updateHeartbeat();
      // Não atualizar viewer_count aqui - o admin já faz isso periodicamente
    }, initialDelay);

    // ✅ Randomizar intervalo (25-35s) para distribuir heartbeats contínuos
    const baseInterval = 30000; // 30 segundos base
    const randomOffset = Math.floor(Math.random() * 10000) - 5000; // -5 a +5 segundos
    const interval = baseInterval + randomOffset;

    const intervalId = setInterval(() => {
      const st = streamRef.current;
      if (st && st.is_active) {
        updateHeartbeat();
        // ✅ Não chamar updateViewerCount aqui - deixa o admin fazer isso
        // Com 70+ viewers, cada um chamando updateViewerCount a cada 30s = ~140 queries/min
      }
    }, interval);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [updateHeartbeat]); // Removido updateViewerCount para reduzir queries

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
    };

    const handleRotation = () => {
      if (!isMobile) return;

      if (isLandscape && !isFullscreen && videoContainerRef.current) {
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
  }, [isMobile, isFullscreen, isLandscape]);

  // ✅ Handler para rotação (apenas mobile)
  const handleRotate = () => {
    if (!isMobile) return;
    try {
      if (screen.orientation && (screen.orientation as any).lock) {
        const target = isLandscape ? 'portrait' : 'landscape';
        (screen.orientation as any).lock(target).catch(() => { });
      } else {
        toast.error('Rotação manual não suportada');
      }
    } catch (e) {
      console.error('Erro ao rotacionar:', e);
    }
  };

  // ✅ Handler para fullscreen (com suporte melhorado para mobile)
  const handleFullscreen = () => {
    if (!videoContainerRef.current) return;

    try {
      if (isFullscreen) {
        // Sair do fullscreen
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      } else {
        // Entrar no fullscreen
        const el = videoContainerRef.current;
        if (el.requestFullscreen) {
          el.requestFullscreen();
        } else if ((el as any).webkitRequestFullscreen) {
          (el as any).webkitRequestFullscreen();
        } else if ((el as any).mozRequestFullScreen) {
          (el as any).mozRequestFullScreen();
        } else if ((el as any).msRequestFullscreen) {
          (el as any).msRequestFullscreen();
        } else {
          toast.error('Fullscreen não suportado neste navegador');
        }
      }
    } catch (error: any) {
      console.error('Erro ao alternar fullscreen:', error);
      toast.error('Erro ao alternar tela cheia');
    }
  };

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

  // ✅ Handler para Picture-in-Picture
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

  useEffect(() => {
    window.addEventListener('toggle-chat', () => setIsChatOpen(p => !p));
    return () => {
      window.removeEventListener('toggle-chat', () => setIsChatOpen(p => !p));
    };
  }, []);

  // 🔍 DEBUG: Log para identificar qual chat está sendo renderizado
  useEffect(() => {
    console.log('🔍 PublicLiveStreamPage Chat Rendering State:', {
      isFullscreen,
      isMobile,
      isChatOpen,
      isLandscape,
      hasStream: !!stream,
      // Condições de renderização
      shouldRenderDesktopFullscreen: isFullscreen && !isMobile && isChatOpen && !!stream,
      shouldRenderSidebarDesktop: !isFullscreen && !!stream,
    });
  }, [isFullscreen, isMobile, isChatOpen, isLandscape, stream]);


  useEffect(() => {
    if (isMobile && isFullscreen && isLandscape) setVideoFitMode(isChatOpen ? 'contain' : 'cover');
    else if (!isFullscreen) setVideoFitMode('contain');
  }, [isMobile, isFullscreen, isLandscape, isChatOpen]);

  if (loading || !stream) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <Header />
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
      </div>
    );
  }

  const isDockedChat = isMobile && isFullscreen && isLandscape && isChatOpen;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full p-0 sm:p-4 lg:p-12 space-y-8 sm:space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 sm:gap-8 px-4 sm:px-0 pt-4 sm:pt-0">
          <div className="space-y-4">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white italic uppercase tracking-tighter">{stream.title}</h1>
              <p className="text-blue-400 font-bold text-xs uppercase tracking-[0.3em]">{stream.channel_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-6 py-3 bg-slate-800/40 rounded-2xl border border-white/5 flex items-center gap-4">
              <div className="flex items-center gap-2">
                {/* Indicador visual apenas - texto "Ao Vivo" removido para usuários */}
                <div className={`w-2 h-2 rounded-full animate-pulse ${stream.is_active ? 'bg-rose-500' : 'bg-slate-500'}`} />
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

        <div className="space-y-10">
          <div className="space-y-10">
            <div
              ref={videoContainerRef}
              onDoubleClick={handleDoubleClick}
              onMouseEnter={() => !isMobile && showControlsTemporarily()}
              onMouseMove={() => !isMobile && showControlsTemporarily()}
              onMouseLeave={() => !isMobile && setShowControls(false)}
              onClick={() => showControlsTemporarily()}
              onTouchStart={() => isMobile && showControlsTemporarily()}
              className={`relative bg-black shadow-2xl overflow-hidden isolate cursor-pointer group
                ${isFullscreen ? 'rounded-none fixed inset-0 z-[100] w-screen h-screen' : 'sm:rounded-3xl border-y sm:border border-white/10 aspect-video min-h-[220px] sm:min-h-[300px]'}
                ${isDockedChat ? 'flex' : ''}`}
              title="Duplo clique para tela cheia"
            >
              <div className={`relative h-full ${isDockedChat ? 'flex-1' : 'w-full'}`}>
                <LiveViewer
                  channelName={channelName} // Dynamic channel from params
                />

                {/* Mensagem de Transmissão Encerrada */}
                {!stream.is_active && (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center z-30">
                    <div className="text-center px-6 max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
                      {/* Icon */}
                      <div className="mb-8 relative">
                        <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
                        <div className="relative text-8xl animate-pulse">📺</div>
                      </div>

                      {/* Title */}
                      <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight">
                        Transmissão Encerrada
                      </h2>

                      {/* Message */}
                      <p className="text-lg sm:text-xl text-blue-200 mb-8 leading-relaxed">
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
                )}

                {/* Overlay de mensagens VIP na tela */}
                {stream.is_active && (
                  <VipMessageOverlay streamId={stream.id} isActive={stream.is_active} />
                )}

                {/* Overlays para Fullscreen (MODO NATIVO E FIXO) */}
                {/* Mobile Portrait Fullscreen */}
                {isFullscreen && !isLandscape && isMobile && (
                  <BottomOverlay streamId={stream.id}>
                    <PinnedLinkOverlay streamId={stream.id} />
                  </BottomOverlay>
                )}
                {/* Mobile Landscape Fullscreen */}
                {isFullscreen && isLandscape && isChatOpen && isMobile && (
                  <SideOverlay
                    streamId={stream.id}
                    isActive={stream.is_active}
                    pinnedLinkSlot={<PinnedLinkOverlay streamId={stream.id} />}
                  />
                )}
                {/* Mobile Portrait Fullscreen - ChatDrawer será renderizado via ChatHost se isChatOpen */}
                {/* Desktop Fullscreen - ChatSlot para sidebar lateral */}
                {isFullscreen && !isMobile && isChatOpen && stream && (
                  <div className="absolute right-4 top-4 bottom-4 z-50 w-[320px] flex flex-col gap-3 pointer-events-auto">
                    <div className="flex-[3] min-h-0 bg-black/80 backdrop-blur-md rounded-xl p-2 border border-white/10 overflow-hidden">
                      <ChatSlot id="desktop-fullscreen-chat" priority={100} className="h-full" />
                    </div>
                    <div className="flex-[1] min-h-0 pointer-events-auto bg-black/80 backdrop-blur-md rounded-xl p-3 space-y-2 overflow-y-auto border border-white/10 custom-scrollbar">
                      <PollDisplay streamId={stream.id} compact={true} />
                      <PinnedLinkOverlay streamId={stream.id} />
                    </div>
                  </div>
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

                {/* Botão Chat Desktop - Sempre visível em fullscreen */}
                {stream.is_active && !isMobile && (
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
                {stream.is_active && !isMobile && (
                  <div className={`absolute bottom-4 right-4 flex gap-2 z-10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'
                    }`}>
                    {/* Botão Cast (Chromecast/AirPlay) - Aparece automaticamente quando disponível */}
                    <CastButton
                      hlsUrl={stream.hls_url}
                      channelName={channelName || 'zktv'}
                    />

                    {/* Botão Picture-in-Picture / Cast Hint */}
                    {document.pictureInPictureEnabled && (
                      <button
                        onClick={togglePiP}
                        className="p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl border border-white/10 transition-all group"
                        title="Mini Player / Transmitir"
                      >
                        <Tv className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                      </button>
                    )}

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
                {stream.is_active && isMobile && (
                  <>
                    <MobileLiveControls
                      isActive={stream.is_active}
                      isFullscreen={isFullscreen}
                      onFullscreen={handleFullscreen}
                      onRotate={handleRotate}
                      onToggleFit={() => setVideoFitMode(p => p === 'contain' ? 'cover' : 'contain')}
                      fitMode={videoFitMode}
                      isDocked={isDockedChat}
                      onPictureInPicture={togglePiP}
                      isPictureInPicture={!!document.pictureInPictureElement}
                      containerRef={videoContainerRef}
                      onChatToggle={() => {
                        setIsChatOpen(!isChatOpen);
                      }}
                    />
                    {/* Botão Cast para Mobile - Aparece automaticamente quando há TV disponível */}
                    <div className={`absolute top-4 right-4 z-10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'
                      }`}>
                      <CastButton
                        hlsUrl={stream.hls_url}
                        channelName={channelName || 'zktv'}
                      />
                    </div>
                  </>
                )}
              </div>
              {/* Mobile Landscape Fullscreen - Chat Docked */}
              {isDockedChat && stream && (
                <div className={`h-full bg-black/40 backdrop-blur-md border-l border-white/10 flex flex-col pointer-events-auto shadow-2xl animate-in slide-in-from-right duration-300 ${isMobile ? 'w-[400px] min-w-[350px] max-w-[45vw]' : 'w-[300px]'
                  }`}>
                  <div className="flex-1 overflow-hidden">
                    <ChatSlot id="mobile-landscape-docked-chat" priority={90} className="h-full" />
                  </div>
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

            {/* Chat Fixo - Abaixo de Próximos Jogos (não fullscreen e quando overlay não está aberto) */}
            {!isFullscreen && !isChatOpen && stream && (
              <div className="space-y-4 mt-8">
                <PollDisplay streamId={stream.id} />
                <PinnedLinkOverlay streamId={stream.id} />
                <div className="h-[600px] bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <ChatSlot id="fixed-chat" priority={50} className="h-full" />
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* ChatDrawer (Mobile Fullscreen) */}
      {isMobile && isFullscreen && stream && (
        <>
          {/* Floating Chat Button - só aparece se chat não estiver aberto */}
          {!isChatOpen && stream.is_active && (
            <FloatingChatButton onClick={() => setIsChatOpen(true)} />
          )}
          {/* ChatDrawer para mobile fullscreen */}
          <ChatDrawer
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            streamId={stream.id}
            isActive={stream.is_active}
          />
        </>
      )}

      <Footer />

      {/* Modal de Assinatura VIP */}
      <VipSubscriptionModal
        isOpen={showVipModal}
        onClose={() => setShowVipModal(false)}
        monthlyPrice={5.00}
      />
    </div>
  );
};

export default PublicLiveStreamPage;
