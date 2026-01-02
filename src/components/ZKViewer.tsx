import { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

interface ZKViewerProps {
  appId?: string;
  channel: string;
  token?: string | null;
  fitMode?: 'contain' | 'cover';
  muteAudio?: boolean; // Para admin: mutar áudio para evitar duplicação (áudio local do ZK Studio + áudio do site)
  enabled?: boolean; // Se false, desconecta imediatamente do Agora (independente do ZK Studio ainda estar transmitindo)
}

export default function ZKViewer({ appId, channel, token, fitMode = 'contain', muteAudio = false, enabled = true }: ZKViewerProps) {
  const clientRef = useRef<any>(null);
  const videoTrackRef = useRef<any>(null);
  const audioTrackRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bgRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<HTMLDivElement | null>(null);
  const bgVideoElRef = useRef<HTMLVideoElement | null>(null);
  const bgTrackRef = useRef<MediaStreamTrack | null>(null);
  const fitModeRef = useRef<'contain' | 'cover'>(fitMode);

  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [connectionTimeout, setConnectionTimeout] = useState<NodeJS.Timeout | null>(null);
  const [connectionStartTime, setConnectionStartTime] = useState<number | null>(null);
  const [connectionElapsedTime, setConnectionElapsedTime] = useState<number>(0);

  // manter o valor atual do fitMode acessível dentro do MutationObserver sem recriar o client
  useEffect(() => {
    fitModeRef.current = fitMode;
    if (containerRef.current) {
      const fgVideos = containerRef.current.querySelectorAll<HTMLVideoElement>('.zk-video-fg video');
      fgVideos.forEach((v) => {
        v.style.objectFit = fitMode;
        v.style.objectPosition = 'center';
      });
    }
  }, [fitMode]);

  useEffect(() => {
    let mounted = true;

    // Observer para forçar estilos corretos:
    // - Foreground: contain (não corta)
    // - Background: cover + blur (preenche sem barras pretas)
    const videoObserver = new MutationObserver(() => {
      if (containerRef.current) {
        const fgVideos = containerRef.current.querySelectorAll<HTMLVideoElement>('.zk-video-fg video');
        fgVideos.forEach((video) => {
          const desired = fitModeRef.current;
          if (video.style.objectFit !== desired) {
            video.style.objectFit = desired;
          }
          if (video.style.objectPosition !== 'center') {
            video.style.objectPosition = 'center';
          }
          // Garantir que o vídeo ocupe todo o container (evita ficar "pequeno" no topo no retrato)
          if (video.style.width !== '100%') video.style.width = '100%';
          if (video.style.height !== '100%') video.style.height = '100%';
          if (video.style.position !== 'absolute') video.style.position = 'absolute';
          if (video.style.inset !== '0px') (video.style as any).inset = '0';
          if (video.style.display !== 'block') video.style.display = 'block';
        });

        const bgVideos = containerRef.current.querySelectorAll<HTMLVideoElement>('.zk-video-bg video');
        bgVideos.forEach((video) => {
          if (video.style.objectFit !== 'cover') {
            video.style.objectFit = 'cover';
          }
          if (video.style.objectPosition !== 'center') {
            video.style.objectPosition = 'center';
          }
          // filtro/blur no background
          if (!video.style.filter) {
            video.style.filter = 'blur(18px) brightness(0.75) saturate(1.2)';
          }
          if (!video.style.transform) {
            video.style.transform = 'scale(1.2)';
          }
        });
      }
    });

    // Observar mudanças no container
    if (containerRef.current) {
      videoObserver.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
      });
    }

    const init = async () => {
      try {
        if (!enabled) {
          console.log('⏸️ ZKViewer: enabled=false, não inicializando conexão Agora');
          return;
        }
        if (clientRef.current) return;

        // Usar appId do prop ou do .env
        const agoraAppId = appId || import.meta.env.VITE_AGORA_APP_ID;
        const agoraToken = token ?? import.meta.env.VITE_AGORA_TOKEN ?? null;

        if (!agoraAppId) {
          setError('App ID não configurado');
          return;
        }

        const client = AgoraRTC.createClient({
          mode: 'live',
          codec: 'h264',
        });

        clientRef.current = client;

        client.on('connection-state-change', (state: string) => {
          if (!mounted) return;
          console.log('🔌 ZKViewer: connection-state-change', {
            state,
            timestamp: new Date().toISOString()
          });
          if (state === 'DISCONNECTED') {
            console.warn('⚠️ ZKViewer: Desconectado do Agora!', {
              timestamp: new Date().toISOString(),
              possibleCauses: ['Token expirado', 'Timeout de inatividade', 'Limite de minutos']
            });
            setIsLive(false);
          }
        });

        // Listener para erros de token
        client.on('token-privilege-will-expire', () => {
          console.warn('⚠️ ZKViewer: Token vai expirar em breve!');
        });

        client.on('token-privilege-did-expire', () => {
          console.error('❌ ZKViewer: Token EXPIROU!');
          setError('Token expirado - reconecte a transmissão');
        });

        // Listener para monitorar qualidade do stream
        client.on('stream-type-changed', (uid: number, streamType: number) => {
          console.log('📊 Qualidade do stream mudou:', {
            uid,
            streamType: streamType === 0 ? 'ALTA' : 'BAIXA',
            timestamp: new Date().toISOString()
          });
          if (streamType === 1) {
            console.warn('⚠️ ATENÇÃO: Stream mudou para BAIXA qualidade!');
          }
        });

        // Listener para problemas de rede
        client.on('network-quality', (stats: any) => {
          if (stats.downlinkNetworkQuality > 3) {
            console.warn('⚠️ Qualidade de rede RUIM:', {
              downlink: stats.downlinkNetworkQuality,
              uplink: stats.uplinkNetworkQuality
            });
          }
        });

        client.on('user-published', async (user: any, mediaType: 'video' | 'audio') => {
          if (!mounted) return;

          console.log('🎬 ZKViewer: user-published', { uid: user.uid, mediaType });

          try {
            await client.subscribe(user, mediaType);
            console.log('✅ ZKViewer: Subscribe realizado com sucesso', mediaType);

            if (mediaType === 'video') {
              // 🔥 FIX CIRÚRGICO: setIsLive ANTES de qualquer outra coisa
              setIsLive(true);
              setError(null); // Limpar qualquer erro anterior
              
              // Limpar timeout de conexão se ainda estiver ativo
              if (connectionTimeout) {
                clearTimeout(connectionTimeout);
                setConnectionTimeout(null);
              }
              
              // Log tempo de conexão
              if (connectionStartTime) {
                const totalTime = Date.now() - connectionStartTime;
                console.log('🔴 ZKViewer: isLive = TRUE', {
                  connectionTime: `${totalTime}ms`,
                  timestamp: new Date().toISOString()
                });
                setConnectionStartTime(null);
              } else {
                console.log('🔴 ZKViewer: isLive = TRUE');
              }

              if (user.videoTrack) {
                videoTrackRef.current = user.videoTrack;

                // Tentar forçar stream HIGH (se dual-stream estiver ativo no broadcaster)
                try {
                  await client.setRemoteVideoStreamType?.(user.uid, 0);
                  console.log('🎚️ ZKViewer: Forçando stream HIGH para uid', user.uid);
                } catch (e) {
                  console.warn('⚠️ ZKViewer: Não foi possível forçar stream HIGH', e);
                }

                // Tentar desabilitar fallback automático para LOW/AUDIO (aplica no uid remoto)
                try {
                  client.setStreamFallbackOption?.(user.uid, 0);
                } catch {
                  // ignore
                }

                // Log de qualidade do vídeo
                const stats = user.videoTrack.getStats();
                console.log('🎥 ZKViewer: Reproduzindo vídeo...', {
                  trackId: user.videoTrack.getTrackId(),
                  enabled: user.videoTrack.enabled,
                  stats: stats
                });

                // Tentar obter estatísticas de recepção
                try {
                  const remoteStats = await client.getRemoteVideoStats();
                  console.log('📊 Estatísticas de vídeo:', remoteStats);
                } catch (e) {
                  console.warn('⚠️ Não foi possível obter estatísticas:', e);
                }

                // Foreground (sem cortes)
                await user.videoTrack.play(fgRef.current!);
                console.log('✅ ZKViewer: Vídeo reproduzindo!');

                // Background blur: criar a partir do vídeo foreground (mais confiável)
                const attachBgFromFg = () => {
                  if (!bgRef.current || !fgRef.current) return false;

                  // Otimização: Em mobile, DESATIVAR o blur effect para economizar recursos (decoder/cpu)
                  // Isso resolve o problema de tela preta/travamento em dispositivos mais fracos
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  if (isMobile) {
                    console.log('📱 ZKViewer: Mobile detectado, desativando background blur para performance');
                    return false;
                  }

                  const fgVideo = fgRef.current.querySelector('video') as HTMLVideoElement | null;
                  const srcObj = fgVideo?.srcObject;
                  if (!(srcObj instanceof MediaStream)) return false;

                  const fgTrack = srcObj.getVideoTracks?.()?.[0];
                  if (!fgTrack) return false;

                  // limpar bg anterior
                  if (bgTrackRef.current) {
                    try { bgTrackRef.current.stop(); } catch { /* ignore */ }
                    bgTrackRef.current = null;
                  }
                  if (bgVideoElRef.current) {
                    try {
                      bgVideoElRef.current.pause?.();
                      (bgVideoElRef.current as any).srcObject = null;
                    } catch { /* ignore */ }
                    bgVideoElRef.current.remove();
                    bgVideoElRef.current = null;
                  }

                  const cloned = fgTrack.clone();
                  bgTrackRef.current = cloned;

                  const bgStream = new MediaStream([cloned]);
                  const bgVideo = document.createElement('video');
                  bgVideo.autoplay = true;
                  bgVideo.muted = true;
                  (bgVideo as any).playsInline = true;
                  bgVideo.setAttribute('playsinline', 'true');
                  bgVideo.setAttribute('webkit-playsinline', 'true');
                  bgVideo.srcObject = bgStream;

                  bgVideo.style.width = '100%';
                  bgVideo.style.height = '100%';
                  bgVideo.style.objectFit = 'cover';
                  bgVideo.style.objectPosition = 'center';
                  bgVideo.style.filter = 'blur(18px) brightness(0.75) saturate(1.2)';
                  bgVideo.style.transform = 'scale(1.2)';
                  bgVideo.style.position = 'absolute';
                  bgVideo.style.inset = '0';

                  bgRef.current.innerHTML = '';
                  bgRef.current.appendChild(bgVideo);
                  bgVideoElRef.current = bgVideo;
                  bgVideo.play?.().catch(() => { });
                  return true;
                };

                // tentar algumas vezes (o <video> do Agora pode demorar a aparecer)
                let tries = 0;
                const maxTries = 10;
                const tick = () => {
                  if (!mounted) return;
                  tries += 1;
                  if (attachBgFromFg()) return;
                  if (tries < maxTries) {
                    requestAnimationFrame(tick);
                  } else {
                    console.warn('⚠️ ZKViewer: Não foi possível anexar background blur (sem vídeo foreground)');
                  }
                };
                requestAnimationFrame(tick);
              }
            }

            if (mediaType === 'audio' && user.audioTrack) {
              audioTrackRef.current = user.audioTrack;
              if (muteAudio) {
                // Admin: mutar imediatamente para evitar duplicação (áudio local do ZK Studio + áudio do site com delay)
                user.audioTrack.setVolume(0);
                console.log('🔇 ZKViewer: Áudio mutado (modo admin - evita duplicação)');
              } else {
                console.log('🔊 ZKViewer: Reproduzindo áudio...');
                await user.audioTrack.play();
                console.log('✅ ZKViewer: Áudio reproduzindo!');
              }
            }
          } catch (err) {
            console.error('❌ ZKViewer: Erro ao processar stream:', err);
          }
        });

        client.on('user-unpublished', (user: any, mediaType: 'video' | 'audio') => {
          if (!mounted) return;
          console.log('📴 ZKViewer: user-unpublished', {
            uid: user.uid,
            mediaType,
            timestamp: new Date().toISOString()
          });
          if (mediaType === 'video') {
            setIsLive(false);
            setReconnectCount(prev => prev + 1);
            console.log('⚫ ZKViewer: isLive = FALSE');
            console.warn('⚠️ ZKViewer: Reconexão #' + (reconnectCount + 1));

            // Limpar referências
            if (videoTrackRef.current) {
              videoTrackRef.current.stop();
              videoTrackRef.current = null;
            }

            // Limpar background
            if (bgTrackRef.current) {
              try { bgTrackRef.current.stop(); } catch { /* ignore */ }
              bgTrackRef.current = null;
            }
            if (bgVideoElRef.current) {
              try {
                bgVideoElRef.current.pause?.();
                (bgVideoElRef.current as any).srcObject = null;
              } catch {
                // ignore
              }
              bgVideoElRef.current.remove();
              bgVideoElRef.current = null;
            }
          }
        });

        // Configurar para BAIXA LATÊNCIA (reduz delay e tela preta inicial)
        await client.setClientRole('audience', { level: 1 });
        
        // Usar o canal passado por prop (IMPORTANTE para suportar _backstage)
        console.log('🔌 ZKViewer: Conectando ao canal...', {
          channel: channel,
          hasToken: !!agoraToken,
          tokenPreview: agoraToken ? agoraToken.substring(0, 20) + '...' : 'null'
        });
        
        // Marcar início da conexão para timeout
        const startTime = Date.now();
        setConnectionStartTime(startTime);
        
        // Timeout de conexão: 15 segundos
        const CONNECTION_TIMEOUT = 15000;
        const timeoutId = setTimeout(() => {
          if (!isLive && mounted) {
            console.error('⏱️ ZKViewer: Timeout de conexão (15s) - tentando reconectar...');
            setError('Conexão demorou muito. Tentando novamente...');
            // Tentar reconectar após timeout
            setTimeout(() => {
              if (mounted && enabled) {
                console.log('🔄 ZKViewer: Tentando reconectar após timeout...');
                setReconnectCount(prev => prev + 1);
                setError(null);
                init();
              }
            }, 2000);
          }
        }, CONNECTION_TIMEOUT) as unknown as NodeJS.Timeout;
        
        setConnectionTimeout(timeoutId);
        
        try {
          await client.join(agoraAppId, channel, agoraToken, null);
          clearTimeout(timeoutId);
          setConnectionTimeout(null);
          const connectionTime = Date.now() - startTime;
          console.log('✅ ZKViewer: Conectado ao canal!', {
            channel: channel,
            connectionTime: `${connectionTime}ms`,
            timestamp: new Date().toISOString()
          });
          
          // Se demorou mais de 5s, avisar
          if (connectionTime > 5000) {
            console.warn('⚠️ ZKViewer: Conexão demorou', connectionTime, 'ms');
          }
        } catch (joinError: any) {
          clearTimeout(timeoutId);
          throw joinError;
        }
      } catch (err: any) {
        console.error('❌ ZKViewer: Erro ao conectar:', err);
        if (mounted) {
          const errorMessage = err?.message || err?.code || 'Erro ao conectar à transmissão';
          setError(errorMessage);
          
          // Tentar reconectar automaticamente após 3 segundos (máximo 3 tentativas)
          if (reconnectCount < 3) {
            console.log(`🔄 ZKViewer: Tentando reconectar (${reconnectCount + 1}/3) em 3s...`);
            setTimeout(() => {
              if (mounted && enabled) {
                setReconnectCount(prev => prev + 1);
                setError(null);
                init();
              }
            }, 3000);
          } else {
            setError('Não foi possível conectar após várias tentativas. Recarregue a página.');
          }
        }
      }
    };

    // Só inicializa se enabled for true
    if (enabled) {
      init();
    }

    return () => {
      mounted = false;
      videoObserver.disconnect();

      videoTrackRef.current?.stop();
      audioTrackRef.current?.stop();

      if (clientRef.current) {
        clientRef.current.removeAllListeners();
        clientRef.current.leave();
        clientRef.current = null;
      }

      if (bgTrackRef.current) {
        try { bgTrackRef.current.stop(); } catch { /* ignore */ }
        bgTrackRef.current = null;
      }
      if (bgVideoElRef.current) {
        try {
          bgVideoElRef.current.pause?.();
          (bgVideoElRef.current as any).srcObject = null;
        } catch { /* ignore */ }
        bgVideoElRef.current.remove();
        bgVideoElRef.current = null;
      }
    };
  }, [appId, channel, token, muteAudio, enabled]); // enabled nas deps para reinicializar quando voltar para true

  // Desconectar IMEDIATAMENTE quando enabled virar false (admin encerrou no site)
  useEffect(() => {
    if (!enabled && clientRef.current) {
      console.log('🛑 ZKViewer: enabled=false - Desconectando IMEDIATAMENTE do Agora (admin encerrou no live)!');
      setIsLive(false);
      setError(null); // Limpar erro ao forçar desconexão

      // 1. Parar e limpar faixas locais/remotas imediatamente
      if (videoTrackRef.current) {
        try { videoTrackRef.current.stop(); } catch (e) { console.error('Erro ao parar videoTrack:', e); }
        videoTrackRef.current = null;
      }

      if (audioTrackRef.current) {
        try { audioTrackRef.current.stop(); } catch (e) { console.error('Erro ao parar audioTrack:', e); }
        audioTrackRef.current = null;
      }

      // 2. Limpar background blur
      if (bgTrackRef.current) {
        try { bgTrackRef.current.stop(); } catch { /* ignore */ }
        bgTrackRef.current = null;
      }
      if (bgVideoElRef.current) {
        try {
          bgVideoElRef.current.pause?.();
          (bgVideoElRef.current as any).srcObject = null;
        } catch { /* ignore */ }
        bgVideoElRef.current.remove();
        bgVideoElRef.current = null;
      }

      // 3. Forçar saída do cliente
      const client = clientRef.current;
      clientRef.current = null; // Evitar uso posterior

      try {
        client.removeAllListeners();
        client.leave().then(() => {
          console.log('✅ ZKViewer: Saiu do canal com sucesso');
        }).catch((err: any) => {
          console.error('Erro ao desconectar do Agora (client.leave):', err);
        });
      } catch (e) {
        console.error('Erro crítico ao tentar desconectar:', e);
      }
    }
  }, [enabled]);

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-black text-white">
        <div className="text-center">
          <p className="mb-2">⚠️ {error}</p>
          {/* Botão de reconectar se necessário */}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: 'black',
        overflow: 'hidden',
      }}
    >
      {/* Background (blur) */}
      <div
        ref={bgRef}
        className="zk-video-bg"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          backgroundColor: 'black',
        }}
      />

      {/* Foreground (conteúdo real, sem cortes) */}
      <div
        ref={fgRef}
        className="zk-video-fg"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          backgroundColor: 'transparent',
        }}
      />

      {/* ⏳ OVERLAY "AGUARDANDO" - SIMPLES E LIMPO */}
      {/* ⏳ OVERLAY "CONECTANDO" */}
      {!isLive && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 pb-10">
          <div className="w-10 h-10 border-2 border-white/10 border-t-rose-500 rounded-full animate-spin mb-4" />
          <p className="text-white/80 text-sm font-medium animate-pulse tracking-wide">
            {connectionStartTime ? 'CONECTANDO AO VIVO...' : 'AGUARDANDO TRANSMISSÃO...'}
          </p>
          {reconnectCount > 0 && (
            <p className="text-white/50 text-xs mt-2">Tentativa {reconnectCount + 1}...</p>
          )}
          {connectionStartTime && connectionElapsedTime > 0 && (
            <p className="text-white/40 text-xs mt-1">
              {connectionElapsedTime}s
            </p>
          )}
        </div>
      )}

      {/* (badge AO VIVO removido a pedido) */}
    </div>
  );
}
