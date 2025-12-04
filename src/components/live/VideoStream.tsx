import React, { useEffect, useRef, useState, useCallback } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { Video, VideoOff, Mic, MicOff, Volume2, MonitorSpeaker, Square } from 'lucide-react';
import { toast } from 'react-hot-toast';
import MobileVideoPlayer from './MobileVideoPlayer';

// Declaração de tipos para AgoraRTC (fallback se o arquivo de tipos não for carregado)
declare namespace AgoraRTC {
  interface ILocalVideoTrack {
    getTrackId(): string;
    enabled: boolean;
    isPlaying: boolean;
    muted: boolean;
    play(element: HTMLElement, config?: any): Promise<void>;
    stop(): void;
    close(): void;
    setEnabled(enabled: boolean): Promise<void>;
    setMuted(muted: boolean): Promise<void>;
    setDevice(deviceId: string): Promise<void>;
    on(event: string, callback: (...args: any[]) => void): void;
  }

  interface ILocalAudioTrack {
    getTrackId(): string;
    enabled: boolean;
    muted: boolean;
    play(): Promise<void>;
    stop(): void;
    close(): void;
    setEnabled(enabled: boolean): Promise<void>;
    setMuted(muted: boolean): Promise<void>;
    setDevice(deviceId: string): Promise<void>;
  }

  interface IRemoteVideoTrack {
    stop(): void;
    play(element: HTMLElement, config?: any): Promise<void>;
  }

  interface IAgoraRTCRemoteUser {
    uid: number;
    hasVideo: boolean;
    hasAudio: boolean;
    videoTrack: IRemoteVideoTrack | null;
    audioTrack: any;
  }

  type ConnectionState = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTING' | 'DISCONNECTED' | 'FAILED';

  interface IAgoraRTCClient {
    connectionState: ConnectionState;
    role?: 'host' | 'audience';
    localTracks: Array<ILocalVideoTrack | ILocalAudioTrack>;
    remoteUsers: IAgoraRTCRemoteUser[];
    join(appId: string, channel: string, token: string | null, uid: number | null): Promise<number>;
    leave(): Promise<void>;
    publish(track: ILocalVideoTrack | ILocalAudioTrack): Promise<void>;
    subscribe(user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video'): Promise<void>;
    setClientRole(role: 'host' | 'audience'): Promise<void>;
    on(event: string, callback: (...args: any[]) => void): void;
    removeAllListeners(): void;
  }
}

interface VideoStreamProps {
  channelName: string;
  uid?: number;
  role?: 'host' | 'audience';
  cameraDeviceId?: string;
  onStreamReady?: () => void;
  onStreamError?: (error: Error) => void;
  startStreaming?: boolean; // Flag para iniciar stream externamente
  isActive?: boolean; // Se a transmissão está ativa
}

const VideoStream: React.FC<VideoStreamProps> = ({
  channelName,
  uid,
  role = 'audience',
  cameraDeviceId,
  onStreamReady,
  onStreamError,
  startStreaming = false,
  isActive = false,
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [hasRemoteUsers, setHasRemoteUsers] = useState(false);
  const [hasVideoElement, setHasVideoElement] = useState(false);
  const [hasLocalVideoElement, setHasLocalVideoElement] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(cameraDeviceId || null);
  const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string | null>(null);
  const [previewTrack, setPreviewTrack] = useState<AgoraRTC.ILocalVideoTrack | null>(null);
  // Controles de volume para múltiplos áudios
  const [cameraAudioVolume, setCameraAudioVolume] = useState(100);
  const [screenAudioVolume, setScreenAudioVolume] = useState(100);
  const joiningRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const maxReconnectAttempts = 6;
  const lastChannelInfoRef = useRef<{ channelName: string; appId: string; token: string | null; uid: number | null } | null>(null);
  const [showAudioControls, setShowAudioControls] = useState(false);
  const [isCapturingDesktopAudio, setIsCapturingDesktopAudio] = useState(false);
  const desktopAudioStreamRef = useRef<MediaStream | null>(null);

  const clientRef = useRef<AgoraRTC.IAgoraRTCClient | null>(null);
  const localVideoTrackRef = useRef<AgoraRTC.ILocalVideoTrack | null>(null);
  const localAudioTrackRef = useRef<AgoraRTC.ILocalAudioTrack | null>(null);
  const screenAudioTrackRef = useRef<AgoraRTC.ILocalAudioTrack | null>(null); // Áudio da tela compartilhada
  const remoteVideoTrackRef = useRef<AgoraRTC.IRemoteVideoTrack | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const remoteVideoContainerRef = useRef<HTMLDivElement>(null);

  const appId = import.meta.env.VITE_AGORA_APP_ID;
  const token = import.meta.env.VITE_AGORA_TOKEN || null;

  // Função para salvar informações do canal para reconexão
  const saveChannelInfo = useCallback((channelName: string, appId: string, token: string | null, uid: number | null) => {
    lastChannelInfoRef.current = { channelName, appId, token, uid };
  }, []);

  // Função de reconexão com backoff exponencial
  const handleReconnect = useCallback(async () => {
    if (!lastChannelInfoRef.current) {
      console.warn('⚠️ Não há informações de canal salvas para reconexão');
      return;
    }

    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('❌ Máximo de tentativas de reconexão atingido');
      if (onStreamError) {
        onStreamError(new Error('Falha na conexão. Por favor, recarregue a página.'));
      }
      toast.error('Falha na conexão. Por favor, recarregue a página.');
      return;
    }

    // Calcular delay com backoff exponencial (1s, 2s, 4s, 8s, 16s, 32s) - máximo 30s
    const delay = Math.min(Math.pow(2, reconnectAttempts) * 1000, 30000);
    console.log(`🔄 Tentativa de reconexão ${reconnectAttempts + 1}/${maxReconnectAttempts} em ${delay}ms...`);

    // Limpar timeout anterior se existir
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = window.setTimeout(async () => {
      try {
        const { channelName, appId, token, uid } = lastChannelInfoRef.current!;
        
        if (!clientRef.current) {
          console.error('❌ Cliente não está disponível para reconexão');
          return;
        }

        // Verificar se já está conectado
        if (clientRef.current.connectionState === 'CONNECTED') {
          console.log('✅ Já está conectado, cancelando reconexão');
          setReconnectAttempts(0);
          return;
        }

        // Fazer join novamente
        await clientRef.current.join(appId, channelName, token, uid);
        
        // Configurar role
        if (role === 'host') {
          await clientRef.current.setClientRole('host');
          
          // Se estava transmitindo, republicar tracks
          if (isStreaming) {
            if (localVideoTrackRef.current) {
              await clientRef.current.publish(localVideoTrackRef.current);
            }
            if (localAudioTrackRef.current) {
              await clientRef.current.publish(localAudioTrackRef.current);
            }
          }
        } else {
          await clientRef.current.setClientRole('audience');
        }

        console.log('✅ Reconexão bem-sucedida!');
        setReconnectAttempts(0);
        toast.success('Reconectado com sucesso!');
      } catch (error: any) {
        console.error(`❌ Erro na tentativa de reconexão ${reconnectAttempts + 1}:`, error);
        setReconnectAttempts(prev => prev + 1);
        
        // Tentar novamente se não atingiu o máximo
        if (reconnectAttempts + 1 < maxReconnectAttempts) {
          handleReconnect();
        } else {
          if (onStreamError) {
            onStreamError(new Error('Falha na conexão após múltiplas tentativas.'));
          }
          toast.error('Falha na conexão. Por favor, recarregue a página.');
        }
      }
    }, delay);
  }, [reconnectAttempts, maxReconnectAttempts, role, isStreaming, onStreamError]);

  // Função para iniciar preview da câmera (definida antes dos useEffect que a usam)
  const startPreview = useCallback(async (deviceId: string) => {
    try {
      // Parar preview anterior se existir
      if (previewTrack) {
        previewTrack.stop();
        previewTrack.close();
        setPreviewTrack(null);
      }

      // Criar novo preview
      const track = await AgoraRTC.createCameraVideoTrack({
        cameraId: deviceId,
        encoderConfig: {
          width: 1920,
          height: 1080,
          frameRate: 30,
        },
      });

      setPreviewTrack(track);
      
      // Reproduzir no container
      if (videoContainerRef.current) {
        await track.play(videoContainerRef.current, { mirror: false });
        console.log('Preview da câmera iniciado:', deviceId);
        setIsVideoOff(false);
        
        // Verificar se o vídeo está realmente sendo exibido
        setTimeout(() => {
          const videoElement = videoContainerRef.current?.querySelector('video');
          if (videoElement) {
            console.log('Elemento de vídeo no preview:', {
              playing: !videoElement.paused,
              readyState: videoElement.readyState,
              videoWidth: videoElement.videoWidth,
              videoHeight: videoElement.videoHeight,
              style: window.getComputedStyle(videoElement).display
            });
            
            // Garantir que o vídeo está visível e ocupa todo o espaço
            videoElement.style.cssText = `
              width: 100% !important;
              height: 100% !important;
              max-width: 100% !important;
              max-height: 100% !important;
              object-fit: contain !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              z-index: 10 !important;
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
              background: transparent !important;
              pointer-events: auto !important;
            `;
            
            // Também garantir no elemento pai (container)
            if (videoContainerRef.current) {
              videoContainerRef.current.style.cssText = `
                position: relative !important;
                width: 100% !important;
                height: 100% !important;
                overflow: hidden !important;
                z-index: 1 !important;
              `;
            }
            
            // Verificar estilos computados após aplicar
            const computedAfter = window.getComputedStyle(videoElement);
            console.log('Estilos aplicados ao vídeo:', {
              width: computedAfter.width,
              height: computedAfter.height,
              display: computedAfter.display,
              visibility: computedAfter.visibility,
              opacity: computedAfter.opacity,
              zIndex: computedAfter.zIndex,
              position: computedAfter.position,
              top: computedAfter.top,
              left: computedAfter.left
            });
            
            // Verificar se há elementos sobrepondo
            const rect = videoElement.getBoundingClientRect();
            const containerRect = videoContainerRef.current?.getBoundingClientRect();
            console.log('Posição do vídeo:', {
              videoRect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
              containerRect: containerRect ? { width: containerRect.width, height: containerRect.height } : null,
              isVisible: rect.width > 0 && rect.height > 0
            });
            
            // Forçar play se estiver pausado
            if (videoElement.paused) {
              videoElement.play().catch((err: unknown) => {
                console.error('Erro ao forçar play:', err);
              });
            }
            
            if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
              console.warn('⚠️ Vídeo não está recebendo dados da câmera');
              // Tentar verificar novamente
              setTimeout(() => {
                const retryElement = videoContainerRef.current?.querySelector('video');
                if (retryElement && (retryElement.videoWidth > 0 || retryElement.videoHeight > 0)) {
                  console.log('✅ Vídeo começou a receber dados após retry');
                } else {
                  toast.error('Câmera não está enviando vídeo. Verifique se o OBS Virtual Camera está ativo e transmitindo.');
                }
              }, 2000);
            } else {
              console.log('✅ Vídeo está recebendo dados:', {
                width: videoElement.videoWidth,
                height: videoElement.videoHeight
              });
              toast.success('Preview da câmera ativo!');
            }
          } else {
            console.warn('❌ Elemento de vídeo não encontrado no container de preview');
            // Tentar novamente
            setTimeout(() => {
              const retryElement = videoContainerRef.current?.querySelector('video');
              if (retryElement) {
                console.log('✅ Elemento de vídeo encontrado na segunda tentativa');
                retryElement.style.cssText = `
                  width: 100% !important;
                  height: 100% !important;
                  object-fit: contain !important;
                  position: absolute !important;
                  top: 0 !important;
                  left: 0 !important;
                  z-index: 2 !important;
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                `;
              }
            }, 1000);
          }
        }, 500);
      }
    } catch (error: any) {
      console.error('Erro ao iniciar preview:', error);
      toast.error(`Erro ao acessar câmera: ${error.message || 'Verifique se a câmera está disponível'}`);
    }
  }, [previewTrack]);

  // Limpar preview quando componente desmontar ou câmera mudar
  useEffect(() => {
    return () => {
      if (previewTrack) {
        previewTrack.stop();
        previewTrack.close();
      }
    };
  }, [previewTrack]);

  // Atualizar selectedCamera quando cameraDeviceId mudar
  useEffect(() => {
    if (cameraDeviceId) {
      setSelectedCamera(cameraDeviceId);
      // Iniciar preview se não estiver transmitindo
      if (!isStreaming && role === 'host') {
        startPreview(cameraDeviceId);
      }
    }
  }, [cameraDeviceId, isStreaming, role, startPreview]);

  // Iniciar preview quando câmera for selecionada (apenas se não estiver transmitindo)
  useEffect(() => {
    if (selectedCamera && !isStreaming && role === 'host' && availableCameras.length > 0) {
      const cameraExists = availableCameras.some(c => c.deviceId === selectedCamera);
      if (cameraExists && !previewTrack) {
        startPreview(selectedCamera);
      }
    }
  }, [selectedCamera, isStreaming, role, availableCameras.length, startPreview, previewTrack]);

  // Carregar dispositivos disponíveis
  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const devices = await AgoraRTC.getDevices();
      const cameras = devices.filter((device: MediaDeviceInfo) => device.kind === 'videoinput');
      const microphones = devices.filter((device: MediaDeviceInfo) => device.kind === 'audioinput');

      setAvailableCameras(cameras);
      setAvailableMicrophones(microphones);

      console.log('Câmeras disponíveis:', cameras.map((c: MediaDeviceInfo) => ({ label: c.label, deviceId: c.deviceId })));

      // Detectar OBS Virtual Camera (apenas para informação, não selecionar automaticamente)
      const obsCamera = cameras.find((cam: MediaDeviceInfo) => {
        const labelLower = cam.label.toLowerCase();
        return (
          labelLower.includes('obs') ||
          labelLower.includes('virtual') ||
          labelLower.includes('obs virtual') ||
          cam.deviceId.toLowerCase().includes('obs')
        );
      });

      if (obsCamera) {
        console.log('OBS Virtual Camera detectada:', obsCamera.label);
      }

      // Se cameraDeviceId foi passado, usar ele
      if (cameraDeviceId) {
        const foundCamera = cameras.find((c: MediaDeviceInfo) => c.deviceId === cameraDeviceId);
        if (foundCamera) {
          setSelectedCamera(cameraDeviceId);
          console.log('Câmera selecionada (via prop):', foundCamera.label);
        }
      } else if (!selectedCamera && cameras.length > 0) {
        // Se não há câmera selecionada, selecionar a primeira (mas não forçar OBS)
        // O usuário pode escolher depois na interface
        // O preview será iniciado automaticamente pelo useEffect
        setSelectedCamera(cameras[0].deviceId);
        console.log('Câmera padrão selecionada (primeira da lista):', cameras[0].label);
      }

      if (microphones.length > 0 && !selectedMicrophone) {
        setSelectedMicrophone(microphones[0].deviceId);
      }
    } catch (error) {
      console.error('Erro ao carregar dispositivos:', error);
      toast.error('Erro ao carregar dispositivos de vídeo/áudio');
    }
  };

  // Inicializar cliente Agora
  useEffect(() => {
    if (!appId) {
      console.error('Agora.io App ID não configurado');
      toast.error('Agora.io App ID não configurado');
      return;
    }

    const client = AgoraRTC.createClient({
      mode: 'live',
      codec: 'vp8',
    });

    clientRef.current = client;

    // Event listeners
    client.on('user-published', handleUserPublished);
    client.on('user-unpublished', handleUserUnpublished);
    client.on('user-joined', handleUserJoined);
    client.on('user-left', handleUserLeft);
    client.on('exception', handleException);
    
    // Listener para quando o próprio host publica um stream
    client.on('stream-published', (event: any) => {
      console.log('📡 EVENTO: Stream publicado pelo próprio cliente:', {
        streamType: event.streamType,
        role,
        localTracks: client.localTracks.length
      });
    });
    
    // Logs adicionais para debug e reconexão automática
    client.on('connection-state-change', (curState: AgoraRTC.ConnectionState, revState: AgoraRTC.ConnectionState) => {
      console.log('🔄 Agora: Estado de conexão mudou:', { 
        curState, 
        revState,
        role,
        remoteUsers: client.remoteUsers.length,
        localTracks: client.localTracks.length
      });
      
      // Ignorar erros de WS_ABORT: LEAVE (são normais durante desconexões)
      if (curState === 'DISCONNECTED' && revState === 'DISCONNECTING') {
        console.log('ℹ️ Desconexão normal (leave)');
        return;
      }
      
      // Detectar desconexão e iniciar reconexão automática
      // Só reconectar se não foi uma desconexão intencional (leave)
      if ((curState === 'DISCONNECTED' || curState === 'FAILED') && 
          revState !== 'DISCONNECTED' && 
          revState !== 'DISCONNECTING' &&
          lastChannelInfoRef.current) {
        console.warn('⚠️ Conexão perdida, iniciando reconexão automática...');
        // Usar setTimeout para evitar chamar handleReconnect durante a renderização
        setTimeout(() => {
          if (clientRef.current && lastChannelInfoRef.current) {
            handleReconnect();
          }
        }, 500);
      }
    });
    
    client.on('user-info-updated', (uid: number, msg: string) => {
      console.log('ℹ️ Agora: Informações do usuário atualizadas:', { uid, msg, role });
      
      // Se for mensagem de mute, verificar se é do host
      if (role === 'audience' && (msg === 'mute-video' || msg === 'mute-audio')) {
        console.log('⚠️ Host mutou stream:', msg);
        // Isso é normal - o host pode ter mutado temporariamente
      }
    });
    
    // Listener adicional para detectar quando usuários entram
    client.on('network-quality', (_stats: any) => {
      // Este evento é disparado periodicamente, podemos usar para verificar usuários
      if (role === 'audience' && client.remoteUsers.length > 0) {
        console.log('📡 Network quality check - Usuários remotos:', client.remoteUsers.length);
      }
    });

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (clientRef.current) {
        clientRef.current.removeAllListeners();
        clientRef.current.leave();
      }
    };
  }, [appId]); // Removido handleReconnect das dependências para evitar recriação do cliente

  // Reagir quando isActive mudar (para desconectar usuários quando transmissão for encerrada)
  useEffect(() => {
    if (role === 'audience' && clientRef.current) {
      if (!isActive) {
        // Só desconectar se realmente estava conectado
        const connectionState = clientRef.current.connectionState;
        if (connectionState === 'CONNECTED' || connectionState === 'CONNECTING') {
          console.log('🛑 Transmissão foi encerrada, desconectando usuário...');
          // Limpar vídeo remoto
          if (remoteVideoTrackRef.current) {
            remoteVideoTrackRef.current.stop();
            remoteVideoTrackRef.current = null;
          }
          setHasRemoteUsers(false);
          setHasVideoElement(false);
          setIsStreaming(false);
          
          // Desconectar do canal
          clientRef.current.leave().catch(err => {
            console.error('Erro ao sair do canal:', err);
          });
        }
      }
    }
  }, [isActive, role]);

  // Auto-join para host quando o cliente estiver pronto (mas não publica automaticamente)
  useEffect(() => {
    if (role !== 'host' || !clientRef.current || !appId || !channelName || isStreaming) return;
    
    let isMounted = true;
    const joinAsHost = async () => {
      if (joiningRef.current) return;
      joiningRef.current = true;
      
      try {
        console.log('🎥 HOST: Fazendo join no canal:', channelName);
        
        await clientRef.current!.join(
          appId,
          channelName,
          token,
          uid || null
        );
        
        if (!isMounted) {
          await clientRef.current!.leave();
          return;
        }
        
        // Salvar informações para reconexão
        saveChannelInfo(channelName, appId, token, uid || null);
        
        await clientRef.current!.setClientRole('host');
        console.log('✅ HOST: Conectado ao canal (aguardando iniciar transmissão)');
        setReconnectAttempts(0); // Reset contador ao conectar
        
        // Não publica automaticamente - aguarda startStream() ser chamado
      } catch (error: any) {
        if (!isMounted) return;
        if (error.code === 'OPERATION_ABORTED' || error.message?.includes('cancel')) {
          console.log('HOST: Join cancelado');
          return;
        }
        console.error('Erro ao fazer join como host:', error);
        toast.error(`Erro ao conectar: ${error.message || 'Tente novamente'}`);
      } finally {
        if (isMounted) {
          joiningRef.current = false;
        }
      }
    };
    
    const timeoutId = setTimeout(() => {
      if (isMounted && role === 'host' && clientRef.current && appId && channelName && !isStreaming && !joiningRef.current) {
        joinAsHost();
      }
    }, 1000);
    
    return () => {
      isMounted = false;
      joiningRef.current = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [role, appId, channelName, token, uid]);

  // Auto-join para audience quando o cliente estiver pronto
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const joinAsAudience = async () => {
      // Verificações de segurança
      if (!role || role !== 'audience') return;
      if (!clientRef.current || !appId || !channelName) return;
      if (isStreaming || joiningRef.current) return;
      // Só conectar se a transmissão estiver ativa
      if (!isActive) {
        console.log('⏸️ Transmissão não está ativa, aguardando...');
        return;
      }

      // Verificar se já está conectado
      const connectionState = clientRef.current.connectionState;
      if (connectionState === 'CONNECTED' || connectionState === 'CONNECTING') {
        console.log('Audience: Já está conectado ou conectando ao canal');
        if (connectionState === 'CONNECTED') {
          setIsStreaming(true);
        }
        return;
      }

      joiningRef.current = true;

      try {
        console.log('Audience: Fazendo join no canal:', channelName);
        
        // Fazer join no canal
        await clientRef.current.join(
          appId,
          channelName,
          token,
          uid || null
        );

        if (!isMounted) {
          console.log('Audience: Componente desmontado durante join, saindo do canal');
          if (clientRef.current) {
            await clientRef.current.leave();
          }
          return;
        }
        
        // Salvar informações para reconexão
        saveChannelInfo(channelName, appId, token, uid || null);

        // Configurar role como audience
        await clientRef.current.setClientRole('audience');
        console.log('✅ Audience: Conectado ao canal e aguardando stream');
        setReconnectAttempts(0); // Reset contador ao conectar
        reconnectTimeoutRef.current = null; // Limpar timeout de reconexão
        
        // Verificar se já há usuários no canal (caso o host já esteja transmitindo)
        const checkRemoteUsers = () => {
          if (!clientRef.current) return;
          
          const remoteUsers = clientRef.current.remoteUsers;
          console.log('👥 Verificando usuários remotos no canal:', remoteUsers.length);
          
          // Atualizar estado de usuários remotos
          setHasRemoteUsers(remoteUsers.length > 0);
          
          if (remoteUsers.length > 0) {
            console.log('🔍 Host encontrado no canal! Verificando streams publicados...');
            for (const remoteUser of remoteUsers) {
              console.log('📋 Detalhes do usuário remoto:', {
                uid: remoteUser.uid,
                hasVideo: remoteUser.hasVideo,
                hasAudio: remoteUser.hasAudio,
                videoTrack: !!remoteUser.videoTrack,
                audioTrack: !!remoteUser.audioTrack,
                connectionState: clientRef.current.connectionState
              });
              
              // Se o usuário já tem vídeo publicado, fazer subscribe
              if (remoteUser.hasVideo && remoteUser.videoTrack) {
                console.log('📹 Vídeo já está publicado, fazendo subscribe...');
                handleUserPublished(remoteUser, 'video').catch(err => {
                  console.error('Erro ao fazer subscribe do vídeo:', err);
                });
              } else if (remoteUser.hasVideo) {
                console.log('⚠️ Usuário tem hasVideo=true mas videoTrack é null, aguardando evento user-published...');
              }
              
              // Se o usuário já tem áudio publicado, fazer subscribe
              if (remoteUser.hasAudio && remoteUser.audioTrack) {
                console.log('🔊 Áudio já está publicado, fazendo subscribe...');
                handleUserPublished(remoteUser, 'audio').catch(err => {
                  console.error('Erro ao fazer subscribe do áudio:', err);
                });
              }
            }
          } else {
            console.log('⏳ Nenhum usuário no canal ainda, aguardando host...');
          }
        };
        
        // Verificar imediatamente
        checkRemoteUsers();
        
        // Verificar periodicamente (caso o host entre depois)
        const intervalId = setInterval(() => {
          if (isMounted && clientRef.current && clientRef.current.connectionState === 'CONNECTED') {
            checkRemoteUsers();
          } else {
            clearInterval(intervalId);
          }
        }, 2000);
        
        // Limpar intervalo quando componente desmontar
        setTimeout(() => {
          if (!isMounted) {
            clearInterval(intervalId);
          }
        }, 30000); // Limpar após 30 segundos
        
        if (isMounted) {
          setIsStreaming(true);
        }
      } catch (error: any) {
        if (!isMounted) {
          console.log('Audience: Join cancelado - componente desmontado');
          return;
        }
        
        // Ignorar erros de cancelamento (normal quando componente desmonta)
        if (error.code === 'OPERATION_ABORTED' || 
            error.message?.includes('cancel') || 
            error.message?.includes('aborted')) {
          console.log('Audience: Join foi cancelado (normal durante desmontagem)');
          return;
        }
        
        console.error('Erro ao fazer join como audience:', error);
        if (isMounted) {
          toast.error(`Erro ao conectar: ${error.message || 'Tente atualizar a página'}`);
        }
      } finally {
        if (isMounted) {
          joiningRef.current = false;
        }
      }
    };

    // Delay para garantir que o cliente está totalmente inicializado
    // Só tentar conectar se isActive for true E não estiver já conectado
    if (isActive && !isStreaming && !joiningRef.current) {
      timeoutId = setTimeout(() => {
        if (isMounted && role === 'audience' && clientRef.current && appId && channelName) {
          // Verificar se já está conectado antes de tentar conectar novamente
          const connectionState = clientRef.current.connectionState;
          if (connectionState !== 'CONNECTED' && connectionState !== 'CONNECTING') {
            joinAsAudience();
          }
        }
      }, 1000);
    }

    return () => {
      isMounted = false;
      joiningRef.current = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [role, appId, channelName, token, uid, isActive, isStreaming]);

  const handleUserPublished = async (
    user: AgoraRTC.IAgoraRTCRemoteUser,
    mediaType: 'audio' | 'video'
  ): Promise<void> => {
    try {
      console.log('🎥 EVENTO: Usuário publicou stream:', { 
        uid: user.uid, 
        mediaType,
        hasVideo: !!user.videoTrack,
        hasAudio: !!user.audioTrack,
        role: role
      });
      
      if (!clientRef.current) {
        console.error('❌ Cliente não está disponível para subscribe');
        return;
      }
      
      await clientRef.current.subscribe(user, mediaType);
      console.log('✅ Subscribe realizado com sucesso para:', mediaType);

      if (mediaType === 'video') {
        const remoteVideoTrack = user.videoTrack;
        if (remoteVideoTrack) {
          console.log('Reproduzindo vídeo remoto...');
          remoteVideoTrackRef.current = remoteVideoTrack;
          
          // Atualizar estado quando vídeo for recebido
          if (role === 'audience') {
            setHasRemoteUsers(true);
            setIsStreaming(true); // Marcar como streaming quando receber vídeo
          }
          
          // Aguardar container estar pronto
          if (remoteVideoContainerRef.current) {
            try {
              await remoteVideoTrack.play(remoteVideoContainerRef.current);
              console.log('✅ Vídeo remoto reproduzido com sucesso');
              
              // Aplicar estilos para garantir visibilidade - com retry
              const applyVideoStyles = (attempt = 1) => {
                const videoElement = remoteVideoContainerRef.current?.querySelector('video');
                if (videoElement) {
                  videoElement.style.cssText = `
                    width: 100% !important;
                    height: 100% !important;
                    max-width: 100% !important;
                    max-height: 100% !important;
                    object-fit: contain !important;
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    z-index: 20 !important;
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    background: transparent !important;
                    pointer-events: auto !important;
                  `;
                  
                  // Forçar play se estiver pausado
                  if (videoElement.paused) {
                    videoElement.play().catch((err: unknown) => {
                      console.error('Erro ao forçar play do vídeo:', err);
                    });
                  }
                  
                  // Verificar se o vídeo tem dimensões válidas
                  if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                    setHasVideoElement(true);
                    console.log('✅ Vídeo remoto renderizado com sucesso:', {
                      width: videoElement.videoWidth,
                      height: videoElement.videoHeight,
                      playing: !videoElement.paused,
                      readyState: videoElement.readyState
                    });
                  } else if (attempt < 5) {
                    // Tentar novamente se o vídeo ainda não tem dimensões
                    setTimeout(() => applyVideoStyles(attempt + 1), 300);
                  }
                } else if (attempt < 5) {
                  // Tentar novamente se o elemento ainda não existe
                  setTimeout(() => applyVideoStyles(attempt + 1), 200);
                } else {
                  console.warn('⚠️ Elemento de vídeo não encontrado após múltiplas tentativas');
                }
              };
              
              // Aplicar estilos imediatamente e com retry
              setTimeout(() => applyVideoStyles(), 100);
              setTimeout(() => applyVideoStyles(), 500);
              setTimeout(() => applyVideoStyles(), 1000);
            } catch (playError: any) {
              console.error('❌ Erro ao reproduzir vídeo remoto:', playError);
              // Tentar novamente após um delay
              setTimeout(async () => {
                try {
                  if (remoteVideoContainerRef.current && remoteVideoTrackRef.current) {
                    await remoteVideoTrackRef.current.play(remoteVideoContainerRef.current);
                    console.log('✅ Vídeo remoto reproduzido após retry');
                    setHasVideoElement(true);
                  }
                } catch (retryError) {
                  console.error('❌ Erro no retry de reprodução:', retryError);
                }
              }, 1000);
            }
          } else {
            console.warn('⚠️ Container de vídeo remoto não está disponível');
            // Tentar novamente quando o container estiver disponível
            setTimeout(async () => {
              if (remoteVideoContainerRef.current && remoteVideoTrackRef.current) {
                try {
                  await remoteVideoTrackRef.current.play(remoteVideoContainerRef.current);
                  console.log('✅ Vídeo remoto reproduzido após container ficar disponível');
                  setHasVideoElement(true);
                } catch (err) {
                  console.error('Erro ao reproduzir após container disponível:', err);
                }
              }
            }, 500);
          }
        } else {
          console.warn('Track de vídeo remoto não encontrado');
        }
      }

      if (mediaType === 'audio') {
        const remoteAudioTrack = user.audioTrack;
        if (remoteAudioTrack) {
          try {
            console.log('🔊 Iniciando reprodução de áudio remoto...', {
              trackId: remoteAudioTrack.getTrackId(),
              enabled: remoteAudioTrack.enabled,
              muted: remoteAudioTrack.muted
            });

            // Garantir que o áudio está habilitado e não mutado
            if (remoteAudioTrack.setVolume) {
              remoteAudioTrack.setVolume(100); // Volume máximo
            }
            
            // Verificar estado do áudio (read-only para tracks remotos)
            // Não podemos controlar muted/enabled em tracks remotos - isso é controlado pelo remetente (OBS)
            if (remoteAudioTrack.muted) {
              console.log('⚠️ Áudio remoto está mutado no remetente (OBS). Não é possível desmutar remotamente.');
            }

            if (remoteAudioTrack.enabled === false) {
              console.log('⚠️ Áudio remoto está desabilitado no remetente. Tentando reproduzir mesmo assim...');
            }
            
            // Reproduzir o áudio
            await remoteAudioTrack.play();
            console.log('✅ Áudio remoto reproduzido com sucesso', {
              trackId: remoteAudioTrack.getTrackId(),
              enabled: remoteAudioTrack.enabled,
              muted: remoteAudioTrack.muted
            });

            // Escutar mudanças no estado do áudio (quando OBS muta/desmuta)
            remoteAudioTrack.on('track-ended', () => {
              console.log('⚠️ Áudio remoto foi encerrado');
            });
          } catch (error: any) {
            console.error('❌ Erro ao reproduzir áudio remoto:', error);
            // Tentar novamente após um delay
            setTimeout(async () => {
              try {
                if (user.audioTrack) {
                  // Não podemos controlar muted/enabled em tracks remotos
                  // Apenas tentar reproduzir novamente
                  await user.audioTrack.play();
                  console.log('✅ Áudio remoto reproduzido após retry');
                }
              } catch (retryError) {
                console.error('❌ Erro ao reproduzir áudio após retry:', retryError);
              }
            }, 1000);
          }
        } else {
          console.warn('⚠️ Track de áudio remoto não encontrado');
        }
      }
    } catch (error: any) {
      console.error('Erro ao fazer subscribe:', error);
      toast.error(`Erro ao conectar ao stream: ${error.message || 'Tente atualizar a página'}`);
    }
  };

  const handleUserUnpublished = (
    user: AgoraRTC.IAgoraRTCRemoteUser,
    mediaType: 'audio' | 'video'
  ) => {
    if (mediaType === 'video') {
      remoteVideoTrackRef.current?.stop();
      remoteVideoTrackRef.current = null;
      
      // Atualizar estado quando vídeo for removido
      if (role === 'audience' && clientRef.current) {
        const hasOtherUsers = clientRef.current.remoteUsers.some(u => u.uid !== user.uid && u.hasVideo);
        if (!hasOtherUsers) {
          setHasRemoteUsers(false);
          setIsStreaming(false);
        }
      }
    }
    
    if (mediaType === 'audio') {
      console.log('🔇 Áudio remoto foi removido (possivelmente mutado pelo OBS)');
      // Quando o áudio é removido, pode ser que o OBS mutou
      // O Agora SDK vai publicar novamente quando o OBS desmutar
    }
  };

  const handleUserJoined = (user: AgoraRTC.IAgoraRTCRemoteUser) => {
    console.log('🎉 EVENTO: Usuário entrou no canal:', { 
      uid: user.uid, 
      hasAudio: !!user.hasAudio, 
      hasVideo: !!user.hasVideo,
      videoTrack: !!user.videoTrack,
      audioTrack: !!user.audioTrack,
      role: role
    });
    
    // Atualizar estado de usuários remotos
    if (role === 'audience') {
      setHasRemoteUsers(true);
    }
    
    // Se o usuário já tem tracks publicados, tentar fazer subscribe
    if (user.hasVideo && user.videoTrack) {
      console.log('📹 Usuário já tem vídeo publicado ao entrar, fazendo subscribe...');
      handleUserPublished(user, 'video').catch(err => {
        console.error('Erro ao fazer subscribe do vídeo já publicado:', err);
      });
    } else if (user.hasVideo) {
      console.log('⏳ Usuário tem hasVideo=true mas videoTrack ainda não está disponível, aguardando user-published...');
    }
    
    if (user.hasAudio && user.audioTrack) {
      console.log('🔊 Usuário já tem áudio publicado ao entrar, fazendo subscribe...');
      handleUserPublished(user, 'audio').catch(err => {
        console.error('Erro ao fazer subscribe do áudio já publicado:', err);
      });
    }
  };

  const handleUserLeft = (user: AgoraRTC.IAgoraRTCRemoteUser) => {
    console.log('Usuário saiu:', user);
    if (remoteVideoTrackRef.current) {
      remoteVideoTrackRef.current.stop();
      remoteVideoTrackRef.current = null;
    }
    
    // Atualizar estado de usuários remotos
    if (role === 'audience' && clientRef.current) {
      setHasRemoteUsers(clientRef.current.remoteUsers.length > 0);
    }
  };

  const handleException = (exception: any) => {
    // Ignorar avisos não críticos
    const nonCriticalCodes = [
      2001, // AUDIO_INPUT_LEVEL_TOO_LOW - aviso de nível de áudio de entrada baixo (normal com OBS)
      2002, // AUDIO_OUTPUT_LEVEL_TOO_LOW - aviso de nível de áudio de saída baixo (normal)
      2003, // SEND_AUDIO_BITRATE_TOO_LOW - aviso de bitrate de áudio muito baixo (normal com OBS)
      4001, // AUDIO_INPUT_LEVEL_TOO_LOW_RECOVER - aviso de recuperação de nível de áudio de entrada (normal com OBS)
      4002, // AUDIO_OUTPUT_LEVEL_TOO_LOW_RECOVER - aviso de recuperação de nível de áudio de saída (normal)
      4003, // AUDIO_OUTPUT_LEVEL_TOO_LOW - apenas aviso
    ];
    
    if (nonCriticalCodes.includes(exception.code)) {
      // Apenas logar, não mostrar erro ao usuário
      console.log('ℹ️ Aviso do Agora (não crítico):', exception.msg || exception.code);
      return;
    }
    
    console.error('Exceção do Agora:', exception);
    if (onStreamError) {
      onStreamError(new Error(exception.msg || 'Erro no stream'));
    }
  };

  const startStream = async () => {
    if (!clientRef.current || !appId) {
      toast.error('Cliente não inicializado');
      return;
    }

    // Se não for host, não pode iniciar transmissão
    if (role !== 'host') {
      console.warn('Tentativa de iniciar stream com role audience. Role deve ser host.');
      toast.error('Apenas o host pode iniciar a transmissão');
      return;
    }

    if (!selectedCamera) {
      toast.error('Por favor, selecione uma câmera antes de iniciar a transmissão');
      return;
    }

    // Verificar se a câmera selecionada ainda está disponível
    const cameraStillAvailable = availableCameras.some(c => c.deviceId === selectedCamera);
    if (!cameraStillAvailable) {
      toast.error('A câmera selecionada não está mais disponível. Por favor, selecione outra.');
      // Recarregar dispositivos
      await loadDevices();
      return;
    }

    try {
      console.log('🎬 Iniciando transmissão...', {
        channelName,
        role,
        selectedCamera,
        appId: appId ? 'configurado' : 'não configurado',
        connectionState: clientRef.current.connectionState
      });

      // Verificar se já está conectado
      if (clientRef.current.connectionState !== 'CONNECTED') {
        console.log('🔌 Host não está conectado, fazendo join...');
        // Conectar ao canal com role correto
        await clientRef.current.join(
          appId,
          channelName,
          token,
          uid || null
        );
        
        // Configurar role após join (importante para modo live)
        await clientRef.current.setClientRole('host');
        console.log('✅ Host conectado ao canal e role configurado');
      } else {
        console.log('✅ Host já está conectado ao canal, apenas publicando...');
        // Garantir que o role está correto
        await clientRef.current.setClientRole('host');
      }

      console.log('📊 Estado antes de publicar:', {
        connectionState: clientRef.current.connectionState,
        localTracks: clientRef.current.localTracks.length,
        remoteUsers: clientRef.current.remoteUsers.length
      });
      console.log('📊 Estado da conexão:', {
        connectionState: clientRef.current.connectionState,
        remoteUsers: clientRef.current.remoteUsers.length,
        localTracks: clientRef.current.localTracks.length
      });

      if (role === 'host') {
        console.log('🎥 HOST: Preparando para publicar stream...');
        // Criar tracks locais para host
        if (selectedCamera) {
          console.log('Criando track de vídeo com câmera:', selectedCamera);
          console.log('Container disponível:', !!videoContainerRef.current);
          
          try {
            // Parar preview se existir
            if (previewTrack) {
              previewTrack.stop();
              previewTrack.close();
              setPreviewTrack(null);
            }
            
            // Criar o track de vídeo
            const videoTrack = await AgoraRTC.createCameraVideoTrack({
              cameraId: selectedCamera,
              encoderConfig: {
                width: 1920,
                height: 1080,
                frameRate: 30,
                bitrateMax: 4000,
              },
            });

            console.log('Track de vídeo criado com sucesso:', {
              trackId: videoTrack.getTrackId(),
              enabled: videoTrack.enabled,
              isPlaying: videoTrack.isPlaying,
              muted: videoTrack.muted
            });
            
            // GARANTIR que o track está habilitado e não mutado antes de salvar
            if (!videoTrack.enabled) {
              console.log('⚠️ Track criado desabilitado, habilitando...');
              await videoTrack.setEnabled(true);
            }
            
            // Garantir que não está mutado
            if (videoTrack.muted) {
              console.log('⚠️ Track criado mutado, desmutando...');
              await videoTrack.setMuted(false);
            }
            
            console.log('✅ Track de vídeo configurado:', {
              enabled: videoTrack.enabled,
              muted: videoTrack.muted
            });
            
            // Salvar referência
            localVideoTrackRef.current = videoTrack;
            
            // Garantir que o estado local está correto
            setIsVideoOff(false);
            
            // Configurar listeners do track
            videoTrack.on('track-ended', () => {
              console.log('⚠️ Track de vídeo foi encerrado');
            });
            
            // Monitorar mudanças no estado enabled/muted
            const checkTrackState = () => {
              if (videoTrack.enabled !== true) {
                console.warn('⚠️ Track de vídeo foi desabilitado! Reabilitando...');
                videoTrack.setEnabled(true).catch((err: unknown) => {
                  console.error('Erro ao reabilitar track:', err);
                });
              }
              if (videoTrack.muted === true) {
                console.warn('⚠️ Track de vídeo foi mutado! Desmutando...');
                videoTrack.setMuted(false).catch((err: unknown) => {
                  console.error('Erro ao desmutar track:', err);
                });
              }
            };
            
            // Verificar periodicamente o estado do track
            const trackStateInterval = setInterval(() => {
              if (localVideoTrackRef.current === videoTrack && isStreaming) {
                checkTrackState();
              } else {
                clearInterval(trackStateInterval);
              }
            }, 1000);
            
            // Verificar estado do track antes de publicar
            console.log('📋 Estado do track antes de publicar:', {
              trackId: videoTrack.getTrackId(),
              enabled: videoTrack.enabled,
              isPlaying: videoTrack.isPlaying,
              muted: videoTrack.muted
            });
            
            // GARANTIR que o track está habilitado e não mutado ANTES de publicar
            if (!videoTrack.enabled) {
              console.log('⚠️ Track está desabilitado, habilitando ANTES de publicar...');
              await videoTrack.setEnabled(true);
            }
            
            if (videoTrack.muted) {
              console.log('⚠️ Track está mutado, desmutando ANTES de publicar...');
              await videoTrack.setMuted(false);
            }
            
            // Verificar novamente após garantir
            console.log('✅ Estado do track após garantir (antes de publicar):', {
              enabled: videoTrack.enabled,
              muted: videoTrack.muted
            });
            
            // Publicar primeiro
            console.log('📤 Publicando vídeo no canal...', {
              channelName,
              trackId: videoTrack.getTrackId(),
              connectionState: clientRef.current.connectionState,
              role: clientRef.current.role
            });
            
            await clientRef.current.publish(videoTrack);
            console.log('✅ Vídeo publicado no canal com sucesso!');
            
            // Verificar IMEDIATAMENTE após publicar se o track ainda está habilitado
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log('🔍 Verificação imediata após publicar:', {
              enabled: videoTrack.enabled,
              muted: videoTrack.muted,
              isPlaying: videoTrack.isPlaying
            });
            
            // Se foi mutado/desabilitado, corrigir imediatamente
            if (!videoTrack.enabled) {
              console.warn('⚠️ Track foi desabilitado após publicar! Reabilitando...');
              await videoTrack.setEnabled(true);
            }
            if (videoTrack.muted) {
              console.warn('⚠️ Track foi mutado após publicar! Desmutando...');
              await videoTrack.setMuted(false);
            }
            
            // Verificar se foi publicado corretamente
            const localTracks = clientRef.current.localTracks;
            console.log('📊 Tracks locais publicados:', {
              video: localTracks.filter((t: any) => t.trackMediaType === 'video').length,
              audio: localTracks.filter((t: any) => t.trackMediaType === 'audio').length,
              total: localTracks.length,
              tracks: localTracks.map((t: AgoraRTC.ILocalVideoTrack | AgoraRTC.ILocalAudioTrack) => {
                const track = t as any;
                return {
                  type: track.trackMediaType || 'unknown',
                  enabled: t.enabled,
                  muted: t.muted,
                  trackId: t.getTrackId()
                };
              })
            });
            
            // Verificar estado do cliente após publicar
            console.log('📊 Estado do cliente após publicar vídeo:', {
              connectionState: clientRef.current.connectionState,
              role: clientRef.current.role,
              remoteUsers: clientRef.current.remoteUsers.length
            });
            
            // Função para tentar reproduzir o vídeo
            const tryPlayVideo = async (attempt = 1) => {
              if (!videoContainerRef.current) {
                console.warn(`Tentativa ${attempt}: Container não disponível`);
                if (attempt < 5) {
                  setTimeout(() => tryPlayVideo(attempt + 1), 200);
                }
                return;
              }
              
              try {
                await videoTrack.play(videoContainerRef.current, { mirror: false });
                console.log(`Vídeo iniciado no container com sucesso (tentativa ${attempt})`);
                
                // Forçar atualização do estado
                setIsVideoOff(false);
                
                // Verificar se o vídeo está realmente sendo reproduzido
                setTimeout(() => {
                  const videoElement = videoContainerRef.current?.querySelector('video');
                  if (videoElement) {
                    console.log('Elemento de vídeo encontrado:', {
                      playing: !videoElement.paused,
                      readyState: videoElement.readyState,
                      videoWidth: videoElement.videoWidth,
                      videoHeight: videoElement.videoHeight
                    });
                    
                    if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
                      console.warn('Vídeo não está recebendo dados da câmera');
                      toast.error('Câmera não está enviando vídeo. Verifique se o OBS Virtual Camera está ativo e transmitindo.');
                    }
                  } else {
                    console.warn('Elemento de vídeo não encontrado no container');
                  }
                }, 1000);
              } catch (playError: any) {
                console.error(`Erro ao reproduzir vídeo (tentativa ${attempt}):`, playError);
                if (attempt < 5) {
                  setTimeout(() => tryPlayVideo(attempt + 1), 300);
                } else {
                  toast.error('Erro ao exibir vídeo. Verifique o console para mais detalhes.');
                }
              }
            };
            
            // Iniciar tentativa de reprodução
            await tryPlayVideo(1);
          } catch (videoError: unknown) {
            const error = videoError as Error & { code?: string };
            console.error('Erro ao criar track de vídeo:', error);
            console.error('Detalhes do erro:', {
              name: error.name,
              message: error.message,
              code: error.code
            });
            toast.error(`Erro ao acessar câmera: ${error.message || 'Verifique se a câmera está disponível e se o OBS Virtual Camera está ativo'}`);
            throw error;
          }
        } else {
          console.warn('Nenhuma câmera selecionada');
          toast.error('Por favor, selecione uma câmera antes de iniciar');
        }

        if (selectedMicrophone) {
          const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
            microphoneId: selectedMicrophone,
          });

          console.log('Track de áudio criado:', {
            trackId: audioTrack.getTrackId(),
            enabled: audioTrack.enabled,
            muted: audioTrack.muted
          });
          
          // GARANTIR que o track está habilitado e não mutado
          if (!audioTrack.enabled) {
            console.log('⚠️ Track de áudio está desabilitado, habilitando...');
            await audioTrack.setEnabled(true);
          }
          
          if (audioTrack.muted) {
            console.log('⚠️ Track de áudio está mutado, desmutando...');
            await audioTrack.setMuted(false);
          }
          
          // Aplicar volume inicial
          if (audioTrack.setVolume) {
            audioTrack.setVolume(cameraAudioVolume);
          }
          
          localAudioTrackRef.current = audioTrack;
          
          // Garantir que o estado local está correto
          setIsMuted(false);
          
          console.log('📤 Publicando áudio da câmera no canal...', {
            trackId: audioTrack.getTrackId(),
            enabled: audioTrack.enabled,
            muted: audioTrack.muted,
            volume: cameraAudioVolume
          });
          await clientRef.current.publish(audioTrack);
          console.log('✅ Áudio da câmera publicado no canal com sucesso!');
          
          // Verificar IMEDIATAMENTE após publicar se o track ainda está habilitado
          await new Promise(resolve => setTimeout(resolve, 100));
          console.log('🔍 Verificação imediata após publicar áudio:', {
            enabled: audioTrack.enabled,
            muted: audioTrack.muted
          });
          
          // Se foi mutado/desabilitado, corrigir imediatamente
          if (!audioTrack.enabled) {
            console.warn('⚠️ Track de áudio foi desabilitado após publicar! Reabilitando...');
            await audioTrack.setEnabled(true);
          }
          if (audioTrack.muted) {
            console.warn('⚠️ Track de áudio foi mutado após publicar! Desmutando...');
            await audioTrack.setMuted(false);
          }
        }

        // Áudio do sistema/desktop será capturado manualmente pelo botão no painel de controles
        // (não captura automaticamente para não pedir permissão sem o admin querer)
      }

      setIsStreaming(true);
      
      // Aguardar um pouco para garantir que os tracks foram publicados
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verificar novamente após um delay
      const finalCheck = () => {
        if (!clientRef.current) return;
        
        const localTracks = clientRef.current.localTracks;
        console.log('🔍 Verificação final após publicar:', {
          role,
          channelName,
          connectionState: clientRef.current.connectionState,
          localTracksCount: localTracks.length,
          localTracks: localTracks.map((t: AgoraRTC.ILocalVideoTrack | AgoraRTC.ILocalAudioTrack) => ({
            type: (t as any).trackMediaType,
            enabled: (t as any).isPlaying || t.enabled,
            muted: t.muted,
            trackId: t.getTrackId()
          })),
          remoteUsers: clientRef.current.remoteUsers.length,
          hasVideo: !!localVideoTrackRef.current,
          hasAudio: !!localAudioTrackRef.current,
          videoTrackEnabled: localVideoTrackRef.current?.enabled,
          audioTrackEnabled: localAudioTrackRef.current?.enabled
        });
        
        // Se os tracks não foram publicados, tentar novamente
        if (localTracks.length === 0 && localVideoTrackRef.current && clientRef.current) {
          console.warn('⚠️ Nenhum track local encontrado após publicar. Tentando republicar...');
          if (localVideoTrackRef.current) {
            clientRef.current.publish(localVideoTrackRef.current).catch((err: unknown) => {
              console.error('Erro ao republicar vídeo:', err);
            });
          }
          if (localAudioTrackRef.current && clientRef.current) {
            clientRef.current.publish(localAudioTrackRef.current).catch((err: unknown) => {
              console.error('Erro ao republicar áudio:', err);
            });
          }
        }
      };
      
      finalCheck();
      
      // Verificar novamente após 2 segundos
      setTimeout(finalCheck, 2000);
      
      // Log final do estado
      console.log('🎉 Stream iniciado com sucesso!', {
        role,
        channelName,
        connectionState: clientRef.current.connectionState,
        localTracks: clientRef.current.localTracks.length,
        remoteUsers: clientRef.current.remoteUsers.length,
        hasVideo: !!localVideoTrackRef.current,
        hasAudio: !!localAudioTrackRef.current
      });
      
      if (onStreamReady) {
        onStreamReady();
      }
      toast.success('Transmissão iniciada!');
    } catch (error: any) {
      console.error('Erro ao iniciar stream:', error);
      toast.error(error.message || 'Erro ao iniciar transmissão');
      if (onStreamError) {
        onStreamError(error);
      }
    }
  };

  // Auto-iniciar stream quando startStreaming for true (chamado pelo botão "Iniciar Transmissão")
  useEffect(() => {
    if (startStreaming && role === 'host' && !isStreaming && clientRef.current && appId && channelName && selectedCamera) {
      console.log('🚀 Auto-iniciando stream (startStreaming=true)...');
      const timer = setTimeout(() => {
        startStream().catch(err => {
          console.error('Erro ao auto-iniciar stream:', err);
          if (onStreamError) {
            onStreamError(err);
          }
        });
      }, 500); // Pequeno delay para garantir que tudo está pronto
      
      return () => clearTimeout(timer);
    }
  }, [startStreaming, role, isStreaming, appId, channelName, selectedCamera]);

  const stopStream = async () => {
    try {
      console.log('🛑 Parando stream e desligando câmera...');
      
      // Parar e fechar tracks locais completamente
      if (localVideoTrackRef.current) {
        try {
          localVideoTrackRef.current.stop();
          localVideoTrackRef.current.close();
        } catch (err) {
          console.error('Erro ao parar vídeo:', err);
        }
        localVideoTrackRef.current = null;
      }

      if (localAudioTrackRef.current) {
        try {
          localAudioTrackRef.current.stop();
          localAudioTrackRef.current.close();
        } catch (err) {
          console.error('Erro ao parar áudio:', err);
        }
        localAudioTrackRef.current = null;
      }
      
      if (screenAudioTrackRef.current) {
        try {
          screenAudioTrackRef.current.stop();
          screenAudioTrackRef.current.close();
        } catch (err) {
          console.error('Erro ao parar áudio da tela:', err);
        }
        screenAudioTrackRef.current = null;
      }

      // Parar preview track também
      if (previewTrack) {
        try {
          previewTrack.stop();
          previewTrack.close();
        } catch (err) {
          console.error('Erro ao parar preview:', err);
        }
        setPreviewTrack(null);
      }

      // Parar tracks remotos
      if (remoteVideoTrackRef.current) {
        try {
          remoteVideoTrackRef.current.stop();
        } catch (err) {
          console.error('Erro ao parar vídeo remoto:', err);
        }
        remoteVideoTrackRef.current = null;
      }

      // Sair do canal
      if (clientRef.current) {
        try {
          await clientRef.current.leave();
        } catch (err) {
          console.error('Erro ao sair do canal:', err);
        }
      }

      // Parar áudio do desktop se estiver ativo
      if (desktopAudioStreamRef.current) {
        try {
          desktopAudioStreamRef.current.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.error('Erro ao parar stream de áudio do desktop:', err);
        }
        desktopAudioStreamRef.current = null;
      }

      // Resetar estados
      setIsStreaming(false);
      setIsMuted(false);
      setIsVideoOff(false);
      setHasRemoteUsers(false);
      setShowAudioControls(false);
      setIsCapturingDesktopAudio(false);
      
      // Parar todos os MediaStreams que possam estar ativos
      // Isso garante que a câmera seja completamente desligada
      try {
        const streams = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streams.getTracks().forEach(track => {
          track.stop();
          console.log('🛑 Track de mídia parado:', track.kind);
        });
      } catch (err) {
        // Não é um erro crítico se não houver streams ativos
        console.log('ℹ️ Nenhum stream de mídia ativo para parar');
      }

      toast.success('Transmissão encerrada e câmera desligada');
    } catch (error) {
      console.error('Erro ao parar stream:', error);
      toast.error('Erro ao encerrar transmissão');
    }
  };

  const toggleMute = async () => {
    if (localAudioTrackRef.current && isStreaming) {
      await localAudioTrackRef.current.setMuted(!isMuted);
      setIsMuted(!isMuted);
      console.log('🔊 Áudio mutado/desmutado:', !isMuted);
    }
  };

  // Função para ajustar volume do áudio da câmera
  const handleCameraAudioVolumeChange = (volume: number) => {
    setCameraAudioVolume(volume);
    if (localAudioTrackRef.current && localAudioTrackRef.current.setVolume) {
      localAudioTrackRef.current.setVolume(volume);
      console.log('🔊 Volume do áudio da câmera ajustado para:', volume);
    }
  };

  // Função para ajustar volume do áudio da tela compartilhada
  const handleScreenAudioVolumeChange = (volume: number) => {
    setScreenAudioVolume(volume);
    if (screenAudioTrackRef.current && screenAudioTrackRef.current.setVolume) {
      screenAudioTrackRef.current.setVolume(volume);
      console.log('🔊 Volume do áudio da tela compartilhada ajustado para:', volume);
    }
  };

  // Função para capturar áudio do sistema/desktop (incluindo áudio de vídeos do OBS)
  const captureDesktopAudio = async () => {
    if (!clientRef.current || !isStreaming) {
      toast.error('Inicie a transmissão primeiro');
      return;
    }

    // Verificar se o navegador suporta getDisplayMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      toast.error('Seu navegador não suporta captura de áudio do sistema. Use Chrome, Edge ou Firefox mais recente.');
      return;
    }

    // Verificar se o Agora SDK suporta createCustomAudioTrack
    if (!(AgoraRTC as any).createCustomAudioTrack) {
      toast.error(
        'Funcionalidade não suportada. O Agora SDK não possui createCustomAudioTrack. ' +
        'Configure o áudio diretamente no OBS Studio usando "Desktop Audio" ou "Audio Output Capture".',
        { duration: 6000 }
      );
      return;
    }

    try {
      console.log('🎤 Solicitando permissão para capturar áudio do sistema...');
      
      // Pedir permissão para capturar áudio da tela/sistema
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: false, 
        audio: true 
      });
      
      const screenAudioTracks = screenStream.getAudioTracks();
      if (screenAudioTracks.length === 0) {
        toast.error('Nenhum áudio detectado. Certifique-se de selecionar "Compartilhar áudio" na janela de compartilhamento.');
        screenStream.getTracks().forEach(track => track.stop());
        return;
      }

      console.log('🎤 Áudio do sistema/desktop detectado!', {
        trackCount: screenAudioTracks.length,
        trackLabel: screenAudioTracks[0].label
      });

      // Salvar referência do stream para poder parar depois
      desktopAudioStreamRef.current = screenStream;

      // Criar track de áudio do Agora usando createCustomAudioTrack
      let screenAudioTrack: any;
      try {
        screenAudioTrack = await (AgoraRTC as any).createCustomAudioTrack({
          mediaStreamTrack: screenAudioTracks[0]
        });
      } catch (createError: any) {
        console.error('❌ Erro ao criar track customizado:', createError);
        toast.error(
          'Erro ao criar track de áudio. O método createCustomAudioTrack pode não estar disponível nesta versão do Agora SDK. ' +
          'Configure o áudio diretamente no OBS Studio.',
          { duration: 6000 }
        );
        screenStream.getTracks().forEach(track => track.stop());
        return;
      }

      // Verificar se o track foi criado corretamente
      if (!screenAudioTrack || typeof screenAudioTrack.getTrackId !== 'function') {
        toast.error('Track de áudio criado incorretamente. Configure o áudio diretamente no OBS Studio.');
        screenStream.getTracks().forEach(track => track.stop());
        return;
      }

      // Aplicar volume inicial
      if (screenAudioTrack.setVolume && typeof screenAudioTrack.setVolume === 'function') {
        try {
          screenAudioTrack.setVolume(screenAudioVolume);
        } catch (volError) {
          console.warn('⚠️ Não foi possível ajustar volume inicial:', volError);
        }
      }

      screenAudioTrackRef.current = screenAudioTrack;
      setIsCapturingDesktopAudio(true);
      
      console.log('📤 Publicando áudio do sistema/desktop no canal...', {
        trackId: screenAudioTrack.getTrackId(),
        volume: screenAudioVolume
      });
      
      try {
        await clientRef.current.publish(screenAudioTrack);
        console.log('✅ Áudio do sistema/desktop publicado no canal com sucesso!');
        toast.success('Áudio do sistema capturado! Agora o áudio de vídeos do OBS será transmitido.');
      } catch (publishError: any) {
        console.error('❌ Erro ao publicar áudio:', publishError);
        toast.error('Erro ao publicar áudio. Verifique o console para mais detalhes.');
        screenAudioTrack.stop();
        screenAudioTrack.close();
        screenStream.getTracks().forEach(track => track.stop());
        screenAudioTrackRef.current = null;
        setIsCapturingDesktopAudio(false);
        return;
      }
      
      // Escutar quando o áudio for encerrado
      screenAudioTracks[0].addEventListener('ended', () => {
        console.log('⚠️ Áudio do sistema foi encerrado');
        stopDesktopAudio();
      });
    } catch (error: any) {
      console.error('❌ Erro ao capturar áudio do sistema:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Permissão negada. Por favor, permita o compartilhamento de áudio.');
      } else if (error.name === 'NotFoundError') {
        toast.error('Nenhuma fonte de áudio encontrada.');
      } else if (error.name === 'NotSupportedError') {
        toast.error(
          'Funcionalidade não suportada neste navegador ou versão do Agora SDK. ' +
          'Configure o áudio diretamente no OBS Studio usando "Desktop Audio" ou "Audio Output Capture".',
          { duration: 6000 }
        );
      } else {
        toast.error('Erro ao capturar áudio: ' + (error.message || error.name || 'Erro desconhecido'));
      }
    }
  };

  // Função para parar captura de áudio do sistema
  const stopDesktopAudio = async () => {
    try {
      if (screenAudioTrackRef.current && clientRef.current) {
        await clientRef.current.unpublish(screenAudioTrackRef.current);
        screenAudioTrackRef.current.stop();
        screenAudioTrackRef.current.close();
        screenAudioTrackRef.current = null;
      }

      if (desktopAudioStreamRef.current) {
        desktopAudioStreamRef.current.getTracks().forEach(track => track.stop());
        desktopAudioStreamRef.current = null;
      }

      setIsCapturingDesktopAudio(false);
      toast.success('Captura de áudio do sistema encerrada');
      console.log('🛑 Áudio do sistema parado');
    } catch (error) {
      console.error('Erro ao parar áudio do sistema:', error);
    }
  };

  const toggleVideo = async () => {
    if (localVideoTrackRef.current && isStreaming) {
      await localVideoTrackRef.current.setEnabled(isVideoOff);
      setIsVideoOff(!isVideoOff);
      console.log('📹 Vídeo desabilitado/habilitado:', !isVideoOff);
    }
  };


  const switchCamera = async (deviceId: string) => {
    setSelectedCamera(deviceId);
    
    // Se já está transmitindo, trocar a câmera no track ativo
    if (localVideoTrackRef.current && role === 'host' && isStreaming) {
      try {
        await localVideoTrackRef.current.setDevice(deviceId);
        toast.success('Câmera alterada durante transmissão');
      } catch (error) {
        console.error('Erro ao trocar câmera:', error);
        toast.error('Erro ao trocar câmera. Tente parar e reiniciar a transmissão.');
      }
    } else {
      // Se não está transmitindo, apenas atualizar preview
      await startPreview(deviceId);
      toast.success('Câmera selecionada');
    }
  };

  const switchMicrophone = async (deviceId: string) => {
    if (localAudioTrackRef.current && role === 'host') {
      try {
        await localAudioTrackRef.current.setDevice(deviceId);
        setSelectedMicrophone(deviceId);
        toast.success('Microfone alterado');
      } catch (error) {
        console.error('Erro ao trocar microfone:', error);
        toast.error('Erro ao trocar microfone');
      }
    }
  };

  // Adicionar estilos globais para elementos de vídeo do Agora
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'agora-video-styles';
    style.textContent = `
      /* Estilos para todos os vídeos do Agora */
      video {
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        object-fit: contain !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        z-index: 10 !important;
        background: transparent !important;
        pointer-events: auto !important;
      }
      
      /* Container de vídeo */
      [data-video-container] {
        position: relative !important;
        width: 100% !important;
        height: 100% !important;
        overflow: hidden !important;
        z-index: 1 !important;
      }
      
      [data-video-container] video {
        z-index: 10 !important;
      }
      
      /* Estilos para fullscreen */
      div:fullscreen,
      div:-webkit-full-screen,
      div:-moz-full-screen,
      div:-ms-fullscreen {
        width: 100vw !important;
        height: 100vh !important;
        background: #000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      
      div:fullscreen video,
      div:-webkit-full-screen video,
      div:-moz-full-screen video,
      div:-ms-fullscreen video {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
      }
    `;
    
    // Remover estilo anterior se existir
    const existingStyle = document.getElementById('agora-video-styles');
    if (existingStyle) {
      document.head.removeChild(existingStyle);
    }
    
    document.head.appendChild(style);
    
    return () => {
      const styleToRemove = document.getElementById('agora-video-styles');
      if (styleToRemove) {
        document.head.removeChild(styleToRemove);
      }
    };
  }, []);

  // Container principal para fullscreen
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);

  // Funções para fullscreen e rotate (mobile)
  const handleFullscreen = useCallback(() => {
    const container = fullscreenContainerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      // iOS/Safari requer tratamento especial
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      if (isIOS || isSafari) {
        // No iOS, tentar usar o video element diretamente se disponível
        const videoElement = container.querySelector('video');
        if (videoElement) {
          // iOS Safari suporta fullscreen via video element
          if ((videoElement as any).webkitEnterFullscreen) {
            (videoElement as any).webkitEnterFullscreen();
            return;
          }
          // Fallback: tentar requestFullscreen no video
          if (videoElement.requestFullscreen) {
            videoElement.requestFullscreen().catch((err) => {
              console.error('Erro ao entrar em fullscreen (iOS):', err);
            });
            return;
          }
        }
        // Fallback: tentar no container com webkit
        if ((container as any).webkitRequestFullscreen) {
          (container as any).webkitRequestFullscreen();
          return;
        }
      }
      
      // Para outros navegadores, usar APIs padrão
      if (container.requestFullscreen) {
        container.requestFullscreen().catch((err) => {
          console.error('Erro ao entrar em fullscreen:', err);
        });
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if ((container as any).mozRequestFullScreen) {
        (container as any).mozRequestFullScreen();
      } else if ((container as any).msRequestFullscreen) {
        (container as any).msRequestFullscreen();
      }
    } else {
      // Sair do fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.error('Erro ao sair do fullscreen:', err);
        });
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).webkitCancelFullScreen) {
        (document as any).webkitCancelFullScreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  }, [isFullscreen]);

  const handleRotate = useCallback(() => {
    setIsRotated(!isRotated);
  }, [isRotated]);

  // Função para Picture-in-Picture
  const handlePictureInPicture = useCallback(async () => {
    try {
      // Encontrar o elemento de vídeo (pode ser local ou remoto)
      const videoElement = 
        videoContainerRef.current?.querySelector('video') ||
        remoteVideoContainerRef.current?.querySelector('video');
      
      if (!videoElement) {
        console.warn('Elemento de vídeo não encontrado para PiP');
        toast.error('Vídeo não encontrado');
        return;
      }

      // Verificar se a API está disponível
      if (!document.pictureInPictureEnabled) {
        toast.error('Picture-in-Picture não está disponível neste navegador');
        return;
      }

      if (isPictureInPicture) {
        // Sair do PiP
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        }
        setIsPictureInPicture(false);
      } else {
        // Entrar no PiP
        await (videoElement as HTMLVideoElement).requestPictureInPicture();
        setIsPictureInPicture(true);
      }
    } catch (error: any) {
      console.error('Erro ao ativar Picture-in-Picture:', error);
      if (error.name !== 'NotAllowedError') {
        toast.error('Erro ao ativar modo flutuante');
      }
    }
  }, [isPictureInPicture]);

  // Listener para mudanças de Picture-in-Picture
  useEffect(() => {
    const handlePiPChange = () => {
      const isInPiP = !!document.pictureInPictureElement;
      setIsPictureInPicture(isInPiP);
    };

    document.addEventListener('enterpictureinpicture', handlePiPChange);
    document.addEventListener('leavepictureinpicture', handlePiPChange);

    return () => {
      document.removeEventListener('enterpictureinpicture', handlePiPChange);
      document.removeEventListener('leavepictureinpicture', handlePiPChange);
    };
  }, []);

  // Listener para mudanças de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
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
  }, []);

  // Verificar periodicamente se há elemento de vídeo renderizado (apenas para audience)
  useEffect(() => {
    if (role !== 'audience') return;
    
    const checkVideo = () => {
      const videoEl = remoteVideoContainerRef.current?.querySelector('video');
      if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
        setHasVideoElement(true);
      } else if (videoEl) {
        // Vídeo existe mas ainda não tem dimensões - aguardar
        setHasVideoElement(false);
      } else if (!remoteVideoTrackRef.current) {
        // Não há track nem elemento de vídeo
        setHasVideoElement(false);
      }
    };
    
    const interval = setInterval(checkVideo, 500);
    checkVideo(); // Verificar imediatamente
    
    return () => clearInterval(interval);
  }, [role]);

  // Verificar periodicamente se há elemento de vídeo renderizado (apenas para host)
  useEffect(() => {
    if (role !== 'host') return;
    
    const checkVideo = () => {
      const videoEl = videoContainerRef.current?.querySelector('video');
      if (videoEl && (videoEl.videoWidth > 0 || videoEl.videoHeight > 0)) {
        setHasLocalVideoElement(true);
      } else {
        setHasLocalVideoElement(false);
      }
    };
    
    const interval = setInterval(checkVideo, 500);
    checkVideo(); // Verificar imediatamente
    
    return () => clearInterval(interval);
  }, [role]);

  return (
    <div 
      ref={fullscreenContainerRef}
      className="flex flex-col h-full bg-black rounded-lg overflow-hidden"
      style={{
        width: '100%',
        height: '100%'
      }}
    >
      {/* Container de Vídeo */}
      <MobileVideoPlayer
        videoElement={null}
        isFullscreen={isFullscreen}
        onFullscreen={handleFullscreen}
        onRotate={handleRotate}
        onPictureInPicture={handlePictureInPicture}
        isPictureInPicture={isPictureInPicture}
        isActive={isActive}
      >
        <div 
          className="flex-1 relative bg-black w-full h-full" 
          style={{ 
            aspectRatio: '16/9', 
            overflow: 'hidden', 
            minHeight: '100%',
            width: '100%',
            height: '100%'
          }}
        >
          {/* Vídeo Local (Host) */}
          {role === 'host' && (
            <div
              ref={videoContainerRef}
              data-video-container
              className={`absolute inset-0 w-full h-full ${isVideoOff ? 'bg-slate-900 flex items-center justify-center' : 'bg-black'}`}
              style={{ 
                minHeight: '100%', 
                minWidth: '100%',
                position: 'relative',
                zIndex: 1,
                overflow: 'hidden'
              }}
            >
            {isVideoOff && (
              <div className="text-slate-400 text-center absolute inset-0 flex items-center justify-center z-10">
                <div>
                  <VideoOff className="w-16 h-16 mx-auto mb-2" />
                  <p>Câmera desativada</p>
                </div>
              </div>
            )}
            {/* Mensagem só aparece se não houver preview, não estiver transmitindo E não houver vídeo renderizado */}
            {!isVideoOff && !isStreaming && !previewTrack && !localVideoTrackRef.current && !hasLocalVideoElement && (
              <div className="text-slate-400 text-center absolute inset-0 flex items-center justify-center z-0 bg-black pointer-events-none">
                <div>
                  <Video className="w-16 h-16 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aguardando início da transmissão...</p>
                </div>
              </div>
            )}
          </div>
        )}

          {/* Vídeo Remoto (Audience) */}
          {role === 'audience' && (
            <div
              ref={remoteVideoContainerRef}
              className="absolute inset-0 w-full h-full bg-black"
              style={{ 
                minHeight: '100%', 
                minWidth: '100%',
                position: 'relative',
                zIndex: 1,
                overflow: 'hidden'
              }}
            >
              {/* Mostrar mensagem apenas se não há vídeo renderizado */}
              {(() => {
                // Verificar se há elemento de vídeo com dimensões válidas
                const videoEl = remoteVideoContainerRef.current?.querySelector('video');
                const hasValidVideo = videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0;
                const shouldShowMessage = !hasValidVideo && !hasVideoElement && !remoteVideoTrackRef.current;
                
                // Se a transmissão não está ativa, sempre mostrar mensagem
                if (!isActive) {
                  return (
                    <div className="text-slate-400 text-center absolute inset-0 flex items-center justify-center z-0">
                      <div>
                        <Video className="w-16 h-16 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Aguardando transmissão...</p>
                      </div>
                    </div>
                  );
                }
                
                // Se está ativo mas não há vídeo ainda
                return shouldShowMessage ? (
                  <div className="text-slate-400 text-center absolute inset-0 flex items-center justify-center z-0">
                    <div>
                      {/* Se stream está ativo e há usuários remotos, mostrar spinner de carregamento */}
                      {hasRemoteUsers ? (
                        <>
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-400 mx-auto mb-2"></div>
                          <p className="text-sm">Conectando...</p>
                          <p className="text-xs mt-1 opacity-70">Aguardando transmissor iniciar a transmissão</p>
                        </>
                      ) : (
                        <>
                          <Video className="w-16 h-16 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Aguardando transmissão...</p>
                        </>
                      )}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* Botão para mostrar/ocultar controles de volume (Host) - Centro da tela */}
          {role === 'host' && isStreaming && (
            <>
              {/* Botão flutuante no centro para abrir controles */}
              {!showAudioControls && (
                <button
                  onClick={() => setShowAudioControls(true)}
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-black/60 backdrop-blur-md text-white p-4 rounded-full hover:bg-black/80 transition-colors shadow-lg"
                  aria-label="Abrir controles de áudio"
                  title="Clique para ajustar volumes"
                >
                  <Volume2 className="w-6 h-6" />
                </button>
              )}

              {/* Painel de Controles de Volume - Centro da tela, oculto por padrão */}
              {showAudioControls && (
                <div 
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-black/80 backdrop-blur-md rounded-lg p-6 max-w-md w-11/12 md:w-96 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white text-lg font-semibold flex items-center gap-2">
                      <Volume2 className="w-5 h-5" />
                      Controles de Áudio
                    </h3>
                    <button
                      onClick={() => setShowAudioControls(false)}
                      className="text-white hover:text-slate-300 transition-colors"
                      aria-label="Fechar controles"
                    >
                      ✕
                    </button>
                  </div>
                  
                  {/* Volume do Áudio da Câmera */}
                  {localAudioTrackRef.current && (
                    <div className="mb-4">
                      <label className="text-white text-sm mb-2 block">
                        Áudio da Câmera: {cameraAudioVolume}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={cameraAudioVolume}
                        onChange={(e) => handleCameraAudioVolumeChange(Number(e.target.value))}
                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  )}
                  
                  {/* Volume do Áudio do Sistema/Desktop */}
                  {screenAudioTrackRef.current ? (
                    <div>
                      <label className="text-white text-sm mb-2 block">
                        Áudio do Sistema/Desktop: {screenAudioVolume}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={screenAudioVolume}
                        onChange={(e) => handleScreenAudioVolumeChange(Number(e.target.value))}
                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-green-500"
                      />
                      <button
                        onClick={stopDesktopAudio}
                        className="mt-2 w-full px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs flex items-center justify-center gap-2 transition-colors"
                      >
                        <Square className="w-3 h-3" />
                        Parar Captura de Áudio
                      </button>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs">
                      <p className="mb-2">Áudio do sistema não capturado.</p>
                      <p className="mb-3 text-xs">Para capturar áudio de vídeos do OBS, clique no botão abaixo.</p>
                      <button
                        onClick={captureDesktopAudio}
                        className="w-full px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-xs flex items-center justify-center gap-2 transition-colors"
                        disabled={!isStreaming}
                      >
                        <MonitorSpeaker className="w-4 h-4" />
                        {isStreaming ? 'Capturar Áudio do Sistema' : 'Inicie a transmissão primeiro'}
                      </button>
                      <p className="mt-2 text-xs opacity-70">
                        ⚠️ O navegador pedirá permissão. Selecione "Compartilhar áudio" na janela.
                      </p>
                    </div>
                  )}
                  
                  {!localAudioTrackRef.current && !screenAudioTrackRef.current && (
                    <p className="text-slate-400 text-xs">Nenhum áudio ativo</p>
                  )}
                </div>
              )}

              {/* Overlay para fechar controles ao clicar fora */}
              {showAudioControls && (
                <div
                  className="absolute inset-0 z-40 bg-black/20"
                  onClick={() => setShowAudioControls(false)}
                />
              )}
            </>
          )}
        </div>
      </MobileVideoPlayer>

      {/* Status para Audience - Removido, agora mostra dentro do player */}
    </div>
  );
};

export default VideoStream;

