import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Eye, Share2, MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import ZKViewer from '../components/ZKViewer';
import LiveChat from '../components/live/LiveChat';
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
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsHideTimerRef = useRef<number | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [showStreamContent, setShowStreamContent] = useState(false);
  const [sessionId] = useState(() => {
    // Tentar recuperar sessionId do localStorage para manter a mesma sessão entre recarregamentos
    const storageKey = `live_session_${channelName}`;
    const savedSessionId = localStorage.getItem(storageKey);
    
    if (savedSessionId) {
      return savedSessionId;
    }
    
    // Criar novo sessionId se não existir
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, newSessionId);
    return newSessionId;
  });

  useEffect(() => {
    if (channelName) {
      loadStream();
    }

    return () => {
      // Marcar sessão como encerrada ao sair
      if (stream) {
        endViewerSession();
      }
    };
  }, [channelName]);

  // Scroll para o topo quando a página carregar (após renderização)
  useEffect(() => {
    // Forçar scroll para o topo imediatamente e após um pequeno delay
    window.scrollTo(0, 0);
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Scroll para o topo quando o stream for carregado
  useEffect(() => {
    if (stream) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 100);
    }
  }, [stream]);

  // Detectar se é mobile e orientação
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                    window.innerWidth <= 768;
      setIsMobile(mobile);
      setIsLandscape(window.innerWidth > window.innerHeight);
      console.log('📱 Detecção mobile:', { mobile, userAgent: navigator.userAgent, width: window.innerWidth });
    };
    
    const handleOrientationChange = () => {
      if (!isMobile) return;
      
      // Aguardar um pouco para a orientação se estabilizar
      setTimeout(() => {
        const isLandscape = window.innerWidth > window.innerHeight;
        setIsLandscape(isLandscape);
        console.log('🔄 Mudança de orientação:', { isLandscape, width: window.innerWidth, height: window.innerHeight });
        
        // Auto fullscreen em paisagem no mobile
        if (isLandscape && !isFullscreen && videoContainerRef.current) {
          console.log('🔄 Auto fullscreen ativado (paisagem)');
          videoContainerRef.current.requestFullscreen?.();
        }
      }, 300);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, [isMobile, isFullscreen]);

  const isDockedChat = isMobile && isFullscreen && isLandscape && isChatOpen;
  const effectiveVideoFitMode: 'contain' | 'cover' = isDockedChat ? 'contain' : videoFitMode;

  const scheduleHideControls = (delayMs: number) => {
    if (controlsHideTimerRef.current) {
      window.clearTimeout(controlsHideTimerRef.current);
      controlsHideTimerRef.current = null;
    }
    controlsHideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, delayMs);
  };

  const showControlsTemporarily = (delayMs: number = 2500) => {
    setControlsVisible(true);
    scheduleHideControls(delayMs);
  };

  // comportamento estilo YouTube: em fullscreen paisagem, padrão é "Preencher (zoom)"
  useEffect(() => {
    if (isMobile && isFullscreen && isLandscape) {
      setVideoFitMode('cover');
    }
    if (!isFullscreen) {
      setVideoFitMode('contain');
    }
  }, [isMobile, isFullscreen, isLandscape]);

  // Quando o chat estiver DOCKED (lado a lado), SEMPRE usar "sem cortes"
  useEffect(() => {
    if (isDockedChat) {
      setVideoFitMode('contain');
    }
  }, [isDockedChat]);

  // Auto-hide dos botões (mobile): mostra por um instante e depois some
  useEffect(() => {
    if (!isMobile) {
      setControlsVisible(true);
      return;
    }
    // Só faz sentido quando há stream ativo (botões existem)
    if (stream?.is_active) {
      // Ao entrar em fullscreen/rotacionar, mostra e esconde
      showControlsTemporarily(isFullscreen ? 2000 : 2500);
    } else {
      setControlsVisible(false);
    }

    return () => {
      if (controlsHideTimerRef.current) {
        window.clearTimeout(controlsHideTimerRef.current);
        controlsHideTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, isFullscreen, isLandscape, stream?.is_active]);

  // Detectar fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreenNow = !!(document.fullscreenElement || 
                                 (document as any).webkitFullscreenElement ||
                                 (document as any).mozFullScreenElement ||
                                 (document as any).msFullscreenElement);
      setIsFullscreen(isFullscreenNow);
      console.log('🖥️ Fullscreen mudou:', { isFullscreen: isFullscreenNow, isMobile });
      // Fechar chat quando sair do fullscreen
      if (!isFullscreenNow) {
        setIsChatOpen(false);
      }
    };

    // Verificar estado inicial
    handleFullscreenChange();

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
  }, [isMobile]);


  // Track viewer após stream ser carregado (apenas se estiver ativo)
  useEffect(() => {
    if (stream && channelName && stream.is_active) {
      trackViewer();
      // Mostrar conteúdo apenas quando transmissão estiver ativa
      setShowStreamContent(true);
    } else if (stream && !stream.is_active) {
      // Se a transmissão não está ativa, encerrar sessão se existir
      endViewerSession();
      // Ocultar conteúdo quando transmissão não estiver ativa
      setShowStreamContent(false);
      // Garantir que o chat feche automaticamente quando encerrar
      setIsChatOpen(false);
    }
  }, [stream, channelName]);

  // Se o stream ficar inativo por polling/subscription, fechar chat imediatamente
  useEffect(() => {
    if (!stream?.is_active && isChatOpen) {
      setIsChatOpen(false);
    }
  }, [stream?.is_active, isChatOpen]);

  // Heartbeat e atualização do contador (apenas se estiver ativo)
  useEffect(() => {
    if (!stream || !stream.is_active) {
      // Se não está ativo, definir contador como 0
      setViewerCount(0);
      return;
    }

    // Atualizar heartbeat e contador imediatamente
    updateHeartbeat();
    updateViewerCount();

    // Atualizar heartbeat a cada 30 segundos
    const heartbeatInterval = setInterval(() => {
      updateHeartbeat();
    }, 30000);

    // Atualizar contador a cada 5 segundos
    const countInterval = setInterval(() => {
      updateViewerCount();
    }, 5000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(countInterval);
    };
  }, [stream, stream?.is_active]);

  const loadStream = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('live_streams')
        .select('*')
        .eq('channel_name', channelName)
        .maybeSingle(); // Usar maybeSingle() ao invés de single() para evitar erro 406 quando não há resultado

      if (error) throw error;

      if (!data) {
        toast.error('Transmissão não encontrada');
        navigate('/');
        return;
      }

      setStream(data);
      setViewerCount(data.viewer_count || 0);
      
      console.log('📺 Stream carregado:', { 
        id: data.id, 
        is_active: data.is_active, 
        title: data.title 
      });

      // Não mostrar toast se a transmissão não está ativa - a mensagem já aparece na tela
    } catch (error: any) {
      console.error('Erro ao carregar transmissão:', error);
      if (error.code === 'PGRST116') {
        toast.error('Transmissão não encontrada');
        navigate('/');
      } else {
        toast.error('Erro ao carregar transmissão');
      }
    } finally {
      setLoading(false);
    }
  };

  const trackViewer = async () => {
    if (!stream) {
      console.log('⏳ Stream ainda não carregado, aguardando...');
      return;
    }

    // Só rastrear viewer se a transmissão estiver ativa
    if (!stream.is_active) {
      console.log('⏸️ Transmissão não está ativa, não rastreando viewer');
      return;
    }

    try {
      console.log('👤 Criando sessão de visualização...', {
        streamId: stream.id,
        sessionId,
        channelName
      });
      
      // Verificar se já existe sessão para este session_id (usando maybeSingle para evitar erro 406)
      const { data: existingSession, error: checkError } = await supabase
        .from('viewer_sessions')
        .select('id, is_active, ended_at')
        .eq('session_id', sessionId)
        .eq('stream_id', stream.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar sessão existente:', checkError);
      }

      if (existingSession) {
        // Se já existe, apenas reativar e atualizar heartbeat
        console.log('ℹ️ Sessão já existe, reativando...', existingSession);
        const { error: updateError } = await supabase
          .from('viewer_sessions')
          .update({ 
            is_active: true,
            // Se o usuário fizer login depois, anexar o user_id na sessão
            user_id: user?.id ?? null,
            last_heartbeat: new Date().toISOString(),
            ended_at: null,
            started_at: existingSession.ended_at ? new Date().toISOString() : undefined
          })
          .eq('session_id', sessionId)
          .eq('stream_id', stream.id);

        if (updateError) {
          console.error('❌ Erro ao reativar sessão:', updateError);
        } else {
          console.log('✅ Sessão reativada com sucesso');
        }
      } else {
        // Criar nova sessão de visualização
        const { data, error } = await supabase.from('viewer_sessions').insert({
          stream_id: stream.id,
          session_id: sessionId,
          is_active: true,
          user_id: user?.id ?? null,
          user_agent: navigator.userAgent,
          last_heartbeat: new Date().toISOString(),
        }).select();

        if (error) {
          console.error('❌ Erro ao criar sessão de visualização:', error);
        } else {
          console.log('✅ Sessão de visualização criada:', data);
        }
      }
      
      // NÃO limpar sessões aqui - isso será feito periodicamente pelo updateViewerCount
      // Apenas atualizar contador (que já faz limpeza internamente)
      await updateViewerCount();
    } catch (error) {
      console.error('Erro ao rastrear viewer:', error);
    }
  };

  const updateHeartbeat = async () => {
    if (!stream || !stream.is_active) return;

    try {
      // Atualizar heartbeat usando função SQL
      const { error } = await supabase.rpc('update_viewer_heartbeat', {
        p_session_id: sessionId
      });

      if (error) {
        console.error('❌ Erro ao atualizar heartbeat:', error);
      }
    } catch (error) {
      console.error('Erro ao atualizar heartbeat:', error);
    }
  };

  const cleanupOldSessions = async () => {
    if (!stream) return;

    try {
      // Limpar sessões duplicadas primeiro
      const { error: dupError } = await supabase.rpc(
        'cleanup_duplicate_viewer_sessions',
        { p_stream_id: stream.id }
      );

      if (dupError) {
        console.error('❌ Erro ao limpar sessões duplicadas:', dupError);
      } else {
        console.log('🧹 Sessões duplicadas limpas');
      }

      // Limpar sessões antigas usando função SQL
      const { error } = await supabase.rpc('cleanup_inactive_viewer_sessions');

      if (error) {
        console.error('❌ Erro ao limpar sessões antigas:', error);
      } else {
        console.log('🧹 Sessões antigas limpas');
      }
    } catch (error) {
      console.error('Erro ao limpar sessões antigas:', error);
    }
  };

  const endViewerSession = async () => {
    if (!stream) return;

    try {
      console.log('👋 Encerrando sessão de visualização...', { sessionId, streamId: stream.id });
      
      const { error } = await supabase
        .from('viewer_sessions')
        .update({
          ended_at: new Date().toISOString(),
          is_active: false,
        })
        .eq('session_id', sessionId)
        .eq('stream_id', stream.id);

      if (error) {
        console.error('❌ Erro ao encerrar sessão:', error);
      } else {
        console.log('✅ Sessão encerrada com sucesso');
      }

      // Remover sessionId do localStorage ao sair
      const storageKey = `live_session_${channelName}`;
      localStorage.removeItem(storageKey);

      // Atualizar contador após encerrar sessão
      await updateViewerCount();
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error);
    }
  };

  // Ref para evitar múltiplas chamadas simultâneas
  const updatingCountRef = useRef(false);
  const lastCleanupRef = useRef(0);

  const updateViewerCount = async () => {
    if (!stream) return;

    // Evitar chamadas simultâneas
    if (updatingCountRef.current) {
      return;
    }

    // Se a transmissão não está ativa, definir contador como 0
    if (!stream.is_active) {
      setViewerCount(0);
      // Atualizar no banco também
      await supabase
        .from('live_streams')
        .update({ viewer_count: 0 })
        .eq('id', stream.id);
      return;
    }

    updatingCountRef.current = true;

    try {
      // Limpar sessões apenas a cada 30 segundos (não a cada atualização)
      const now = Date.now();
      if (now - lastCleanupRef.current > 30000) {
        await cleanupOldSessions();
        lastCleanupRef.current = now;
      }
      
      console.log('📊 Atualizando contador de viewers...', { streamId: stream.id });
      
      // Usar função SQL para contar apenas sessões únicas ativas
      const { data: countData, error } = await supabase.rpc(
        'count_active_unique_viewers',
        { p_stream_id: stream.id }
      );

      if (error) {
        console.error('❌ Erro ao contar viewers:', error);
        // Fallback: contar manualmente com DISTINCT
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: sessions, error: fallbackError } = await supabase
          .from('viewer_sessions')
          .select('session_id')
          .eq('stream_id', stream.id)
          .eq('is_active', true)
          .gte('last_heartbeat', fiveMinutesAgo);

        if (fallbackError) {
          throw fallbackError;
        }

        // Contar sessões únicas manualmente
        const uniqueSessions = new Set(sessions?.map(s => s.session_id) || []);
        const newCount = uniqueSessions.size;
        console.log('👥 Viewers únicos encontrados (fallback):', newCount);

        await supabase
          .from('live_streams')
          .update({ viewer_count: newCount })
          .eq('id', stream.id);

        setViewerCount(newCount);
        return;
      }

      const newCount = Number(countData) || 0;
      console.log('👥 Viewers únicos ativos encontrados:', newCount);

      // Atualizar contador na tabela live_streams
      const { error: updateError } = await supabase
        .from('live_streams')
        .update({ viewer_count: newCount })
        .eq('id', stream.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar viewer_count no banco:', updateError);
      } else {
        console.log('✅ Contador atualizado no banco:', newCount);
      }

      setViewerCount(newCount);
    } catch (error) {
      console.error('Erro ao atualizar contador de viewers:', error);
    } finally {
      updatingCountRef.current = false;
    }
  };

  // Subscribe para atualizações da transmissão e viewer_sessions
  useEffect(() => {
    if (!stream) return;

    console.log('🔔 Configurando subscription para stream:', stream.id, 'is_active:', stream.is_active);

    const channel = supabase
      .channel(`public_stream_${stream.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${stream.id}`,
        },
        (payload) => {
          const updated = payload.new as LiveStream;
          console.log('📡 Stream atualizado via subscription:', { 
            is_active: updated.is_active, 
            viewer_count: updated.viewer_count,
            old_is_active: stream?.is_active,
            payload: payload
          });
          
          // Forçar atualização do estado
          setStream((prev) => {
            if (prev && prev.id === updated.id) {
              return { ...prev, ...updated };
            }
            return updated;
          });
          setViewerCount(updated.viewer_count || 0);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'viewer_sessions',
          filter: `stream_id=eq.${stream.id}`,
        },
        (payload) => {
          console.log('📊 Mudança em viewer_sessions:', payload.eventType);
          // Atualizar contador quando houver mudanças nas sessões
          updateViewerCount();
        }
      )
      .subscribe();

    // Polling como fallback para garantir que o estado seja atualizado
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('live_streams')
          .select('*')
          .eq('id', stream.id)
          .single();

        if (!error && data) {
          setStream((prev) => {
            if (prev && prev.is_active !== data.is_active) {
              console.log('🔄 Estado do stream mudou via polling:', { 
                old: prev.is_active, 
                new: data.is_active 
              });
            }
            return data;
          });
          setViewerCount(data.viewer_count || 0);
        }
      } catch (error) {
        console.error('Erro ao fazer polling do stream:', error);
      }
    }, 5000); // Verificar a cada 5 segundos

    return () => {
      console.log('🔕 Removendo subscription do stream:', stream.id);
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [stream?.id]); // Usar apenas stream.id como dependência para evitar recriar subscription

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
          <p className="text-white">Carregando transmissão...</p>
        </div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Transmissão não encontrada</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-x-hidden">
      {/* Estilos específicos para mobile */}
      <style jsx>{`
        .mobile-video-container {
          touch-action: pan-y;
        }
        
        @media (max-width: 768px) {
          .mobile-video-container:fullscreen {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: black !important;
          }
          
          .mobile-video-container:fullscreen > * {
            width: 100% !important;
            height: auto !important;
            max-height: 100% !important;
            aspect-ratio: 16/9 !important;
            object-fit: contain !important;
          }
        }
        
        @media (orientation: landscape) and (max-width: 768px) {
          .mobile-video-container:fullscreen > * {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
          }
        }
      `}</style>
      
      <Header />

      {/* Conteúdo Principal */}
      <div className="flex-1 max-w-[1400px] mx-auto w-full p-2 sm:p-4 overflow-y-auto overflow-x-hidden">
        {/* Header da Transmissão */}
        <div className="mb-3 sm:mb-4">
          <button
            onClick={() => navigate('/')}
            className="text-amber-400 hover:text-amber-300 mb-2 flex items-center gap-2 transition-colors text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Voltar</span>
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-white mb-1 truncate">{stream.title}</h1>
              {stream.description && (
                <p className="text-xs sm:text-sm text-slate-400 line-clamp-2">{stream.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2 text-slate-300 text-xs sm:text-base">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">{stream?.is_active ? (viewerCount > 0 ? viewerCount : stream?.viewer_count || 0) : 0}</span>
                <span className="text-xs sm:text-sm text-slate-400 hidden sm:inline">viewers</span>
              </div>
              {/* Botão de Compartilhar */}
              <button
                onClick={async () => {
                  const streamUrl = `${window.location.origin}/live/${stream.channel_name}`;
                  
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: stream.title,
                        text: `Assista à transmissão ao vivo: ${stream.title}`,
                        url: streamUrl,
                      });
                    } catch (error) {
                      // Usuário cancelou ou erro - copiar para área de transferência
                      try {
                        await navigator.clipboard.writeText(streamUrl);
                        toast.success('Link copiado');
                      } catch (err) {
                        console.error('Erro ao copiar link:', err);
                        toast.error('Erro ao compartilhar link');
                      }
                    }
                  } else {
                    // Fallback: copiar para área de transferência
                    try {
                      await navigator.clipboard.writeText(streamUrl);
                      toast.success('Link copiado');
                    } catch (err) {
                      console.error('Erro ao copiar link:', err);
                      toast.error('Erro ao copiar link');
                    }
                  }
                }}
                className="px-2 sm:px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2 flex-shrink-0"
                title="Compartilhar transmissão"
              >
                <Share2 className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium hidden sm:inline">Compartilhar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status da Transmissão - Só mostra se realmente não estiver ativa */}
        {stream && !stream.is_active && (
          <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-300 text-center text-xs sm:text-sm">
              ⏸️ Esta transmissão não está ativa no momento. Aguarde o início da transmissão.
            </p>
          </div>
        )}

        {/* Layout Principal - 16:9 com melhorias mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 relative">
          {/* Vídeo - Ocupa 8 colunas */}
          <div className="lg:col-span-8 relative">
            <div 
              ref={videoContainerRef}
              className={`bg-black rounded-lg overflow-hidden relative ${
                isMobile ? 'mobile-video-container' : ''
              }`}
              style={{ 
                aspectRatio: (isMobile && isFullscreen) ? undefined : '16/9',
                // Garantir que em mobile fullscreen mantenha proporção
                ...(isMobile && isFullscreen ? {
                  width: '100vw',
                  height: '100dvh',
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  zIndex: 9999,
                  borderRadius: 0,
                  display: isDockedChat ? 'flex' : 'block',
                  flexDirection: isDockedChat ? 'row' : undefined,
                  alignItems: isDockedChat ? 'stretch' : undefined
                } : {})
              }}
              onClick={() => {
                // Toque/click na tela: mostrar controles e depois esconder (estilo YouTube)
                if (isMobile && stream?.is_active) {
                  showControlsTemporarily(2500);
                }
              }}
              onDoubleClick={() => {
                // Duplo clique para fullscreen
                if (!document.fullscreenElement) {
                  videoContainerRef.current?.requestFullscreen?.();
                } else {
                  document.exitFullscreen?.();
                }
              }}
              onTouchStart={(e) => {
                if (!isMobile) return;
                if (stream?.is_active) {
                  showControlsTemporarily(2500);
                }
                const touch = e.touches[0];
                setTouchStart({ x: touch.clientX, y: touch.clientY });
              }}
              onTouchEnd={(e) => {
                if (!isMobile || !touchStart) return;
                
                const touch = e.changedTouches[0];
                const deltaY = touchStart.y - touch.clientY;
                const deltaX = Math.abs(touchStart.x - touch.clientX);
                
                // Swipe vertical com pelo menos 50px de movimento e pouco movimento horizontal
                if (Math.abs(deltaY) > 50 && deltaX < 100) {
                  if (deltaY > 0 && !isFullscreen) {
                    // Swipe up - entrar em fullscreen
                    videoContainerRef.current?.requestFullscreen?.();
                  } else if (deltaY < 0 && isFullscreen) {
                    // Swipe down - sair do fullscreen
                    document.exitFullscreen?.();
                  }
                }
                
                setTouchStart(null);
              }}
            >
              {/* Área do vídeo (em docked chat, ocupa apenas a parte esquerda) */}
              <div
                className="zk-video-stage"
                style={
                  isDockedChat
                    ? { position: 'relative', flex: 1, height: '100%', minWidth: 0, background: 'black' }
                    : { position: 'absolute', inset: 0 }
                }
              >
                <div
                  className="zk-video-frame"
                  style={
                    isDockedChat
                      ? {
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'black',
                        }
                      : { position: 'absolute', inset: 0 }
                  }
                >
                  <div
                    style={
                      isDockedChat
                        ? {
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            maxWidth: '100%',
                            maxHeight: '100%',
                          }
                        : { position: 'absolute', inset: 0 }
                    }
                  >
                    {/* Sempre usa canal fixo "ZkPremios" para conectar ao ZK Studio Pro */}
                    {/* CORREÇÃO: Só mostrar conteúdo quando transmissão estiver ativa */}
                    {showStreamContent ? (
                      <ZKViewer channel="ZkPremios" fitMode={effectiveVideoFitMode} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                        <div className="text-center p-6">
                          <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                            <div className="w-6 h-6 bg-slate-500 rounded-full"></div>
                          </div>
                          <h3 className="text-white text-lg font-semibold mb-2">Transmissão em Preparação</h3>
                          <p className="text-slate-400 text-sm">Aguarde o início da transmissão ao vivo</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Painel DOCKED (YouTube) - fullscreen paisagem + chat aberto */}
              <AnimatePresence>
                {isDockedChat && stream && stream.is_active && (
                  <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="bg-slate-900 shadow-2xl flex flex-col chat-overlay-mobile"
                    style={{
                      position: 'relative',
                      width: 'clamp(260px, 35vw, 340px)',
                      height: '100%',
                      zIndex: 2147483647,
                      pointerEvents: 'auto',
                      borderLeft: '1px solid rgba(148, 163, 184, 0.25)'
                    }}
                  >
                    <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800">
                      <h3 className="text-white font-semibold flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Chat ao Vivo
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsChatOpen(false);
                        }}
                        className="text-slate-400 hover:text-white transition-colors p-1"
                        aria-label="Fechar chat"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <LiveChat streamId={stream.id} isAdmin={false} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Botões Mobile - Chat e Fullscreen */}
              {isMobile && stream && stream.is_active && (
                <>
                  {/* Wrapper de controles: some e aparece por toque */}
                  <div
                    style={{
                      opacity: controlsVisible ? 1 : 0,
                      transition: 'opacity 200ms ease',
                      pointerEvents: controlsVisible ? 'auto' : 'none',
                    }}
                  >
                    {/* Botão "Zoom/Preencher" (estilo YouTube) - só faz sentido fora do docked chat */}
                    {isFullscreen && isLandscape && !isDockedChat && (
                      <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 0.65, scale: 1 }}
                      whileHover={{ opacity: 0.95 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setVideoFitMode((prev) => (prev === 'cover' ? 'contain' : 'cover'));
                      }}
                      className="absolute top-4 left-4 mobile-chat-button text-white p-2.5 rounded-full shadow-lg"
                      style={{
                        position: 'fixed',
                        top: '16px',
                        left: '16px',
                        zIndex: 2147483646,
                        pointerEvents: 'auto',
                        touchAction: 'auto',
                      }}
                      aria-label={videoFitMode === 'cover' ? 'Sem cortar' : 'Preencher tela'}
                      title={videoFitMode === 'cover' ? 'Sem cortar' : 'Preencher tela'}
                      >
                        {/* ícone simples */}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
                        </svg>
                      </motion.button>
                    )}

                  {/* Botão de Chat Transparente */}
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.7, scale: 1 }}
                    whileHover={{ opacity: 1 }}
                    whileTap={{ scale: 0.95 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      const newState = !isChatOpen;
                      console.log('💬 Botão de chat clicado:', { 
                        isChatOpen, 
                        isFullscreen, 
                        isMobile,
                        willOpen: newState,
                        timestamp: new Date().toISOString()
                      });
                      
                      // Feedback visual temporário
                      const button = e.currentTarget as HTMLButtonElement;
                      button.style.backgroundColor = 'rgba(34, 197, 94, 0.8)';
                      setTimeout(() => {
                        button.style.backgroundColor = '';
                      }, 300);
                      
                      setIsChatOpen(newState);
                      console.log('💬 Estado do chat após clique:', newState);
                      
                      // Alerta visual para debug (remover depois)
                      if (newState) {
                        console.log('✅ Chat DEVE estar abrindo agora!');
                      } else {
                        console.log('❌ Chat DEVE estar fechando agora!');
                      }
                    }}
                    className="absolute top-4 right-4 mobile-chat-button text-white p-2.5 rounded-full shadow-lg"
                    style={{
                      position: 'fixed',
                      top: '16px',
                      right: '16px',
                      zIndex: 2147483646,
                      pointerEvents: 'auto',
                      touchAction: 'auto'
                    }}
                    aria-label={isChatOpen ? "Fechar chat" : "Abrir chat"}
                    title={isChatOpen ? "Fechar chat" : "Abrir chat"}
                  >
                    {isChatOpen ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                  </motion.button>

                  {/* Botão Fullscreen Transparente (Retrato) */}
                  {!isFullscreen && window.innerHeight > window.innerWidth && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 0.6, scale: 1 }}
                      whileHover={{ opacity: 0.9 }}
                      whileTap={{ scale: 0.95 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('🔍 Botão fullscreen clicado');
                        videoContainerRef.current?.requestFullscreen?.();
                      }}
                      className="absolute bottom-4 right-4 z-[60] mobile-chat-button text-white p-2.5 rounded-full shadow-lg"
                      aria-label="Tela cheia"
                      title="Tela cheia"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </motion.button>
                  )}
                  </div>

                  {/* Chat Overlay (modo overlay) - não usar quando estiver DOCKED */}
                  <AnimatePresence>
                    {isChatOpen && !isDockedChat && (
                      <>
                        {/* Backdrop */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => {
                            console.log('🔙 Backdrop clicado - fechando chat (mobile)');
                            setIsChatOpen(false);
                          }}
                          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                          style={{
                            zIndex: 2147483646,
                            pointerEvents: 'auto',
                          }}
                        />

                        {/* Painel do Chat */}
                        <motion.div
                          initial={{ x: '100%' }}
                          animate={{ x: 0 }}
                          exit={{ x: '100%' }}
                          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                          className="absolute top-0 right-0 h-full w-[75%] max-w-sm bg-slate-900 shadow-2xl flex flex-col chat-overlay-mobile"
                          style={{
                            height: '100%',
                            zIndex: 2147483647,
                            pointerEvents: 'auto',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                              <MessageSquare className="w-5 h-5" />
                              Chat ao Vivo
                            </h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsChatOpen(false);
                              }}
                              className="text-slate-400 hover:text-white transition-colors p-1"
                              aria-label="Fechar chat"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="flex-1 overflow-hidden">
                            <LiveChat streamId={stream.id} isAdmin={false} />
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* Indicador de Swipe para Fullscreen (Mobile) */}
              {isMobile && !isFullscreen && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 0.6, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
                >
                  <div className="bg-black/40 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-2 swipe-indicator">
                    <span>↕️</span>
                    <span>Deslize para expandir</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Chat - Desktop (apenas quando estiver AO VIVO) */}
          {!isMobile && stream?.is_active ? (
            /* Chat Normal (Desktop) */
            <div className="lg:col-span-4">
              <div style={{ minHeight: '600px' }}>
                <LiveChat streamId={stream.id} isAdmin={false} />
              </div>
            </div>
          ) : !isMobile ? (
            <div className="lg:col-span-4">
              <div className="min-h-[200px] bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center p-6 text-center">
                <div className="text-slate-300 text-sm">
                  Chat disponível apenas durante a transmissão ao vivo.
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PublicLiveStreamPage;

