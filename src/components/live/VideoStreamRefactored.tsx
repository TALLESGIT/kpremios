import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { supabase } from '../../lib/supabase';
import StreamOverlay from './StreamOverlay';
import { setupIOSPlaybackFix } from '../player/utils/iosPlaybackFix';

// Suprimir warnings específicos do Agora SDK
let agoraWarningsSuppressed = false;

const suppressAgoraWarnings = () => {
  if (agoraWarningsSuppressed) return;
  
  const originalError = console.error;
  const originalWarn = console.warn;
  
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
    /AUDIO_OUTPUT_LEVEL_TOO_LOW/i,
    /AUDIO_OUTPUT_LEVEL_TOO_LOW_RECOVER/i,
    /code: 2002.*AUDIO_OUTPUT_LEVEL_TOO_LOW/i,
    /code: 4002.*AUDIO_OUTPUT_LEVEL_TOO_LOW_RECOVER/i,
    /AudioContext current time stuck/i,
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

suppressAgoraWarnings();

interface AdImage {
  id: string;
  url: string;
  enabled: boolean;
  duration?: number;
}

interface VideoStreamProps {
  channelName: string;
  isBroadcaster: boolean;
  onEnd?: () => void;
  adImages?: AdImage[];
  overlayAd?: { url: string; enabled: boolean };
  onStatsUpdate?: (stats: {
    viewerCount: number;
    connectionState: string;
    connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  }) => void;
  streamId?: string;
  sessionId?: string;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onRecordingReady?: (blob: Blob, filename: string) => void;
  cameraPipPosition?: { x: number; y: number };
  screenShareEnabled?: boolean;
  hideScreenShareButton?: boolean;
  activeScene?: any;
  cameraDeviceId?: string;
  hideControls?: boolean;
}

const VideoStream: React.FC<VideoStreamProps> = ({
  channelName,
  isBroadcaster,
  onEnd,
  adImages = [],
  overlayAd,
  onStatsUpdate,
  onRecordingReady,
  onRecordingStateChange,
  cameraPipPosition,
  screenShareEnabled = false,
  hideScreenShareButton = false,
  activeScene = null,
  cameraDeviceId,
  hideControls = false
}) => {
  // Refs
  const clientRef = useRef<any>(null);
  const localAudioTrackRef = useRef<any>(null);
  const localVideoTrackRef = useRef<any>(null);
  const screenVideoTrackRef = useRef<any>(null);
  const screenAudioTrackRef = useRef<any>(null);
  const cameraVideoTrackRef = useRef<any>(null);
  const combinedVideoTrackRef = useRef<any>(null);

  const localVideoRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoRef = useRef<HTMLDivElement | null>(null);

  // State
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [hasLocalVideo, setHasLocalVideo] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  // Internal helpers
  const isCleaningUpRef = useRef(false);
  const isJoiningRef = useRef(false);
  const cleanupCalledRef = useRef(false);

  // Track subscribed users to avoid duplicate subscribe
  const subscribedUsersRef = useRef<Set<number | string>>(new Set());

  // Configuração Agora
  const APP_ID = import.meta.env.VITE_AGORA_APP_ID || '';
  const TOKEN = import.meta.env.VITE_AGORA_TOKEN || null;

  // ========== Safe DOM clearing ==========
  const safeClearElement = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    
    try {
      if (!element.isConnected) return;

      const hasVideo = element.querySelector('video');
      if (hasVideo) {
        const videoElement = hasVideo as HTMLVideoElement;
        const isInFullscreen = !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        );

        if (
          videoElement.videoWidth > 0 ||
          videoElement.offsetWidth > 0 ||
          !videoElement.paused ||
          videoElement.readyState >= 2 ||
          isInFullscreen
        ) {
          console.debug('⚠️ Tentativa de limpar elemento com vídeo ativo, ignorando...');
          return;
        }
      }

      // If no active video found, clear safely
      if (!hasVideo) {
        while (element.firstChild) {
          element.removeChild(element.firstChild);
        }
      }
    } catch (e) {
      console.debug('Aviso ao limpar elemento:', e);
    }
  }, []);

  // ========== Centralized subscribe + play logic ==========
  const handleUserPublished = useCallback(async (user: any, mediaType: string) => {
    if (!clientRef.current) return;

    // Validate user
    if (!user || typeof user !== 'object' || !user.uid) {
      console.warn('User inválido no evento user-published/user-online');
      return;
    }

    // Avoid duplicate subscribes
    const isAlreadySubscribed = subscribedUsersRef.current.has(user.uid);
    
    if (isAlreadySubscribed && mediaType === 'video') {
      // If video already exists and is playing, nothing to do
      const existing = document.getElementById(`remote-video-${user.uid}`);
      if (existing && existing.querySelector('video')) {
        const videoEl = existing.querySelector('video') as HTMLVideoElement;
        if (videoEl && (videoEl.videoWidth > 0 || !videoEl.paused || videoEl.readyState >= 2)) {
          console.debug('✅ Vídeo já está sendo reproduzido para', user.uid);
          setHasRemoteVideo(true);
          setIsConnecting(false);
          return;
        }
      }
    }

    try {
      // Wait for connection to be connected (with short backoff)
      let waitCount = 0;
      while (clientRef.current.connectionState !== 'CONNECTED' && waitCount < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        waitCount++;
        if (isCleaningUpRef.current) return;
      }

      // Subscribe if not already subscribed
      if (!isAlreadySubscribed) {
        console.log('📡 Subscribing to user:', user.uid, 'mediaType:', mediaType);
        await clientRef.current.subscribe(user, mediaType);
        subscribedUsersRef.current.add(user.uid);
        console.log('✅ Subscribe success user', user.uid, mediaType);
        
        // Aguardar track estar disponível
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // If mediaType includes video, try to play
      if (mediaType === 'video' && remoteVideoRef.current) {
        // Create a persistent container only if not exists
        let videoContainer = document.getElementById(`remote-video-${user.uid}`) as HTMLDivElement | null;
        
        if (!videoContainer) {
          videoContainer = document.createElement('div');
          videoContainer.id = `remote-video-${user.uid}`;
          videoContainer.className = 'w-full h-full';
          videoContainer.style.width = '100%';
          videoContainer.style.height = '100%';
          videoContainer.style.position = 'relative';
          videoContainer.style.overflow = 'hidden';
          videoContainer.style.backgroundColor = '#000';
          remoteVideoRef.current.appendChild(videoContainer);
        } else {
          console.debug('ℹ️ Container já existe para', user.uid);
        }

        // If there's already a video element and it's playing, don't recreate
        const existingVideo = videoContainer.querySelector('video') as HTMLVideoElement | null;
        if (existingVideo && (existingVideo.videoWidth > 0 || !existingVideo.paused || existingVideo.readyState >= 2)) {
          console.log('✅ Vídeo track já está sendo reproduzido, apenas aplicando estilos...');
          setHasRemoteVideo(true);
          setIsConnecting(false);
          return;
        }

        // Try play and apply styles
        if (user.videoTrack) {
          try {
            console.log('▶️ Reproduzindo vídeo remoto...');
            
            // Marcar como tendo vídeo IMEDIATAMENTE antes de chamar play()
            setHasRemoteVideo(true);
            setIsConnecting(false);

            await user.videoTrack.play(videoContainer);
            console.log('✅ play() chamado com sucesso para', user.uid);

            // Aguardar elemento ser criado
            await new Promise(resolve => setTimeout(resolve, 100));

            const videoElement = videoContainer.querySelector('video') as HTMLVideoElement | null;
            if (videoElement) {
              // Aplicar estilos
              videoElement.style.width = '100%';
              videoElement.style.height = '100%';
              videoElement.style.objectFit = 'cover';
              videoElement.style.position = 'absolute';
              videoElement.style.top = '0';
              videoElement.style.left = '0';
              videoElement.style.right = '0';
              videoElement.style.bottom = '0';
              videoElement.style.zIndex = '20';
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

              // iOS playback fix
              try {
                const cleanupIOSFix = setupIOSPlaybackFix(videoElement);
                (videoElement as any)._iosCleanup = cleanupIOSFix;
              } catch (e) {
                console.debug('No iOS fix available');
              }

              // Listener para loadedmetadata
              const handleLoadedMetadata = () => {
                console.log('📏 Resolução detectada:', videoElement.videoWidth, 'x', videoElement.videoHeight);
                if (videoElement.paused) {
                  videoElement.play().catch((err) => {
                    console.warn('Erro ao forçar play após metadata:', err);
                  });
                }
              };

              videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
              if (videoElement.readyState >= 1) {
                handleLoadedMetadata();
              }

              console.log('✅ Estilos aplicados ao vídeo remoto');
            }

            // Tentar aplicar estilos em múltiplos momentos
            setTimeout(() => {
              const retryVideoElement = videoContainer.querySelector('video') as HTMLVideoElement;
              if (retryVideoElement) {
                retryVideoElement.style.display = 'block';
                retryVideoElement.style.visibility = 'visible';
                retryVideoElement.style.opacity = '1';
                retryVideoElement.style.zIndex = '20';
              }
            }, 500);

            setTimeout(() => {
              const retryVideoElement = videoContainer.querySelector('video') as HTMLVideoElement;
              if (retryVideoElement) {
                retryVideoElement.style.display = 'block';
                retryVideoElement.style.visibility = 'visible';
                retryVideoElement.style.opacity = '1';
                retryVideoElement.style.zIndex = '20';
              }
            }, 1000);

          } catch (playError) {
            console.error('❌ Erro ao chamar play():', playError);
          }
        }
      }

      // If mediaType is audio, try play audio track
      if (mediaType === 'audio' && user.audioTrack) {
        try {
          const playResult = user.audioTrack.play();
          if (playResult && typeof playResult.then === 'function') {
            await playResult;
          }
          setAudioBlocked(false);
          console.log('✅ Áudio remoto reproduzindo para', user.uid);
        } catch (e) {
          console.warn('⚠️ Erro ao reproduzir áudio remoto', e);
          setAudioBlocked(true);
        }
      }
    } catch (subscribeError: any) {
      console.error('❌ Erro ao fazer subscribe/play:', subscribeError);
      
      if (
        subscribeError.message?.includes('disconnected') ||
        subscribeError.message?.includes('not joined') ||
        subscribeError.code === 'INVALID_OPERATION'
      ) {
        console.warn('⚠️ Conexão não pronta, aguardando e tentando novamente...');
      } else if (subscribeError.message?.includes("Cannot use 'in' operator")) {
        console.warn('⚠️ User object pode estar incompleto, aguardando...');
      }
    }
  }, [safeClearElement]);

  // ========== Event listeners setup ==========
  const setupEventListeners = useCallback((client: any) => {
    client.on('connection-state-change', (curState: string, revState: string) => {
      console.log('🔌 Mudança no estado da conexão:', { anterior: revState, atual: curState });
      if (onStatsUpdate) {
        onStatsUpdate({
          viewerCount: client.remoteUsers.length,
          connectionState: curState,
          connectionQuality: curState === 'CONNECTED' ? 'excellent' : 'poor'
        });
      }
    });

    client.on('user-joined', (user: any) => {
      console.log('👤 User joined:', user.uid, 'Total remote users:', client.remoteUsers.length);
    });

    client.on('user-online', async (user: any) => {
      try {
        console.log('🌐 User online:', user.uid, 'hasVideo:', user.hasVideo, 'hasAudio:', user.hasAudio);
        if ((user.hasVideo || user.hasAudio) && client.connectionState === 'CONNECTED') {
          if (user.hasVideo) await handleUserPublished(user, 'video');
          if (user.hasAudio) await handleUserPublished(user, 'audio');
        }
      } catch (e) {
        console.warn('Erro em user-online handler', e);
      }
    });

    client.on('user-left', (user: any) => {
      console.log('👋 User left:', user.uid, 'Total:', client.remoteUsers.length);
      try {
        const el = document.getElementById(`remote-video-${user.uid}`);
        if (el) safeClearElement(el.parentElement || el);
        subscribedUsersRef.current.delete(user.uid);
      } catch (e) {
        console.debug('Erro ao limpar container do usuário que saiu', e);
      }
    });

    client.on('user-published', async (user: any, mediaType: string) => {
      await handleUserPublished(user, mediaType);
    });

    client.on('user-unpublished', async (user: any, mediaType: string) => {
      console.log('📡 user-unpublished', user?.uid, mediaType);
      if (mediaType === 'video' && remoteVideoRef.current) {
        // Verificar se há vídeo ativo antes de limpar
        const existingVideo = remoteVideoRef.current.querySelector('video') as HTMLVideoElement;
        const shouldClear = !existingVideo || 
                           (existingVideo.videoWidth === 0 && 
                            existingVideo.offsetWidth === 0 && 
                            existingVideo.paused &&
                            existingVideo.readyState < 2);
        
        if (shouldClear) {
          safeClearElement(remoteVideoRef.current);
          setHasRemoteVideo(false);
          setIsConnecting(true);
        }
      }
    });

    client.on('exception', (event: any) => {
      const nonCriticalCodes = [2001, 4001, 2002, 4002, 1005, 3005];
      if (event.code === 'WS_ABORT' || event.msg?.includes('WS_ABORT') || nonCriticalCodes.includes(event.code)) {
        console.debug('Aviso do Agora SDK (não crítico):', event.msg || event.message);
        return;
      }
      if (isCleaningUpRef.current) {
        console.debug('Erro durante cleanup (ignorado):', event.msg || event.message, 'code:', event.code);
        return;
      }
      console.error('Erro do Agora SDK:', event);
    });
  }, [safeClearElement, handleUserPublished, onStatsUpdate]);

  // ========== Initialize Viewer ==========
  const initializeViewer = useCallback(async () => {
    if (!APP_ID) {
      console.error('App ID não configurado!');
      toast.error('App ID do Agora.io não configurado');
      return;
    }
    
    if (isJoiningRef.current) return;

    try {
      isJoiningRef.current = true;
      setIsConnecting(true);

      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
      clientRef.current = client;

      setupEventListeners(client);

      const tokenToUse = TOKEN || null;
      let uid = null;
      
      try {
        uid = await client.join(APP_ID, channelName, tokenToUse, null);
        console.log('✅ Viewer joined with uid', uid);
      } catch (joinErr: any) {
        console.error('Erro ao join:', joinErr);
        isJoiningRef.current = false;
        setIsConnecting(false);
        throw joinErr;
      }

      await client.setClientRole('audience', { level: 2 });

      // If there are already remote users, try subscribing
      const remoteUsers = client.remoteUsers || [];
      if (remoteUsers.length > 0) {
        console.log('📡 Usuários já no canal, fazendo subscribe...');
        for (const u of remoteUsers) {
          if (u.hasVideo) await handleUserPublished(u, 'video');
          if (u.hasAudio) await handleUserPublished(u, 'audio');
        }
      }

      setIsConnecting(false);
      isJoiningRef.current = false;
      console.log('✅ Viewer initialization complete');
    } catch (error: any) {
      console.error('Erro ao conectar à transmissão:', error);
      isJoiningRef.current = false;
      setIsConnecting(false);
      
      if (error.code === 'CAN_NOT_GET_GATEWAY_SERVER' || error.message?.includes('dynamic use static key')) {
        toast.error('⚠️ Erro: Projeto Agora.io requer TOKEN. Configure no .env ou use "App ID Only"');
      } else {
        toast.error(`Erro ao conectar: ${error.message || 'Tente novamente'}`);
      }
    }
  }, [APP_ID, TOKEN, channelName, setupEventListeners, handleUserPublished]);

  // ========== Cleanup ==========
  const cleanup = useCallback(async () => {
    if (cleanupCalledRef.current) return;
    cleanupCalledRef.current = true;
    isCleaningUpRef.current = true;

    try {
      if (clientRef.current) {
        try {
          await clientRef.current.leave();
        } catch (e) {
          console.debug('leave error', e);
        }
        clientRef.current = null;
      }

      // Limpar tracks
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }
      if (screenVideoTrackRef.current) {
        screenVideoTrackRef.current.close();
        screenVideoTrackRef.current = null;
      }
      if (screenAudioTrackRef.current) {
        screenAudioTrackRef.current.close();
        screenAudioTrackRef.current = null;
      }
      if (cameraVideoTrackRef.current) {
        cameraVideoTrackRef.current.close();
        cameraVideoTrackRef.current = null;
      }

      // Limpar elementos de vídeo de forma segura
      safeClearElement(localVideoRef.current);
      safeClearElement(remoteVideoRef.current);

      setHasRemoteVideo(false);
      setIsConnecting(false);
      setHasLocalVideo(false);
      setIsStreaming(false);
      subscribedUsersRef.current.clear();
    } catch (e) {
      console.error('Erro no cleanup:', e);
    } finally {
      isCleaningUpRef.current = false;
      cleanupCalledRef.current = false;
    }
  }, [safeClearElement]);

  // ========== Effects ==========
  useEffect(() => {
    if (!isBroadcaster) {
      initializeViewer();
    }

    return () => {
      isCleaningUpRef.current = true;
      cleanup();
    };
  }, [isBroadcaster, channelName, initializeViewer, cleanup]);

  // Verificar periodicamente se o vídeo remoto está visível
  useEffect(() => {
    if (isBroadcaster) return;

    const checkRemoteVideo = () => {
      if (remoteVideoRef.current) {
        const videoElement = remoteVideoRef.current.querySelector('video') as HTMLVideoElement;
        if (videoElement) {
          const hasValidVideo = videoElement.videoWidth > 0 || 
                               videoElement.offsetWidth > 0 || 
                               !videoElement.paused || 
                               videoElement.readyState >= 2 ||
                               videoElement.srcObject !== null;
          
          if (hasValidVideo && !hasRemoteVideo) {
            setHasRemoteVideo(true);
            setIsConnecting(false);
            videoElement.style.zIndex = '20';
            videoElement.style.display = 'block';
            videoElement.style.visibility = 'visible';
            videoElement.style.opacity = '1';
          }
        }
      }
    };

    checkRemoteVideo();
    const interval = setInterval(checkRemoteVideo, 500);
    
    return () => clearInterval(interval);
  }, [isBroadcaster, hasRemoteVideo]);

  // ========== Render ==========
  if (!APP_ID) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded">
        <p className="font-bold">⚠️ Configuração Necessária</p>
        <p className="text-sm mt-2">Adicione <code>VITE_AGORA_APP_ID</code> no arquivo .env</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        #video-player {
          max-width: 100% !important;
          width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          aspect-ratio: 16 / 9 !important;
        }
        
        @media (max-width: 767px) {
          #video-player {
            margin: 0 !important;
            padding: 0 !important;
            max-height: 100vh !important;
          }
        }
      `}</style>
      
      <div 
        id="video-player" 
        data-broadcaster={isBroadcaster ? 'true' : 'false'} 
        className="relative w-full bg-black overflow-hidden rounded-lg" 
        style={{ margin: '0', padding: '0', maxWidth: '100%', aspectRatio: '16/9' }}
      >
        {/* Local (admin) container */}
        {isBroadcaster && (
          <div className="relative w-full bg-black overflow-hidden rounded-lg" style={{ aspectRatio: '16/9' }}>
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
            {/* Overlays do Stream Studio */}
            <StreamOverlay activeScene={activeScene} />
            
            {/* Overlay de carregamento */}
            {!hasLocalVideo && isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center bg-black z-0 pointer-events-none">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p>Carregando vídeo da câmera...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Remote (viewer) container */}
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
            
            {/* Overlay de carregamento - só mostra se não há vídeo */}
            {!hasRemoteVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-[5] pointer-events-none">
                <div className="text-center text-white">
                  {isConnecting ? (
                    <>
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                      <p>Conectando à transmissão...</p>
                    </>
                  ) : (
                    <>
                      <div className="text-6xl mb-4">📹</div>
                      <p className="text-lg font-medium">Aguardando transmissão...</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default VideoStream;

