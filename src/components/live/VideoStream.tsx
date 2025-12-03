import React, { useEffect, useRef, useState, useCallback } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { Video, VideoOff, Camera, Mic, MicOff, Settings, Monitor } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface VideoStreamProps {
  channelName: string;
  uid?: number;
  role?: 'host' | 'audience';
  cameraDeviceId?: string;
  onStreamReady?: () => void;
  onStreamError?: (error: Error) => void;
  startStreaming?: boolean; // Flag para iniciar stream externamente
}

const VideoStream: React.FC<VideoStreamProps> = ({
  channelName,
  uid,
  role = 'audience',
  cameraDeviceId,
  onStreamReady,
  onStreamError,
  startStreaming = false,
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(cameraDeviceId || null);
  const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string | null>(null);
  const [previewTrack, setPreviewTrack] = useState<AgoraRTC.ILocalVideoTrack | null>(null);
  const joiningRef = useRef(false);

  const clientRef = useRef<AgoraRTC.IAgoraRTCClient | null>(null);
  const localVideoTrackRef = useRef<AgoraRTC.ILocalVideoTrack | null>(null);
  const localAudioTrackRef = useRef<AgoraRTC.ILocalAudioTrack | null>(null);
  const remoteVideoTrackRef = useRef<AgoraRTC.IRemoteVideoTrack | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const remoteVideoContainerRef = useRef<HTMLDivElement>(null);

  const appId = import.meta.env.VITE_AGORA_APP_ID;
  const token = import.meta.env.VITE_AGORA_TOKEN || null;

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
              videoElement.play().catch(err => {
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
      const cameras = devices.filter((device) => device.kind === 'videoinput');
      const microphones = devices.filter((device) => device.kind === 'audioinput');

      setAvailableCameras(cameras);
      setAvailableMicrophones(microphones);

      console.log('Câmeras disponíveis:', cameras.map(c => ({ label: c.label, deviceId: c.deviceId })));

      // Detectar OBS Virtual Camera (apenas para informação, não selecionar automaticamente)
      const obsCamera = cameras.find((cam) => {
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
        const foundCamera = cameras.find(c => c.deviceId === cameraDeviceId);
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
    client.on('stream-published', (event) => {
      console.log('📡 EVENTO: Stream publicado pelo próprio cliente:', {
        streamType: event.streamType,
        role,
        localTracks: client.localTracks.length
      });
    });
    
    // Logs adicionais para debug
    client.on('connection-state-change', (curState, revState) => {
      console.log('🔄 Agora: Estado de conexão mudou:', { 
        curState, 
        revState,
        role,
        remoteUsers: client.remoteUsers.length,
        localTracks: client.localTracks.length
      });
    });
    
    client.on('user-info-updated', (uid, msg) => {
      console.log('ℹ️ Agora: Informações do usuário atualizadas:', { uid, msg, role });
      
      // Se for mensagem de mute, verificar se é do host
      if (role === 'audience' && (msg === 'mute-video' || msg === 'mute-audio')) {
        console.log('⚠️ Host mutou stream:', msg);
        // Isso é normal - o host pode ter mutado temporariamente
      }
    });
    
    // Listener adicional para detectar quando usuários entram
    client.on('network-quality', (stats) => {
      // Este evento é disparado periodicamente, podemos usar para verificar usuários
      if (role === 'audience' && client.remoteUsers.length > 0) {
        console.log('📡 Network quality check - Usuários remotos:', client.remoteUsers.length);
      }
    });

    return () => {
      if (clientRef.current) {
        clientRef.current.removeAllListeners();
        clientRef.current.leave();
      }
    };
  }, [appId]);

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
        
        await clientRef.current!.setClientRole('host');
        console.log('✅ HOST: Conectado ao canal (aguardando iniciar transmissão)');
        
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
        
        // Configurar role como audience
        await clientRef.current.setClientRole('audience');
        console.log('✅ Audience: Conectado ao canal e aguardando stream');
        
        // Verificar se já há usuários no canal (caso o host já esteja transmitindo)
        const checkRemoteUsers = () => {
          if (!clientRef.current) return;
          
          const remoteUsers = clientRef.current.remoteUsers;
          console.log('👥 Verificando usuários remotos no canal:', remoteUsers.length);
          
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
    timeoutId = setTimeout(() => {
      if (isMounted && role === 'audience' && clientRef.current && appId && channelName && !isStreaming && !joiningRef.current) {
        joinAsAudience();
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

  const handleUserPublished = async (
    user: AgoraRTC.IAgoraRTCRemoteUser,
    mediaType: 'audio' | 'video'
  ) => {
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
          
          // Aguardar container estar pronto
          if (remoteVideoContainerRef.current) {
            await remoteVideoTrack.play(remoteVideoContainerRef.current);
            console.log('Vídeo remoto reproduzido com sucesso');
            
            // Aplicar estilos para garantir visibilidade
            setTimeout(() => {
              const videoElement = remoteVideoContainerRef.current?.querySelector('video');
              if (videoElement) {
                videoElement.style.cssText = `
                  width: 100% !important;
                  height: 100% !important;
                  object-fit: contain !important;
                  position: absolute !important;
                  top: 0 !important;
                  left: 0 !important;
                  z-index: 10 !important;
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                `;
                console.log('Estilos aplicados ao vídeo remoto');
              }
            }, 100);
          } else {
            console.warn('Container de vídeo remoto não está disponível');
          }
        } else {
          console.warn('Track de vídeo remoto não encontrado');
        }
      }

      if (mediaType === 'audio') {
        const remoteAudioTrack = user.audioTrack;
        if (remoteAudioTrack) {
          await remoteAudioTrack.play();
          console.log('Áudio remoto reproduzido com sucesso');
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
  };

  const handleException = (exception: any) => {
    // Ignorar avisos não críticos
    const nonCriticalCodes = [
      2002, // AUDIO_OUTPUT_LEVEL_TOO_LOW - apenas aviso de nível de áudio baixo
      4002, // AUDIO_OUTPUT_LEVEL_TOO_LOW_RECOVER - apenas aviso de nível de áudio baixo
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
              muted: videoTrack.isMuted
            });
            
            // GARANTIR que o track está habilitado e não mutado antes de salvar
            if (!videoTrack.enabled) {
              console.log('⚠️ Track criado desabilitado, habilitando...');
              await videoTrack.setEnabled(true);
            }
            
            // Garantir que não está mutado
            if (videoTrack.isMuted) {
              console.log('⚠️ Track criado mutado, desmutando...');
              await videoTrack.setMuted(false);
            }
            
            console.log('✅ Track de vídeo configurado:', {
              enabled: videoTrack.enabled,
              muted: videoTrack.isMuted
            });
            
            // Salvar referência
            localVideoTrackRef.current = videoTrack;
            
            // Garantir que o estado local está correto
            setIsVideoOff(false);
            
            // Configurar listeners do track
            videoTrack.on('track-ended', () => {
              console.log('Track de vídeo encerrado');
            });
            
            videoTrack.on('beauty-effect-overload', () => {
              console.warn('Beauty effect overload');
            });
            
            // Listener para detectar mudanças no estado do track
            videoTrack.on('track-ended', () => {
              console.log('⚠️ Track de vídeo foi encerrado');
            });
            
            // Monitorar mudanças no estado enabled/muted
            const checkTrackState = () => {
              if (videoTrack.enabled !== true) {
                console.warn('⚠️ Track de vídeo foi desabilitado! Reabilitando...');
                videoTrack.setEnabled(true).catch(err => {
                  console.error('Erro ao reabilitar track:', err);
                });
              }
              if (videoTrack.isMuted === true) {
                console.warn('⚠️ Track de vídeo foi mutado! Desmutando...');
                videoTrack.setMuted(false).catch(err => {
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
              muted: videoTrack.isMuted
            });
            
            // GARANTIR que o track está habilitado e não mutado ANTES de publicar
            if (!videoTrack.enabled) {
              console.log('⚠️ Track está desabilitado, habilitando ANTES de publicar...');
              await videoTrack.setEnabled(true);
            }
            
            if (videoTrack.isMuted) {
              console.log('⚠️ Track está mutado, desmutando ANTES de publicar...');
              await videoTrack.setMuted(false);
            }
            
            // Verificar novamente após garantir
            console.log('✅ Estado do track após garantir (antes de publicar):', {
              enabled: videoTrack.enabled,
              muted: videoTrack.isMuted
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
              muted: videoTrack.isMuted,
              isPlaying: videoTrack.isPlaying
            });
            
            // Se foi mutado/desabilitado, corrigir imediatamente
            if (!videoTrack.enabled) {
              console.warn('⚠️ Track foi desabilitado após publicar! Reabilitando...');
              await videoTrack.setEnabled(true);
            }
            if (videoTrack.isMuted) {
              console.warn('⚠️ Track foi mutado após publicar! Desmutando...');
              await videoTrack.setMuted(false);
            }
            
            // Verificar se foi publicado corretamente
            const localTracks = clientRef.current.localTracks;
            console.log('📊 Tracks locais publicados:', {
              video: localTracks.filter(t => t.trackMediaType === 'video').length,
              audio: localTracks.filter(t => t.trackMediaType === 'audio').length,
              total: localTracks.length,
              tracks: localTracks.map(t => ({
                type: t.trackMediaType,
                enabled: t.enabled,
                muted: t.isMuted,
                trackId: t.getTrackId()
              }))
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
          } catch (videoError: any) {
            console.error('Erro ao criar track de vídeo:', videoError);
            console.error('Detalhes do erro:', {
              name: videoError.name,
              message: videoError.message,
              code: videoError.code
            });
            toast.error(`Erro ao acessar câmera: ${videoError.message || 'Verifique se a câmera está disponível e se o OBS Virtual Camera está ativo'}`);
            throw videoError;
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
            muted: audioTrack.isMuted
          });
          
          // GARANTIR que o track está habilitado e não mutado
          if (!audioTrack.enabled) {
            console.log('⚠️ Track de áudio está desabilitado, habilitando...');
            await audioTrack.setEnabled(true);
          }
          
          if (audioTrack.isMuted) {
            console.log('⚠️ Track de áudio está mutado, desmutando...');
            await audioTrack.setMuted(false);
          }
          
          localAudioTrackRef.current = audioTrack;
          
          // Garantir que o estado local está correto
          setIsMuted(false);
          
          console.log('📤 Publicando áudio no canal...', {
            trackId: audioTrack.getTrackId(),
            enabled: audioTrack.enabled,
            muted: audioTrack.isMuted
          });
          await clientRef.current.publish(audioTrack);
          console.log('✅ Áudio publicado no canal com sucesso!');
          
          // Verificar IMEDIATAMENTE após publicar se o track ainda está habilitado
          await new Promise(resolve => setTimeout(resolve, 100));
          console.log('🔍 Verificação imediata após publicar áudio:', {
            enabled: audioTrack.enabled,
            muted: audioTrack.isMuted
          });
          
          // Se foi mutado/desabilitado, corrigir imediatamente
          if (!audioTrack.enabled) {
            console.warn('⚠️ Track de áudio foi desabilitado após publicar! Reabilitando...');
            await audioTrack.setEnabled(true);
          }
          if (audioTrack.isMuted) {
            console.warn('⚠️ Track de áudio foi mutado após publicar! Desmutando...');
            await audioTrack.setMuted(false);
          }
        }
      }

      setIsStreaming(true);
      
      // Aguardar um pouco para garantir que os tracks foram publicados
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verificar novamente após um delay
      const finalCheck = () => {
        const localTracks = clientRef.current.localTracks;
        console.log('🔍 Verificação final após publicar:', {
          role,
          channelName,
          connectionState: clientRef.current.connectionState,
          localTracksCount: localTracks.length,
          localTracks: localTracks.map(t => ({
            type: t.trackMediaType,
            enabled: t.isPlaying,
            muted: t.isMuted,
            trackId: t.getTrackId()
          })),
          remoteUsers: clientRef.current.remoteUsers.length,
          hasVideo: !!localVideoTrackRef.current,
          hasAudio: !!localAudioTrackRef.current,
          videoTrackEnabled: localVideoTrackRef.current?.enabled,
          audioTrackEnabled: localAudioTrackRef.current?.enabled
        });
        
        // Se os tracks não foram publicados, tentar novamente
        if (localTracks.length === 0 && localVideoTrackRef.current) {
          console.warn('⚠️ Nenhum track local encontrado após publicar. Tentando republicar...');
          if (localVideoTrackRef.current) {
            clientRef.current.publish(localVideoTrackRef.current).catch(err => {
              console.error('Erro ao republicar vídeo:', err);
            });
          }
          if (localAudioTrackRef.current) {
            clientRef.current.publish(localAudioTrackRef.current).catch(err => {
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
      // Parar tracks locais
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }

      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }

      // Parar tracks remotos
      if (remoteVideoTrackRef.current) {
        remoteVideoTrackRef.current.stop();
        remoteVideoTrackRef.current = null;
      }

      // Sair do canal
      if (clientRef.current) {
        await clientRef.current.leave();
      }

      setIsStreaming(false);
      toast.success('Transmissão encerrada');
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

  return (
    <div className="flex flex-col h-full bg-black rounded-lg overflow-hidden">
      {/* Container de Vídeo */}
      <div className="flex-1 relative bg-black" style={{ aspectRatio: '16/9', overflow: 'hidden', minHeight: '100%' }}>
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
            {/* Mensagem só aparece se não houver preview e não estiver transmitindo */}
            {!isVideoOff && !isStreaming && !previewTrack && (
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
            {!remoteVideoTrackRef.current && (
              <div className="text-slate-400 text-center absolute inset-0 flex items-center justify-center z-0">
                <div>
                  <Video className="w-16 h-16 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aguardando transmissão...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Controles Overlay (Host) */}
        {role === 'host' && isStreaming && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition-colors ${
                isMuted
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-slate-700/80 hover:bg-slate-600/80'
              } text-white`}
              title={isMuted ? 'Ativar microfone' : 'Desativar microfone'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-colors ${
                isVideoOff
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-slate-700/80 hover:bg-slate-600/80'
              } text-white`}
              title={isVideoOff ? 'Ativar câmera' : 'Desativar câmera'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>

      {/* Painel de Controles (Host) - Apenas quando estiver transmitindo */}
      {role === 'host' && isStreaming && (
        <div className="p-4 bg-slate-900 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-white font-medium">AO VIVO</span>
            </div>
            <button
              onClick={stopStream}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
            >
              Encerrar Transmissão
            </button>
          </div>
        </div>
      )}

      {/* Status para Audience */}
      {role === 'audience' && !isStreaming && (
        <div className="p-4 bg-slate-900 border-t border-slate-700 text-center">
          <p className="text-slate-400">Aguardando transmissão...</p>
        </div>
      )}
    </div>
  );
};

export default VideoStream;

