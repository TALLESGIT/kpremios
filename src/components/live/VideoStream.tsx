import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, X, Monitor, MonitorOff, Link as LinkIcon, Volume2, VolumeX, Volume1, Circle, Square } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { supabase } from '../../lib/supabase';
import StreamOverlay from './StreamOverlay';
import { setupIOSPlaybackFix } from '../player/utils/iosPlaybackFix';

// Suprimir warnings específicos do Agora SDK que são comuns e não afetam funcionalidade
// Esses erros ocorrem durante reconexões WebSocket e são normais
let agoraWarningsSuppressed = false;

const suppressAgoraWarnings = () => {
  // Aplicar apenas uma vez
  if (agoraWarningsSuppressed) return;
  
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Padrões de erros do Agora SDK que podem ser ignorados (são comuns durante reconexões)
  const ignorablePatterns = [
    /AgoraRTCError WS_ABORT: type: ping/i,
    /AgoraRTCError WS_ABORT: type: traffic_stats/i,
    /AgoraRTCError WS_ABORT: type: restart_ice/i,
    /restart ICE failed, abort operation/i,
    /get traffic stats error.*WS_ABORT/i,
    /P2PChannel\.restartICE warning/i,
    /AgoraRTCException.*WS_ABORT.*type: (ping|traffic_stats|restart_ice)/i,
    /multi unilbs network error, retry.*NETWORK_TIMEOUT/i,
    /AgoraRTCError NETWORK_TIMEOUT: timeout of \d+ms exceeded/i,
    /AgoraRTCException.*NETWORK_TIMEOUT.*timeout of \d+ms exceeded/i,
    // Avisos de áudio que são normais (nível baixo não é um problema real)
    /AUDIO_OUTPUT_LEVEL_TOO_LOW/i,
    /AUDIO_OUTPUT_LEVEL_TOO_LOW_RECOVER/i,
    /code: 2002.*AUDIO_OUTPUT_LEVEL_TOO_LOW/i,
    /code: 4002.*AUDIO_OUTPUT_LEVEL_TOO_LOW_RECOVER/i,
    // Avisos de AudioContext que são comuns e não afetam funcionalidade
    /AudioContext current time stuck/i,
    // Avisos de TURN/STUN timeout que são comuns em algumas redes
    /TURN allocate request timed out/i,
    /STUN binding request timed out/i,
    /P2PConnection\.onICECandidateError.*code: 701/i
  ];
  
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    const shouldIgnore = ignorablePatterns.some(pattern => pattern.test(message));
    if (!shouldIgnore) {
      originalError.apply(console, args);
    }
  };
  
  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    const shouldIgnore = ignorablePatterns.some(pattern => pattern.test(message));
    if (!shouldIgnore) {
      originalWarn.apply(console, args);
    }
  };
  
  agoraWarningsSuppressed = true;
};

// Aplicar supressão ao carregar o módulo (apenas uma vez)
suppressAgoraWarnings();

interface AdImage {
  id: string;
  url: string;
  enabled: boolean;
  duration?: number; // Para slideshow (segundos)
}

interface VideoStreamProps {
  channelName: string;
  isBroadcaster: boolean;
  onEnd?: () => void;
  adImages?: AdImage[]; // Imagens para slideshow
  overlayAd?: { url: string; enabled: boolean }; // Propaganda overlay
  onStatsUpdate?: (stats: {
    viewerCount: number;
    connectionState: string;
    connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  }) => void;
  streamId?: string; // ID da transmissão para tracking
  sessionId?: string; // ID da sessão do viewer para tracking
  onRecordingStateChange?: (isRecording: boolean) => void; // Callback para estado de gravação
  onRecordingReady?: (blob: Blob, filename: string) => void; // Callback quando gravação está pronta
  cameraPipPosition?: { x: number; y: number }; // Posição da câmera PiP (para viewers)
  screenShareEnabled?: boolean; // Controlar compartilhamento de tela via Stream Studio
  hideScreenShareButton?: boolean; // Ocultar botão de tela quando usando Stream Studio
  activeScene?: any; // Cena ativa do Stream Studio para overlays
  cameraDeviceId?: string; // ID do dispositivo de câmera (para OBS Virtual Camera, etc)
  hideControls?: boolean; // Ocultar todos os controles quando usando OBS
}

/**
 * Componente de transmissão ao vivo usando Agora.io
 * 
 * Para usar:
 * 1. Instale: npm install agora-rtc-sdk-ng
 * 2. Configure as credenciais no .env
 * 3. Use este componente na página de transmissão
 */
const VideoStream: React.FC<VideoStreamProps> = ({ 
  channelName, 
  isBroadcaster,
  onEnd,
  adImages = [],
  overlayAd,
  onStatsUpdate,
  streamId,
  sessionId,
  onRecordingStateChange,
  onRecordingReady,
  cameraPipPosition,
  screenShareEnabled = false,
  hideScreenShareButton = false,
  activeScene = null,
  cameraDeviceId,
  hideControls = false
}) => {
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  // Função auxiliar para limpar elementos de forma segura
  const safeClearElement = (element: HTMLElement | null) => {
    if (!element) return;
    
    try {
      // Verificar se o elemento ainda está no DOM antes de limpar
      if (!element.isConnected) {
        return; // Elemento já foi removido do DOM
      }
      
      // NUNCA limpar se há vídeo sendo reproduzido (especialmente para remoteVideoRef)
      const hasVideo = element.querySelector('video');
      if (hasVideo) {
        const videoElement = hasVideo as HTMLVideoElement;
        // Verificar se o vídeo está realmente sendo reproduzido
        // Verificar também se está em fullscreen (não limpar em fullscreen)
        const isInFullscreen = !!(document.fullscreenElement || 
          (document as any).webkitFullscreenElement || 
          (document as any).mozFullScreenElement || 
          (document as any).msFullscreenElement);
        
        if (videoElement.videoWidth > 0 || 
            videoElement.offsetWidth > 0 || 
            !videoElement.paused || 
            videoElement.readyState >= 2 || // HAVE_CURRENT_DATA ou superior
            isInFullscreen) {
          console.log('⚠️ Tentativa de limpar elemento com vídeo ativo, ignorando...', {
            videoWidth: videoElement.videoWidth,
            offsetWidth: videoElement.offsetWidth,
            paused: videoElement.paused,
            readyState: videoElement.readyState,
            isInFullscreen
          });
          return; // Não limpar se há vídeo ativo ou em fullscreen
        }
      }
      
      // Usar innerHTML para limpar de forma mais segura (evita conflitos com React)
      // Mas apenas se não houver vídeo sendo reproduzido
      if (!hasVideo) {
        element.innerHTML = '';
      }
    } catch (e) {
      // Se houver erro, apenas logar (não crítico)
      console.debug('Aviso ao limpar elemento:', e);
    }
  };
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasLocalVideo, setHasLocalVideo] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [gameVolume, setGameVolume] = useState(100); // Volume do jogo/tela (0-100)
  const [micVolume, setMicVolume] = useState(100); // Volume do microfone (0-100)
  const [isGameDucked, setIsGameDucked] = useState(false); // Se o volume do jogo está abaixado
  const [normalGameVolume, setNormalGameVolume] = useState(100); // Volume normal do jogo (para restaurar)
  const [videoSource, setVideoSource] = useState<'camera' | 'screen' | 'external'>('camera');
  const [externalVideoUrl, setExternalVideoUrl] = useState<string>('');
  const [showExternalUrlInput, setShowExternalUrlInput] = useState(false);
  const [showScreenShare, setShowScreenShare] = useState(false);
  const [showCamera, setShowCamera] = useState(true);
  const [cameraPosition, setCameraPosition] = useState({ x: 20, y: 20 }); // Posição em pixels (para cálculo)
  const [cameraPositionPercent, setCameraPositionPercent] = useState({ x: 0, y: 0 }); // Posição em porcentagem (para sincronização)
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerSizeRef = useRef({ width: 0, height: 0 }); // Tamanho do container para cálculos
  const [showAudioControls, setShowAudioControls] = useState(false); // Mostrar/ocultar controles de áudio
  
  // Estados para propagandas e slideshow
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showOverlayAd, setShowOverlayAd] = useState(false);
  const [overlayAdImage, setOverlayAdImage] = useState<string | null>(null);
  const slideIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estados e refs para gravação
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  
  const clientRef = useRef<any>(null);
  const localAudioTrackRef = useRef<any>(null);
  const localVideoTrackRef = useRef<any>(null);
  const screenVideoTrackRef = useRef<any>(null);
  const screenAudioTrackRef = useRef<any>(null); // Referência separada para o audio track
  const cameraVideoTrackRef = useRef<any>(null);
  const externalVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const cameraPiPRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef<boolean>(false);
  const cleanupCalledRef = useRef<boolean>(false);
  const currentChannelRef = useRef<string>('');
  const isJoiningRef = useRef<boolean>(false);
  const isCleaningUpRef = useRef<boolean>(false); // Flag para indicar que cleanup está em andamento
  const ensureVideoDisplayRunningRef = useRef<boolean>(false);
  const checkTracksIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const combinedVideoTrackRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeSceneRef = useRef<any>(null); // Ref para activeScene atual para uso no canvas
  
  // Atualizar ref sempre que activeScene mudar (para o canvas ter acesso ao valor atual)
  useEffect(() => {
    activeSceneRef.current = activeScene;
  }, [activeScene]);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const transitionCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Configuração Agora
  const APP_ID = import.meta.env.VITE_AGORA_APP_ID || '';
  // Para desenvolvimento sem token, usar null explicitamente
  // Se o projeto no Agora.io requer token, você precisa gerar um token temporário
  const TOKEN = import.meta.env.VITE_AGORA_TOKEN || null;

  // Validação e debug
  useEffect(() => {
    if (!APP_ID) {
      console.error('❌ VITE_AGORA_APP_ID não encontrado no .env');
      console.error('📋 Verifique se o arquivo .env contém: VITE_AGORA_APP_ID=seu-app-id');
    } else {
      console.log('✅ App ID carregado:', APP_ID.substring(0, 8) + '...');
    }
    
    if (TOKEN) {
      console.log('✅ Token carregado:', TOKEN.substring(0, 20) + '...');
    } else {
      console.warn('⚠️ Token não encontrado - usando apenas App ID');
    }
  }, []);

  useEffect(() => {
    console.log('🔄 useEffect triggered:', {
      isInitialized: isInitializedRef.current,
      isJoining: isJoiningRef.current,
      currentChannel: currentChannelRef.current,
      newChannel: channelName,
      isBroadcaster,
      isStreaming,
      hasClient: !!clientRef.current,
      hasRemoteVideo,
      isConnecting
    });
    
    // Se o channelName mudou e já estávamos conectados, fazer cleanup primeiro
    if (isInitializedRef.current && currentChannelRef.current !== channelName && currentChannelRef.current !== '') {
      console.log('⚠️ Channel name changed from', currentChannelRef.current, 'to', channelName, '- cleaning up first...');
      // Aguardar cleanup completar antes de continuar
      cleanup().then(() => {
        isInitializedRef.current = false;
        cleanupCalledRef.current = false;
        isJoiningRef.current = false;
        // Aguardar um pouco antes de reinicializar
        setTimeout(() => {
          if (!isInitializedRef.current) {
            console.log('🔄 Reinicializando após mudança de canal...');
            initializeBasedOnRole();
          }
        }, 300);
      });
      return;
    }

    // Evitar múltiplas inicializações
    if (isInitializedRef.current || isJoiningRef.current) {
      console.log('⏸️ Já inicializado ou em processo de join, ignorando...');
      // Mas se é viewer e não há cliente, pode ser que precisa inicializar
      if (!isBroadcaster && !clientRef.current) {
        console.log('⚠️ Viewer sem cliente, forçando reinicialização...');
        isInitializedRef.current = false;
        isJoiningRef.current = false;
        initializeBasedOnRole();
      }
      // Se é viewer, tem cliente, mas não tem vídeo remoto e não está conectando, tentar conectar novamente
      if (!isBroadcaster && clientRef.current && !hasRemoteVideo && !isConnecting && !isJoiningRef.current) {
        console.log('⚠️ Viewer tem cliente mas não tem vídeo, tentando reconectar...');
        const connectionState = String(clientRef.current.connectionState);
        console.log('   Estado da conexão:', connectionState);
        if (connectionState === 'DISCONNECTED' || connectionState === 'DISCONNECTING') {
          console.log('   Cliente desconectado, reinicializando...');
          isInitializedRef.current = false;
          isJoiningRef.current = false;
          initializeBasedOnRole();
        }
      }
      return;
    }

    // Se já está no canal correto E está transmitindo, não fazer nada
    if (currentChannelRef.current === channelName && clientRef.current && isStreaming) {
      console.log('✅ Já está no canal correto e transmitindo, ignorando...');
      return;
    }
    
    // Se já está no canal correto mas não está transmitindo, verificar se precisa reinicializar
    if (currentChannelRef.current === channelName && clientRef.current && !isStreaming) {
      console.log('⚠️ Está no canal correto mas não está transmitindo, verificando...');
      // Se o cliente existe mas não está transmitindo, pode ser que houve um erro
      // Não fazer nada por enquanto, deixar o usuário tentar novamente
      return;
    }

    console.log('🚀 Iniciando inicialização...');
    initializeBasedOnRole();
  }, [isBroadcaster, channelName, isStreaming]);

  // Verificar periodicamente se o vídeo está visível (para garantir que o estado seja atualizado)
  useEffect(() => {
    if (!isBroadcaster || !isStreaming) return;

    const checkVideo = () => {
      if (localVideoRef.current) {
        const videoElement = localVideoRef.current.querySelector('video') as HTMLVideoElement;
        if (videoElement && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
          if (!hasLocalVideo) {
            console.log('✅ Vídeo detectado e visível, atualizando estado...');
            setHasLocalVideo(true);
          }
        }
      }
    };

    // Verificar imediatamente e depois periodicamente
    checkVideo();
    const interval = setInterval(checkVideo, 500);
    
    return () => clearInterval(interval);
  }, [isBroadcaster, isStreaming, hasLocalVideo]);

  // Auto fullscreen ao virar o celular para paisagem (para broadcaster e viewers)
  useEffect(() => {
    // Habilitar fullscreen automático para viewers também (mas apenas em mobile)
    const isMobileDevice = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobileDevice) return; // Apenas em mobile

    let isHandlingFullscreen = false; // Flag para evitar múltiplas tentativas simultâneas

    const handleOrientationChange = async () => {
      // Evitar múltiplas tentativas simultâneas
      if (isHandlingFullscreen) return;
      
      const videoPlayer = document.getElementById('video-player');
      if (!videoPlayer) return;

      // Verificar se já está em fullscreen
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      // Verificar orientação (90 ou -90 = paisagem)
      const isLandscape = window.orientation === 90 || window.orientation === -90 || 
                         (window.innerWidth > window.innerHeight);

      if (isLandscape && !isCurrentlyFullscreen) {
        // Paisagem = entrar em tela cheia (apenas se não estiver já em fullscreen)
        isHandlingFullscreen = true;
        
        try {
          if (videoPlayer.requestFullscreen) {
            await videoPlayer.requestFullscreen();
          } else if ((videoPlayer as any).webkitRequestFullscreen) {
            await (videoPlayer as any).webkitRequestFullscreen();
          } else if ((videoPlayer as any).mozRequestFullScreen) {
            await (videoPlayer as any).mozRequestFullScreen();
          } else if ((videoPlayer as any).msRequestFullscreen) {
            await (videoPlayer as any).msRequestFullscreen();
          }
        } catch (err: any) {
          // Ignorar erros de permissão (usuário pode ter cancelado ou não permitido)
          if (err.name !== 'NotAllowedError' && err.name !== 'TypeError') {
            console.log('⚠️ Não foi possível entrar em fullscreen:', err);
          }
        } finally {
          // Resetar flag após um delay
          setTimeout(() => {
            isHandlingFullscreen = false;
          }, 1000);
        }
      } else if (!isLandscape && isCurrentlyFullscreen) {
        // Retrato = sair da tela cheia
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
        } catch (err: any) {
          // Ignorar erros silenciosamente
          if (err.name !== 'NotAllowedError' && err.name !== 'TypeError') {
            console.log('⚠️ Não foi possível sair do fullscreen:', err);
          }
        }
      }
    };

    // Adicionar listener para mudança de orientação com debounce
    let orientationTimer: NodeJS.Timeout;
    const debouncedHandleOrientationChange = () => {
      clearTimeout(orientationTimer);
      orientationTimer = setTimeout(handleOrientationChange, 300); // Reduzido para resposta mais rápida
    };

    window.addEventListener('orientationchange', debouncedHandleOrientationChange);
    // Também escutar resize para detectar mudanças de orientação em alguns dispositivos
    window.addEventListener('resize', debouncedHandleOrientationChange);
    
    // Escutar mudanças de fullscreen para garantir que o vídeo seja mantido
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      
      if (isCurrentlyFullscreen) {
        // Quando entra em fullscreen, garantir que o vídeo está visível
        setTimeout(() => {
          const videoElement = remoteVideoRef.current?.querySelector('video') as HTMLVideoElement;
          if (videoElement) {
            videoElement.style.display = 'block';
            videoElement.style.visibility = 'visible';
            videoElement.style.opacity = '1';
            videoElement.style.zIndex = '20';
            console.log('✅ Vídeo mantido visível em fullscreen');
          }
        }, 100);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      window.removeEventListener('orientationchange', debouncedHandleOrientationChange);
      window.removeEventListener('resize', debouncedHandleOrientationChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      clearTimeout(orientationTimer);
    };
  }, [isBroadcaster]);

  // Verificar periodicamente se o vídeo remoto está visível (para garantir que o overlay não apareça)
  useEffect(() => {
    if (isBroadcaster) return;

    const checkRemoteVideo = () => {
      if (remoteVideoRef.current) {
        // Verificar se há vídeo em qualquer lugar dentro do remoteVideoRef
        const videoElement = remoteVideoRef.current.querySelector('video') as HTMLVideoElement;
        const videoInContainer = remoteVideoRef.current.querySelector('div > video') as HTMLVideoElement;
        const actualVideo = videoElement || videoInContainer;
        
        if (actualVideo) {
          // Verificar se o vídeo tem conteúdo válido
          const hasValidVideo = actualVideo.videoWidth > 0 || 
                               actualVideo.offsetWidth > 0 || 
                               !actualVideo.paused || 
                               actualVideo.readyState >= 2 ||
                               actualVideo.srcObject !== null;
          
          if (hasValidVideo) {
            // Se há vídeo renderizado mas hasRemoteVideo é false, atualizar IMEDIATAMENTE
            if (!hasRemoteVideo) {
              console.log('✅ Vídeo remoto detectado e visível, atualizando estado...', {
                videoWidth: actualVideo.videoWidth,
                offsetWidth: actualVideo.offsetWidth,
                paused: actualVideo.paused,
                readyState: actualVideo.readyState,
                hasSrcObject: actualVideo.srcObject !== null
              });
              setHasRemoteVideo(true);
              setIsConnecting(false);
            }
            
            // Garantir que o vídeo está visível e acima de tudo
            actualVideo.style.zIndex = '20';
            actualVideo.style.display = 'block';
            actualVideo.style.visibility = 'visible';
            actualVideo.style.opacity = '1';
            actualVideo.style.position = 'absolute';
            actualVideo.style.top = '0';
            actualVideo.style.left = '0';
            actualVideo.style.width = '100%';
            actualVideo.style.height = '100%';
            actualVideo.style.objectFit = 'cover';
            actualVideo.style.backgroundColor = '#000';
            
            // Garantir que o container pai também está visível
            if (remoteVideoRef.current) {
              remoteVideoRef.current.style.display = 'block';
              remoteVideoRef.current.style.visibility = 'visible';
              remoteVideoRef.current.style.opacity = '1';
            }
            
            // Garantir que o container do vídeo está visível
            const videoContainer = actualVideo.parentElement;
            if (videoContainer) {
              videoContainer.style.display = 'block';
              videoContainer.style.visibility = 'visible';
              videoContainer.style.opacity = '1';
            }
          } else {
            console.log('⚠️ Vídeo encontrado mas sem conteúdo válido ainda...', {
              videoWidth: actualVideo.videoWidth,
              offsetWidth: actualVideo.offsetWidth,
              paused: actualVideo.paused,
              readyState: actualVideo.readyState
            });
          }
        } else if (hasRemoteVideo) {
          // Se hasRemoteVideo é true mas não há vídeo, verificar se foi removido
          console.warn('⚠️ hasRemoteVideo é true mas vídeo não encontrado');
        }
      }
    };

    // Verificar imediatamente e depois periodicamente (mais frequente)
    checkRemoteVideo();
    const interval = setInterval(checkRemoteVideo, 500); // Verificar a cada 500ms
    
    return () => clearInterval(interval);
  }, [isBroadcaster, hasRemoteVideo]);

  // Event listeners para arrastar o PiP da câmera
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && cameraPiPRef.current) {
        const container = localVideoRef.current?.getBoundingClientRect();
        if (container) {
          const pipSize = 120; // Tamanho fixo do PiP
          const newX = e.clientX - container.left - dragOffset.x;
          const newY = e.clientY - container.top - dragOffset.y;
          
          // Limitar dentro do container
          const maxX = container.width - pipSize;
          const maxY = container.height - pipSize;
          
          const clampedX = Math.max(0, Math.min(maxX, newX));
          const clampedY = Math.max(0, Math.min(maxY, newY));
          
          // Atualizar posição em pixels
          setCameraPosition({
            x: clampedX,
            y: clampedY
          });
          
          // Calcular e atualizar posição em porcentagem (0-100)
          // IMPORTANTE: Usar a área disponível (maxX/maxY) como base para o cálculo
          const availableWidth = container.width - pipSize;
          const availableHeight = container.height - pipSize;
          
          // Calcular porcentagem baseado na área disponível (não no container total)
          const percentX = availableWidth > 0 ? (clampedX / availableWidth) * 100 : 0;
          const percentY = availableHeight > 0 ? (clampedY / availableHeight) * 100 : 0;
          
          console.log('📐 Cálculo de porcentagem (Admin):', {
            containerSize: { width: container.width, height: container.height },
            availableSize: { width: availableWidth, height: availableHeight },
            pixelPosition: { x: clampedX, y: clampedY },
            percentPosition: { x: percentX, y: percentY }
          });
          
          setCameraPositionPercent({
            x: Math.max(0, Math.min(100, percentX)),
            y: Math.max(0, Math.min(100, percentY))
          });
          
          // Salvar tamanho do container para referência
          containerSizeRef.current = { width: container.width, height: container.height };
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Salvar posição da câmera no banco quando admin mover (com debounce) - usando porcentagem
  useEffect(() => {
    if (!isBroadcaster || !streamId) return;
    
    const timeoutId = setTimeout(async () => {
      try {
        // Salvar como porcentagem (0-100) para funcionar em qualquer tamanho de tela
        await supabase
          .from('live_streams')
          .update({
            camera_pip_x: Math.round(cameraPositionPercent.x * 100) / 100, // Salvar como 0-100 (com 2 casas decimais)
            camera_pip_y: Math.round(cameraPositionPercent.y * 100) / 100
          })
          .eq('id', streamId);
        console.log('💾 Posição da câmera salva no banco (porcentagem):', cameraPositionPercent);
      } catch (error) {
        console.error('Erro ao salvar posição da câmera:', error);
      }
    }, 300); // Debounce de 300ms para evitar muitas atualizações

    return () => clearTimeout(timeoutId);
  }, [cameraPositionPercent, isBroadcaster, streamId]);

  // Para viewers: converter porcentagem do banco para pixels baseado no tamanho do container
  useEffect(() => {
    if (!isBroadcaster && cameraPipPosition) {
      // cameraPipPosition agora vem como porcentagem (0-100)
      // Precisamos converter para pixels baseado no tamanho atual do container
      const updatePositionFromPercent = () => {
        // Para viewers, usar remoteVideoRef (onde o vídeo remoto é exibido)
        // O container pai é o div que contém o remoteVideoRef
        const videoContainer = remoteVideoRef.current?.parentElement?.getBoundingClientRect();
        const container = videoContainer || remoteVideoRef.current?.getBoundingClientRect();
        
        if (container && container.width > 0 && container.height > 0) {
          const pipSize = 120;
          // Área disponível para mover a câmera (descontando o tamanho do PiP)
          const availableWidth = container.width - pipSize;
          const availableHeight = container.height - pipSize;
          
          // Converter porcentagem (0-100) para pixels
          // Se porcentagem é 100%, deve ir até o final (availableWidth/Height)
          // Se porcentagem é 0%, deve ficar no início (0)
          const pixelX = (cameraPipPosition.x / 100) * availableWidth;
          const pixelY = (cameraPipPosition.y / 100) * availableHeight;
          
          // Log removido para evitar spam no console durante fullscreen
          
          setCameraPosition({
            x: Math.max(0, Math.min(availableWidth, pixelX)),
            y: Math.max(0, Math.min(availableHeight, pixelY))
          });
          
          setCameraPositionPercent({
            x: cameraPipPosition.x,
            y: cameraPipPosition.y
          });
        } else {
          console.warn('⚠️ Container não encontrado ou sem tamanho, aguardando...');
          // Tentar novamente após um delay se o container não estiver pronto
          setTimeout(updatePositionFromPercent, 500);
        }
      };
      
      // Aguardar um pouco para garantir que o container está renderizado
      const initialDelay = setTimeout(() => {
        updatePositionFromPercent();
      }, 500);
      
      // Atualizar quando o container mudar de tamanho (resize)
      const handleResize = () => {
        updatePositionFromPercent();
      };
      
      window.addEventListener('resize', handleResize);
      
      // Observar mudanças no container (mais preciso que resize)
      const resizeObserver = new ResizeObserver(() => {
        updatePositionFromPercent();
      });
      
      // Observar tanto o container pai quanto o remoteVideoRef
      const containerElement = remoteVideoRef.current?.parentElement || remoteVideoRef.current;
      if (containerElement) {
        resizeObserver.observe(containerElement);
      }
      
      return () => {
        clearTimeout(initialDelay);
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
      };
    }
  }, [cameraPipPosition, isBroadcaster]);

  // Atualizar posição do PiP no track combinado quando o admin mover a câmera
  useEffect(() => {
    if (combinedVideoTrackRef.current && showScreenShare && showCamera) {
      const combinedTrack = combinedVideoTrackRef.current as any;
      if (combinedTrack._updatePipPosition && typeof combinedTrack._updatePipPosition === 'function') {
        // Passar posição em porcentagem (0-100) para funcionar no canvas
        combinedTrack._updatePipPosition(cameraPositionPercent);
        console.log('📹 Posição do PiP atualizada no track combinado (porcentagem):', cameraPositionPercent);
      }
    }
  }, [cameraPositionPercent, showScreenShare, showCamera]);

  // Mover câmera para PiP quando screen sharing e câmera estão ativos
  useEffect(() => {
    const moveCameraToPiP = async () => {
      console.log('🔄 Verificando condições para PiP:', {
        showScreenShare,
        showCamera,
        hasCameraTrack: !!cameraVideoTrackRef.current,
        hasPiPContainer: !!cameraPiPRef.current,
        isStreaming
      });

      if (
        showScreenShare && 
        showCamera && 
        cameraVideoTrackRef.current && 
        cameraPiPRef.current &&
        isStreaming
      ) {
        // Verificar se já há vídeo no PiP
        const existingVideo = cameraPiPRef.current.querySelector('video');
        if (existingVideo && existingVideo.readyState >= 2) {
          console.log('📹 Câmera já está no PiP e carregada');
          return;
        }

        try {
          console.log('📹 Movendo câmera para PiP...');
          
          // Aguardar um pouco para garantir que o PiP está no DOM
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Verificar novamente se o container ainda existe
          if (!cameraPiPRef.current) {
            console.warn('⚠️ Container PiP não encontrado após delay');
            return;
          }
          
          // Limpar PiP antes de adicionar novo vídeo
          safeClearElement(cameraPiPRef.current);
          
          // Reproduzir câmera no PiP
          await cameraVideoTrackRef.current.play(cameraPiPRef.current);
          console.log('✅ Câmera reproduzindo no PiP');
          
          // Aplicar estilos ao vídeo do PiP
          setTimeout(() => {
            const pipVideo = cameraPiPRef.current?.querySelector('video') as HTMLVideoElement;
            if (pipVideo) {
              pipVideo.style.width = '100%';
              pipVideo.style.height = '100%';
              pipVideo.style.objectFit = 'cover';
              pipVideo.style.borderRadius = '50%';
              pipVideo.style.display = 'block';
              pipVideo.style.visibility = 'visible';
              pipVideo.style.position = 'absolute';
              pipVideo.style.top = '0';
              pipVideo.style.left = '0';
              console.log('✅ Estilos aplicados ao PiP da câmera');
            } else {
              console.warn('⚠️ Vídeo não encontrado no PiP após reprodução');
            }
          }, 300);
        } catch (error) {
          console.error('❌ Erro ao mover câmera para PiP:', error);
        }
      } else {
        // Se as condições não são atendidas, limpar PiP se necessário
        if (cameraPiPRef.current && !showScreenShare) {
          safeClearElement(cameraPiPRef.current);
        }
      }
    };

    moveCameraToPiP();
  }, [showScreenShare, showCamera, isStreaming]);

  // Cleanup quando o componente for desmontado
  useEffect(() => {
    return () => {
      console.log('Componente sendo desmontado, executando cleanup...');
      console.log('   Estado no desmonte:', {
        isBroadcaster,
        isStreaming,
        hasClient: !!clientRef.current,
        hasRemoteUsers: clientRef.current?.remoteUsers?.length || 0,
        connectionState: clientRef.current?.connectionState,
        isJoining: isJoiningRef.current
      });
      
      // Se está em processo de join, aguardar um pouco antes de fazer cleanup
      // (pode ser React Strict Mode desmontando durante a inicialização)
      if (isJoiningRef.current) {
        console.debug('🔄 Componente sendo desmontado durante join (provavelmente React Strict Mode)');
        console.debug('   Aguardando join completar antes de fazer cleanup...');
        // Marcar que cleanup foi solicitado, mas não executar ainda
        isCleaningUpRef.current = true;
        
        // Aguardar até 3 segundos para o join completar e verificar se componente foi remontado
        let waitCount = 0;
        const maxWait = 30; // 30 * 100ms = 3 segundos
        
        const checkJoin = setInterval(() => {
          waitCount++;
          
          // Verificar se o join completou
          if (!isJoiningRef.current) {
            clearInterval(checkJoin);
            console.log('   ✅ Join completou, verificando se componente ainda existe...');
            
            // Se o cliente ainda existe e está conectado, pode ser React Strict Mode (remontagem)
            if (clientRef.current && String(clientRef.current.connectionState) === 'CONNECTED') {
              console.debug('   ✅ Componente foi remontado (React Strict Mode), cancelando cleanup');
              isCleaningUpRef.current = false; // Resetar flag
              return; // Não fazer cleanup
            }
            
            // Se não há cliente ou não está conectado, fazer cleanup
            if (!clientRef.current || String(clientRef.current.connectionState) !== 'CONNECTED') {
              console.debug('   ℹ️ Componente realmente foi desmontado, executando cleanup...');
              if (!cleanupCalledRef.current) {
                cleanupCalledRef.current = true;
                cleanup();
              }
            }
            return;
          }
          
          // Se passou o tempo máximo e ainda está em join, fazer cleanup
          if (waitCount >= maxWait) {
            clearInterval(checkJoin);
            console.warn('   ⚠️ Join não completou a tempo, executando cleanup...');
            if (!cleanupCalledRef.current) {
              cleanupCalledRef.current = true;
              cleanup();
            }
          }
        }, 100); // Verificar a cada 100ms
        
        return; // Não fazer cleanup imediatamente
      }
      
      // Se o viewer está conectado e há usuários remotos, não fazer cleanup
      // (pode ser React Strict Mode desmontando e remontando)
      if (!isBroadcaster && clientRef.current) {
        const remoteUsers = clientRef.current.remoteUsers;
        const connectionState = clientRef.current.connectionState;
        
        if ((connectionState === 'CONNECTED' || connectionState === 'CONNECTING') && remoteUsers.length > 0) {
          console.warn('⚠️ Componente sendo desmontado mas viewer está conectado com usuários remotos!');
          console.warn('   Isso pode ser React Strict Mode. Não fazendo cleanup para evitar desconexão.');
          return;
        }
      }
      
      if (!cleanupCalledRef.current) {
        cleanupCalledRef.current = true;
        cleanup();
      }
    };
  }, [isBroadcaster]);

  const initializeBasedOnRole = () => {
    if (isBroadcaster && !isStreaming) {
      isInitializedRef.current = true;
      cleanupCalledRef.current = false;
      currentChannelRef.current = channelName;
      
      // Aguardar um pequeno delay para garantir que o estado foi atualizado
      const timer = setTimeout(() => {
        initializeBroadcast();
      }, 100);
      
      return () => {
        clearTimeout(timer);
      };
    } else if (!isBroadcaster) {
      isInitializedRef.current = true;
      cleanupCalledRef.current = false;
      currentChannelRef.current = channelName;
      initializeViewer();
    }
  };

  // Função auxiliar para calcular espaço necessário para overlays na parte inferior
  const calculateBottomOverlaySpace = (scene: any): number => {
    if (!scene || !scene.sources) return 0;
    
    // Converter posições de pixels para porcentagem (baseado em canvas 1280x720)
    const canvasHeight = 720;
    
    // Encontrar overlays visíveis na parte inferior (últimos 30% da tela)
    const bottomThreshold = canvasHeight * 0.7; // 70% do topo = começa a parte inferior
    let maxBottomPosition = 0;
    
    scene.sources.forEach((source: any) => {
      if (source.is_visible && source.type !== 'screenshare') {
        const sourceBottom = source.position.y + source.position.height;
        if (source.position.y >= bottomThreshold && sourceBottom > maxBottomPosition) {
          maxBottomPosition = sourceBottom;
        }
      }
    });
    
    // Converter de pixels para porcentagem do canvas e calcular espaço necessário
    if (maxBottomPosition > bottomThreshold) {
      const spaceNeeded = maxBottomPosition - bottomThreshold;
      // Retornar em porcentagem (0-100) para uso no canvas
      return (spaceNeeded / canvasHeight) * 100;
    }
    
    return 0;
  };

  // Função para criar um track combinado (screen sharing + câmera)
  const createCombinedVideoTrack = async (
    screenTrack: any,
    cameraTrack: any,
    pipPosition: { x: number; y: number } = { x: 20, y: 20 }
  ): Promise<any> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Criar canvas para combinar os vídeos
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível obter contexto do canvas'));
          return;
        }

        canvasRef.current = canvas;
        
        // Armazenar posição do PiP no canvas (em porcentagem 0-100 para funcionar em qualquer tamanho)
        // Converter posição inicial de pixels para porcentagem se necessário
        let currentPipPositionPercent = { x: 0, y: 0 };
        
        // Se pipPosition vem em pixels (valores > 100), assumir que é posição absoluta e converter
        // Se vem em porcentagem (0-100), usar diretamente
        if (pipPosition.x > 100 || pipPosition.y > 100) {
          // Assumir container padrão de 1280x720 para conversão inicial
          const defaultContainerWidth = 1280;
          const defaultContainerHeight = 720;
          const pipSize = 120;
          const availableWidth = defaultContainerWidth - pipSize;
          const availableHeight = defaultContainerHeight - pipSize;
          currentPipPositionPercent = {
            x: (pipPosition.x / availableWidth) * 100,
            y: (pipPosition.y / availableHeight) * 100
          };
        } else {
          // Já está em porcentagem
          currentPipPositionPercent = { x: pipPosition.x, y: pipPosition.y };
        }
        
        // Criar elementos de vídeo ocultos para capturar os streams
        const screenVideo = document.createElement('video');
        const cameraVideo = document.createElement('video');
        
        screenVideo.autoplay = true;
        screenVideo.playsInline = true;
        screenVideo.muted = true;
        screenVideo.style.position = 'fixed';
        screenVideo.style.top = '-9999px';
        screenVideo.style.width = '1920px';
        screenVideo.style.height = '1080px';
        document.body.appendChild(screenVideo);
        
        cameraVideo.autoplay = true;
        cameraVideo.playsInline = true;
        cameraVideo.muted = true;
        cameraVideo.style.position = 'fixed';
        cameraVideo.style.top = '-9999px';
        cameraVideo.style.width = '640px';
        cameraVideo.style.height = '480px';
        document.body.appendChild(cameraVideo);
        
        // Obter MediaStream dos tracks
        const screenStream = new MediaStream([screenTrack.getMediaStreamTrack()]);
        const cameraStream = new MediaStream([cameraTrack.getMediaStreamTrack()]);
        
        // Atribuir streams aos elementos de vídeo
        screenVideo.srcObject = screenStream;
        cameraVideo.srcObject = cameraStream;
        
        // Aguardar os vídeos estarem prontos
        await Promise.all([
          new Promise((resolve) => {
            if (screenVideo.readyState >= 2) {
              resolve(undefined);
            } else {
              screenVideo.onloadedmetadata = () => resolve(undefined);
            }
          }),
          new Promise((resolve) => {
            if (cameraVideo.readyState >= 2) {
              resolve(undefined);
            } else {
              cameraVideo.onloadedmetadata = () => resolve(undefined);
            }
          })
        ]);
        
        // Tentar reproduzir
        try {
          await screenVideo.play();
          await cameraVideo.play();
        } catch (e) {
          console.warn('Aviso ao reproduzir vídeos:', e);
        }
        
        // Aguardar um pouco mais para garantir que os vídeos estão renderizando
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar se os vídeos têm dimensões válidas
        console.log('📊 Verificando dimensões dos vídeos:', {
          screenVideo: {
            width: screenVideo.videoWidth,
            height: screenVideo.videoHeight,
            readyState: screenVideo.readyState,
            paused: screenVideo.paused
          },
          cameraVideo: {
            width: cameraVideo.videoWidth,
            height: cameraVideo.videoHeight,
            readyState: cameraVideo.readyState,
            paused: cameraVideo.paused
          }
        });
        
        // Se screen sharing não tem dimensões, aguardar mais
        if (screenVideo.videoWidth === 0 || screenVideo.videoHeight === 0) {
          console.log('⏳ Screen sharing ainda não tem dimensões, aguardando...');
          let waitCount = 0;
          while ((screenVideo.videoWidth === 0 || screenVideo.videoHeight === 0) && waitCount < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;
          }
          console.log('📊 Dimensões após aguardar:', {
            width: screenVideo.videoWidth,
            height: screenVideo.videoHeight,
            waitCount
          });
        }
        
        // Função para desenhar no canvas
        const drawFrame = () => {
          if (!ctx || !screenVideo || !cameraVideo) return;
          
          // Calcular espaço necessário para overlays na parte inferior
          // Usar ref para ter acesso ao activeScene mais atual
          const currentActiveScene = activeSceneRef.current;
          const bottomOverlaySpace = calculateBottomOverlaySpace(currentActiveScene);
          const screenShareHeight = bottomOverlaySpace > 0 
            ? canvas.height * (1 - bottomOverlaySpace / 100) 
            : canvas.height;
          const screenShareY = 0;
          
          // Limpar canvas
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Desenhar screen sharing - redimensionar se houver overlays na parte inferior
          if (screenVideo.videoWidth > 0 && screenVideo.videoHeight > 0) {
            try {
              if (bottomOverlaySpace > 0) {
                // Desenhar screen sharing redimensionado para deixar espaço para overlays
                ctx.drawImage(
                  screenVideo, 
                  0, 
                  screenShareY, 
                  canvas.width, 
                  screenShareHeight
                );
                
                // Preencher área dos overlays com fundo preto
                ctx.fillStyle = '#000';
                ctx.fillRect(0, screenShareHeight, canvas.width, canvas.height - screenShareHeight);
              } else {
                // Screen sharing full screen (sem overlays na parte inferior)
                ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
              }
            } catch (e) {
              console.warn('Erro ao desenhar screen sharing:', e);
            }
          } else {
            // Se screen sharing não tem dimensões, desenhar fundo preto
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          
          // Desenhar câmera como círculo no canto (PiP) - apenas se tiver dimensões
          if (cameraVideo.videoWidth > 0 && cameraVideo.videoHeight > 0) {
            try {
              const pipSize = 200; // Tamanho do PiP no canvas (proporcional ao tamanho real de 120px)
              // Converter porcentagem (0-100) para pixels no canvas (1920x1080)
              const availableWidth = canvas.width - pipSize;
              const availableHeight = canvas.height - pipSize;
              const pipX = (currentPipPositionPercent.x / 100) * availableWidth;
              const pipY = (currentPipPositionPercent.y / 100) * availableHeight;
              
              // Criar clipping path circular
              ctx.save();
              ctx.beginPath();
              ctx.arc(
                pipX + pipSize / 2,
                pipY + pipSize / 2,
                pipSize / 2,
                0,
                Math.PI * 2
              );
              ctx.clip();
              
              // Desenhar câmera
              ctx.drawImage(
                cameraVideo,
                pipX,
                pipY,
                pipSize,
                pipSize
              );
              
              ctx.restore();
              
              // Desenhar borda branca ao redor do círculo
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.arc(
                pipX + pipSize / 2,
                pipY + pipSize / 2,
                pipSize / 2,
                0,
                Math.PI * 2
              );
              ctx.stroke();
            } catch (e) {
              console.warn('Erro ao desenhar câmera no PiP:', e);
            }
          }
        };
        
        // Desenhar primeiro frame imediatamente
        drawFrame();
        
        // Iniciar loop de desenho (60 FPS)
        const drawInterval = setInterval(() => {
          try {
            drawFrame();
          } catch (e) {
            console.warn('Erro ao desenhar frame:', e);
          }
        }, 1000 / 60);
        
        // Criar stream a partir do canvas
        const stream = canvas.captureStream(60);
        const videoTrack = stream.getVideoTracks()[0];
        
        if (!videoTrack) {
          clearInterval(drawInterval);
          document.body.removeChild(screenVideo);
          document.body.removeChild(cameraVideo);
          reject(new Error('Nenhum track de vídeo encontrado no stream'));
          return;
        }
        
        // Criar custom track do Agora
        const customTrack = AgoraRTC.createCustomVideoTrack({
          mediaStreamTrack: videoTrack
        });
        
        // Armazenar referências para cleanup e atualização
        (customTrack as any)._screenVideo = screenVideo;
        (customTrack as any)._cameraVideo = cameraVideo;
        (customTrack as any)._drawInterval = drawInterval;
        (customTrack as any)._canvas = canvas;
        (customTrack as any)._updatePipPosition = (newPosition: { x: number; y: number }) => {
          // newPosition pode vir em pixels ou porcentagem
          // Se valores > 100, assumir pixels e converter para porcentagem
          if (newPosition.x > 100 || newPosition.y > 100) {
            // Assumir container padrão para conversão
            const defaultContainerWidth = 1920; // Usar dimensões do canvas como referência
            const defaultContainerHeight = 1080;
            const pipSize = 120;
            const availableWidth = defaultContainerWidth - pipSize;
            const availableHeight = defaultContainerHeight - pipSize;
            currentPipPositionPercent = {
              x: (newPosition.x / availableWidth) * 100,
              y: (newPosition.y / availableHeight) * 100
            };
          } else {
            // Já está em porcentagem
            currentPipPositionPercent = { x: newPosition.x, y: newPosition.y };
          }
          console.log('📹 Posição do PiP atualizada no canvas (porcentagem):', currentPipPositionPercent);
        };
        
        console.log('✅ Track combinado criado (screen sharing + câmera)');
        console.log('   Posição inicial do PiP (porcentagem):', currentPipPositionPercent);
        resolve(customTrack);
        
      } catch (error: any) {
        console.error('❌ Erro ao criar track combinado:', error);
        reject(error);
      }
    });
  };

  // Função para criar um custom video track a partir de uma URL
  const createCustomVideoTrackFromUrl = async (url: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      try {
        // Criar elemento de vídeo oculto
        const videoElement = document.createElement('video');
        videoElement.crossOrigin = 'anonymous';
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.loop = true;
        videoElement.muted = true; // Mudo para evitar feedback
        videoElement.style.position = 'fixed';
        videoElement.style.top = '-9999px';
        videoElement.style.left = '-9999px';
        videoElement.style.width = '1px';
        videoElement.style.height = '1px';
        document.body.appendChild(videoElement);
        
        externalVideoElementRef.current = videoElement;
        
        let trackCreated = false;
        
        // Configurar eventos
        videoElement.onloadedmetadata = () => {
          console.log('✅ Vídeo externo carregado:', {
            width: videoElement.videoWidth,
            height: videoElement.videoHeight,
            duration: videoElement.duration,
            readyState: videoElement.readyState
          });
        };
        
        videoElement.onerror = (error) => {
          console.error('❌ Erro ao carregar vídeo externo:', error);
          if (document.body.contains(videoElement)) {
            document.body.removeChild(videoElement);
          }
          if (!trackCreated) {
            reject(new Error('Erro ao carregar vídeo externo. Verifique se a URL é válida e permite CORS.'));
          }
        };
        
        // Aguardar o vídeo estar pronto para reproduzir
        const createTrack = async () => {
          if (trackCreated) return;
          
          try {
            // Aguardar o vídeo estar pronto
            if (videoElement.readyState < 2) {
              await new Promise((resolve) => {
                const checkReady = () => {
                  if (videoElement.readyState >= 2) {
                    resolve(undefined);
                  } else {
                    setTimeout(checkReady, 100);
                  }
                };
                checkReady();
              });
            }
            
            // Tentar reproduzir
            try {
              await videoElement.play();
            } catch (playError) {
              console.warn('⚠️ Não foi possível reproduzir automaticamente, tentando continuar...', playError);
            }
            
            // Aguardar um pouco para garantir que o stream está ativo
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Criar track a partir do elemento de vídeo usando captureStream
            const stream = videoElement.captureStream(60); // 60 FPS
            const videoTrack = stream.getVideoTracks()[0];
            
            if (!videoTrack) {
              throw new Error('Nenhum track de vídeo encontrado no stream');
            }
            
            // Criar custom track do Agora
            const customTrack = AgoraRTC.createCustomVideoTrack({
              mediaStreamTrack: videoTrack
            });
            
            trackCreated = true;
            console.log('✅ Custom video track criado a partir de URL');
            resolve(customTrack);
            
          } catch (error: any) {
            console.error('❌ Erro ao criar custom track:', error);
            if (document.body.contains(videoElement)) {
              document.body.removeChild(videoElement);
            }
            if (!trackCreated) {
              reject(new Error(`Erro ao criar track: ${error.message || 'Erro desconhecido'}`));
            }
          }
        };
        
        // Tentar carregar a URL
        videoElement.src = url;
        
        // Aguardar o vídeo estar pronto
        videoElement.oncanplay = createTrack;
        videoElement.oncanplaythrough = createTrack;
        
        // Fallback: tentar criar após loadeddata
        videoElement.onloadeddata = () => {
          if (!trackCreated) {
            setTimeout(createTrack, 500);
          }
        };
        
        // Timeout de segurança
        setTimeout(() => {
          if (!trackCreated) {
            console.error('❌ Timeout ao carregar vídeo externo');
            if (document.body.contains(videoElement)) {
              document.body.removeChild(videoElement);
            }
            reject(new Error('Timeout ao carregar vídeo externo. Verifique se a URL é válida e acessível.'));
          }
        }, 15000); // 15 segundos
        
      } catch (error: any) {
        console.error('❌ Erro ao criar custom video track:', error);
        reject(new Error(`Erro ao criar track: ${error.message || 'Erro desconhecido'}`));
      }
    });
  };

  // Função para ativar/desativar screen sharing
  // Função para aplicar volume do jogo/tela
  const applyGameVolume = (volume: number) => {
    if (screenAudioTrackRef.current && typeof screenAudioTrackRef.current.setVolume === 'function') {
      screenAudioTrackRef.current.setVolume(volume);
      console.log('🔊 Volume do jogo/tela aplicado:', volume);
    }
  };

  // Função para aplicar volume do microfone
  const applyMicVolume = (volume: number) => {
    if (localAudioTrackRef.current && typeof localAudioTrackRef.current.setVolume === 'function') {
      localAudioTrackRef.current.setVolume(volume);
      console.log('🎤 Volume do microfone aplicado:', volume);
    }
  };

  // Função para baixar/aumentar volume do jogo (ducking manual)
  const toggleGameDucking = () => {
    if (isGameDucked) {
      // Restaurar volume normal
      setGameVolume(normalGameVolume);
      applyGameVolume(normalGameVolume);
      setIsGameDucked(false);
      toast.success('Volume do jogo restaurado');
    } else {
      // Baixar volume do jogo
      setNormalGameVolume(gameVolume);
      const duckedVolume = Math.max(10, gameVolume * 0.2); // Reduzir para 20% do volume atual (mínimo 10)
      setGameVolume(duckedVolume);
      applyGameVolume(duckedVolume);
      setIsGameDucked(true);
      toast.success('Volume do jogo reduzido - você pode falar');
    }
  };

  // Atualizar volumes quando mudarem
  useEffect(() => {
    if (isStreaming && showScreenShare && screenAudioTrackRef.current) {
      applyGameVolume(gameVolume);
    }
  }, [gameVolume, isStreaming, showScreenShare]);
  
  // Quando o screen sharing é ativado novamente, aplicar o volume salvo
  useEffect(() => {
    if (isStreaming && showScreenShare && screenAudioTrackRef.current) {
      // Aplicar volume quando a tela é ativada
      applyGameVolume(gameVolume);
      console.log('🔊 Volume do jogo aplicado ao ativar tela:', gameVolume);
    }
  }, [showScreenShare]);

  // ========== SISTEMA DE SLIDESHOW ==========
  // Estado local para slideshow (pode vir de props ou localStorage)
  const [localAdImages, setLocalAdImages] = useState<AdImage[]>(adImages);
  const prevAdImagesRef = useRef<string>('');
  const prevChannelNameRef = useRef<string>('');
  
  // Sincronizar adImages de props (admin) ou localStorage (viewers)
  useEffect(() => {
    if (isBroadcaster) {
      // Admin: usar props diretamente
      const adImagesStr = JSON.stringify(adImages);
      // Só atualizar se realmente mudou
      if (adImagesStr !== prevAdImagesRef.current || channelName !== prevChannelNameRef.current) {
        setLocalAdImages(adImages);
        prevAdImagesRef.current = adImagesStr;
        prevChannelNameRef.current = channelName;
        
        // Salvar no localStorage para viewers
        if (adImages.length > 0) {
          localStorage.setItem(`adImages_${channelName}`, adImagesStr);
        } else {
          localStorage.removeItem(`adImages_${channelName}`);
        }
      }
    }
  }, [adImages, channelName, isBroadcaster]);

  // Para viewers: carregar do localStorage separadamente
  useEffect(() => {
    if (!isBroadcaster) {
      const loadSlides = () => {
        const savedSlides = localStorage.getItem(`adImages_${channelName}`);
        if (savedSlides) {
          try {
            const slides = JSON.parse(savedSlides);
            const slidesStr = JSON.stringify(slides);
            // Só atualizar se realmente mudou
            if (slidesStr !== prevAdImagesRef.current) {
              setLocalAdImages(slides);
              prevAdImagesRef.current = slidesStr;
            }
          } catch (e) {
            console.error('Erro ao carregar slides:', e);
          }
        } else {
          // Só atualizar se não estiver vazio
          if (prevAdImagesRef.current !== '[]') {
            setLocalAdImages([]);
            prevAdImagesRef.current = '[]';
          }
        }
      };
      
      loadSlides();
      
      // Polling para verificar mudanças (menos frequente para evitar loops)
      const interval = setInterval(loadSlides, 2000);
      
      // Escutar mudanças no localStorage
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === `adImages_${channelName}`) {
          loadSlides();
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(interval);
      };
    }
  }, [channelName, isBroadcaster]); // Removido adImages para evitar loops

  // Função para obter imagens habilitadas do slideshow
  const getEnabledSlides = () => {
    return localAdImages.filter(img => img.enabled);
  };

  // Função para avançar para o próximo slide com duração individual
  const scheduleNextSlide = () => {
    const enabledSlides = getEnabledSlides();
    if (enabledSlides.length === 0) return;

    // Obter o slide atual
    const currentSlide = enabledSlides[currentSlideIndex];
    if (!currentSlide) return;

    // Obter a duração do slide atual (em milissegundos)
    const duration = (currentSlide.duration || 5) * 1000; // Converter segundos para ms

    // Limpar timeout anterior se existir
    if (slideIntervalRef.current) {
      clearTimeout(slideIntervalRef.current);
    }

    // Agendar próximo slide com a duração específica desta imagem
    slideIntervalRef.current = setTimeout(() => {
      setCurrentSlideIndex((prev) => {
        const enabledSlides = getEnabledSlides();
        if (enabledSlides.length === 0) return 0;
        const next = (prev + 1) % enabledSlides.length;
        
        // Admin: salvar índice no localStorage para sincronizar com viewers
        if (isBroadcaster) {
          localStorage.setItem(`currentSlideIndex_${channelName}`, next.toString());
        }
        
        return next;
      });
    }, duration);
  };

  // Função para parar slideshow
  const stopSlideshow = () => {
    if (slideIntervalRef.current) {
      clearTimeout(slideIntervalRef.current);
      slideIntervalRef.current = null;
    }
  };

  // Sincronizar índice do slide entre admin e viewers
  const prevSlideIndexRef = useRef<number>(-1);
  useEffect(() => {
    if (isBroadcaster) {
      // Admin: salvar índice atual no localStorage quando mudar
      if (currentSlideIndex !== prevSlideIndexRef.current) {
        localStorage.setItem(`currentSlideIndex_${channelName}`, currentSlideIndex.toString());
        prevSlideIndexRef.current = currentSlideIndex;
      }
    } else {
      // Viewers: carregar índice do localStorage
      const loadSlideIndex = () => {
        const savedIndex = localStorage.getItem(`currentSlideIndex_${channelName}`);
        if (savedIndex) {
          const index = parseInt(savedIndex, 10);
          if (!isNaN(index) && index !== prevSlideIndexRef.current) {
            setCurrentSlideIndex(index);
            prevSlideIndexRef.current = index;
          }
        }
      };
      
      loadSlideIndex();
      
      // Polling para verificar mudanças no índice (sincronização em tempo real)
      const interval = setInterval(loadSlideIndex, 300);
      
      return () => clearInterval(interval);
    }
  }, [currentSlideIndex, channelName, isBroadcaster]);

  // Iniciar/parar slideshow quando imagens mudarem
  useEffect(() => {
    const enabledSlides = getEnabledSlides();
    if (enabledSlides.length > 0 && isStreaming) {
      // Resetar índice se necessário
      if (currentSlideIndex >= enabledSlides.length) {
        setCurrentSlideIndex(0);
        if (isBroadcaster) {
          localStorage.setItem(`currentSlideIndex_${channelName}`, '0');
        }
      } else {
        // Admin: salvar índice inicial e agendar próximo slide
        if (isBroadcaster) {
          localStorage.setItem(`currentSlideIndex_${channelName}`, currentSlideIndex.toString());
          scheduleNextSlide();
        }
      }
    } else {
      stopSlideshow();
    }

    return () => {
      stopSlideshow();
    };
  }, [localAdImages, isStreaming]); // Removido currentSlideIndex e outros para evitar loops

  // Quando o índice do slide muda, agendar o próximo com a nova duração (apenas admin)
  useEffect(() => {
    if (isBroadcaster) {
      const enabledSlides = getEnabledSlides();
      if (enabledSlides.length > 0 && isStreaming) {
        scheduleNextSlide();
      }
    }
  }, [currentSlideIndex, isBroadcaster]); // Apenas admin agenda próximo slide

  // Tracking de visualizações de propagandas (slideshow)
  useEffect(() => {
    if (!streamId || !sessionId || isBroadcaster || !isStreaming) return;
    
    const enabledSlides = getEnabledSlides();
    if (enabledSlides.length === 0) return;
    
    const currentSlide = enabledSlides[currentSlideIndex];
    if (!currentSlide) return;
    
    const trackAdView = async () => {
      try {
        await supabase.from('ad_views').insert({
          stream_id: streamId,
          session_id: sessionId,
          ad_id: currentSlide.id,
          ad_type: 'slideshow',
          duration_seconds: currentSlide.duration || 5
        });
      } catch (error) {
        console.error('Erro ao rastrear visualização de propaganda:', error);
      }
    };
    
    trackAdView();
  }, [currentSlideIndex, streamId, sessionId, isBroadcaster, isStreaming]);

  // Tracking de visualizações de propagandas (overlay)
  useEffect(() => {
    if (!streamId || !sessionId || isBroadcaster || !isStreaming) return;
    if (!showOverlayAd || !overlayAdImage) return;
    
    const trackOverlayView = async () => {
      try {
        await supabase.from('ad_views').insert({
          stream_id: streamId,
          session_id: sessionId,
          ad_id: 'overlay',
          ad_type: 'overlay',
          duration_seconds: 0 // Overlay não tem duração fixa
        });
      } catch (error) {
        console.error('Erro ao rastrear visualização de overlay:', error);
      }
    };
    
    trackOverlayView();
  }, [showOverlayAd, overlayAdImage, streamId, sessionId, isBroadcaster, isStreaming]);

  // ========== SISTEMA DE PROPAGANDA OVERLAY ==========
  // Atualizar overlay quando overlayAd mudar (vem do banco de dados via props)
  useEffect(() => {
    if (overlayAd?.enabled && overlayAd?.url) {
      setShowOverlayAd(true);
      setOverlayAdImage(overlayAd.url);
    } else {
      setShowOverlayAd(false);
      setOverlayAdImage(null);
    }
  }, [overlayAd]);

  // Copiar conteúdo do vídeo para o PiP quando overlay está ativo (Admin)
  useEffect(() => {
    if (!showOverlayAd || !isBroadcaster) return;
    
    const updatePip = () => {
      const pipContainer = document.getElementById('overlay-pip-content-admin');
      const videoContainer = localVideoRef.current;
      
      if (pipContainer && videoContainer) {
        const videoElement = videoContainer.querySelector('video');
        if (videoElement && videoElement.srcObject) {
          const existingPip = pipContainer.querySelector('video');
          if (!existingPip) {
            const pipVideo = document.createElement('video');
            pipVideo.srcObject = videoElement.srcObject as MediaStream;
            pipVideo.autoplay = true;
            pipVideo.muted = false;
            pipVideo.style.width = '100%';
            pipVideo.style.height = '100%';
            pipVideo.style.objectFit = 'cover';
            pipContainer.appendChild(pipVideo);
          }
        }
      }
    };
    
    // Aguardar um pouco para o vídeo estar pronto
    const timeout = setTimeout(updatePip, 100);
    const interval = setInterval(updatePip, 1000);
    
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      const pipContainer = document.getElementById('overlay-pip-content-admin');
      if (pipContainer) {
        pipContainer.innerHTML = '';
      }
    };
  }, [showOverlayAd, isBroadcaster]); // Removido hasLocalVideo para evitar loops

  // Copiar conteúdo do vídeo para o PiP quando overlay está ativo (Viewers)
  useEffect(() => {
    if (!showOverlayAd || isBroadcaster) return;
    
    const updatePip = () => {
      const pipContainer = document.getElementById('overlay-pip-content-viewer');
      const videoContainer = remoteVideoRef.current;
      
      if (pipContainer && videoContainer) {
        const videoElement = videoContainer.querySelector('video');
        if (videoElement && videoElement.srcObject) {
          const existingPip = pipContainer.querySelector('video');
          if (!existingPip) {
            const pipVideo = document.createElement('video');
            pipVideo.srcObject = videoElement.srcObject as MediaStream;
            pipVideo.autoplay = true;
            pipVideo.muted = false;
            pipVideo.style.width = '100%';
            pipVideo.style.height = '100%';
            pipVideo.style.objectFit = 'cover';
            pipContainer.appendChild(pipVideo);
          }
        }
      }
    };
    
    // Aguardar um pouco para o vídeo estar pronto
    const timeout = setTimeout(updatePip, 100);
    const interval = setInterval(updatePip, 1000);
    
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      const pipContainer = document.getElementById('overlay-pip-content-viewer');
      if (pipContainer) {
        pipContainer.innerHTML = '';
      }
    };
  }, [showOverlayAd, isBroadcaster]); // Removido hasRemoteVideo para evitar loops

  useEffect(() => {
    if (isStreaming) {
      applyMicVolume(micVolume);
    }
  }, [micVolume, isStreaming]);

  // Função para ativar screen share (usada pelo Stream Studio)
  const startScreenShare = async () => {
    if (!isStreaming || !clientRef.current || showScreenShare) return;
    
    try {
      // Ativar screen sharing
      const screenTrackResult = await AgoraRTC.createScreenVideoTrack({
        encoderConfig: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        }
      }, 'auto');
      
      const screenVideoTrack = Array.isArray(screenTrackResult) ? screenTrackResult[0] : screenTrackResult;
      const screenAudioTrack = Array.isArray(screenTrackResult) ? screenTrackResult[1] : null;
      
      screenVideoTrackRef.current = screenVideoTrack;
      screenAudioTrackRef.current = screenAudioTrack;
      
      if (screenAudioTrack && typeof screenAudioTrack.setVolume === 'function') {
        screenAudioTrack.setVolume(gameVolume);
      }
      
      // Se a câmera está ativa, criar track combinado
      if (cameraVideoTrackRef.current && showCamera) {
        try {
          await clientRef.current.unpublish(cameraVideoTrackRef.current);
          const combinedTrack = await createCombinedVideoTrack(
            screenVideoTrack,
            cameraVideoTrackRef.current,
            cameraPosition
          );
          combinedVideoTrackRef.current = combinedTrack;
          
          // IMPORTANTE: Incluir áudio do microfone junto com track combinado
          const tracksToPublish: any[] = [combinedTrack];
          
          // Adicionar áudio do screen share se disponível
          if (screenAudioTrack) {
            tracksToPublish.push(screenAudioTrack);
            console.log('🔊 Áudio do screen share incluído no track combinado');
          }
          
          // IMPORTANTE: Adicionar áudio do microfone para narração
          if (localAudioTrackRef.current) {
            tracksToPublish.push(localAudioTrackRef.current);
            console.log('🎤 Áudio do microfone incluído no track combinado (via startScreenShare)');
          } else {
            console.warn('⚠️ Áudio do microfone não disponível - usuários não ouvirão a narração');
          }
          
          await clientRef.current.publish(tracksToPublish);
        } catch (error) {
          console.error('Erro ao criar track combinado:', error);
          const tracksToPublish = screenAudioTrack ? [screenVideoTrack, screenAudioTrack] : [screenVideoTrack];
          await clientRef.current.publish(tracksToPublish);
        }
      } else {
        const tracksToPublish = screenAudioTrack ? [screenVideoTrack, screenAudioTrack] : [screenVideoTrack];
        await clientRef.current.publish(tracksToPublish);
      }
      
      if (localVideoRef.current) {
        safeClearElement(localVideoRef.current);
        await new Promise(resolve => setTimeout(resolve, 100));
        await screenVideoTrack.play(localVideoRef.current);
        
        setTimeout(() => {
          const videoElement = localVideoRef.current?.querySelector('video') as HTMLVideoElement;
          if (videoElement) {
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
            videoElement.style.objectFit = 'cover';
            videoElement.style.position = 'absolute';
            videoElement.style.top = '0px';
            videoElement.style.left = '0px';
            videoElement.style.zIndex = '1';
          }
        }, 300);
      }
      
      setShowScreenShare(true);
      console.log('✅ Screen share ativado via Stream Studio');
    } catch (error: any) {
      console.error('Erro ao ativar screen share:', error);
      toast.error('Erro ao compartilhar tela: ' + (error.message || 'Erro desconhecido'));
    }
  };
  
  // Função para desativar screen share (usada pelo Stream Studio)
  const stopScreenShare = async () => {
    if (!isStreaming || !clientRef.current || !showScreenShare) return;
    
    try {
      if (combinedVideoTrackRef.current) {
        try {
          await clientRef.current.unpublish(combinedVideoTrackRef.current);
          const combinedTrack = combinedVideoTrackRef.current as any;
          if (combinedTrack._drawInterval) clearInterval(combinedTrack._drawInterval);
          if (combinedTrack._screenVideo && document.body.contains(combinedTrack._screenVideo)) {
            document.body.removeChild(combinedTrack._screenVideo);
          }
          if (combinedTrack._cameraVideo && document.body.contains(combinedTrack._cameraVideo)) {
            document.body.removeChild(combinedTrack._cameraVideo);
          }
          if (combinedTrack._canvas && document.body.contains(combinedTrack._canvas)) {
            document.body.removeChild(combinedTrack._canvas);
          }
          combinedTrack.stop();
          combinedTrack.close();
          combinedVideoTrackRef.current = null;
        } catch (e) {
          console.warn('Aviso ao despublicar track combinado:', e);
        }
      }
      
      if (screenVideoTrackRef.current) {
        const screenTrack = screenVideoTrackRef.current;
        const tracksToUnpublish = Array.isArray(screenTrack) ? screenTrack : [screenTrack];
        
        try {
          await clientRef.current.unpublish(tracksToUnpublish);
        } catch (e) {
          console.warn('Aviso ao despublicar screen sharing:', e);
        }
        
        if (Array.isArray(screenTrack)) {
          for (const track of screenTrack) {
            if (track && typeof track.stop === 'function') track.stop();
            if (track && typeof track.close === 'function') track.close();
          }
        } else {
          if (typeof screenTrack.stop === 'function') screenTrack.stop();
          if (typeof screenTrack.close === 'function') screenTrack.close();
        }
        screenVideoTrackRef.current = null;
      }
      
      if (localVideoRef.current) {
        safeClearElement(localVideoRef.current);
      }
      
      if (showCamera && cameraVideoTrackRef.current && localVideoRef.current) {
        if (cameraPiPRef.current) {
          safeClearElement(cameraPiPRef.current);
        }
        
        try {
          await clientRef.current.publish(cameraVideoTrackRef.current);
          await cameraVideoTrackRef.current.play(localVideoRef.current);
        } catch (e) {
          console.warn('Aviso ao republicar câmera:', e);
        }
      }
      
      setShowScreenShare(false);
      console.log('✅ Screen share desativado via Stream Studio');
    } catch (error) {
      console.error('Erro ao desativar screen share:', error);
    }
  };
  
  // Ref para evitar loops ao controlar screen share automaticamente
  const screenShareControlRef = useRef<boolean>(false);
  
  // Controlar screen share automaticamente via Stream Studio
  useEffect(() => {
    console.log('🔄 ScreenShare Control Effect:', {
      isBroadcaster,
      isStreaming,
      hasClient: !!clientRef.current,
      screenShareEnabled,
      showScreenShare,
      isControlling: screenShareControlRef.current
    });

    if (!isBroadcaster || !isStreaming || !clientRef.current) {
      // Log apenas em modo debug (não é um erro, é comportamento esperado)
      console.debug('⏸️ ScreenShare - Condições não atendidas (normal para viewers ou quando não está transmitindo)');
      return;
    }
    
    if (screenShareControlRef.current) {
      console.log('⏸️ ScreenShare - Já está controlando, ignorando...');
      return;
    }
    
    if (screenShareEnabled && !showScreenShare) {
      console.log('▶️ ScreenShare - Ativando compartilhamento de tela...');
      screenShareControlRef.current = true;
      startScreenShare()
        .then(() => {
          console.log('✅ ScreenShare - Compartilhamento iniciado com sucesso');
        })
        .catch((err) => {
          console.error('❌ ScreenShare - Erro ao iniciar:', err);
        })
        .finally(() => {
          screenShareControlRef.current = false;
        });
    } else if (!screenShareEnabled && showScreenShare) {
      console.log('⏹️ ScreenShare - Desativando compartilhamento de tela...');
      screenShareControlRef.current = true;
      stopScreenShare()
        .then(() => {
          console.log('✅ ScreenShare - Compartilhamento desativado com sucesso');
        })
        .catch((err) => {
          console.error('❌ ScreenShare - Erro ao desativar:', err);
        })
        .finally(() => {
          screenShareControlRef.current = false;
        });
    }
  }, [screenShareEnabled, isStreaming, isBroadcaster, showScreenShare]);

  const toggleScreenShare = async () => {
    if (!isStreaming || !clientRef.current) {
      toast.error('Você precisa estar transmitindo');
      return;
    }
    
    try {
      if (showScreenShare) {
        // Desativar screen sharing
        // Se há track combinado, despublicar ele primeiro
        if (combinedVideoTrackRef.current) {
          try {
            await clientRef.current.unpublish(combinedVideoTrackRef.current);
            
            // Limpar recursos do track combinado
            const combinedTrack = combinedVideoTrackRef.current as any;
            if (combinedTrack._drawInterval) {
              clearInterval(combinedTrack._drawInterval);
            }
            if (combinedTrack._screenVideo && document.body.contains(combinedTrack._screenVideo)) {
              document.body.removeChild(combinedTrack._screenVideo);
            }
            if (combinedTrack._cameraVideo && document.body.contains(combinedTrack._cameraVideo)) {
              document.body.removeChild(combinedTrack._cameraVideo);
            }
            if (combinedTrack._canvas && document.body.contains(combinedTrack._canvas)) {
              document.body.removeChild(combinedTrack._canvas);
            }
            
            combinedTrack.stop();
            combinedTrack.close();
            combinedVideoTrackRef.current = null;
          } catch (e) {
            console.warn('Aviso ao despublicar track combinado:', e);
          }
        }
        
        if (screenVideoTrackRef.current) {
          const screenTrack = screenVideoTrackRef.current;
          const tracksToUnpublish = Array.isArray(screenTrack) ? screenTrack : [screenTrack];
          
          try {
            await clientRef.current.unpublish(tracksToUnpublish);
          } catch (e) {
            console.warn('Aviso ao despublicar screen sharing:', e);
          }
          
          // Parar e fechar screen sharing
          if (Array.isArray(screenTrack)) {
            for (const track of screenTrack) {
              if (track && typeof track.stop === 'function') {
                track.stop();
              }
              if (track && typeof track.close === 'function') {
                track.close();
              }
            }
          } else {
            if (typeof screenTrack.stop === 'function') {
              screenTrack.stop();
            }
            if (typeof screenTrack.close === 'function') {
              screenTrack.close();
            }
          }
          screenVideoTrackRef.current = null;
        }
        
        // Limpar container principal
        if (localVideoRef.current) {
          safeClearElement(localVideoRef.current);
        }
        
        // Se a câmera está ativa, republicar e mostrar no container principal
        if (showCamera && cameraVideoTrackRef.current && localVideoRef.current) {
          // Limpar PiP
          if (cameraPiPRef.current) {
            safeClearElement(cameraPiPRef.current);
          }
          
          // Republicar câmera (já que screen sharing foi despublicado)
          try {
            await clientRef.current.publish(cameraVideoTrackRef.current);
            console.log('✅ Câmera republicada após desativar screen sharing');
          } catch (e) {
            console.warn('Aviso ao republicar câmera:', e);
          }
          
          // Mostrar câmera no container principal
          await cameraVideoTrackRef.current.play(localVideoRef.current);
        }
        
        setShowScreenShare(false);
        toast.success('🖥️ Compartilhamento de tela desativado');
      } else {
        // Ativar screen sharing COM áudio do sistema
        console.log('🖥️ Criando screen track com áudio...');
        const screenTrackResult = await AgoraRTC.createScreenVideoTrack({
          encoderConfig: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          }
        }, 'auto'); // 'auto' captura áudio do sistema se disponível
        
        // createScreenVideoTrack pode retornar um array [videoTrack, audioTrack] ou apenas videoTrack
        const screenVideoTrack = Array.isArray(screenTrackResult) ? screenTrackResult[0] : screenTrackResult;
        const screenAudioTrack = Array.isArray(screenTrackResult) ? screenTrackResult[1] : null;
        
        console.log('✅ Screen tracks criados:', {
          hasVideo: !!screenVideoTrack,
          hasAudio: !!screenAudioTrack,
          audioType: screenAudioTrack ? 'audio' : undefined
        });
        
        screenVideoTrackRef.current = screenVideoTrack;
        screenAudioTrackRef.current = screenAudioTrack; // Armazenar referência do audio track
        
        // Aplicar volume do jogo/tela quando o track é criado
        if (screenAudioTrack) {
          if (typeof screenAudioTrack.setVolume === 'function') {
            screenAudioTrack.setVolume(gameVolume);
            console.log('🔊 Volume do jogo/tela aplicado na criação:', gameVolume);
          }
          // Garantir que o áudio esteja ativado
          if (screenAudioTrack.setEnabled) {
            screenAudioTrack.setEnabled(true);
            console.log('✅ Áudio do screen share ATIVADO');
          }
        } else {
          console.warn('⚠️ Nenhum áudio capturado do screen share - pode ser necessário ativar permissões do navegador');
        }
        
        // Se a câmera está ativa, criar track combinado (screen sharing + câmera)
        if (cameraVideoTrackRef.current && showCamera) {
          try {
            console.log('📹 Criando track combinado (screen sharing + câmera)...');
            console.log('   Screen track:', !!screenVideoTrack);
            console.log('   Camera track:', !!cameraVideoTrackRef.current);
            
            // Despublicar câmera se estiver publicada
            try {
              await clientRef.current.unpublish(cameraVideoTrackRef.current);
              console.log('✅ Câmera despublicada antes de criar track combinado');
            } catch (e) {
              console.log('ℹ️ Câmera não estava publicada (normal)');
            }
            
            // Criar track combinado com posição atual do PiP
            console.log('🔄 Iniciando criação do track combinado...');
            console.log('   Posição do PiP:', cameraPosition);
            const combinedTrack = await createCombinedVideoTrack(
              screenVideoTrack,
              cameraVideoTrackRef.current,
              cameraPosition // Passar posição atual do PiP
            );
            
            console.log('✅ Track combinado criado com sucesso');
            combinedVideoTrackRef.current = combinedTrack;
            
            // Publicar track combinado (vídeo e áudio se disponível)
            // IMPORTANTE: Incluir áudio do microfone (localAudioTrackRef) para que os usuários ouçam o narrador
            const tracksToPublish: any[] = [combinedTrack];
            
            // Adicionar áudio do screen share se disponível
            if (screenAudioTrack) {
              tracksToPublish.push(screenAudioTrack);
              console.log('🔊 Áudio do screen share incluído');
            }
            
            // IMPORTANTE: Adicionar áudio do microfone para narração
            if (localAudioTrackRef.current) {
              tracksToPublish.push(localAudioTrackRef.current);
              console.log('🎤 Áudio do microfone incluído (para narração)');
            } else {
              console.warn('⚠️ Áudio do microfone não disponível - usuários não ouvirão a narração');
            }
            
            console.log('📤 Publicando track combinado com áudios...', {
              tracksCount: tracksToPublish.length,
              hasScreenAudio: !!screenAudioTrack,
              hasMicrophoneAudio: !!localAudioTrackRef.current
            });
            await clientRef.current.publish(tracksToPublish);
            
            console.log('✅ Track combinado publicado com sucesso (screen sharing + câmera + áudio)');
            console.log('   Tracks publicados:', clientRef.current.localTracks.length);
          } catch (error) {
            console.error('❌ Erro ao criar track combinado:', error);
            console.error('   Stack:', error instanceof Error ? error.stack : 'N/A');
            console.log('🔄 Fallback: publicando apenas screen sharing...');
            // Fallback: publicar apenas screen sharing
            const tracksToPublish = screenAudioTrack ? [screenVideoTrack, screenAudioTrack] : [screenVideoTrack];
            await clientRef.current.publish(tracksToPublish);
            console.log('✅ Screen sharing publicado (fallback)');
          }
        } else {
          // Se câmera não está ativa, publicar apenas screen sharing
          console.log('📤 Publicando apenas screen sharing (câmera não está ativa)');
          console.log('   Screen track:', !!screenVideoTrack);
          console.log('   Screen audio track:', !!screenAudioTrack);
          
          // Garantir que não há track combinado ativo
          if (combinedVideoTrackRef.current) {
            try {
              await clientRef.current.unpublish(combinedVideoTrackRef.current);
              const oldTrack = combinedVideoTrackRef.current as any;
              if (oldTrack._drawInterval) clearInterval(oldTrack._drawInterval);
              if (oldTrack._screenVideo && document.body.contains(oldTrack._screenVideo)) {
                document.body.removeChild(oldTrack._screenVideo);
              }
              if (oldTrack._cameraVideo && document.body.contains(oldTrack._cameraVideo)) {
                document.body.removeChild(oldTrack._cameraVideo);
              }
              if (oldTrack._canvas && document.body.contains(oldTrack._canvas)) {
                document.body.removeChild(oldTrack._canvas);
              }
              oldTrack.stop();
              oldTrack.close();
              combinedVideoTrackRef.current = null;
            } catch (e) {
              console.warn('Aviso ao limpar track combinado:', e);
            }
          }
          
          // Incluir áudio do microfone junto com screen share
          const tracksToPublish: any[] = [screenVideoTrack];
          
          if (screenAudioTrack) {
            tracksToPublish.push(screenAudioTrack);
            console.log('🔊 Áudio do screen share incluído');
          }
          
          // IMPORTANTE: Incluir áudio do microfone para narração
          if (localAudioTrackRef.current) {
            tracksToPublish.push(localAudioTrackRef.current);
            console.log('🎤 Áudio do microfone incluído (para narração)');
          }
          
          await clientRef.current.publish(tracksToPublish);
          console.log('✅ Screen sharing publicado com áudios');
          console.log('   Tracks publicados:', clientRef.current.localTracks.length);
          console.log('   Tracks:', clientRef.current.localTracks.map((t: any) => t.getTrackLabel()));
        }
        
        // Limpar container principal
        if (localVideoRef.current) {
          safeClearElement(localVideoRef.current);
        }
        
        // Mostrar screen sharing ocupando toda a tela
        await new Promise(resolve => setTimeout(resolve, 100));
        if (localVideoRef.current) {
          await screenVideoTrack.play(localVideoRef.current);
          
          // Aplicar estilos para ocupar toda a tela
          setTimeout(() => {
            const videoElement = localVideoRef.current?.querySelector('video') as HTMLVideoElement;
            if (videoElement) {
              videoElement.style.width = '100%';
              videoElement.style.height = '100%';
              videoElement.style.objectFit = 'cover';
              videoElement.style.position = 'absolute';
              videoElement.style.top = '0';
              videoElement.style.left = '0';
              videoElement.style.zIndex = '1';
            }
          }, 300);
        }
        
        // Ativar screen sharing (o useEffect vai mover a câmera para o PiP se necessário)
        setShowScreenShare(true);
        toast.success('🖥️ Compartilhamento de tela ativado');
      }
    } catch (error: any) {
      console.error('❌ Erro ao alternar screen sharing:', error);
      
      // Verificar diferentes tipos de erro de permissão
      const isPermissionError = 
        error.name === 'NotAllowedError' || 
        error.name === 'PERMISSION_DENIED' ||
        error.code === 'PERMISSION_DENIED' ||
        error.message?.includes('Permission denied') ||
        error.message?.includes('permission denied');
      
      if (isPermissionError) {
        toast.error(
          '❌ Permissão negada para compartilhar tela. Por favor, permita o compartilhamento de tela nas configurações do navegador e tente novamente.',
          { duration: 5000 }
        );
      } else if (error.name === 'NotFoundError' || error.message?.includes('not found')) {
        toast.error('Nenhuma tela disponível para compartilhar. Verifique se há telas conectadas.');
      } else if (error.name === 'AbortError' || error.message?.includes('abort')) {
        toast.error('Compartilhamento de tela cancelado.');
      } else {
        toast.error(
          `Erro ao compartilhar tela: ${error.message || 'Erro desconhecido'}. Tente novamente.`,
          { duration: 4000 }
        );
      }
      
      // Garantir que o estado seja resetado em caso de erro
      setShowScreenShare(false);
    }
  };

  // Função para ativar/desativar câmera
  const toggleCamera = async () => {
    if (!isStreaming || !clientRef.current) {
      toast.error('Você precisa estar transmitindo');
      return;
    }
    
    try {
      if (showCamera) {
        // Desativar câmera
        if (cameraVideoTrackRef.current) {
          await clientRef.current.unpublish(cameraVideoTrackRef.current);
          cameraVideoTrackRef.current.stop();
          cameraVideoTrackRef.current.close();
          cameraVideoTrackRef.current = null;
          
          // Limpar PiP
          if (cameraPiPRef.current) {
            safeClearElement(cameraPiPRef.current);
          }
          
          // Limpar container principal se não há screen sharing
          if (!showScreenShare && localVideoRef.current) {
            safeClearElement(localVideoRef.current);
          }
        }
        // Se screen sharing está ativo, recriar track apenas com screen sharing
        if (showScreenShare && screenVideoTrackRef.current) {
          try {
            // Despublicar track combinado se existir
            if (combinedVideoTrackRef.current) {
              try {
                await clientRef.current.unpublish(combinedVideoTrackRef.current);
                const oldTrack = combinedVideoTrackRef.current as any;
                if (oldTrack._drawInterval) clearInterval(oldTrack._drawInterval);
                if (oldTrack._screenVideo && document.body.contains(oldTrack._screenVideo)) {
                  document.body.removeChild(oldTrack._screenVideo);
                }
                if (oldTrack._cameraVideo && document.body.contains(oldTrack._cameraVideo)) {
                  document.body.removeChild(oldTrack._cameraVideo);
                }
                if (oldTrack._canvas && document.body.contains(oldTrack._canvas)) {
                  document.body.removeChild(oldTrack._canvas);
                }
                oldTrack.stop();
                oldTrack.close();
                combinedVideoTrackRef.current = null;
              } catch (e) {
                console.warn('Aviso ao despublicar track combinado:', e);
              }
            }
            
            // Republicar apenas screen sharing
            const screenTrack = screenVideoTrackRef.current;
            const screenAudioTrack = Array.isArray(screenTrack) ? screenTrack[1] : null;
            const screenVideoTrack = Array.isArray(screenTrack) ? screenTrack[0] : screenTrack;
            const tracksToPublish = screenAudioTrack 
              ? [screenVideoTrack, screenAudioTrack] 
              : [screenVideoTrack];
            await clientRef.current.publish(tracksToPublish);
            console.log('✅ Screen sharing republicado (câmera desativada)');
          } catch (error) {
            console.error('❌ Erro ao republicar screen sharing:', error);
          }
        }
        
        setShowCamera(false);
        toast.success('📹 Câmera desativada');
      } else {
        // Ativar câmera
        const cameraConfig: any = {
          encoderConfig: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          }
        };
        
        // Se cameraDeviceId foi especificado (ex: OBS Virtual Camera), usar
        if (cameraDeviceId) {
          cameraConfig.cameraId = cameraDeviceId;
          console.log('📹 Usando câmera específica:', cameraDeviceId);
        }
        
        const cameraTrack = await AgoraRTC.createCameraVideoTrack(cameraConfig);
        
        cameraVideoTrackRef.current = cameraTrack;
        
        // IMPORTANTE: Verificar se screen share está ativo
        // Verificar tanto o estado showScreenShare quanto se há track de screen share armazenado
        // Isso garante que mesmo se o estado não estiver sincronizado, ainda detecta o screen share
        const hasActiveScreenShare = (showScreenShare || screenVideoTrackRef.current) && screenVideoTrackRef.current;
        
        console.log('🔍 Verificando condições para track combinado:', {
          showScreenShare,
          hasScreenShareTrack: !!screenVideoTrackRef.current,
          hasActiveScreenShare,
          hasCombinedTrack: !!combinedVideoTrackRef.current,
          cameraPosition
        });
        
        if (hasActiveScreenShare && screenVideoTrackRef.current) {
          // Screen sharing está ativo, recriar track combinado com a câmera
          console.log('📹 Screen sharing ativo - recriando track combinado com câmera...');
          
          try {
            // Despublicar track atual (pode ser screen sharing sozinho ou track combinado antigo)
            if (combinedVideoTrackRef.current) {
              try {
                await clientRef.current.unpublish(combinedVideoTrackRef.current);
                const oldTrack = combinedVideoTrackRef.current as any;
                if (oldTrack._drawInterval) clearInterval(oldTrack._drawInterval);
                if (oldTrack._screenVideo && document.body.contains(oldTrack._screenVideo)) {
                  document.body.removeChild(oldTrack._screenVideo);
                }
                if (oldTrack._cameraVideo && document.body.contains(oldTrack._cameraVideo)) {
                  document.body.removeChild(oldTrack._cameraVideo);
                }
                if (oldTrack._canvas && document.body.contains(oldTrack._canvas)) {
                  document.body.removeChild(oldTrack._canvas);
                }
                oldTrack.stop();
                oldTrack.close();
              } catch (e) {
                console.warn('Aviso ao despublicar track combinado antigo:', e);
              }
            }
            
            // Despublicar screen sharing atual
            const screenTrack = screenVideoTrackRef.current;
            const tracksToUnpublish = Array.isArray(screenTrack) ? screenTrack : [screenTrack];
            try {
              await clientRef.current.unpublish(tracksToUnpublish);
            } catch (e) {
              console.warn('Aviso ao despublicar screen sharing:', e);
            }
            
            // Criar novo track combinado com posição atual do PiP
            const screenVideoTrack = Array.isArray(screenTrack) ? screenTrack[0] : screenTrack;
            const screenAudioTrack = Array.isArray(screenTrack) ? screenTrack[1] : null;
            
            console.log('🔄 Criando track combinado com posição do PiP:', cameraPosition);
            const combinedTrack = await createCombinedVideoTrack(
              screenVideoTrack,
              cameraTrack,
              cameraPosition // Passar posição atual do PiP
            );
            
            combinedVideoTrackRef.current = combinedTrack;
            
            // Publicar track combinado com TODOS os áudios
            const tracksToPublish: any[] = [combinedTrack];
            
            // Adicionar áudio do screen share se disponível
            if (screenAudioTrack) {
              tracksToPublish.push(screenAudioTrack);
              console.log('🔊 Áudio do screen share incluído no track combinado');
            }
            
            // IMPORTANTE: Adicionar áudio do microfone para narração
            if (localAudioTrackRef.current) {
              tracksToPublish.push(localAudioTrackRef.current);
              console.log('🎤 Áudio do microfone incluído no track combinado (via toggleCamera)');
            } else {
              console.warn('⚠️ Áudio do microfone não disponível - usuários não ouvirão a narração');
            }
            
            await clientRef.current.publish(tracksToPublish);
            console.log('✅ Track combinado recriado e publicado com câmera + áudios:', {
              hasCombinedTrack: !!combinedTrack,
              hasScreenAudio: !!screenAudioTrack,
              hasMicAudio: !!localAudioTrackRef.current,
              totalTracks: tracksToPublish.length
            });
          } catch (error) {
            console.error('❌ Erro ao recriar track combinado:', error);
            toast.error('Erro ao combinar câmera com screen sharing');
          }
          
          // O useEffect vai mover a câmera para o PiP localmente também
        } else {
          // Screen sharing não está ativo (ou não detectado), publicar apenas câmera
          // Verificar novamente se há screen share publicado (pode estar desincronizado)
          const hasAnyScreenShare = screenVideoTrackRef.current || 
            clientRef.current.localTracks.some((track: any) => 
              track.isVideo && track !== cameraTrack && track !== combinedVideoTrackRef.current
            );
          
          if (hasAnyScreenShare && screenVideoTrackRef.current) {
            // Há screen share, criar track combinado mesmo que estado não esteja sincronizado
            console.log('⚠️ Screen share detectado mesmo sem estado ativo - criando track combinado...');
            
            try {
              // Despublicar qualquer track de vídeo existente
              const tracksToUnpublish = clientRef.current.localTracks.filter((track: any) => 
                track.isVideo && track !== cameraTrack
              );
              if (tracksToUnpublish.length > 0) {
                await clientRef.current.unpublish(tracksToUnpublish);
              }
              
              // Criar track combinado
              const screenVideoTrack = Array.isArray(screenVideoTrackRef.current) 
                ? screenVideoTrackRef.current[0] 
                : screenVideoTrackRef.current;
              const screenAudioTrack = Array.isArray(screenVideoTrackRef.current) 
                ? screenVideoTrackRef.current[1] 
                : null;
              
              const combinedTrack = await createCombinedVideoTrack(
                screenVideoTrack,
                cameraTrack,
                cameraPosition
              );
              
              combinedVideoTrackRef.current = combinedTrack;
              
              // Publicar com todos os áudios
              const tracksToPublish: any[] = [combinedTrack];
              if (screenAudioTrack) tracksToPublish.push(screenAudioTrack);
              if (localAudioTrackRef.current) tracksToPublish.push(localAudioTrackRef.current);
              
              await clientRef.current.publish(tracksToPublish);
              console.log('✅ Track combinado criado mesmo com estado desincronizado');
              
              // Atualizar estado para refletir a realidade
              setShowScreenShare(true);
            } catch (error) {
              console.error('❌ Erro ao criar track combinado (fallback):', error);
              // Fallback: publicar apenas câmera
              await clientRef.current.publish(cameraTrack);
              if (localVideoRef.current) {
                await cameraTrack.play(localVideoRef.current);
              }
            }
          } else {
            // Não há screen share, publicar apenas câmera
            if (screenVideoTrackRef.current) {
              try {
                await clientRef.current.unpublish(screenVideoTrackRef.current);
                console.log('✅ Screen sharing despublicado para permitir câmera');
              } catch (e) {
                console.warn('Aviso ao despublicar screen sharing:', e);
              }
            }
            
            await clientRef.current.publish(cameraTrack);
            
            if (localVideoRef.current) {
              await cameraTrack.play(localVideoRef.current);
            }
          }
        }
        
        setShowCamera(true);
        toast.success('📹 Câmera ativada');
      }
    } catch (error: any) {
      console.error('❌ Erro ao alternar câmera:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Permissão negada para acessar a câmera');
      } else {
        toast.error(`Erro: ${error.message || 'Erro desconhecido'}`);
      }
    }
  };

  // Função para alternar a fonte de vídeo
  const switchVideoSource = async (newSource: 'camera' | 'screen' | 'external', url?: string) => {
    if (!isStreaming || !clientRef.current || !localVideoTrackRef.current) {
      toast.error('Você precisa estar transmitindo para alternar a fonte de vídeo');
      return;
    }
    
    try {
      // Parar e remover o track atual
      const oldTrack = localVideoTrackRef.current;
      await clientRef.current.unpublish(oldTrack);
      oldTrack.stop();
      oldTrack.close();
      
      // Criar novo track baseado na fonte
      let newVideoTrack;
      if (newSource === 'screen') {
        console.log('🖥️ Alternando para screen sharing...');
        newVideoTrack = await AgoraRTC.createScreenVideoTrack({
          encoderConfig: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          }
        }, 'auto');
        toast.success('🖥️ Compartilhamento de tela ativado');
      } else if (newSource === 'external' && url) {
        console.log('🔗 Alternando para vídeo externo...');
        newVideoTrack = await createCustomVideoTrackFromUrl(url);
        toast.success('🔗 Vídeo externo ativado');
      } else {
        // Voltar para câmera
        console.log('📹 Alternando para câmera...');
        const cameraConfig: any = {
          encoderConfig: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          }
        };
        
        // Se cameraDeviceId foi especificado (ex: OBS Virtual Camera), usar
        if (cameraDeviceId) {
          cameraConfig.cameraId = cameraDeviceId;
        }
        
        newVideoTrack = await AgoraRTC.createCameraVideoTrack(cameraConfig);
        toast.success('📹 Câmera ativada');
      }
      
      // Atualizar referência
      localVideoTrackRef.current = newVideoTrack;
      
      // Publicar novo track
      await clientRef.current.publish(newVideoTrack);
      
      // Reproduzir no elemento local
      if (localVideoRef.current) {
        safeClearElement(localVideoRef.current);
        await new Promise(resolve => setTimeout(resolve, 100));
        await newVideoTrack.play(localVideoRef.current);
        
        // Aplicar estilos
        setTimeout(() => {
          const videoElement = localVideoRef.current?.querySelector('video') as HTMLVideoElement;
          if (videoElement) {
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
            videoElement.style.objectFit = 'cover';
            videoElement.style.position = 'absolute';
            videoElement.style.top = '5px';
            videoElement.style.left = '0px';
            videoElement.style.zIndex = '5';
            videoElement.style.backgroundColor = '#000';
          }
        }, 300);
      }
      
      setVideoSource(newSource);
      console.log('✅ Fonte de vídeo alterada com sucesso');
      
    } catch (error: any) {
      console.error('❌ Erro ao alternar fonte de vídeo:', error);
      toast.error(`Erro ao alternar: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const initializeBroadcast = async () => {
    if (!APP_ID) {
      toast.error('Agora.io App ID não configurado');
      return;
    }

    // Verificar se já está inicializando
    if (isJoiningRef.current) {
      console.log('Already joining, skipping...');
      return;
    }

    try {
      isJoiningRef.current = true;
      
      // Criar cliente Agora
      const client = AgoraRTC.createClient({ 
        mode: 'live', 
        codec: 'vp8' 
      });
      clientRef.current = client;

      // Configurar event listeners ANTES de entrar no canal
      setupEventListeners(client);

      // Entrar no canal primeiro
      // Se não há token, passar null explicitamente
      // IMPORTANTE: Se o projeto requer token mas você quer usar apenas App ID,
      // configure o projeto no dashboard para "App ID Only"
      console.log('🔄 Tentando entrar no canal como broadcaster...');
      console.log('   Usando token:', TOKEN ? 'Sim' : 'Não (App ID Only)');
      
      // Se não há token, usar null (requer projeto configurado para App ID Only)
      const tokenToUse = TOKEN || null;
      const uid = await client.join(APP_ID, channelName, tokenToUse, null);
      isJoiningRef.current = false;
      console.log('✅ Entrou no canal com sucesso! UID:', uid);
      console.log('   Canal:', channelName);
      console.log('   Remote users no canal:', client.remoteUsers.length);
      
      // Configurar como host (broadcaster) ANTES de criar tracks
      console.log('🎤 Configurando como host (broadcaster)...');
      await client.setClientRole('host');
      console.log('✅ Configurado como host com sucesso');

      // Criar tracks: áudio + câmera (sempre criamos a câmera para o PiP)
      let audioTrack, cameraTrack;
      try {
        // Criar áudio track (sempre do microfone)
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        
        // Criar câmera track (sempre criamos para poder mostrar como PiP)
        console.log('📹 Criando camera track com resolução 1080p60...');
        const cameraConfig: any = {
          encoderConfig: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 60 }
          }
        };
        
        // Se cameraDeviceId foi especificado (ex: OBS Virtual Camera), usar
        if (cameraDeviceId) {
          cameraConfig.cameraId = cameraDeviceId;
          console.log('📹 Usando câmera específica:', cameraDeviceId);
        }
        
        cameraTrack = await AgoraRTC.createCameraVideoTrack(cameraConfig);
        console.log('✅ Camera track criado com sucesso');
        
        cameraVideoTrackRef.current = cameraTrack;
        
        console.log('✅ Tracks criados com sucesso');
      } catch (trackError: any) {
        console.error('❌ Erro ao acessar câmera/microfone:', trackError);
        isJoiningRef.current = false;
        
        if (trackError.name === 'NotAllowedError' || trackError.message?.includes('permission')) {
          toast.error('Permissão negada. Por favor, permita o acesso à câmera e microfone nas configurações do navegador.');
        } else if (trackError.name === 'NotFoundError' || trackError.message?.includes('device')) {
          toast.error('Câmera ou microfone não encontrados. Verifique se os dispositivos estão conectados.');
        } else {
          toast.error(`Erro ao acessar câmera: ${trackError.message || 'Erro desconhecido'}`);
        }
        
        await cleanup();
        return;
      }

      localAudioTrackRef.current = audioTrack;
      localVideoTrackRef.current = cameraTrack; // Manter compatibilidade
      
      console.log('✅ Tracks criados e armazenados nos refs');
      console.log('   Audio track enabled:', audioTrack.isPlaying);
      console.log('   Camera track enabled:', cameraTrack.isPlaying);

      // Garantir que os estados iniciais estejam corretos (ambos ligados inicialmente)
      setIsMuted(false);
      setIsVideoOff(false);
      setShowCamera(true); // Câmera está ativa por padrão
      
      // Adicionar listeners para detectar quando os tracks são desabilitados
      audioTrack.on('track-ended', () => {
        console.warn('⚠️ Audio track foi encerrado!');
      });
      
      cameraTrack.on('track-ended', () => {
        console.warn('⚠️ Camera track foi encerrado!');
      });

      // Aplicar estilos ao vídeo da câmera que já foi reproduzido
      if (localVideoRef.current) {
        // Aguardar um pouco para o SDK criar o elemento de vídeo
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Aplicar estilos ao vídeo criado pelo SDK
        const applyVideoStyles = () => {
          // Tentar encontrar o vídeo de múltiplas formas
          let videoElement = localVideoRef.current?.querySelector('video') as HTMLVideoElement;
          
          if (!videoElement && localVideoRef.current) {
            // Tentar encontrar via getElementsByTagName
            const allVideos = localVideoRef.current.getElementsByTagName('video');
            if (allVideos.length > 0) {
              videoElement = allVideos[0] as HTMLVideoElement;
              console.log('✅ Vídeo encontrado via getElementsByTagName');
            }
          }
          
          if (videoElement) {
            // Aplicar estilos com z-index alto para ficar acima do overlay
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
            videoElement.style.objectFit = 'cover';
            videoElement.style.position = 'absolute';
            videoElement.style.top = '5px';
            videoElement.style.left = '0px';
            videoElement.style.zIndex = '5'; // Abaixo dos controles mas acima do fundo
            videoElement.style.backgroundColor = '#000';
            videoElement.style.display = 'block';
            videoElement.style.visibility = 'visible';
            videoElement.style.opacity = '1';
            videoElement.style.minWidth = '100%';
            videoElement.style.minHeight = '100%';
            
            videoElement.setAttribute('autoplay', 'true');
            videoElement.setAttribute('playsinline', 'true');
            videoElement.setAttribute('tabindex', '-1');
            videoElement.setAttribute('controlslist', 'nodownload');
            videoElement.classList.add('video-stream', 'html5-main-video');
            
            // Forçar play se estiver pausado
            if (videoElement.paused) {
              videoElement.play().catch(e => console.warn('Erro ao forçar play:', e));
            }
            
            const hasValidDimensions = videoElement.videoWidth > 0 && videoElement.videoHeight > 0;
            
            // Garantir que o container mantenha aspect-ratio 16:9
            if (hasValidDimensions && localVideoRef.current) {
              const container = localVideoRef.current;
              // Manter aspect-ratio ao invés de altura fixa
              if (!container.style.aspectRatio) {
                container.style.aspectRatio = '16 / 9';
                console.log('📏 Aspect-ratio 16:9 aplicado ao container');
              }
            }
            
            console.log('✅ Estilos aplicados ao vídeo da câmera');
            setHasLocalVideo(true);
          }
        };
        
        applyVideoStyles();
        
        // Tentar novamente após um tempo se não encontrou
        setTimeout(() => {
          if (!localVideoRef.current?.querySelector('video')) {
            console.log('🔄 Tentando aplicar estilos novamente...');
            applyVideoStyles();
          }
        }, 500);
      }

      // Aguardar um pouco para garantir que a conexão está estabelecida
      console.log('⏳ Aguardando conexão estabelecida antes de publicar...');
      console.log('   Estado inicial:', client.connectionState);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verificar se o cliente está conectado
      let connectionState = client.connectionState;
      console.log('🔌 Estado da conexão:', connectionState);
      
      if (connectionState !== 'CONNECTED' && connectionState !== 'CONNECTING') {
        console.warn('⚠️ Cliente não está conectado, aguardando...');
        // Aguardar até estar conectado (máximo 10 segundos)
        let waitCount = 0;
        while (client.connectionState !== 'CONNECTED' && waitCount < 20) {
          await new Promise(resolve => setTimeout(resolve, 500));
          waitCount++;
          connectionState = client.connectionState;
          console.log(`   Aguardando conexão... (${waitCount}/20) Estado: ${connectionState}`);
        }
        console.log('🔌 Estado da conexão após aguardar:', client.connectionState);
      } else if (connectionState === 'CONNECTING') {
        console.log('🔄 Conexão em andamento, aguardando...');
        let waitCount = 0;
        while (client.connectionState === 'CONNECTING' && waitCount < 20) {
          await new Promise(resolve => setTimeout(resolve, 500));
          waitCount++;
          connectionState = client.connectionState;
          console.log(`   Aguardando conexão completar... (${waitCount}/20) Estado: ${connectionState}`);
        }
        console.log('🔌 Estado da conexão após aguardar:', client.connectionState);
      }
      
      if (client.connectionState !== 'CONNECTED') {
        console.warn('⚠️ Conexão não estabelecida. Estado:', client.connectionState);
        console.warn('   Tentando publicar mesmo assim...');
      } else {
        console.log('✅ Conexão estabelecida! Pronto para publicar.');
      }
      
        // Publicar áudio e câmera juntos após conexão estar estabelecida
        console.log('📤 Publicando tracks (áudio + câmera)...');
        console.log('   Audio track:', !!audioTrack);
        console.log('   Camera track:', !!cameraVideoTrackRef.current);
        console.log('   Canal:', channelName);
        console.log('   Client role: host (definido anteriormente)');
        console.log('   Connection state:', client.connectionState);
        
        try {
          // Publicar áudio e câmera juntos
          await client.publish([audioTrack, cameraTrack]);
          console.log('✅ Áudio e câmera publicados com sucesso');
          
          // Mostrar câmera no container principal
          if (localVideoRef.current) {
            await cameraTrack.play(localVideoRef.current);
            console.log('✅ Camera reproduzindo no container principal');
            
            // Aguardar um pouco para o SDK criar o elemento de vídeo
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Aplicar estilos ao vídeo
            const applyStyles = () => {
              const videoElement = localVideoRef.current?.querySelector('video') as HTMLVideoElement;
              if (videoElement) {
                videoElement.style.width = '100%';
                videoElement.style.height = '100%';
                videoElement.style.objectFit = 'cover';
                videoElement.style.position = 'absolute';
                videoElement.style.top = '0';
                videoElement.style.left = '0';
                videoElement.style.zIndex = '5';
                videoElement.style.backgroundColor = '#000';
                videoElement.style.display = 'block';
                videoElement.style.visibility = 'visible';
                videoElement.style.opacity = '1';
                
                if (localVideoRef.current) {
                  localVideoRef.current.style.aspectRatio = '16 / 9';
                }
                
                setHasLocalVideo(true);
                console.log('✅ Estilos aplicados ao vídeo da câmera');
                return true;
              }
              return false;
            };
            
            if (!applyStyles()) {
              // Tentar novamente após um tempo
              setTimeout(() => {
                applyStyles();
              }, 500);
            }
          }
        console.log('   Remote users no canal:', client.remoteUsers.length);
        console.log('   Canal:', channelName);
        console.log('   App ID:', APP_ID.substring(0, 8) + '...' + APP_ID.substring(24));
        console.log('   Connection state:', client.connectionState);
        
        // Verificar se os tracks foram publicados corretamente
        const localTracks = client.localTracks;
        console.log('   Local tracks publicados:', localTracks.length);
        localTracks.forEach((track: any, index: number) => {
          console.log(`   Track ${index}:`, track.getTrackLabel(), track.isPlaying ? 'playing' : 'not playing');
        });
        
        // Verificar se os tracks estão realmente publicados
        if (localTracks.length === 0) {
          console.error('❌ Nenhum track local encontrado após publicação!');
          toast.error('Erro: tracks não foram publicados corretamente');
        } else {
          console.log('✅ Tracks confirmados como publicados');
        }
      } catch (publishError) {
        console.error('❌ Erro ao publicar tracks:', publishError);
        console.error('   Detalhes do erro:', {
          code: (publishError as any)?.code,
          message: (publishError as any)?.message,
          name: (publishError as any)?.name
        });
        throw publishError;
      }

      setIsStreaming(true);
      cleanupCalledRef.current = false; // Reset para permitir cleanup futuro
      
      // Adicionar listener para verificar se os tracks são removidos
      client.on('stream-type-changed', (uid: number, streamType: string) => {
        console.log('📡 Stream type changed:', { uid, streamType });
      });
      
      // Limpar intervalo anterior se existir
      if (checkTracksIntervalRef.current) {
        clearInterval(checkTracksIntervalRef.current);
        checkTracksIntervalRef.current = null;
      }
      
      // Verificar periodicamente se os tracks ainda estão publicados
      checkTracksIntervalRef.current = setInterval(() => {
        if (!clientRef.current || cleanupCalledRef.current) {
          if (checkTracksIntervalRef.current) {
            clearInterval(checkTracksIntervalRef.current);
            checkTracksIntervalRef.current = null;
          }
          return;
        }
        
        const localTracks = clientRef.current.localTracks;
        if (localTracks.length === 0 && isStreaming) {
          console.error('❌ Tracks foram removidos! Local tracks:', localTracks.length);
          console.error('   Isso não deveria acontecer durante uma transmissão ativa');
          console.error('   Estado:', {
            isStreaming,
            hasClient: !!clientRef.current,
            hasAudioTrack: !!localAudioTrackRef.current,
            hasVideoTrack: !!localVideoTrackRef.current,
            connectionState: clientRef.current?.connectionState
          });
        } else if (localTracks.length > 0) {
          console.log('✅ Tracks ainda publicados:', localTracks.length);
        }
        
        // Atualizar estatísticas para o admin
        if (isBroadcaster && onStatsUpdate) {
          const connectionState = clientRef.current.connectionState;
          const remoteUsers = clientRef.current.remoteUsers;
          const getConnectionQuality = (): 'excellent' | 'good' | 'poor' | 'disconnected' => {
            if (connectionState === 'DISCONNECTED') return 'disconnected';
            if (connectionState === 'CONNECTED') return 'excellent';
            if (connectionState === 'CONNECTING') return 'good';
            return 'poor';
          };
          
          onStatsUpdate({
            viewerCount: remoteUsers.length,
            connectionState,
            connectionQuality: getConnectionQuality()
          });
        }
      }, 2000);
      
      // Garantir que o vídeo seja exibido corretamente - apenas aplicar estilos
      const ensureVideoDisplay = () => {
        // Evitar múltiplas execuções simultâneas
        if (ensureVideoDisplayRunningRef.current) {
          return;
        }

        ensureVideoDisplayRunningRef.current = true;
        
        try {
          if (!localVideoRef.current) {
            ensureVideoDisplayRunningRef.current = false;
            return;
          }

          // Procurar vídeo criado pelo SDK - tentar múltiplas formas
          let videoElement = localVideoRef.current.querySelector('video') as HTMLVideoElement;
          
          // Se não encontrou, procurar em qualquer lugar dentro do container
          if (!videoElement) {
            const allVideos = localVideoRef.current.getElementsByTagName('video');
            if (allVideos.length > 0) {
              videoElement = allVideos[0] as HTMLVideoElement;
              console.log('✅ Vídeo encontrado via getElementsByTagName');
            }
          }
          
          if (videoElement) {
            console.log('✅ Vídeo encontrado, aplicando estilos...');
            
            // Garantir estilos com z-index correto
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
            videoElement.style.objectFit = 'cover';
            videoElement.style.position = 'absolute';
            videoElement.style.top = '5px';
            videoElement.style.left = '0px';
            videoElement.style.zIndex = '5'; // Abaixo dos controles mas acima do fundo
            videoElement.style.backgroundColor = '#000';
            videoElement.style.display = 'block';
            videoElement.style.visibility = 'visible';
            videoElement.style.opacity = '1';
            videoElement.style.minWidth = '100%';
            videoElement.style.minHeight = '100%';
            
            videoElement.setAttribute('autoplay', 'true');
            videoElement.setAttribute('playsinline', 'true');
            videoElement.setAttribute('tabindex', '-1');
            videoElement.setAttribute('controlslist', 'nodownload');
            videoElement.classList.add('video-stream', 'html5-main-video');
            
            // Forçar play se estiver pausado
            if (videoElement.paused) {
              videoElement.play().catch(e => console.warn('Erro ao forçar play:', e));
            }
            
            // Verificar se o vídeo tem dimensões válidas
            const hasValidDimensions = videoElement.videoWidth > 0 && videoElement.videoHeight > 0;
            
          console.log('📐 Dimensões do vídeo:', {
              videoWidth: videoElement.videoWidth,
              videoHeight: videoElement.videoHeight,
              clientWidth: videoElement.clientWidth,
              clientHeight: videoElement.clientHeight,
              offsetWidth: videoElement.offsetWidth,
              offsetHeight: videoElement.offsetHeight,
              paused: videoElement.paused,
              readyState: videoElement.readyState,
              hasValidDimensions,
              zIndex: window.getComputedStyle(videoElement).zIndex,
              display: window.getComputedStyle(videoElement).display,
              visibility: window.getComputedStyle(videoElement).visibility,
              opacity: window.getComputedStyle(videoElement).opacity
            });
            
            // Se tem dimensões válidas, marcar como tendo vídeo
            if (hasValidDimensions) {
              setHasLocalVideo(true);
            }
            
            ensureVideoDisplayRunningRef.current = false;
          } else {
            // Vídeo ainda não foi criado pelo SDK, tentar novamente em breve
            console.debug('Vídeo ainda não encontrado, tentando novamente...');
            ensureVideoDisplayRunningRef.current = false;
          }
        } catch (error) {
          console.error('Erro em ensureVideoDisplay:', error);
          ensureVideoDisplayRunningRef.current = false;
        }
      };

      // Aplicar estilos após o vídeo ser criado pelo SDK
      setTimeout(() => ensureVideoDisplay(), 500);
      setTimeout(() => ensureVideoDisplay(), 1000);
      setTimeout(() => ensureVideoDisplay(), 2000);
      
      toast.success('🎥 Transmissão iniciada!');
    } catch (error: any) {
      console.error('❌ Erro ao iniciar transmissão:', error);
      console.error('   Stack trace:', error.stack);
      console.error('   Error name:', error.name);
      console.error('   Error code:', error.code);
      console.error('   Error message:', error.message);
      isJoiningRef.current = false;
      
      // Se foi cancelado (OPERATION_ABORTED ou WS_ABORT), não mostrar erro
      if (error.name === 'AgoraRTCException' && (error.code === 'OPERATION_ABORTED' || error.code === 'WS_ABORT')) {
        console.log('Join foi cancelado (provavelmente mudança de canal ou cleanup)');
        return;
      }
      
      // Ignorar erros de WS_ABORT durante cleanup
      if (error.code === 'WS_ABORT' || error.message?.includes('LEAVE')) {
        console.debug('Erro WS_ABORT durante cleanup (normal)');
        return;
      }
      
      // Erro específico de gateway - precisa de token ou configuração diferente
      if (error.code === 'CAN_NOT_GET_GATEWAY_SERVER' || error.message?.includes('dynamic use static key')) {
        console.error('❌ Erro de gateway - O projeto Agora.io está configurado para usar token dinâmico obrigatório');
        console.error('📋 SOLUÇÕES:');
        console.error('   1. Gere um token temporário em: https://console.agora.io/');
        console.error('   2. Ou configure o projeto para usar "App ID Only" nas configurações');
        console.error('   3. Veja o guia completo em: RESOLVER_ERRO_GATEWAY_AGORA.md');
        
        toast.error(
          <div className="text-left">
            <div className="font-bold mb-1">⚠️ Erro de Configuração Agora.io</div>
            <div className="text-sm">
              O projeto requer token. Acesse: <br/>
              <a 
                href="https://console.agora.io/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 underline"
              >
                console.agora.io
              </a>
              <br/>
              Veja: RESOLVER_ERRO_GATEWAY_AGORA.md
            </div>
          </div>,
          { duration: 10000 }
        );
        return;
      }
      
      toast.error(`Erro ao iniciar transmissão: ${error.message || 'Verifique as permissões'}`);
      isInitializedRef.current = false;
      cleanupCalledRef.current = false;
      await cleanup();
    }
  };

  const initializeViewer = async () => {
    if (!APP_ID) {
      console.error('❌ App ID não configurado!');
      console.error('📋 Adicione VITE_AGORA_APP_ID no arquivo .env');
      toast.error('Agora.io App ID não configurado. Verifique o arquivo .env');
      return;
    }

    // Validar formato do App ID (deve ter 32 caracteres)
    if (APP_ID.length !== 32) {
      console.error('❌ App ID inválido!');
      console.error('📋 O App ID deve ter 32 caracteres. Verifique se está correto.');
      console.error('📋 App ID atual:', APP_ID);
      toast.error('App ID inválido. Verifique se está correto no .env');
      return;
    }

    // Verificar se já está inicializando
    if (isJoiningRef.current) {
      console.log('Already joining, skipping...');
      return;
    }

    try {
      // Verificar se cleanup foi chamado antes de iniciar join
      if (isCleaningUpRef.current) {
        console.log('⚠️ Cleanup foi chamado, cancelando join...');
        isJoiningRef.current = false;
        return;
      }

      isJoiningRef.current = true;
      setIsConnecting(true);
      setHasRemoteVideo(false);
      
      console.log('🔧 Configuração Agora:');
      console.log('   App ID:', APP_ID.substring(0, 8) + '...' + APP_ID.substring(24));
      console.log('   Token:', TOKEN ? TOKEN.substring(0, 20) + '...' : 'Não fornecido');
      console.log('   Channel:', channelName);
      
      // Criar cliente Agora
      const client = AgoraRTC.createClient({ 
        mode: 'live', 
        codec: 'vp8' 
      });
      clientRef.current = client;

      // Verificar novamente se cleanup foi chamado
      if (isCleaningUpRef.current) {
        console.log('⚠️ Cleanup foi chamado durante criação do cliente, cancelando join...');
        isJoiningRef.current = false;
        return;
      }

      // Configurar event listeners ANTES de entrar no canal (IMPORTANTE!)
      setupEventListeners(client);

      // Verificar novamente antes de fazer join
      if (isCleaningUpRef.current) {
        console.log('⚠️ Cleanup foi chamado antes do join, cancelando...');
        isJoiningRef.current = false;
        return;
      }

      // Entrar no canal primeiro
      // Se não há token, passar null explicitamente
      // IMPORTANTE: Se o projeto requer token mas você quer usar apenas App ID,
      // configure o projeto no dashboard para "App ID Only"
      console.log('🔄 Tentando entrar no canal...');
      console.log('   Usando token:', TOKEN ? 'Sim' : 'Não (App ID Only)');
      
      // Se não há token, usar null (requer projeto configurado para App ID Only)
      const tokenToUse = TOKEN || null;
      
      // Tentar join com retry em caso de timeout de rede
      let uid: number | string | null = null;
      let joinAttempts = 0;
      const maxJoinAttempts = 3;
      
      while (joinAttempts < maxJoinAttempts && !uid) {
        try {
          // Verificar se cleanup foi chamado antes de cada tentativa
          if (isCleaningUpRef.current) {
            console.log('⚠️ Cleanup foi chamado durante tentativas de join, cancelando...');
            isJoiningRef.current = false;
            return;
          }
          
          if (joinAttempts > 0) {
            console.log(`🔄 Tentativa ${joinAttempts + 1}/${maxJoinAttempts} de join...`);
            // Aguardar um pouco antes de tentar novamente (backoff exponencial)
            await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, joinAttempts - 1), 5000)));
          }
          
          uid = await client.join(APP_ID, channelName, tokenToUse, null) as number | string;
          console.log('✅ Join bem-sucedido na tentativa', joinAttempts + 1);
          break; // Sucesso, sair do loop
        } catch (joinError: any) {
          joinAttempts++;
          console.warn(`⚠️ Erro no join (tentativa ${joinAttempts}/${maxJoinAttempts}):`, joinError);
          
          // Verificar se é um erro de timeout de rede
          if (joinError.code === 'NETWORK_TIMEOUT' || 
              joinError.message?.includes('timeout') ||
              joinError.message?.includes('NETWORK_TIMEOUT')) {
            console.warn('   Erro de timeout de rede detectado');
            
            if (joinAttempts < maxJoinAttempts) {
              console.log(`   Tentando novamente em ${Math.min(1000 * Math.pow(2, joinAttempts - 1), 5000)}ms...`);
              continue; // Tentar novamente
            } else {
              console.error('❌ Todas as tentativas de join falharam devido a timeout de rede');
              isJoiningRef.current = false;
              setIsConnecting(false);
              throw new Error('Não foi possível conectar ao servidor após múltiplas tentativas. Verifique sua conexão de internet.');
            }
          } else {
            // Outro tipo de erro, não tentar novamente
            console.error('❌ Erro não relacionado a timeout:', joinError);
            isJoiningRef.current = false;
            setIsConnecting(false);
            throw joinError;
          }
        }
      }
      
      if (!uid) {
        isJoiningRef.current = false;
        setIsConnecting(false);
        throw new Error('Falha ao entrar no canal após múltiplas tentativas');
      }
      
      // Verificar se cleanup foi chamado durante o join
      // MAS aguardar um pouco para ver se é React Strict Mode (remontagem rápida)
      if (isCleaningUpRef.current) {
        console.log('⚠️ Cleanup foi chamado durante join, aguardando para verificar se é React Strict Mode...');
        // Aguardar 100ms para ver se o componente será remontado (React Strict Mode)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Se ainda está marcado para cleanup E não há mais cliente, então realmente foi desmontado
        if (isCleaningUpRef.current && !clientRef.current) {
          console.log('⚠️ Componente realmente foi desmontado, saindo...');
          try {
            await client.leave();
          } catch (e) {
            // Ignorar erros ao sair durante join
          }
          isJoiningRef.current = false;
          return;
        } else {
          // Pode ser React Strict Mode, continuar normalmente
          console.log('✅ Pode ser React Strict Mode, continuando...');
          isCleaningUpRef.current = false; // Resetar flag de cleanup
        }
      }
      
      console.log('✅ Entrou no canal com sucesso! UID:', uid);
      isJoiningRef.current = false;

      // Configurar como audience (viewer) com ultra-low latency
      const clientRoleOptions = { level: 2 }; // Ultra-low latency para transmissão interativa
      await client.setClientRole('audience', clientRoleOptions);
      console.log('✅ Set as audience');

      // Aguardar conexão estar estabelecida antes de tentar subscribe
      console.log('⏳ Aguardando conexão estabelecida...');
      console.log('   Estado inicial:', client.connectionState);
      
      // Aguardar até a conexão estar estabelecida (máximo 10 segundos)
      let waitCount = 0;
      while (client.connectionState !== 'CONNECTED' && waitCount < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        waitCount++;
        console.log(`   Aguardando conexão... (${waitCount}/20) Estado: ${client.connectionState}`);
      }
      
      // Verificar estado da conexão
      console.log('🔌 Estado da conexão do viewer:', client.connectionState);
      console.log('   Canal:', channelName);
      console.log('   App ID:', APP_ID.substring(0, 8) + '...' + APP_ID.substring(24));
      
      if (client.connectionState !== 'CONNECTED') {
        console.warn('⚠️ Conexão não estabelecida após aguardar. Estado:', client.connectionState);
        console.warn('   Isso pode causar problemas ao receber streams. Continuando mesmo assim...');
      } else {
        console.log('✅ Conexão estabelecida com sucesso!');
      }

      // Configurar handler para autoplay de áudio (política do navegador)
      // O SDK do Agora retoma automaticamente o áudio quando o usuário interage
      // Este handler é apenas para informar o usuário, mas o áudio será ativado automaticamente
      AgoraRTC.onAutoplayFailed = () => {
        console.log('ℹ️ Autoplay bloqueado pelo navegador (normal) - áudio será ativado automaticamente ao interagir');
        setAudioBlocked(true);
        // Mostrar um toast discreto para informar o usuário
        toast('🔊 Clique na página para ativar o áudio', { 
          duration: 5000,
          icon: '🔊'
        });
      };
      
      // Verificar se já há usuários publicando no canal
      // NOTA: Não fazer subscribe aqui - deixar o evento 'user-published' fazer isso
      // Isso evita o erro "Cannot subscribe when peerConnection disconnected"
      const remoteUsers = client.remoteUsers;
      console.log('🔍 Remote users already in channel:', remoteUsers.length);
      
      if (remoteUsers.length > 0) {
        console.log('✅ Usuários encontrados no canal, processando...');
        remoteUsers.forEach((user: any) => {
          console.log('   User:', user.uid, 'hasVideo:', user.hasVideo, 'hasAudio:', user.hasAudio);
        });
        
        // Se já há usuários no canal quando o viewer entra, fazer subscribe manualmente
        // O evento user-published pode não ser disparado se o usuário já estava no canal
        console.log('📡 Fazendo subscribe manualmente para usuários já no canal...');
        
        // Verificar se a conexão está estabelecida antes de tentar subscribe
        let connectionState = String(client.connectionState);
        if (connectionState !== 'CONNECTED') {
          console.warn('⚠️ Conexão não estabelecida ainda. Estado:', connectionState);
          console.warn('   Aguardando conexão antes de fazer subscribe para usuários já no canal...');
          
          // Aguardar até a conexão estar estabelecida (máximo 10 segundos)
          let waitCount = 0;
          while (waitCount < 20) {
            connectionState = String(client.connectionState);
            if (connectionState === 'CONNECTED') break;
            await new Promise(resolve => setTimeout(resolve, 500));
            waitCount++;
            if (isCleaningUpRef.current) {
              console.log('⚠️ Cleanup foi chamado durante espera, cancelando subscribe...');
              return;
            }
          }
          
          connectionState = String(client.connectionState);
          if (connectionState !== 'CONNECTED') {
            console.error('❌ Conexão não estabelecida após aguardar. Cancelando subscribe para usuários já no canal');
            return;
          }
        }
        
        for (const user of remoteUsers) {
          try {
            // Validar user antes de processar
            if (!user || typeof user !== 'object' || !user.uid) {
              console.warn('⚠️ User inválido, pulando...');
              continue;
            }
            
            // Verificar novamente o estado da conexão antes de cada subscribe
            const currentState = client.connectionState as string;
            if (currentState !== 'CONNECTED') {
              console.warn('⚠️ Conexão perdida durante subscribe. Estado:', currentState);
              break;
            }
            
            // Subscribe ao vídeo se disponível
            if (user.hasVideo) {
              console.log('📹 Fazendo subscribe de vídeo para user:', user.uid);
              await client.subscribe(user, 'video');
              console.log('✅ Subscribed to video for user:', user.uid);
              
              // Aguardar um pouco para o track estar disponível
              await new Promise(resolve => setTimeout(resolve, 300));
              
              // Reproduzir vídeo se o track estiver disponível
              if (user.videoTrack && remoteVideoRef.current) {
                console.log('▶️ Reproduzindo vídeo remoto...');
                safeClearElement(remoteVideoRef.current);
                const videoContainer = document.createElement('div');
                videoContainer.id = `remote-video-${user.uid}`;
                videoContainer.className = 'w-full h-full';
                videoContainer.style.width = '100%';
                videoContainer.style.height = '100%';
                videoContainer.style.position = 'relative';
                videoContainer.style.overflow = 'hidden';
                videoContainer.style.backgroundColor = '#000';
                remoteVideoRef.current.appendChild(videoContainer);
                
                await user.videoTrack.play(videoContainer);
                
                // Aplicar estilos ao vídeo após ser criado
                setTimeout(() => {
                  const videoElement = videoContainer.querySelector('video') as HTMLVideoElement;
                  if (videoElement) {
                    videoElement.style.width = '100%';
                    videoElement.style.height = '100%';
                    videoElement.style.objectFit = 'cover';
                    videoElement.style.position = 'absolute';
                    videoElement.style.top = '0';
                    videoElement.style.left = '0';
                    videoElement.style.zIndex = '15';
                    videoElement.style.backgroundColor = '#000';
                    videoElement.style.display = 'block';
                    videoElement.style.visibility = 'visible';
                    videoElement.style.opacity = '1';
                    
                    // Garantir que o container mantenha aspect-ratio
                    if (remoteVideoRef.current) {
                      remoteVideoRef.current.style.aspectRatio = '16 / 9';
                    }
                    if (videoContainer) {
                      videoContainer.style.aspectRatio = '16 / 9';
                    }
                    
                    console.log('✅ Estilos aplicados ao vídeo remoto (subscribe manual)');
                  }
                }, 200);
                
                setHasRemoteVideo(true);
                setIsConnecting(false);
                console.log('✅ Vídeo remoto reproduzindo');
              }
            }
            
            // Verificar novamente o estado da conexão antes de subscribe de áudio
            const currentStateAudio = client.connectionState as string;
            if (currentStateAudio !== 'CONNECTED') {
              console.warn('⚠️ Conexão perdida durante subscribe de áudio. Estado:', currentStateAudio);
              break;
            }
            
            // Subscribe ao áudio se disponível
            if (user.hasAudio) {
              console.log('🔊 Fazendo subscribe de áudio para user:', user.uid);
              await client.subscribe(user, 'audio');
              console.log('✅ Subscribed to audio for user:', user.uid);
              
              // Aguardar apenas 100ms para o track estar disponível (reduzido de 300ms)
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Reproduzir áudio se o track estiver disponível
              if (user.audioTrack) {
                try {
                  // play() pode retornar Promise<void> ou void
                  const playResult = user.audioTrack.play() as Promise<void> | void | null | undefined;
                  if (playResult && playResult instanceof Promise) {
                    await playResult;
                  }
                    console.log('✅ Áudio remoto reproduzindo');
                    setAudioBlocked(false);
                } catch (audioError: any) {
                  console.error('❌ Erro ao reproduzir áudio:', audioError);
                  console.log('⚠️ Áudio bloqueado pelo navegador');
                  setAudioBlocked(true);
                  // Tentar novamente após interação do usuário
                }
              } else {
                console.warn('⚠️ Audio track não disponível após subscribe');
              }
            }
          } catch (subscribeError: any) {
            console.error('❌ Erro ao fazer subscribe manual:', subscribeError);
            // Continuar com outros usuários mesmo se houver erro
          }
        }
      } else {
        console.log('⏳ Nenhum usuário no canal ainda, aguardando broadcaster...');
        console.log('   O broadcaster precisa publicar os tracks para aparecer aqui');
        setIsConnecting(true);
      }
      
      cleanupCalledRef.current = false; // Reset para permitir cleanup futuro
      
      // Verificar periodicamente se há tracks já disponíveis (verificação mais frequente para resposta rápida)
      checkTracksIntervalRef.current = setInterval(async () => {
        if (!clientRef.current || isCleaningUpRef.current) {
          if (checkTracksIntervalRef.current) {
            clearInterval(checkTracksIntervalRef.current);
            checkTracksIntervalRef.current = null;
          }
          return;
        }
        
        const currentUsers = clientRef.current.remoteUsers;
        
        // Verificar se já há vídeo renderizado antes de tentar reproduzir
        const hasRenderedVideo = remoteVideoRef.current?.querySelector('video') as HTMLVideoElement;
        if (hasRenderedVideo && (hasRenderedVideo.videoWidth > 0 || hasRenderedVideo.offsetWidth > 0 || !hasRenderedVideo.paused)) {
          // Já há vídeo renderizado, apenas atualizar estado se necessário
          if (!hasRemoteVideo) {
            console.log('✅ Vídeo já renderizado, atualizando estado...');
            setHasRemoteVideo(true);
            setIsConnecting(false);
            if (checkTracksIntervalRef.current) {
              clearInterval(checkTracksIntervalRef.current);
              checkTracksIntervalRef.current = null;
            }
          }
          return; // Não tentar reproduzir novamente
        }
        
        // Se não há usuários em remoteUsers mas o broadcaster está online, tentar verificar novamente
        // Isso pode acontecer se o broadcaster entrou antes do viewer ou se o evento user-published não foi disparado
        if (currentUsers.length === 0 && clientRef.current.connectionState === 'CONNECTED') {
          // Verificar se há usuários que ainda não aparecem em remoteUsers mas estão online
          // Tentar fazer subscribe manualmente se detectar que há broadcaster online
          return;
        }
        
        if (currentUsers.length > 0 && !hasRemoteVideo) {
          console.log('🔍 Verificando tracks disponíveis:', currentUsers.length);
          for (const user of currentUsers) {
            // Validar user antes de processar
            if (!user || typeof user !== 'object' || !user.uid) {
              continue;
            }
            
            // Se já tem track de vídeo disponível (já foi feito subscribe pelo evento), apenas reproduzir
            if (user.videoTrack && remoteVideoRef.current && !hasRemoteVideo) {
              // Verificar se já há um vídeo sendo reproduzido
              const existingVideo = document.getElementById(`remote-video-${user.uid}`);
              if (existingVideo && existingVideo.querySelector('video')) {
                const existingVideoElement = existingVideo.querySelector('video') as HTMLVideoElement;
                if (existingVideoElement && (existingVideoElement.videoWidth > 0 || existingVideoElement.offsetWidth > 0 || !existingVideoElement.paused)) {
                  console.log('✅ Vídeo já está sendo reproduzido, apenas atualizando estado...');
                  setHasRemoteVideo(true);
                  setIsConnecting(false);
                  if (checkTracksIntervalRef.current) {
                    clearInterval(checkTracksIntervalRef.current);
                    checkTracksIntervalRef.current = null;
                  }
                  return;
                }
              }
              
              // Verificar se o track já está sendo reproduzido
              if (user.videoTrack.isPlaying) {
                console.log('✅ Vídeo track já está sendo reproduzido, apenas aplicando estilos...');
                setHasRemoteVideo(true);
                setIsConnecting(false);
                if (checkTracksIntervalRef.current) {
                  clearInterval(checkTracksIntervalRef.current);
                  checkTracksIntervalRef.current = null;
                }
                return;
              }
              
              console.log('📹 Vídeo track já disponível, reproduzindo...');
              
              // NUNCA limpar se já há vídeo sendo reproduzido
              const existingVideoInRef = remoteVideoRef.current.querySelector('video') as HTMLVideoElement;
              if (!existingVideoInRef || existingVideoInRef.videoWidth === 0) {
                safeClearElement(remoteVideoRef.current);
              }
              
              const videoContainer = document.createElement('div');
              videoContainer.id = `remote-video-${user.uid}`;
              videoContainer.className = 'w-full h-full';
              videoContainer.style.width = '100%';
              videoContainer.style.height = '100%';
              videoContainer.style.position = 'relative';
              videoContainer.style.overflow = 'hidden';
              videoContainer.style.backgroundColor = '#000';
              remoteVideoRef.current.appendChild(videoContainer);
              
              const playResult = user.videoTrack.play(videoContainer);
              
              // Função para aplicar estilos
              const applyStylesToVideo = () => {
                const videoElement = videoContainer.querySelector('video') as HTMLVideoElement;
                if (videoElement) {
                  videoElement.style.width = '100%';
                  videoElement.style.height = '100%';
                  videoElement.style.objectFit = 'cover';
                  videoElement.style.position = 'absolute';
                  videoElement.style.top = '0';
                  videoElement.style.left = '0';
                  videoElement.style.zIndex = '15';
                  videoElement.style.backgroundColor = '#000';
                  videoElement.style.display = 'block';
                  videoElement.style.visibility = 'visible';
                  videoElement.style.opacity = '1';
                  
                  // Container se adapta ao tamanho disponível
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.style.height = '100%';
                  }
                  if (videoContainer) {
                    videoContainer.style.height = '100%';
                  }
                  
                  return true;
                }
                return false;
              };
              
              // Marcar como tendo vídeo IMEDIATAMENTE após chamar play()
              setHasRemoteVideo(true);
              setIsConnecting(false);
              
              // Aplicar estilos imediatamente também
              setTimeout(() => {
                applyStylesToVideo();
              }, 50);
              
              // Verificar se play() retorna uma Promise
              if (playResult && typeof playResult.then === 'function') {
                playResult.then(() => {
                  setTimeout(() => {
                    if (applyStylesToVideo()) {
                      console.log('✅ Vídeo conectado via verificação periódica');
                      toast.success('Vídeo conectado!');
                      if (checkTracksIntervalRef.current) {
                        clearInterval(checkTracksIntervalRef.current);
                        checkTracksIntervalRef.current = null;
                      }
                    } else {
                      // Aplicar estilos mesmo se não encontrou imediatamente
                      setTimeout(() => {
                        if (applyStylesToVideo()) {
                          console.log('✅ Estilos aplicados após delay');
                        }
                      }, 500);
                    }
                  }, 200);
                }).catch((e: any) => {
                  console.error('Erro ao reproduzir:', e);
                  // Mesmo com erro, manter hasRemoteVideo como true se o vídeo existe
                  const videoElement = videoContainer.querySelector('video') as HTMLVideoElement;
                  if (videoElement) {
                    applyStylesToVideo();
                  }
                });
              } else {
                // Se não retornou Promise, aplicar estilos diretamente
                setTimeout(() => {
                  if (applyStylesToVideo()) {
                    console.log('✅ Vídeo conectado via verificação periódica (sem Promise)');
                    toast.success('Vídeo conectado!');
                    if (checkTracksIntervalRef.current) {
                      clearInterval(checkTracksIntervalRef.current);
                      checkTracksIntervalRef.current = null;
                    }
                  } else {
                    // Tentar novamente após mais tempo
                    setTimeout(() => {
                      if (applyStylesToVideo()) {
                        console.log('✅ Estilos aplicados após delay');
                        toast.success('Vídeo conectado!');
                      }
                    }, 500);
                  }
                }, 200);
              }
              break; // Sair do loop se encontrou e reproduziu
            }
          }
        }
      }, 500); // Verificar a cada 500ms para resposta mais rápida
      
      // Limpar intervalo após 60 segundos
      setTimeout(() => {
        if (checkTracksIntervalRef.current) {
          clearInterval(checkTracksIntervalRef.current);
          checkTracksIntervalRef.current = null;
        }
      }, 60000);
      
      toast.success('Conectado! Aguardando transmissor...');
    } catch (error: any) {
      console.error('Erro ao conectar à transmissão:', error);
      isJoiningRef.current = false;
      
      // Se foi cancelado (OPERATION_ABORTED ou WS_ABORT), não mostrar erro
      if (error.name === 'AgoraRTCException' && (error.code === 'OPERATION_ABORTED' || error.code === 'WS_ABORT')) {
        console.log('Join foi cancelado (provavelmente mudança de canal ou cleanup)');
        return;
      }
      
      // Ignorar erros de WS_ABORT durante cleanup
      if (error.code === 'WS_ABORT' || error.message?.includes('LEAVE')) {
        console.debug('Erro WS_ABORT durante cleanup (normal)');
        return;
      }
      
      // Erro específico de gateway - precisa de token ou configuração diferente
      if (error.code === 'CAN_NOT_GET_GATEWAY_SERVER' || error.message?.includes('dynamic use static key') || error.message?.includes('invalid vendor key')) {
        console.error('❌ Erro de gateway do Agora.io');
        console.error('📋 Mensagem:', error.message);
        console.error('📋 SOLUÇÕES:');
        
        if (error.message?.includes('invalid vendor key') || error.message?.includes('can not find appid')) {
          console.error('   1. Verifique se o App ID está correto no .env');
          console.error('   2. Verifique se o token foi gerado para o mesmo App ID');
          console.error('   3. Reinicie o servidor após alterar o .env (npm run dev)');
          console.error('   4. App ID atual:', APP_ID);
          
          toast.error(
            '⚠️ App ID inválido ou não encontrado. Verifique se está correto no .env e reinicie o servidor.',
            { duration: 10000 }
          );
        } else {
          console.error('   1. Gere um token temporário em: https://console.agora.io/');
          console.error('   2. Ou configure o projeto para usar "App ID Only" nas configurações');
          console.error('   3. Veja o guia completo em: RESOLVER_ERRO_GATEWAY_AGORA.md');
          
          toast.error(
            '⚠️ Erro: Projeto Agora.io requer TOKEN. Acesse console.agora.io para gerar token ou configurar "App ID Only". Veja RESOLVER_ERRO_GATEWAY_AGORA.md',
            { duration: 10000 }
          );
        }
        return;
      }
      
      toast.error(`Erro ao conectar: ${error.message || 'Tente novamente'}`);
      setIsConnecting(false);
      isInitializedRef.current = false;
      cleanupCalledRef.current = false;
      await cleanup();
    }
  };

  // Configurar event listeners (deve ser chamado ANTES de entrar no canal)
  const setupEventListeners = (client: any) => {
    // Listener para mudanças no estado da conexão
    client.on('connection-state-change', (curState: string, revState: string) => {
      console.log('🔌 Mudança no estado da conexão:', {
        anterior: revState,
        atual: curState
      });
      
      if (curState === 'CONNECTED') {
        console.log('✅ Conexão estabelecida!');
      } else if (curState === 'DISCONNECTED') {
        console.warn('⚠️ Conexão desconectada');
      } else if (curState === 'CONNECTING') {
        console.log('🔄 Conectando...');
      }
    });
    
    // Listener para verificar quando usuários entram no canal
    client.on('user-joined', (user: any) => {
      console.log('👤 User joined:', user.uid);
      console.log('   Total remote users:', client.remoteUsers.length);
      console.log('   Connection state:', client.connectionState);
    });
    
    // Listener para quando usuário fica online (pode estar online mas ainda não publicou)
    client.on('user-online', async (user: any) => {
      console.log('🌐 User online:', user.uid);
      console.log('   Total remote users:', client.remoteUsers.length);
      console.log('   hasVideo:', user.hasVideo, 'hasAudio:', user.hasAudio);
      
      // Se o usuário já tem tracks publicados, fazer subscribe imediatamente
      // MAS apenas se a conexão estiver estabelecida
      if (user.hasVideo || user.hasAudio) {
        // Verificar se a conexão está estabelecida antes de tentar subscribe
        if (client.connectionState !== 'CONNECTED') {
          console.warn('⚠️ Usuário online mas conexão não estabelecida ainda. Estado:', client.connectionState);
          console.warn('   Aguardando conexão antes de fazer subscribe...');
          
          // Aguardar até a conexão estar estabelecida (máximo 10 segundos)
          let waitCount = 0;
          while (client.connectionState !== 'CONNECTED' && waitCount < 20) {
            await new Promise(resolve => setTimeout(resolve, 500));
            waitCount++;
            if (isCleaningUpRef.current) {
              console.log('⚠️ Cleanup foi chamado durante espera, cancelando...');
              return;
            }
          }
          
          if (client.connectionState !== 'CONNECTED') {
            console.error('❌ Conexão não estabelecida após aguardar. Cancelando subscribe para user-online');
            return;
          }
        }
        
        console.log('📡 Usuário online já tem tracks, fazendo subscribe IMEDIATAMENTE...');
        try {
          if (user.hasVideo) {
            await client.subscribe(user, 'video');
            console.log('✅ Subscribed to video for online user:', user.uid);
            // Aguardar apenas 100ms e tentar reproduzir imediatamente
            setTimeout(async () => {
              if (user.videoTrack && remoteVideoRef.current) {
                try {
                  console.log('🎬 Tentando reproduzir vídeo imediatamente após subscribe...');
                  
                  // Verificar se já há vídeo antes de limpar
                  const existingVideo = remoteVideoRef.current.querySelector('video') as HTMLVideoElement;
                  if (!existingVideo || existingVideo.videoWidth === 0) {
                    safeClearElement(remoteVideoRef.current);
                  }
                  
                  const videoContainer = document.createElement('div');
                  videoContainer.id = `remote-video-${user.uid}`;
                  videoContainer.className = 'w-full h-full';
                  videoContainer.style.width = '100%';
                  videoContainer.style.height = '100%';
                  videoContainer.style.position = 'relative';
                  videoContainer.style.overflow = 'hidden';
                  videoContainer.style.backgroundColor = '#000';
                  remoteVideoRef.current.appendChild(videoContainer);
                  
                  await user.videoTrack.play(videoContainer);
                  
                  // Marcar como visível IMEDIATAMENTE
                  setHasRemoteVideo(true);
                  setIsConnecting(false);
                  
                  // Garantir que o vídeo está visível
                  setTimeout(() => {
                    const videoElement = videoContainer.querySelector('video') as HTMLVideoElement;
                    if (videoElement) {
                      videoElement.style.display = 'block';
                      videoElement.style.visibility = 'visible';
                      videoElement.style.opacity = '1';
                      videoElement.style.zIndex = '20';
                      videoElement.style.width = '100%';
                      videoElement.style.height = '100%';
                      videoElement.style.objectFit = 'cover';
                      videoElement.style.position = 'absolute';
                      videoElement.style.top = '0';
                      videoElement.style.left = '0';
                      videoElement.style.backgroundColor = '#000';
                    }
                  }, 100);
                  
                  console.log('✅ Vídeo reproduzido imediatamente após user-online!');
                } catch (e) {
                  console.warn('⚠️ Erro ao reproduzir vídeo imediatamente:', e);
                }
              }
            }, 100);
          }
          if (user.hasAudio) {
            await client.subscribe(user, 'audio');
            console.log('✅ Subscribed to audio for online user:', user.uid);
            // Reproduzir áudio imediatamente
            setTimeout(() => {
              if (user.audioTrack) {
                try {
                  user.audioTrack.play();
                  setAudioBlocked(false);
                } catch (e) {
                  console.warn('⚠️ Erro ao reproduzir áudio:', e);
                  setAudioBlocked(true);
                }
              }
            }, 100);
          }
        } catch (e: any) {
          console.warn('⚠️ Erro ao fazer subscribe para user-online:', e);
        }
      } else {
        console.log('⏳ Usuário online mas ainda não publicou tracks, aguardando user-published...');
      }
    });
    
    // Listener para verificar quando usuários saem do canal
    client.on('user-left', (user: any) => {
      console.log('👋 User left:', user.uid);
      console.log('   Total remote users:', client.remoteUsers.length);
    });
    
    // Escutar quando um stream remoto é publicado
    client.on('user-published', async (user: any, mediaType: string) => {
      try {
        // Validar user antes de processar
        if (!user || typeof user !== 'object' || !user.uid) {
          console.error('❌ User inválido no evento user-published');
          return;
        }
        
        console.log('📡 User published:', user.uid, 'MediaType:', mediaType);
        console.log('👤 User details:', {
          hasVideo: user.hasVideo,
          hasAudio: user.hasAudio,
          videoTrack: !!user.videoTrack,
          audioTrack: !!user.audioTrack,
          uid: user.uid
        });
        
        // Subscribe imediatamente (sem delay desnecessário)
        try {
          await client.subscribe(user, mediaType);
          console.log('✅ Subscribed to user:', user.uid, 'MediaType:', mediaType);
          
          // Aguardar apenas 100ms para o track estar disponível (reduzido de 300ms)
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (subscribeError: any) {
          console.error('❌ Erro ao fazer subscribe no evento:', subscribeError);
          
          // Se o erro for sobre conexão não estabelecida, aguardar mais
          if (subscribeError.message?.includes('disconnected') || 
              subscribeError.message?.includes('not joined') ||
              subscribeError.code === 'INVALID_OPERATION') {
            console.warn('⚠️ Conexão ainda não estabelecida, aguardando...');
            
            // Verificar estado da conexão e aguardar até estar CONNECTED
            let waitCount = 0;
            const maxWaitAttempts = 20; // 20 * 500ms = 10 segundos máximo
            while (client.connectionState !== 'CONNECTED' && waitCount < maxWaitAttempts) {
              await new Promise(resolve => setTimeout(resolve, 500));
              waitCount++;
              console.log(`   Aguardando conexão... (${waitCount}/${maxWaitAttempts}) Estado: ${client.connectionState}`);
              
              // Se cleanup foi chamado, cancelar
              if (isCleaningUpRef.current) {
                console.log('⚠️ Cleanup foi chamado durante espera de conexão, cancelando subscribe...');
                return;
              }
            }
            
            // Verificar se a conexão está estabelecida antes de tentar subscribe novamente
            if (client.connectionState !== 'CONNECTED') {
              console.error('❌ Conexão não estabelecida após aguardar. Estado:', client.connectionState);
              console.error('   Cancelando subscribe - o join pode ter falhado');
              return;
            }
            
            // Tentar subscribe novamente agora que a conexão está estabelecida
            try {
              await client.subscribe(user, mediaType);
              console.log('✅ Subscribe bem-sucedido após aguardar conexão');
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (retryError: any) {
              console.error('❌ Erro na segunda tentativa de subscribe:', retryError);
              // Se ainda é "not joined", não tentar mais
              if (retryError.message?.includes('not joined') || retryError.code === 'INVALID_OPERATION') {
                console.error('   Cliente não está no canal, cancelando subscribe');
              }
              return;
            }
          } else if (subscribeError.message?.includes("Cannot use 'in' operator")) {
            console.warn('⚠️ User object pode estar incompleto, tentando novamente...');
            await new Promise(resolve => setTimeout(resolve, 300)); // Reduzido de 500ms
            try {
              await client.subscribe(user, mediaType);
              console.log('✅ Subscribe bem-sucedido na segunda tentativa');
              await new Promise(resolve => setTimeout(resolve, 100)); // Reduzido de 300ms
            } catch (retryError) {
              console.error('❌ Erro na segunda tentativa de subscribe:', retryError);
              return;
            }
          } else {
            throw subscribeError;
          }
        }

        if (mediaType === 'video' && remoteVideoRef.current) {
          console.log('🎬 Processando vídeo remoto...');
          
          // Verificar se já há vídeo sendo reproduzido antes de limpar
          const existingVideo = remoteVideoRef.current.querySelector('video') as HTMLVideoElement;
          const shouldClear = !existingVideo || 
                             (existingVideo.videoWidth === 0 && 
                              existingVideo.offsetWidth === 0 && 
                              existingVideo.paused &&
                              existingVideo.readyState < 2);
          
          // Apenas limpar se não há vídeo ativo sendo reproduzido
          if (shouldClear) {
            console.log('🔄 Limpando vídeo anterior para aplicar novo track...');
            safeClearElement(remoteVideoRef.current);
          } else {
            console.log('⚠️ Vídeo já está sendo reproduzido, mantendo e aplicando novo track...');
          }
          
          // Aguardar apenas 100ms para o track estar disponível (reduzido de 300ms)
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Criar um elemento div para o vídeo
          const videoContainer = document.createElement('div');
          videoContainer.id = `remote-video-${user.uid}`;
          videoContainer.className = 'w-full h-full';
          videoContainer.style.width = '100%';
          videoContainer.style.height = '100%';
          videoContainer.style.position = 'relative';
          videoContainer.style.overflow = 'hidden';
          videoContainer.style.backgroundColor = '#000';
          remoteVideoRef.current.appendChild(videoContainer);
          
          // Reproduzir vídeo remoto
          if (user.videoTrack) {
            console.log('▶️ Reproduzindo vídeo track...');
            
            // Marcar como tendo vídeo IMEDIATAMENTE antes de chamar play()
            // Isso garante que o overlay não apareça enquanto o vídeo está sendo renderizado
            setHasRemoteVideo(true);
            setIsConnecting(false);
            
            // Verificar se o track já está sendo reproduzido
            if (user.videoTrack.isPlaying) {
              console.log('✅ Vídeo track já está sendo reproduzido, apenas aplicando estilos...');
              // Apenas aplicar estilos se já está reproduzindo
            } else {
              try {
                await user.videoTrack.play(videoContainer);
                console.log('✅ play() chamado com sucesso');
                
                // Aguardar o elemento de vídeo ser criado
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Aplicar correções de iOS/Safari se necessário
                const videoElement = videoContainer.querySelector('video') as HTMLVideoElement;
                if (videoElement) {
                  // Aplicar correções de iOS
                  const cleanupIOSFix = setupIOSPlaybackFix(videoElement);
                  
                  // Listener para loadedmetadata (garantir que o vídeo carregou)
                  const handleLoadedMetadata = () => {
                    console.log('📏 Resolução detectada:', videoElement.videoWidth, 'x', videoElement.videoHeight);
                    
                    // Forçar play caso o navegador não tenha iniciado automaticamente
                    if (videoElement.paused) {
                      videoElement.play().catch((err) => {
                        console.warn('Erro ao forçar play após metadata:', err);
                      });
                    }
                  };
                  
                  videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
                  
                  // Se já tem metadata, chamar imediatamente
                  if (videoElement.readyState >= 1) {
                    handleLoadedMetadata();
                  }
                  
                  // Cleanup quando o componente desmontar
                  const originalCleanup = cleanupIOSFix;
                  // Armazenar cleanup para usar depois se necessário
                  (videoElement as any)._iosCleanup = originalCleanup;
                }
              } catch (playError: any) {
                console.error('❌ Erro ao chamar play():', playError);
                // Mesmo com erro, tentar continuar
              }
            }
            
            // Aplicar estilos ao vídeo após ser criado
            const applyStyles = () => {
              const videoElement = videoContainer.querySelector('video') as HTMLVideoElement;
              if (videoElement) {
                videoElement.style.width = '100%';
                videoElement.style.height = '100%';
                videoElement.style.objectFit = 'cover';
                videoElement.style.position = 'absolute';
                videoElement.style.top = '0';
                videoElement.style.left = '0';
                videoElement.style.right = '0';
                videoElement.style.bottom = '0';
                videoElement.style.zIndex = '20'; // Muito acima do overlay (z-[5])
                videoElement.style.backgroundColor = '#000';
                videoElement.style.display = 'block';
                videoElement.style.visibility = 'visible';
                videoElement.style.opacity = '1';
                videoElement.style.margin = '0';
                videoElement.style.padding = '0';
                
                // Container se adapta ao tamanho disponível
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.style.height = '100%';
                  remoteVideoRef.current.style.display = 'block';
                  remoteVideoRef.current.style.visibility = 'visible';
                }
                if (videoContainer) {
                  videoContainer.style.height = '100%';
                  videoContainer.style.display = 'block';
                  videoContainer.style.visibility = 'visible';
                }
                
                console.log('✅ Estilos aplicados ao vídeo remoto:', {
                  videoWidth: videoElement.videoWidth,
                  videoHeight: videoElement.videoHeight,
                  clientWidth: videoElement.clientWidth,
                  clientHeight: videoElement.clientHeight,
                  offsetWidth: videoElement.offsetWidth,
                  offsetHeight: videoElement.offsetHeight,
                  containerHeight: remoteVideoRef.current?.offsetHeight,
                  videoContainerHeight: videoContainer.offsetHeight,
                  zIndex: videoElement.style.zIndex,
                  display: videoElement.style.display,
                  visibility: videoElement.style.visibility,
                  opacity: videoElement.style.opacity
                });
                return true;
              }
              return false;
            };
            
            // Tentar aplicar estilos imediatamente e depois periodicamente
            // Aplicar estilos imediatamente
            if (!applyStyles()) {
              // Se não encontrou, tentar após um pequeno delay
              // Nota: É normal o elemento demorar um pouco para ser criado pelo Agora SDK
              setTimeout(() => {
                if (applyStyles()) {
                  console.log('✅ Estilos aplicados após delay inicial');
                } else {
                  console.debug('🔄 Elemento de vídeo ainda não criado pelo SDK (normal, aguardando...)');
                }
              }, 100);
              
              // Tentar novamente após mais tempo
              setTimeout(() => {
                if (applyStyles()) {
                  console.log('✅ Vídeo encontrado e estilizado após 500ms');
                }
              }, 500);
              
              // Última tentativa
              setTimeout(() => {
                if (applyStyles()) {
                  console.log('✅ Vídeo encontrado e estilizado após 1s');
                } else {
                  // Verificar se o vídeo foi encontrado em outro lugar (pode ter sido criado pelo SDK)
                  const videoInRef = remoteVideoRef.current?.querySelector('video') as HTMLVideoElement;
                  if (videoInRef && (videoInRef.videoWidth > 0 || videoInRef.offsetWidth > 0)) {
                    console.debug('ℹ️ Vídeo encontrado em outro local, aplicando estilos...');
                    applyStyles();
                  } else {
                    console.debug('🔄 Elemento de vídeo ainda não disponível (o SDK pode criar mais tarde)');
                  }
                }
              }, 1000);
            }
            
            // Verificar se o vídeo foi renderizado e mostrar toast
            setTimeout(() => {
              const videoElement = videoContainer.querySelector('video') as HTMLVideoElement;
              if (videoElement) {
                console.log('✅ Video track playing - vídeo encontrado', {
                  videoWidth: videoElement.videoWidth,
                  offsetWidth: videoElement.offsetWidth,
                  paused: videoElement.paused,
                  readyState: videoElement.readyState,
                  hasSrcObject: videoElement.srcObject !== null,
                  display: videoElement.style.display,
                  visibility: videoElement.style.visibility,
                  opacity: videoElement.style.opacity,
                  zIndex: videoElement.style.zIndex
                });
                
                // Se tem dimensões válidas, mostrar toast
                if (videoElement.videoWidth > 0 || videoElement.offsetWidth > 0) {
                  toast.success('Vídeo conectado!');
                } else {
                  // Aguardar um pouco mais e verificar novamente
                  setTimeout(() => {
                    const retryVideoElement = videoContainer.querySelector('video') as HTMLVideoElement;
                    if (retryVideoElement && (retryVideoElement.videoWidth > 0 || retryVideoElement.offsetWidth > 0)) {
                      toast.success('Vídeo conectado!');
                    }
                  }, 1000);
                }
              } else {
                // É normal o elemento demorar um pouco para ser criado pelo Agora SDK
                console.debug('🔄 Elemento de vídeo ainda não criado após play() (normal, aguardando SDK...)');
                // Tentar novamente após mais tempo
                setTimeout(() => {
                  const retryVideoElement = videoContainer.querySelector('video') as HTMLVideoElement;
                  if (retryVideoElement) {
                    console.log('✅ Video track marcado como visível após retry');
                    retryVideoElement.style.display = 'block';
                    retryVideoElement.style.visibility = 'visible';
                    retryVideoElement.style.opacity = '1';
                    retryVideoElement.style.zIndex = '20';
                    toast.success('Vídeo conectado!');
                  }
                }, 500);
              }
            }, 100); // Reduzido para resposta mais rápida
          } else {
            console.warn('⚠️ user.videoTrack não disponível após subscribe');
            // Se não há track, manter hasRemoteVideo como false para mostrar overlay
            setHasRemoteVideo(false);
          }
        }

        if (mediaType === 'audio' && user.audioTrack) {
          // Reproduzir áudio remoto
          try {
            const playResult = user.audioTrack.play();
            if (playResult && typeof playResult.then === 'function') {
              playResult.then(() => {
                console.log('✅ Audio track playing');
                setAudioBlocked(false);
              }).catch((audioError: any) => {
                console.error('❌ Erro ao reproduzir áudio:', audioError);
                console.log('⚠️ Áudio bloqueado pelo navegador');
                setAudioBlocked(true);
                // O SDK do Agora retoma automaticamente quando o usuário interage
              });
            } else {
              console.log('✅ Audio track playing (sem Promise)');
              setAudioBlocked(false);
            }
          } catch (audioError: any) {
            console.error('❌ Erro ao reproduzir áudio:', audioError);
            console.log('⚠️ Áudio bloqueado pelo navegador');
            setAudioBlocked(true);
          }
        }
      } catch (error) {
        console.error('❌ Erro ao fazer subscribe:', error);
        toast.error('Erro ao conectar ao vídeo');
      }
    });

    // Escutar quando um stream remoto é removido (mudança de tela/câmera do admin)
    client.on('user-unpublished', async (user: any, mediaType: string) => {
      try {
        console.log('📡 User unpublished:', user?.uid, 'MediaType:', mediaType);
        
        // Quando o admin troca de tela/câmera, o track antigo é removido
        // Limpar o vídeo para que o novo track seja renderizado corretamente
        if (mediaType === 'video' && remoteVideoRef.current) {
          console.log('🔄 Admin trocou de tela/câmera, limpando vídeo anterior...');
          // Limpar vídeo anterior para que o novo track seja renderizado
          safeClearElement(remoteVideoRef.current);
          setHasRemoteVideo(false);
          setIsConnecting(true);
        }
        
        if (user?.videoTrack) {
          user.videoTrack.stop();
          // Remover elemento de vídeo
          const videoElement = document.getElementById(`remote-video-${user.uid}`);
          if (videoElement) {
            videoElement.remove();
          }
        }
        if (user?.audioTrack) {
          user.audioTrack.stop();
        }
      } catch (error) {
        console.error('Erro ao parar stream remoto:', error);
      }
    });

    // Escutar erros do cliente
    client.on('exception', (event: any) => {
      // Filtrar avisos não críticos que não precisam ser tratados como erros
      const nonCriticalCodes = [
        2001, // AUDIO_INPUT_LEVEL_TOO_LOW
        4001, // AUDIO_INPUT_LEVEL_TOO_LOW_RECOVER
        2002, // AUDIO_OUTPUT_LEVEL_TOO_LOW
        4002, // AUDIO_OUTPUT_LEVEL_TOO_LOW_RECOVER
        1005, // RECV_VIDEO_DECODE_FAILED - erro temporário de decodificação, geralmente se recupera
        3005, // RECV_VIDEO_DECODE_FAILED_RECOVER - recuperação do erro de decodificação
      ];
      
      // Filtrar erros de WS_ABORT durante cleanup (normais e esperados)
      // Esses erros acontecem quando o componente é desmontado ou quando há cleanup simultâneo
      if (
        event.code === 'WS_ABORT' || 
        event.msg?.includes('WS_ABORT') || 
        event.msg?.includes('LEAVE') ||
        event.message?.includes('WS_ABORT') ||
        event.message?.includes('LEAVE') ||
        (event.msg && typeof event.msg === 'string' && event.msg.includes('LEAVE'))
      ) {
        // Apenas logar como debug, não como erro
        console.debug('Aviso do Agora SDK (não crítico - cleanup):', event.msg || event.message, 'code:', event.code);
        return; // Não tratar como erro
      }
      
      if (nonCriticalCodes.includes(event.code)) {
        // Apenas logar como debug, não como erro
        console.debug('Aviso do Agora SDK (não crítico):', event.msg || event.message, 'code:', event.code);
        return; // Não tratar como erro
      }
      
      // Verificar se estamos em processo de cleanup
      if (cleanupCalledRef.current) {
        // Durante cleanup, muitos erros são esperados e não devem ser mostrados
        console.debug('Erro durante cleanup (ignorado):', event.msg || event.message, 'code:', event.code);
        return;
      }
      
      // Para outros erros, logar normalmente
      console.error('Erro do Agora SDK:', event);
      toast.error('Erro na transmissão. Tente novamente.');
    });
  };

  const toggleMute = async () => {
    try {
      if (localAudioTrackRef.current) {
        const newMutedState = !isMuted;
        // setEnabled(true) = microfone ligado, setEnabled(false) = microfone desligado
        await localAudioTrackRef.current.setEnabled(!newMutedState);
        setIsMuted(newMutedState);
        console.log('🎤 Microfone:', newMutedState ? 'DESLIGADO' : 'LIGADO');
        toast.success(newMutedState ? '🔇 Microfone desligado' : '🎤 Microfone ligado');
      } else {
        console.warn('localAudioTrackRef.current não está disponível');
      }
    } catch (error) {
      console.error('Erro ao alternar microfone:', error);
      toast.error('Erro ao alternar microfone');
    }
  };

  const toggleVideo = async () => {
    try {
      // Encontrar o track de vídeo publicado (pode ser câmera ou screen sharing)
      const publishedVideoTrack = clientRef.current?.localTracks.find(
        (track: any) => track.isVideo
      ) as any;
      
      if (publishedVideoTrack) {
        const newVideoOffState = !isVideoOff;
        // setEnabled(true) = vídeo ligado, setEnabled(false) = vídeo desligado
        await publishedVideoTrack.setEnabled(!newVideoOffState);
        setIsVideoOff(newVideoOffState);
        console.log('📹 Vídeo:', newVideoOffState ? 'DESLIGADO' : 'LIGADO');
        toast.success(newVideoOffState ? '📹 Vídeo desligado' : '📹 Vídeo ligado');
      } else if (cameraVideoTrackRef.current && !showScreenShare) {
        // Se não há track publicado mas há câmera criada (não publicada), usar ela
        const newVideoOffState = !isVideoOff;
        await cameraVideoTrackRef.current.setEnabled(!newVideoOffState);
        setIsVideoOff(newVideoOffState);
        console.log('📹 Câmera:', newVideoOffState ? 'DESLIGADA' : 'LIGADA');
        toast.success(newVideoOffState ? '📹 Câmera desligada' : '📹 Câmera ligada');
      } else {
        console.warn('Nenhum track de vídeo disponível para alternar');
        toast.error('Nenhum vídeo ativo para alternar');
      }
    } catch (error) {
      console.error('Erro ao alternar vídeo:', error);
      toast.error('Erro ao alternar vídeo');
    }
  };

  // Funções de gravação
  const startRecording = async () => {
    if (!isBroadcaster || !isStreaming) {
      toast.error('Você precisa estar transmitindo para gravar');
      return;
    }

    try {
      // Obter os tracks atuais
      const videoTrack = screenVideoTrackRef.current || cameraVideoTrackRef.current || localVideoTrackRef.current;
      const audioTrack = localAudioTrackRef.current;

      if (!videoTrack || !audioTrack) {
        toast.error('Não foi possível acessar os tracks de vídeo/áudio');
        return;
      }

      // Obter MediaStreamTrack dos tracks do Agora
      // O Agora SDK expõe os tracks através do método getMediaStreamTrack()
      let videoStreamTrack: MediaStreamTrack | null = null;
      let audioStreamTrack: MediaStreamTrack | null = null;

      try {
        // Tentar obter o track de vídeo - o Agora SDK tem o método getMediaStreamTrack()
        if (videoTrack && typeof videoTrack.getMediaStreamTrack === 'function') {
          videoStreamTrack = videoTrack.getMediaStreamTrack();
          console.log('✅ Track de vídeo obtido via getMediaStreamTrack()');
        } else {
          // Fallback: capturar do elemento de vídeo renderizado
          const videoElement = localVideoRef.current?.querySelector('video') as HTMLVideoElement;
          if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            videoStreamTrack = stream.getVideoTracks()[0];
            console.log('✅ Track de vídeo obtido do elemento de vídeo');
          } else {
            console.warn('⚠️ Não foi possível obter track de vídeo');
          }
        }

        // Tentar obter o track de áudio
        if (audioTrack && typeof audioTrack.getMediaStreamTrack === 'function') {
          audioStreamTrack = audioTrack.getMediaStreamTrack();
          console.log('✅ Track de áudio obtido via getMediaStreamTrack()');
        } else {
          // Fallback: criar um novo track do microfone
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamTrack = micStream.getAudioTracks()[0];
            console.log('✅ Track de áudio obtido via getUserMedia');
          } catch (micError) {
            console.error('❌ Erro ao obter áudio:', micError);
          }
        }
      } catch (trackError) {
        console.error('❌ Erro ao obter tracks:', trackError);
        // Fallback final: capturar do elemento de vídeo
        const videoElement = localVideoRef.current?.querySelector('video') as HTMLVideoElement;
        if (videoElement && videoElement.srcObject) {
          const stream = videoElement.srcObject as MediaStream;
          videoStreamTrack = stream.getVideoTracks()[0];
        }
        // Para áudio, criar novo track
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStreamTrack = micStream.getAudioTracks()[0];
        } catch (micError) {
          console.error('❌ Erro ao obter áudio no fallback:', micError);
        }
      }

      if (!videoStreamTrack) {
        toast.error('Não foi possível obter o track de vídeo');
        return;
      }

      if (!audioStreamTrack) {
        toast.error('Não foi possível obter o track de áudio');
        return;
      }

      // Criar um MediaStream combinado
      const combinedStream = new MediaStream([videoStreamTrack, audioStreamTrack]);
      recordingStreamRef.current = combinedStream;

      // Verificar se MediaRecorder é suportado
      if (!MediaRecorder.isTypeSupported('video/webm')) {
        toast.error('Gravação não suportada neste navegador');
        return;
      }

      // Criar MediaRecorder
      const options: MediaRecorderOptions = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      };

      // Fallback para codec mais compatível
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/webm;codecs=vp8,opus';
      }

      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      // Event listeners
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `live-recording-${channelName}-${timestamp}.webm`;
        
        if (onRecordingReady) {
          onRecordingReady(blob, filename);
        } else {
          // Fallback: download direto
          downloadRecording(blob, filename);
        }

        // Limpar
        recordedChunksRef.current = [];
        if (recordingStreamRef.current) {
          recordingStreamRef.current.getTracks().forEach(track => track.stop());
          recordingStreamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('Erro na gravação:', event);
        toast.error('Erro ao gravar. Tente novamente.');
        setIsRecording(false);
        if (onRecordingStateChange) {
          onRecordingStateChange(false);
        }
      };

      // Iniciar gravação
      mediaRecorder.start(1000); // Coletar dados a cada 1 segundo
      setIsRecording(true);
      setRecordingTime(0);
      
      if (onRecordingStateChange) {
        onRecordingStateChange(true);
      }

      // Atualizar tempo de gravação
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('🔴 Gravação iniciada!');
    } catch (error: any) {
      console.error('Erro ao iniciar gravação:', error);
      toast.error(`Erro ao iniciar gravação: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) {
      return;
    }

    try {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      if (onRecordingStateChange) {
        onRecordingStateChange(false);
      }

      toast.success('⏹️ Gravação finalizada! Preparando download...');
    } catch (error: any) {
      console.error('Erro ao parar gravação:', error);
      toast.error(`Erro ao parar gravação: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const downloadRecording = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('✅ Download iniciado!');
  };

  // Expor funções de gravação via useEffect para o componente pai
  useEffect(() => {
    if (isBroadcaster && typeof window !== 'undefined' && isStreaming) {
      // Expor funções globalmente para o admin poder chamar
      (window as any).__videoStreamRecording = {
        start: startRecording,
        stop: stopRecording,
        isRecording: () => isRecording,
        recordingTime: () => recordingTime,
      };
      console.log('✅ API de gravação disponível');
    } else {
      // Remover API se não está transmitindo
      if (typeof window !== 'undefined' && (window as any).__videoStreamRecording) {
        delete (window as any).__videoStreamRecording;
        console.log('⏸️ API de gravação removida (não está transmitindo)');
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__videoStreamRecording;
      }
    };
  }, [isBroadcaster, isStreaming, isRecording, recordingTime]);

  const endStream = async () => {
    if (cleanupCalledRef.current) {
      return; // Já está sendo limpo
    }
    
    cleanupCalledRef.current = true;
    isInitializedRef.current = false;
    setIsStreaming(false);
    
    await cleanup();
    
    if (onEnd) onEnd();
    toast.success('Transmissão encerrada');
  };

  const cleanup = async () => {
    // Proteção: evitar múltiplas chamadas de cleanup
    if (cleanupCalledRef.current && isCleaningUpRef.current) {
      console.log('⏸️ Cleanup já está em andamento, ignorando...');
      return;
    }
    
    // Marcar que cleanup está em andamento
    isCleaningUpRef.current = true;
    cleanupCalledRef.current = true;
    
    // Limpar intervalo de verificação de tracks
    try {
      if (checkTracksIntervalRef.current) {
        clearInterval(checkTracksIntervalRef.current);
        checkTracksIntervalRef.current = null;
        console.log('✅ Intervalo de verificação de tracks limpo');
      }
    } catch (e) {
      console.warn('Erro ao limpar intervalo:', e);
    }
    
    // Evitar múltiplas chamadas de cleanup
    if (!clientRef.current && !localAudioTrackRef.current && !localVideoTrackRef.current && !screenVideoTrackRef.current) {
      console.log('⏸️ Não há recursos para limpar, finalizando cleanup...');
      isCleaningUpRef.current = false;
      return;
    }
    
    // Proteção: Se o viewer está conectado e há usuários remotos, não fazer cleanup
    try {
      if (!isBroadcaster && clientRef.current) {
        const remoteUsers = clientRef.current?.remoteUsers || [];
        const connectionState = clientRef.current?.connectionState;
        
        if (connectionState === 'CONNECTED' && remoteUsers.length > 0) {
          console.warn('⚠️ Tentativa de cleanup enquanto viewer está conectado com usuários remotos!');
          console.warn('   Remote users:', remoteUsers.length);
          console.warn('   Connection state:', connectionState);
          console.warn('   Ignorando cleanup para evitar desconexão prematura');
          isCleaningUpRef.current = false;
          cleanupCalledRef.current = false; // Permitir cleanup futuro
          return;
        }
      }
    } catch (e) {
      console.warn('Erro ao verificar estado do cliente:', e);
    }

    try {
      console.log('Cleaning up resources...');
      console.log('   isBroadcaster:', isBroadcaster);
      console.log('   isStreaming:', isStreaming);
      console.log('   hasClient:', !!clientRef.current);
      
      // Parar e remover tracks locais (seguindo a documentação oficial)
      if (localAudioTrackRef.current) {
        try {
          // Parar o track primeiro
          localAudioTrackRef.current.stop();
          // Fechar o track para liberar recursos
          localAudioTrackRef.current.close();
          console.log('✅ Audio track parado e fechado');
        } catch (e) {
          console.warn('Error stopping audio track:', e);
        }
        localAudioTrackRef.current = null;
      }

      if (localVideoTrackRef.current) {
        try {
          // Parar o track primeiro
          localVideoTrackRef.current.stop();
          // Fechar o track para liberar recursos
          localVideoTrackRef.current.close();
          console.log('✅ Video track parado e fechado');
        } catch (e) {
          console.warn('Error stopping video track:', e);
        }
        localVideoTrackRef.current = null;
      }
      
      // Limpar track combinado
      if (combinedVideoTrackRef.current) {
        try {
          const combinedTrack = combinedVideoTrackRef.current as any;
          if (combinedTrack._drawInterval) {
            clearInterval(combinedTrack._drawInterval);
          }
          if (combinedTrack._screenVideo && document.body.contains(combinedTrack._screenVideo)) {
            document.body.removeChild(combinedTrack._screenVideo);
          }
          if (combinedTrack._cameraVideo && document.body.contains(combinedTrack._cameraVideo)) {
            document.body.removeChild(combinedTrack._cameraVideo);
          }
          if (combinedTrack._canvas && document.body.contains(combinedTrack._canvas)) {
            document.body.removeChild(combinedTrack._canvas);
          }
          if (typeof combinedTrack.stop === 'function') {
            combinedTrack.stop();
          }
          if (typeof combinedTrack.close === 'function') {
            combinedTrack.close();
          }
          console.log('✅ Track combinado limpo');
        } catch (e) {
          console.warn('Error stopping combined track:', e);
        }
        combinedVideoTrackRef.current = null;
      }
      
      // Limpar screen sharing track
      if (screenVideoTrackRef.current) {
        try {
          // screenVideoTrackRef pode ser um array ou um track único
          const screenTrack = screenVideoTrackRef.current;
          if (Array.isArray(screenTrack)) {
            // Se é array, parar cada track
            for (const track of screenTrack) {
              if (track && typeof track.stop === 'function') {
                track.stop();
              }
              if (track && typeof track.close === 'function') {
                track.close();
              }
            }
          } else {
            // Se é um track único
            if (typeof screenTrack.stop === 'function') {
              screenTrack.stop();
            }
            if (typeof screenTrack.close === 'function') {
              screenTrack.close();
            }
          }
          console.log('✅ Screen sharing track parado e fechado');
        } catch (e) {
          console.warn('Error stopping screen track:', e);
        }
        screenVideoTrackRef.current = null;
      }
      
      // Limpar camera track
      if (cameraVideoTrackRef.current) {
        try {
          cameraVideoTrackRef.current.stop();
          cameraVideoTrackRef.current.close();
          console.log('✅ Camera track parado e fechado');
        } catch (e) {
          console.warn('Error stopping camera track:', e);
        }
        cameraVideoTrackRef.current = null;
      }
      
      // Limpar vídeo externo se existir
      if (externalVideoElementRef.current) {
        try {
          externalVideoElementRef.current.pause();
          externalVideoElementRef.current.src = '';
          if (document.body.contains(externalVideoElementRef.current)) {
            document.body.removeChild(externalVideoElementRef.current);
          }
          externalVideoElementRef.current = null;
          console.log('✅ Vídeo externo limpo');
        } catch (e) {
          console.warn('Error cleaning external video:', e);
        }
      }
      
      // Parar todos os MediaStreams que possam estar ativos
      try {
          // Obter todos os streams ativos e parar
        if (navigator.mediaDevices?.enumerateDevices) {
          await navigator.mediaDevices.enumerateDevices();
          // Isso não para os streams, mas podemos tentar parar via getTracks
        }
      } catch (e) {
        console.debug('Não foi possível enumerar dispositivos:', e);
      }

      // Remover event listeners antes de sair
      if (clientRef.current) {
        try {
          clientRef.current.removeAllListeners();
        } catch (e) {
          console.warn('Error removing listeners:', e);
        }
      }

      // Sair do canal e desconectar cliente
      if (clientRef.current) {
        try {
          // Verificar se ainda está conectando antes de sair
          if (isJoiningRef.current) {
            console.log('⚠️ Ainda está conectando, aguardando join completar ou falhar...');
            // Aguardar mais tempo para a conexão completar ou falhar (aumentado para dar tempo aos retries)
            let waitCount = 0;
            const maxWaitTime = 30; // 30 * 500ms = 15 segundos (tempo suficiente para 3 tentativas de join)
            while (isJoiningRef.current && waitCount < maxWaitTime) {
              await new Promise(resolve => setTimeout(resolve, 500));
              waitCount++;
              
              // Verificar se a conexão mudou de estado
              if (clientRef.current && 
                  (clientRef.current.connectionState === 'CONNECTED' || 
                   clientRef.current.connectionState === 'DISCONNECTED')) {
                console.log(`   Estado da conexão mudou para: ${clientRef.current.connectionState}`);
                break;
              }
            }
            console.log(`   Aguardou ${waitCount * 500}ms, isJoining: ${isJoiningRef.current}`);
          }
          
          // Verificar se o cliente ainda está conectado antes de sair
          const connectionState = clientRef.current.connectionState;
          console.log('🔌 Estado da conexão antes de sair:', connectionState);
          
          // Só tentar sair se não estiver DISCONNECTED ou DISCONNECTING
          // E se não estiver mais em processo de join
          if (connectionState !== 'DISCONNECTED' && 
              connectionState !== 'DISCONNECTING' && 
              !isJoiningRef.current) {
            console.log('🚪 Saindo do canal...');
            await clientRef.current.leave();
            console.log('✅ Left channel successfully');
          } else {
            if (isJoiningRef.current) {
              console.log('⚠️ Join ainda em andamento, pulando leave() (será cancelado automaticamente)');
            } else {
              console.log('⚠️ Cliente já estava desconectado, pulando leave()');
            }
          }
        } catch (e: any) {
          // Ignorar erros de WS_ABORT (acontece quando já está saindo ou durante join)
          if (e.code === 'WS_ABORT' || 
              e.message?.includes('LEAVE') || 
              e.message?.includes('WS_ABORT') ||
              e.code === 'OPERATION_ABORTED') {
            console.debug('Cleanup: Conexão já estava sendo encerrada ou join foi cancelado (normal)');
          } else {
            console.warn('Error leaving channel:', e);
            console.warn('   Stack trace:', e.stack);
          }
        }
        clientRef.current = null;
      }

      // Parar todos os MediaStreams ativos (garantir que câmera e microfone sejam desligados)
      try {
        // Obter todos os MediaStreams ativos e parar seus tracks
        if (localVideoRef.current) {
          const videoElement = localVideoRef.current.querySelector('video') as HTMLVideoElement;
          if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            stream.getTracks().forEach(track => {
              track.stop();
              console.log('✅ Track de mídia parado:', track.kind);
            });
            videoElement.srcObject = null;
          }
        }
      } catch (e) {
        console.warn('Erro ao parar MediaStreams:', e);
      }

      // Limpar elementos de vídeo de forma segura
      safeClearElement(localVideoRef.current);
      safeClearElement(remoteVideoRef.current);

      setHasRemoteVideo(false);
      setIsConnecting(false);
      setHasLocalVideo(false);
      setIsMuted(false);
      setIsVideoOff(false);
      isInitializedRef.current = false;
      isJoiningRef.current = false;
      ensureVideoDisplayRunningRef.current = false;
      currentChannelRef.current = '';
      console.log('✅ Cleanup completed - todos os recursos foram liberados');
    } catch (error) {
      console.error('Erro ao limpar recursos:', error);
    } finally {
      // Sempre resetar flags no finally para garantir que não fiquem travadas
      isCleaningUpRef.current = false;
    }
  };

  if (!APP_ID) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded">
        <p className="font-bold">⚠️ Configuração Necessária</p>
        <p className="text-sm mt-2">
          Adicione <code>VITE_AGORA_APP_ID</code> no arquivo .env
        </p>
        <p className="text-xs mt-1">
          Obtenha em: <a href="https://www.agora.io" target="_blank" rel="noopener noreferrer" className="underline">agora.io</a>
        </p>
        <p className="text-xs mt-2 text-gray-600">
          <strong>Nota:</strong> Para desenvolvimento, você pode usar apenas o App ID. Para produção, configure também o Token.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Estilos globais para garantir que o vídeo seja visível */}
      <style>{`
        [ref="localVideoRef"] video,
        [ref="localVideoRef"] > video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          position: absolute !important;
          top: 0px !important;
          left: 0px !important;
          z-index: 5 !important;
          background-color: #000 !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          border-radius: 0.5rem !important;
          tabindex: -1 !important;
        }
        
        [ref="localVideoRef"] video.video-stream,
        [ref="localVideoRef"] > video.video-stream {
          width: 100% !important;
          height: 100% !important;
        }
        [ref="localVideoRef"] {
          width: calc(100% - 2rem) !important;
          max-width: 1600px !important;
          aspect-ratio: 16 / 9 !important;
          position: relative !important;
          margin: 0 auto !important;
          padding: 0 !important;
          min-height: 0 !important;
          height: auto !important;
        }
        [ref="remoteVideoRef"] video,
        [ref="remoteVideoRef"] > div > video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          position: absolute !important;
          top: 0px !important;
          left: 0px !important;
          right: 0px !important;
          bottom: 0px !important;
          z-index: 20 !important; /* Aumentado para ficar acima do overlay (z-10) */
          background-color: #000 !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          margin: 0 !important;
          padding: 0 !important;
          tabindex: -1 !important;
        }
        
        [ref="remoteVideoRef"] video.video-stream,
        [ref="remoteVideoRef"] > div > video.video-stream {
          width: 100% !important;
          height: 100% !important;
        }
        [ref="remoteVideoRef"] {
          width: 100% !important;
          max-width: 100% !important;
          aspect-ratio: 16 / 9 !important; /* Sempre 16/9 para OBS */
          position: relative !important;
          margin: 0 !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 0 !important;
          height: auto !important;
        }
        
        /* Container pai também mantém 16/9 e ocupa todo espaço - IGUAL AO ADMIN */
        .relative.w-full.bg-black {
          aspect-ratio: 16 / 9 !important; /* Sempre 16/9 para OBS */
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          min-height: 0 !important;
          height: auto !important;
          position: relative !important;
          display: block !important;
        }
        [ref="remoteVideoRef"] > div {
          width: 100% !important;
          height: 100% !important;
          position: relative !important;
          margin: 0 !important;
          padding: 0 !important;
          min-height: 0 !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        /* Estilos para fullscreen automático ao virar celular */
        #video-player:fullscreen,
        #video-player:-webkit-full-screen,
        #video-player:-moz-full-screen,
        #video-player:-ms-fullscreen {
          width: 100vw !important;
          height: calc(var(--vh, 1vh) * 100) !important; /* Altura real no mobile */
          background: #000 !important;
          margin: 0 !important;
          padding: 0 !important;
          border-radius: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        
        #video-player:fullscreen video,
        #video-player:-webkit-full-screen video,
        #video-player:-moz-full-screen video,
        #video-player:-ms-fullscreen video {
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          max-height: 100vh !important;
          object-fit: contain !important;
          margin: 0 auto !important;
          padding: 0 !important;
          display: block !important;
        }
        
        /* No mobile, usar contain para não cortar conteúdo e centralizar */
        @media (max-width: 767px) {
          #video-player:fullscreen,
          #video-player:-webkit-full-screen,
          #video-player:-moz-full-screen,
          #video-player:-ms-fullscreen {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          
          #video-player:fullscreen video,
          #video-player:-webkit-full-screen video,
          #video-player:-moz-full-screen video,
          #video-player:-ms-fullscreen video {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: 100vh !important;
            object-fit: contain !important;
            display: block !important;
            margin: 0 auto !important;
          }
        }
        
        /* Media query para orientação landscape em mobile */
        @media screen and (orientation: landscape) {
          #video-player {
            width: 100vw !important;
            aspect-ratio: 16 / 9 !important; /* Sempre 16/9 para OBS */
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 0 !important;
          }
          
          #video-player > div {
            margin: 0 !important;
          }
          
          [ref="localVideoRef"],
          [ref="remoteVideoRef"] {
            aspect-ratio: 16 / 9 !important; /* Sempre 16/9 para OBS */
            width: 100vw !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          [ref="localVideoRef"] video,
          [ref="remoteVideoRef"] video {
            width: 100vw !important;
            max-width: 100vw !important;
            height: auto !important;
            max-height: calc(var(--vh, 1vh) * 100) !important; /* Altura real no mobile */
            object-fit: contain !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border-radius: 0 !important;
            display: block !important;
          }
        }
        
        /* Remover background-color do .bg-black (apenas desktop) */
        @media (min-width: 768px) {
          .bg-black {
            background-color: transparent !important;
          }
        }
        
        /* Remover padding da classe md:p-6 para usuários (viewers) */
        @media (min-width: 768px) {
          /* Remover padding de elementos com md:p-6 que contêm o video-player de viewer */
          *:has(#video-player[data-broadcaster="false"]) {
            padding: 0 !important;
          }
          /* Remover padding de elementos com classe md:p-6 que contêm o video-player de viewer */
          .md\:p-6:has(#video-player[data-broadcaster="false"]) {
            padding: 0 !important;
          }
          /* Remover padding de elementos com classe p-6 que contêm o video-player de viewer */
          .p-6:has(#video-player[data-broadcaster="false"]) {
            padding: 0 !important;
          }
        }
        
        /* Aplicar margens e paddings adequados aos containers de vídeo */
        #video-player {
          max-width: 100% !important;
          width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          aspect-ratio: 16 / 9 !important; /* Garantir aspect-ratio desde o início */
        }
        
        /* Remover margin no mobile */
        @media (max-width: 767px) {
          #video-player {
            margin: 0 !important;
            padding: 0 !important;
            max-height: 100vh !important;
          }
          
          [ref="remoteVideoRef"] {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            aspect-ratio: 16 / 9 !important; /* Sempre 16/9 para OBS */
          }
          
          /* Remover padding da classe p-3 no mobile */
          .p-3 {
            padding: 0 !important;
          }
          
          /* Remover background-color transparent do .bg-black no mobile (voltar ao padrão) */
          .bg-black {
            background-color: rgb(0 0 0 / var(--tw-bg-opacity, 1)) !important;
          }
          
          /* Remover margin e padding de elementos com estilo inline no mobile */
          [style*="margin: 1rem auto"],
          [style*="padding: 1rem"] {
            margin: 0 !important;
            padding: 0 !important;
          }
        }
        
        /* Em fullscreen, remover margens e paddings e centralizar */
        #video-player:fullscreen,
        #video-player:-webkit-full-screen,
        #video-player:-moz-full-screen,
        #video-player:-ms-fullscreen {
          margin: 0 !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        
        /* Garantir que o vídeo dentro do #video-player fique centralizado */
        #video-player:fullscreen > div,
        #video-player:-webkit-full-screen > div,
        #video-player:-moz-full-screen > div,
        #video-player:-ms-fullscreen > div {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
          height: 100% !important;
        }
        
        /* Remover position absolute e top do vídeo em fullscreen para centralizar */
        #video-player:fullscreen [ref="remoteVideoRef"] video,
        #video-player:-webkit-full-screen [ref="remoteVideoRef"] video,
        #video-player:-moz-full-screen [ref="remoteVideoRef"] video,
        #video-player:-ms-fullscreen [ref="remoteVideoRef"] video,
        #video-player:fullscreen [ref="localVideoRef"] video,
        #video-player:-webkit-full-screen [ref="localVideoRef"] video,
        #video-player:-moz-full-screen [ref="localVideoRef"] video,
        #video-player:-ms-fullscreen [ref="localVideoRef"] video {
          position: relative !important;
          top: auto !important;
          left: auto !important;
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          max-height: 100vh !important;
          object-fit: contain !important;
          margin: 0 auto !important;
          display: block !important;
        }
        
        /* Container do vídeo remoto em fullscreen centralizado */
        #video-player:fullscreen [ref="remoteVideoRef"],
        #video-player:-webkit-full-screen [ref="remoteVideoRef"],
        #video-player:-moz-full-screen [ref="remoteVideoRef"],
        #video-player:-ms-fullscreen [ref="remoteVideoRef"],
        #video-player:fullscreen [ref="localVideoRef"],
        #video-player:-webkit-full-screen [ref="localVideoRef"],
        #video-player:-moz-full-screen [ref="localVideoRef"],
        #video-player:-ms-fullscreen [ref="localVideoRef"] {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          aspect-ratio: 16 / 9 !important; /* Sempre 16/9 para OBS */
        }
      `}</style>
      <div id="video-player" data-broadcaster={isBroadcaster ? 'true' : 'false'} className="relative w-full bg-black overflow-hidden rounded-lg" style={{ margin: '0', padding: '0', maxWidth: '100%', aspectRatio: '16/9' }}>
        {/* Vídeo Local (Broadcaster) */}
        {isBroadcaster && (
          <div className="relative w-full bg-black overflow-hidden rounded-lg" style={{ aspectRatio: '16/9' }}>
            {/* Container para o vídeo - SDK do Agora gerencia este elemento */}
            <div 
              ref={localVideoRef} 
              className="w-full h-full relative"
              style={{ 
                width: '100%',
                height: '100%',
                position: 'relative',
                backgroundColor: '#000',
                overflow: 'hidden',
                display: 'block'
              }}
            />
            {/* Overlays do Stream Studio - Renderizar sobre o vídeo */}
            <StreamOverlay activeScene={activeScene} />
            {/* Fallback enquanto o vídeo carrega - renderizado fora do ref para evitar conflitos */}
            {!hasLocalVideo && isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center bg-black z-0 pointer-events-none">
                <div className="text-center text-white">
                  {isStreaming ? (
                    <>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                      <p>Carregando vídeo da câmera...</p>
                    </>
                  ) : (
                    <>
                      <div className="text-6xl mb-4">📹</div>
                      <p className="text-lg font-medium">Preparando transmissão...</p>
                    </>
                  )}
                </div>
              </div>
            )}
          
          {/* Câmera PiP (Picture-in-Picture) - Admin - aparece quando screen sharing está ativo */}
          {isBroadcaster && showScreenShare && showCamera && cameraVideoTrackRef.current && (
            <div
              ref={cameraPiPRef}
              id="pip-camera-container-admin"
              className="absolute rounded-full overflow-hidden border-4 border-white shadow-2xl cursor-move z-30"
              style={{
                width: '120px',
                height: '120px',
                left: `${cameraPosition.x}px`,
                top: `${cameraPosition.y}px`,
                backgroundColor: '#000'
              }}
              onMouseDown={(e) => {
                setIsDragging(true);
                const rect = cameraPiPRef.current?.getBoundingClientRect();
                if (rect) {
                  setDragOffset({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  });
                }
              }}
            >
              <style>{`
                #pip-camera-container-admin video {
                  width: 100% !important;
                  height: 100% !important;
                  object-fit: cover !important;
                  border-radius: 50% !important;
                  display: block !important;
                  visibility: visible !important;
                }
              `}</style>
            </div>
          )}
            
            {/* Overlay de Propaganda (Fullscreen com conteúdo anterior em PiP) */}
            {showOverlayAd && overlayAdImage && (
              <div className="absolute inset-0 z-50 bg-black">
                {/* Propaganda fullscreen */}
                <img 
                  src={overlayAdImage} 
                  alt="Propaganda" 
                  className="w-full h-full object-cover"
                />
                
                {/* Container PiP para mostrar o conteúdo anterior (jogo/vídeo) */}
                <div className="absolute top-4 right-4 w-64 h-48 bg-black rounded-lg overflow-hidden shadow-2xl border-2 border-white/20 z-51">
                  {/* Clonar o conteúdo do vídeo para o PiP */}
                  <div 
                    id="overlay-pip-content-admin"
                    className="w-full h-full"
                    style={{ 
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                      backgroundColor: '#000'
                    }}
                  />
                </div>
                
                {/* Indicador de áudio ativo para o admin */}
                {isBroadcaster && (
                  <div className="absolute bottom-4 left-4 bg-green-500/90 backdrop-blur-sm px-4 py-2 rounded-lg z-52">
                    <div className="flex items-center gap-2 text-white text-sm font-medium">
                      <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                      <span>🎤 Áudio ativo - Você pode falar normalmente</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            
            {/* Slideshow de Imagens */}
            {!showOverlayAd && getEnabledSlides().length > 0 && (
              <div className="absolute inset-0 z-40 pointer-events-none">
                {getEnabledSlides()[currentSlideIndex] && (
                  <img 
                    src={getEnabledSlides()[currentSlideIndex].url} 
                    alt={`Slide ${currentSlideIndex + 1}`}
                    className="w-full h-full object-contain"
                    style={{
                      animation: 'fadeIn 0.5s ease-in-out'
                    }}
                  />
                )}
              </div>
            )}
        </div>
      )}

      {/* Vídeo Remoto (Viewers) - MESMA ESTRUTURA DO ADMIN */}
      {!isBroadcaster && (
        <div className="relative w-full bg-black overflow-hidden rounded-lg" style={{ aspectRatio: '16/9' }}>
          <div 
            ref={remoteVideoRef} 
            className="w-full h-full relative"
            style={{ 
              width: '100%',
              height: '100%',
              position: 'relative',
              backgroundColor: '#000',
              overflow: 'hidden',
              display: 'block'
            }}
          />
          {/* Overlays do Stream Studio - Para Viewers também */}
          <StreamOverlay activeScene={activeScene} />
          
          {/* Nota: Para viewers, a câmera PiP já vem embutida no track combinado do admin
              Não precisamos renderizar separadamente, mas mantemos o código caso seja necessário no futuro */}
          
          {/* Overlay de carregamento - só mostra se não há vídeo */}
          {/* IMPORTANTE: z-index menor que o vídeo (z-10 < z-20 do vídeo) para não cobrir */}
          {!hasRemoteVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-[5] pointer-events-none">
              <div className="text-white text-center">
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-lg font-medium">Conectando...</p>
                    <p className="text-sm text-gray-400 mt-2">Aguardando transmissor iniciar a transmissão</p>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">📹</div>
                    <p className="text-lg font-medium">Nenhuma transmissão ativa</p>
                    <p className="text-sm text-gray-400 mt-2">O transmissor ainda não iniciou a transmissão</p>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Overlay de Propaganda (Fullscreen com conteúdo anterior em PiP) - Para Viewers */}
          {showOverlayAd && overlayAdImage && (
            <div className="absolute inset-0 z-50 bg-black">
              {/* Propaganda fullscreen */}
              <img 
                src={overlayAdImage} 
                alt="Propaganda" 
                className="w-full h-full object-cover"
              />
              
              {/* Container PiP para mostrar o conteúdo anterior (jogo/vídeo) */}
              <div className="absolute top-4 right-4 w-64 h-48 bg-black rounded-lg overflow-hidden shadow-2xl border-2 border-white/20 z-51">
                {/* Clonar o conteúdo do vídeo para o PiP */}
                <div 
                  id="overlay-pip-content-viewer"
                  className="w-full h-full"
                  style={{ 
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    backgroundColor: '#000'
                  }}
                />
              </div>
            </div>
          )}
          
          {/* Slideshow de Imagens - Para Viewers */}
          {!showOverlayAd && getEnabledSlides().length > 0 && (
            <div className="absolute inset-0 z-40 pointer-events-none">
              {getEnabledSlides()[currentSlideIndex] && (
                <img 
                  src={getEnabledSlides()[currentSlideIndex].url} 
                  alt={`Slide ${currentSlideIndex + 1}`}
                  className="w-full h-full object-contain"
                  style={{
                    animation: 'fadeIn 0.5s ease-in-out'
                  }}
                />
              )}
            </div>
          )}
          
          {/* Botão para ativar áudio se estiver bloqueado */}
          {hasRemoteVideo && audioBlocked && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
              <button
                onClick={async () => {
                  try {
                    // Tentar reproduzir áudio de todos os usuários remotos
                    if (clientRef.current) {
                      const remoteUsers = clientRef.current.remoteUsers;
                      for (const user of remoteUsers) {
                        if (user.audioTrack) {
                          try {
                            await user.audioTrack.play();
                            console.log('✅ Áudio ativado manualmente');
                            setAudioBlocked(false);
                            toast.success('🔊 Áudio ativado!');
                          } catch (e) {
                            console.error('Erro ao ativar áudio:', e);
                          }
                        }
                      }
                    }
                  } catch (error) {
                    console.error('Erro ao ativar áudio:', error);
                  }
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all"
              >
                <span className="text-2xl">🔊</span>
                <span className="font-medium">Ativar Áudio</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Indicador de Status */}
      {isStreaming && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full z-10 shadow-lg">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">AO VIVO</span>
        </div>
      )}

    </div>
    </>
  );
};

export default VideoStream;

