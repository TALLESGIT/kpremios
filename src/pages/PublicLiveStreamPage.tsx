import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Share2, Copy, Check, Eye, ArrowLeft, Home, Maximize2, Minimize2, MessageSquare, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import VideoStream from '../components/live/VideoStream';
import LiveChat from '../components/live/LiveChat';
import VipMessageOverlay from '../components/live/VipMessageOverlay';
import { useStreamStudioSync } from '../hooks/useStreamStudioSync';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

const PublicLiveStreamPage: React.FC = () => {
  const { channelName } = useParams<{ channelName: string }>();
  const navigate = useNavigate();
  const [stream, setStream] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChatInFullscreen, setShowChatInFullscreen] = useState(false);
  const [showChatMobile, setShowChatMobile] = useState(false);
  const [showChatIcon, setShowChatIcon] = useState(false); // Ícone de chat transparente
  const [isMobile, setIsMobile] = useState(false); // Detectar se é mobile
  const [controlsVisible, setControlsVisible] = useState(true); // Controles visíveis
  const [vipMessages, setVipMessages] = useState<any[]>([]); // Mensagens VIP para overlay
  const videoContainerRef = useRef<HTMLDivElement>(null); // Ref para o container do vídeo (para fullscreen como YouTube)
  
  // Sincronizar Stream Studio com transmissão ao vivo
  const { activeScene } = useStreamStudioSync(stream?.id || '');
  
  // Tracking de sessão
  const [sessionId] = useState(() => {
    // Gerar ou recuperar session ID único
    let sid = sessionStorage.getItem('viewer_session_id');
    if (!sid) {
      sid = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('viewer_session_id', sid);
    }
    return sid;
  });
  const [sessionStarted, setSessionStarted] = useState(false);

  useEffect(() => {
    if (channelName) {
      loadStream();
    }
  }, [channelName]);

  // Iniciar tracking de sessão
  useEffect(() => {
    if (!stream?.id || sessionStarted) return;

    const startSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const startTime = new Date();
        
        const { error } = await supabase
          .from('viewer_sessions')
          .insert({
            stream_id: stream.id,
            user_id: user?.id || null,
            session_id: sessionId,
            started_at: startTime.toISOString(),
            is_active: true,
            user_agent: navigator.userAgent
          });

        if (error) throw error;
        
        setSessionStarted(true);
        
        // Atualizar duração a cada 5 segundos para tempo real
        const updateInterval = setInterval(async () => {
          const duration = Math.floor((Date.now() - startTime.getTime()) / 1000);
          await supabase
            .from('viewer_sessions')
            .update({ duration_seconds: duration })
            .eq('session_id', sessionId)
            .eq('is_active', true);
        }, 5000); // Atualizar a cada 5 segundos para tempo real

        // Finalizar sessão quando sair
        const handleBeforeUnload = async () => {
          await supabase
            .from('viewer_sessions')
            .update({
              ended_at: new Date().toISOString(),
              is_active: false
            })
            .eq('session_id', sessionId);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
          clearInterval(updateInterval);
          window.removeEventListener('beforeunload', handleBeforeUnload);
          // Finalizar sessão ao desmontar
          supabase
            .from('viewer_sessions')
            .update({
              ended_at: new Date().toISOString(),
              is_active: false
            })
            .eq('session_id', sessionId);
        };
      } catch (error) {
        console.error('Erro ao iniciar sessão:', error);
      }
    };

    startSession();
  }, [stream?.id, sessionId, sessionStarted]);

  // Atualizar contador de visualizações - Só incrementar uma vez por sessão
  useEffect(() => {
    if (!stream?.id || !sessionStarted) return;

    // Verificar se já incrementou para esta sessão
    const hasIncrementedKey = `viewer_count_incremented_${stream.id}_${sessionId}`;
    const hasIncremented = sessionStorage.getItem(hasIncrementedKey);

    // Incrementar contador apenas uma vez por sessão
    const incrementViewer = async () => {
      if (hasIncremented) {
        console.log('✅ Contador já foi incrementado para esta sessão');
        return;
      }

      try {
        await supabase.rpc('increment_viewer_count', { stream_id: stream.id });
        sessionStorage.setItem(hasIncrementedKey, 'true');
        console.log('✅ Contador de visualizações incrementado');
      } catch (error) {
        console.error('Erro ao incrementar visualizações:', error);
      }
    };

    incrementViewer();

    // Atualizar contador periodicamente via Realtime (não incrementar novamente)
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('live_streams')
          .select('viewer_count')
          .eq('id', stream.id)
          .single();
        
        if (data) {
          setViewerCount(data.viewer_count || 0);
        }
      } catch (error) {
        console.error('Erro ao atualizar contador:', error);
      }
    }, 2000); // Atualizar a cada 2 segundos para tempo real

    return () => clearInterval(interval);
  }, [stream?.id, sessionId, sessionStarted]);

  const loadStream = async () => {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select('*')
        .eq('channel_name', channelName)
        .single();

      if (error) throw error;

      setStream(data);
    } catch (error) {
      console.error('Erro ao carregar stream:', error);
      toast.error('Transmissão não encontrada');
    } finally {
      setLoading(false);
    }
  };

  // Sincronização em tempo real do overlayAd, posição da câmera e contador usando Supabase Realtime
  useEffect(() => {
    if (!stream?.id) return;

    const channel = supabase
      .channel(`live_stream_${stream.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${stream.id}`
        },
        (payload) => {
          console.log('📡 Stream atualizado em tempo real:', payload);
          const updatedStream = payload.new as any;
          
          // Atualizar stream completo
          setStream(updatedStream);
          
          // Atualizar contador de visualizações em tempo real
          if (updatedStream.viewer_count !== undefined) {
            setViewerCount(updatedStream.viewer_count || 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stream?.id]);

  const copyLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 🔥 Ajustar altura real do mobile (evita corte por barra de navegação)
  useEffect(() => {
    const updateVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    updateVh();
    window.addEventListener('resize', updateVh);
    window.addEventListener('orientationchange', updateVh);

    return () => {
      window.removeEventListener('resize', updateVh);
      window.removeEventListener('orientationchange', updateVh);
    };
  }, []);

  // Função para entrar/sair de tela cheia (com suporte mobile)
  const toggleFullscreen = async () => {
    try {
      // Verificar se já está em fullscreen (com suporte a todos os navegadores)
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (!isCurrentlyFullscreen) {
        // Entrar em fullscreen
        let element: HTMLElement | null = null;

        if (isMobile) {
          // No mobile, tentar primeiro o elemento de vídeo diretamente (melhor compatibilidade iOS)
          const videoElement = document.querySelector('#video-player video') as HTMLVideoElement;
          if (videoElement) {
            element = videoElement;
          } else {
            // Fallback para documentElement
            element = document.documentElement;
          }
        } else {
          // Desktop: usar container do vídeo
          element = videoContainerRef.current || 
                   document.querySelector('.video-container-fullscreen') as HTMLElement ||
                   document.getElementById('video-player') as HTMLElement ||
                   document.documentElement;
        }

        if (!element) {
          element = document.documentElement;
        }

        // Tentar entrar em fullscreen com suporte a todos os navegadores
        let fullscreenPromise: Promise<void> | null = null;

        try {
          if (element.requestFullscreen) {
            fullscreenPromise = element.requestFullscreen() as Promise<void>;
          } else if ((element as any).webkitRequestFullscreen) {
            fullscreenPromise = (element as any).webkitRequestFullscreen();
          } else if ((element as any).webkitEnterFullscreen && element instanceof HTMLVideoElement) {
            // iOS Safari - método específico para vídeo
            (element as any).webkitEnterFullscreen();
            fullscreenPromise = Promise.resolve();
          } else if ((element as any).mozRequestFullScreen) {
            fullscreenPromise = (element as any).mozRequestFullScreen();
          } else if ((element as any).msRequestFullscreen) {
            fullscreenPromise = (element as any).msRequestFullscreen();
          }

          if (fullscreenPromise) {
            await fullscreenPromise;
            // Aguardar um pouco para garantir que o fullscreen foi aplicado
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (fullscreenError) {
          console.error('Erro ao entrar em fullscreen:', fullscreenError);
          throw fullscreenError;
        }
        
        setIsFullscreen(true);
        setShowChatIcon(false);
        setControlsVisible(true);
        
        // Auto-hide controles após 3 segundos em mobile
        if (isMobile) {
          setTimeout(() => {
            if (isFullscreen) {
              setControlsVisible(false);
              setShowChatIcon(true);
            }
          }, 3000);
        }
      } else {
        // Sair do fullscreen
        let exitPromise: Promise<void> | null = null;

        if (document.exitFullscreen) {
          exitPromise = document.exitFullscreen() as Promise<void>;
        } else if ((document as any).webkitExitFullscreen) {
          exitPromise = (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          exitPromise = (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          exitPromise = (document as any).msExitFullscreen();
        }

        if (exitPromise) {
          await exitPromise;
        }
        
        // Desbloquear orientação
        if (screen.orientation && screen.orientation.unlock) {
          try {
            screen.orientation.unlock();
          } catch (e) {
            // Ignorar erro ao desbloquear
          }
        }
        
        setIsFullscreen(false);
        setShowChatInFullscreen(false);
        setShowChatIcon(false);
        setControlsVisible(true);
      }
    } catch (err: any) {
      console.error('Erro ao alternar tela cheia:', err);
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      
      if (!isCurrentlyFullscreen) {
        toast.error('Não foi possível entrar em tela cheia. Tente novamente.');
      }
    }
  };

  // 🔥 Fullscreen automático ao girar o celular (landscape) - Estilo YouTube
  useEffect(() => {
    if (!isMobile) return;

    let isHandlingFullscreen = false; // Flag para evitar múltiplas tentativas simultâneas
    let orientationTimer: NodeJS.Timeout;

    const handleOrientationChange = async () => {
      // Evitar múltiplas tentativas simultâneas
      if (isHandlingFullscreen) return;

      // Aguardar um pouco para a orientação estabilizar
      clearTimeout(orientationTimer);
      orientationTimer = setTimeout(async () => {
        const isLandscape = window.orientation === 90 || window.orientation === -90 || 
                           (window.innerWidth > window.innerHeight);

        const isCurrentlyFullscreen = !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        );

        if (isLandscape && !isCurrentlyFullscreen) {
          // Paisagem = entrar em tela cheia automaticamente
          isHandlingFullscreen = true;
          
          try {
            // Usar o container do vídeo
            let element: HTMLElement | null = videoContainerRef.current ||
                                             document.querySelector('.video-container-fullscreen') as HTMLElement ||
                                             document.querySelector('#video-player') as HTMLElement ||
                                             document.documentElement;

            if (element.requestFullscreen) {
              await element.requestFullscreen();
            } else if ((element as any).webkitRequestFullscreen) {
              await (element as any).webkitRequestFullscreen();
            } else if ((element as any).mozRequestFullScreen) {
              await (element as any).mozRequestFullScreen();
            } else if ((element as any).msRequestFullscreen) {
              await (element as any).msRequestFullscreen();
            }

            setIsFullscreen(true);
          } catch (err: any) {
            // Ignorar erros de permissão silenciosamente
            if (err.name !== 'NotAllowedError' && err.name !== 'TypeError') {
              console.log('Fullscreen automático não disponível:', err);
            }
          } finally {
            setTimeout(() => {
              isHandlingFullscreen = false;
            }, 1000);
          }
        } else if (!isLandscape && isCurrentlyFullscreen) {
          // Retrato = sair da tela cheia automaticamente
          try {
            if (document.exitFullscreen) {
              await document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
              await (document as any).webkitExitFullscreen();
            } else if ((document as any).mozCancelFullScreen) {
              await (document as any).mozCancelFullScreen();
            } else if ((document as any).msExitFullscreen) {
              await (document as any).msExitFullscreen();
            }

            setIsFullscreen(false);
          } catch (err: any) {
            // Ignorar erros silenciosamente
            if (err.name !== 'NotAllowedError' && err.name !== 'TypeError') {
              console.log('Erro ao sair do fullscreen:', err);
            }
          }
        }
      }, 300);
    };

    // Escutar mudanças de orientação
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Também escutar resize (alguns dispositivos não disparam orientationchange)
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleOrientationChange, 500);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);
      clearTimeout(orientationTimer);
      clearTimeout(resizeTimer);
    };
  }, [isMobile, videoContainerRef]);

  // 🔥 Pinch-to-zoom no vídeo em fullscreen (estilo YouTube)
  useEffect(() => {
    if (!isFullscreen || !isMobile) return;

    const videoContainer = videoContainerRef.current;
    if (!videoContainer) return;

    const videoElement = videoContainer.querySelector('video') as HTMLVideoElement;
    if (!videoElement) return;

    let initialDistance = 0;
    let currentScale = 1;
    let currentTranslateX = 0;
    let currentTranslateY = 0;
    let isPinching = false;
    let lastTouchCenter = { x: 0, y: 0 };

    const getDistance = (touch1: Touch, touch2: Touch) => {
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (touch1: Touch, touch2: Touch) => {
      return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        isPinching = true;
        initialDistance = getDistance(e.touches[0], e.touches[1]);
        lastTouchCenter = getTouchCenter(e.touches[0], e.touches[1]);
        e.preventDefault();
      } else {
        isPinching = false;
        currentScale = 1;
        currentTranslateX = 0;
        currentTranslateY = 0;
        videoElement.style.transform = '';
        videoElement.style.transition = 'transform 0.3s ease-out';
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isPinching) {
        e.preventDefault();
        
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / initialDistance;
        
        // Limitar zoom entre 1x e 3x
        const newScale = Math.max(1, Math.min(3, scale));
        currentScale = newScale;

        const touchCenter = getTouchCenter(e.touches[0], e.touches[1]);
        const deltaX = touchCenter.x - lastTouchCenter.x;
        const deltaY = touchCenter.y - lastTouchCenter.y;

        currentTranslateX += deltaX;
        currentTranslateY += deltaY;

        // Limitar movimento para não sair muito da tela
        const maxTranslate = 100;
        currentTranslateX = Math.max(-maxTranslate, Math.min(maxTranslate, currentTranslateX));
        currentTranslateY = Math.max(-maxTranslate, Math.min(maxTranslate, currentTranslateY));

        videoElement.style.transition = 'none';
        videoElement.style.transform = `scale(${newScale}) translate(${currentTranslateX / newScale}px, ${currentTranslateY / newScale}px)`;
        videoElement.style.transformOrigin = 'center center';

        lastTouchCenter = touchCenter;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2 && isPinching) {
        isPinching = false;
        
        // Se o zoom for muito pequeno, resetar para 1x
        if (currentScale < 1.1) {
          currentScale = 1;
          currentTranslateX = 0;
          currentTranslateY = 0;
        }

        videoElement.style.transition = 'transform 0.3s ease-out';
        videoElement.style.transform = `scale(${currentScale}) translate(${currentTranslateX / currentScale}px, ${currentTranslateY / currentScale}px)`;
        videoElement.style.transformOrigin = 'center center';
      }
    };

    // Adicionar listeners
    videoContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    videoContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    videoContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
    videoContainer.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      videoContainer.removeEventListener('touchstart', handleTouchStart);
      videoContainer.removeEventListener('touchmove', handleTouchMove);
      videoContainer.removeEventListener('touchend', handleTouchEnd);
      videoContainer.removeEventListener('touchcancel', handleTouchEnd);
      
      // Resetar transformações ao sair
      if (videoElement) {
        videoElement.style.transform = '';
        videoElement.style.transition = '';
      }
    };
  }, [isFullscreen, isMobile, videoContainerRef]);

  // Detectar toque na tela para mostrar/ocultar controles (mobile)
  useEffect(() => {
    if (!isFullscreen || !isMobile) return;

    let touchTimer: NodeJS.Timeout;
    const videoContainer = document.querySelector('.video-container-fullscreen');

    const handleTouch = () => {
      setControlsVisible(true);
      setShowChatIcon(true);
      
      // Auto-hide após 3 segundos
      clearTimeout(touchTimer);
      touchTimer = setTimeout(() => {
        if (isFullscreen && !showChatInFullscreen) {
          setControlsVisible(false);
          setShowChatIcon(true); // Manter ícone visível
        }
      }, 3000);
    };

    if (videoContainer) {
      videoContainer.addEventListener('touchstart', handleTouch);
      return () => {
        videoContainer.removeEventListener('touchstart', handleTouch);
        clearTimeout(touchTimer);
      };
    }
  }, [isFullscreen, isMobile, showChatInFullscreen]);

  // Escutar mensagens VIP em tempo real para overlay
  useEffect(() => {
    if (!stream?.id) return;

    const channel = supabase
      .channel(`vip-messages-${stream.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `stream_id=eq.${stream.id} AND is_vip=eq.true`
        },
        (payload) => {
          const newMessage = payload.new;
          if (newMessage.is_vip) {
            setVipMessages(prev => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stream?.id]);

  // Detectar mudanças no estado de tela cheia
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (!isCurrentlyFullscreen) {
        setShowChatInFullscreen(false);
        setShowChatIcon(false);
        setControlsVisible(true);
        
        // Desbloquear orientação ao sair
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      } else {
        // Ao entrar em fullscreen, mostrar controles temporariamente
        if (isMobile) {
          setControlsVisible(true);
          setShowChatIcon(false);
          setTimeout(() => {
            if (isCurrentlyFullscreen && !showChatInFullscreen) {
              setControlsVisible(false);
              setShowChatIcon(true);
            }
          }, 3000);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isMobile, showChatInFullscreen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="max-w-7xl mx-auto p-4 py-8">
          {/* Botão Voltar */}
          <button
            onClick={() => navigate('/')}
            className="mb-4 md:mb-6 flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors font-medium bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 rounded-lg border border-amber-500/30 w-auto"
          >
            <ArrowLeft size={18} />
            <span className="text-sm md:text-base">Voltar</span>
          </button>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Transmissão não encontrada</h2>
            <p className="text-slate-300 mb-6">Esta transmissão não existe ou foi encerrada.</p>
            <button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 mx-auto"
            >
              <Home size={20} />
              Ir para Início
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Meta tags para mobile fullscreen */}
      {isFullscreen && isMobile && (
        <style>{`
          html, body {
            overflow: hidden !important;
          }
          @media screen and (orientation: portrait) {
            .video-container-fullscreen {
              transform: rotate(90deg);
              transform-origin: center center;
              width: 100vh !important;
              height: 100vw !important;
              position: fixed !important;
              top: 50% !important;
              left: 50% !important;
              margin-left: -50vh !important;
              margin-top: -50vw !important;
            }
          }
          .video-container-fullscreen {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 9999 !important;
            background: black !important;
          }
          .video-container-fullscreen video {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
          }
          
          /* Para mobile, usar contain para não cortar conteúdo */
          .video-container-fullscreen > div > div video,
          .video-container-fullscreen video,
          .video-container-fullscreen [ref="remoteVideoRef"] video,
          .video-container-fullscreen [ref="remoteVideoRef"] > div > video {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
          }
          
          /* Container do vídeo em fullscreen - Estilo YouTube */
          .video-container-fullscreen {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          
          /* Quando em fullscreen, garantir que o container ocupe 100% da tela */
          .video-container-fullscreen:fullscreen,
          .video-container-fullscreen:-webkit-full-screen,
          .video-container-fullscreen:-moz-full-screen,
          .video-container-fullscreen:-ms-fullscreen {
            width: 100vw !important;
            height: 100vh !important;
            background: #000 !important;
          }
          
          .video-container-fullscreen > div {
            width: 100% !important;
            height: 100% !important;
          }
          
          /* Garantir que o container do vídeo ocupe toda a tela */
          .video-container-fullscreen > div > div:first-child {
            width: 100% !important;
            height: 100% !important;
          }
          
          /* Garantir que o vídeo dentro do container cubra toda a área em fullscreen */
          .video-container-fullscreen:fullscreen video,
          .video-container-fullscreen:-webkit-full-screen video,
          .video-container-fullscreen:-moz-full-screen video,
          .video-container-fullscreen:-ms-fullscreen video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
          }
          
          /* Botão de fullscreen sempre visível acima de tudo */
          .fullscreen-button-container {
            z-index: 99999 !important;
            position: absolute !important;
            pointer-events: none !important;
          }
          
          .fullscreen-button-container button {
            z-index: 99999 !important;
            pointer-events: auto !important;
            opacity: 0.8 !important;
          }
          
          .fullscreen-button-container button:hover {
            opacity: 1 !important;
          }
        `}</style>
      )}
      
      <div 
        className={`min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ${isFullscreen ? 'overflow-hidden fixed inset-0' : ''}`}
        style={isFullscreen && isMobile ? { 
          position: 'fixed',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          touchAction: 'none' // Prevenir gestos de rotação
        } : {}}
      >
      {!isFullscreen && <Header />}
      
      <div className="max-w-7xl mx-auto p-4 py-8">
        {/* Botão Voltar - Fixo no topo para mobile */}
        <button
          onClick={() => navigate('/')}
          className="mb-4 md:mb-6 flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors font-medium bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 rounded-lg border border-amber-500/30 w-auto"
        >
          <ArrowLeft size={18} />
          <span className="text-sm md:text-base">Voltar</span>
        </button>

        {/* Título e Info */}
        <div className="mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-white break-words">{stream.title}</h1>
            {stream.is_active && (
              <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                <div className="flex items-center gap-2 bg-red-500/20 px-3 md:px-4 py-2 rounded-full border border-red-500/50">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-400 font-bold text-xs md:text-sm">AO VIVO</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Eye size={16} className="md:w-[18px] md:h-[18px]" />
                  <span className="font-medium text-sm md:text-base">{viewerCount} assistindo</span>
                </div>
              </div>
            )}
            {!stream.is_active && (
              <div className="flex items-center gap-2 bg-gray-500/20 px-3 md:px-4 py-2 rounded-full border border-gray-500/50">
                <span className="text-gray-400 font-medium text-xs md:text-sm">Encerrada</span>
              </div>
            )}
          </div>
          {stream.description && (
            <p className="text-slate-300 text-sm md:text-base break-words">{stream.description}</p>
          )}
        </div>

        {/* Overlay de Mensagens VIP */}
        {stream.is_active && (
          <VipMessageOverlay messages={vipMessages} />
        )}

        {/* Layout: Vídeo + Chat - Estilo YouTube */}
        {stream.is_active ? (
          <div 
            ref={videoContainerRef}
            className={`relative video-container-fullscreen ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}
          >
            {/* Container principal - Grid responsivo estilo YouTube */}
            <div className={`relative ${isFullscreen ? 'w-full h-full flex' : 'grid grid-cols-1 xl:grid-cols-[1fr_400px] 2xl:grid-cols-[1fr_450px] gap-4 md:gap-6 mb-6'}`}>
              {/* Player de Vídeo - Ocupa espaço flexível */}
              <div 
                className={`${isFullscreen && showChatInFullscreen ? (isMobile ? 'w-1/2' : 'w-full sm:w-[calc(100%-24rem)]') : isFullscreen ? 'w-full h-full' : 'relative min-w-0'} relative transition-all duration-300`}
                onClick={() => {
                  // Em mobile fullscreen, toque na tela mostra/oculta controles
                  if (isFullscreen && isMobile && !showChatInFullscreen) {
                    setControlsVisible(true);
                    setShowChatIcon(true);
                    setTimeout(() => {
                      if (isFullscreen && !showChatInFullscreen) {
                        setControlsVisible(false);
                        setShowChatIcon(true);
                      }
                    }, 3000);
                  }
                }}
              >
                <div className={`${isFullscreen ? 'w-full h-full p-0' : 'bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/20'} relative`}>
                  <VideoStream
                    channelName={stream.channel_name}
                    isBroadcaster={false}
                    streamId={stream.id}
                    sessionId={sessionId}
                    overlayAd={
                      stream.overlay_ad_url && stream.overlay_ad_enabled
                        ? { url: stream.overlay_ad_url, enabled: true }
                        : undefined
                    }
                    cameraPipPosition={
                      stream.camera_pip_x !== undefined && stream.camera_pip_y !== undefined
                        ? { x: stream.camera_pip_x, y: stream.camera_pip_y }
                        : undefined
                    }
                    activeScene={activeScene}
                  />
                  
                  {/* Botão de Fullscreen - Sempre visível, transparente e acima de tudo */}
                  <div className="fullscreen-button-container absolute bottom-1 right-2 z-[9999]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleFullscreen();
                      }}
                      className="bg-black/10 hover:bg-black/30 text-white p-3 rounded-full transition-all backdrop-blur-sm border border-white/15 shadow-lg"
                      aria-label={isFullscreen ? "Sair de tela cheia" : "Tela cheia"}
                      title={isFullscreen ? "Sair de tela cheia" : "Tela cheia"}
                      style={{ zIndex: 9999 }}
                    >
                      {isFullscreen ? <Minimize2 size={22} className="drop-shadow-lg" /> : <Maximize2 size={22} className="drop-shadow-lg" />}
                    </button>
                  </div>
                  
                  {/* Ícone de Chat Transparente (Mobile Fullscreen) */}
                  {isFullscreen && isMobile && showChatIcon && !showChatInFullscreen && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowChatInFullscreen(true);
                        setControlsVisible(true);
                        setShowChatIcon(false);
                      }}
                      className="absolute top-4 right-4 z-20 bg-black/40 hover:bg-black/60 text-white p-3 rounded-full transition-all backdrop-blur-md border border-white/30 shadow-lg animate-pulse"
                      aria-label="Abrir Chat"
                    >
                      <MessageSquare size={24} className="opacity-90" />
                      {/* Badge de notificação */}
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-black animate-ping"></span>
                    </button>
                  )}
                  
                  {/* Botões de controle em tela cheia */}
                  {isFullscreen && (controlsVisible || !isMobile) && (
                    <div className={`absolute top-4 right-4 z-10 flex gap-2 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                      {/* Botão de Chat (Desktop ou quando chat está aberto) */}
                      {(!isMobile || showChatInFullscreen) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowChatInFullscreen(!showChatInFullscreen);
                            if (!showChatInFullscreen) {
                              setControlsVisible(true);
                            }
                          }}
                          className="bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all backdrop-blur-sm border border-white/20"
                          aria-label="Toggle Chat"
                        >
                          {showChatInFullscreen ? <X size={20} /> : <MessageSquare size={20} />}
                        </button>
                      )}
                      
                      {/* Botão de Sair da tela cheia */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFullscreen();
                        }}
                        className="bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all backdrop-blur-sm border border-white/20"
                        aria-label="Sair de tela cheia"
                      >
                        <Minimize2 size={20} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat - Normal (não em tela cheia) - Desktop/TV - Estilo YouTube */}
              {!isFullscreen && (
                <div className="hidden xl:block relative">
                  <div className="sticky top-4 h-[calc(100vh-8rem)] max-h-[800px]">
                    <LiveChat streamId={stream.id} channelName={stream.channel_name} />
                  </div>
                </div>
              )}

              {/* Chat - Mobile (não em tela cheia) - Overlay */}
              {!isFullscreen && showChatMobile && (
                <div className="lg:hidden fixed inset-0 z-50 bg-black/95 backdrop-blur-md">
                  <div className="h-full flex flex-col">
                    {/* Header do chat mobile */}
                    <div className="flex items-center justify-between p-4 border-b border-white/20">
                      <h3 className="text-white font-bold text-lg">Chat</h3>
                      <button
                        onClick={() => setShowChatMobile(false)}
                        className="text-white hover:text-gray-300 transition-colors"
                        aria-label="Fechar Chat"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    {/* Chat content */}
                    <div className="flex-1 overflow-hidden">
                      <LiveChat streamId={stream.id} channelName={stream.channel_name} />
                    </div>
                  </div>
                </div>
              )}

              {/* Botão flutuante de chat para mobile (não em tela cheia) */}
              {!isFullscreen && (
                <button
                  onClick={() => setShowChatMobile(true)}
                  className="lg:hidden fixed bottom-6 right-6 z-40 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white p-4 rounded-full shadow-lg transition-all flex items-center gap-2 font-medium"
                  aria-label="Abrir Chat"
                >
                  <MessageSquare size={20} />
                  <span className="text-sm font-bold">Chat</span>
                </button>
              )}

              {/* Chat em Fullscreen - Slide lateral estilo YouTube */}
              {isFullscreen && showChatInFullscreen && (
                <div 
                  className={`absolute top-0 right-0 h-full ${isMobile ? 'w-1/2' : 'w-96 2xl:w-[450px]'} bg-black/98 backdrop-blur-md border-l border-white/20 z-20 animate-slide-in-right shadow-2xl`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="h-full flex flex-col">
                    {/* Header do chat em tela cheia */}
                    <div className="flex items-center justify-between p-4 border-b border-white/20 bg-slate-900/80 backdrop-blur-sm">
                      <h3 className="text-white font-bold text-lg">💬 Chat ao Vivo</h3>
                      <button
                        onClick={() => {
                          setShowChatInFullscreen(false);
                          // Em mobile, ocultar controles após fechar chat
                          if (isMobile) {
                            setTimeout(() => {
                              setControlsVisible(false);
                              setShowChatIcon(true);
                            }, 1000);
                          }
                        }}
                        className="text-white hover:text-slate-300 transition-colors p-2 rounded-full hover:bg-white/10"
                        aria-label="Fechar Chat"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    {/* Chat - Altura completa */}
                    <div className="flex-1 overflow-hidden">
                      <LiveChat streamId={stream.id} channelName={stream.channel_name} />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Overlay para fechar chat ao clicar no vídeo (mobile) */}
              {isFullscreen && showChatInFullscreen && isMobile && (
                <div 
                  className="absolute inset-0 z-10 bg-transparent"
                  onClick={() => {
                    setShowChatInFullscreen(false);
                    setTimeout(() => {
                      setControlsVisible(false);
                      setShowChatIcon(true);
                    }, 1000);
                  }}
                />
              )}
            </div>

          </div>
        ) : (
          <div className="mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-white/20">
              <div className="w-full min-h-[300px] md:min-h-[400px] bg-slate-800 rounded-lg flex items-center justify-center">
                <div className="text-center px-4">
                  <div className="text-5xl md:text-6xl mb-4">📹</div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Transmissão Encerrada</h3>
                  <p className="text-slate-400 text-sm md:text-base mb-4">
                    Esta transmissão não está mais ao vivo.
                  </p>
                  <p className="text-slate-500 text-xs md:text-sm">
                    A transmissão foi finalizada. Fique atento para as próximas lives!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compartilhar */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Share2 className="text-amber-400 flex-shrink-0" size={20} />
            <div className="flex-1 min-w-0">
              <label className="block text-white text-xs md:text-sm mb-1">Compartilhar Transmissão</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={window.location.href}
                  readOnly
                  className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 text-xs md:text-sm truncate"
                />
                <button
                  onClick={copyLink}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm md:text-base whitespace-nowrap"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isFullscreen && <Footer />}
      </div>
    </>
  );
};

export default PublicLiveStreamPage;

