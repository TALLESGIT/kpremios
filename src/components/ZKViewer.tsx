import { useEffect, useRef, useState, useCallback } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

interface ZKViewerProps {
  appId?: string;
  channel: string;
  token?: string | null;
  fitMode?: 'contain' | 'cover';
  muteAudio?: boolean;
  enabled?: boolean;
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

  // ✅ NOVO: Estado para fallback de codec
  const [useVP8Fallback, setUseVP8Fallback] = useState(false);
  const [decodeErrorCount, setDecodeErrorCount] = useState(0);

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

  // ✅ NOVO: Função para inicializar com codec configurável
  const initAgora = useCallback(async (forceVP8 = false) => {
    const env = (import.meta as any).env || {};
    const agoraAppId = appId || env.VITE_AGORA_APP_ID;
    const agoraToken = token ?? env.VITE_AGORA_TOKEN ?? null;

    if (!agoraAppId) {
      setError('App ID não configurado');
      return null;
    }

    // ✅ Codec configurável - VP8 como fallback para PCs com problemas de H.264
    const codec = forceVP8 ? 'vp8' : 'h264';
    console.log(`🎬 ZKViewer: Criando cliente com codec: ${codec}`);

    const client = AgoraRTC.createClient({
      mode: 'live',
      codec: codec,
    });

    // ✅ Buffer AUMENTADO para estabilidade (especialmente em redes variadas)
    try {
      (AgoraRTC as any).setParameter('VIDEO_BUFFER_DELAY', 200);
      (AgoraRTC as any).setParameter('PLAYBACK_BUFFER_MAX', 400);
      console.log('📊 ZKViewer: Buffer configurado: 200-400ms');
    } catch (e) {
      console.warn('⚠️ ZKViewer: Não foi possível configurar buffer', e);
    }

    return { client, agoraAppId, agoraToken };
  }, [appId, token]);

  useEffect(() => {
    let mounted = true;

    const videoObserver = new MutationObserver(() => {
      if (containerRef.current) {
        const fgVideos = containerRef.current.querySelectorAll<HTMLVideoElement>('.zk-video-fg video');
        fgVideos.forEach((video) => {
          const desired = fitModeRef.current;
          if (video.style.objectFit !== desired) video.style.objectFit = desired;
          if (video.style.objectPosition !== 'center') video.style.objectPosition = 'center';
          if (video.style.width !== '100%') video.style.width = '100%';
          if (video.style.height !== '100%') video.style.height = '100%';
          if (video.style.position !== 'absolute') video.style.position = 'absolute';
          if (video.style.inset !== '0px') (video.style as any).inset = '0';
          if (video.style.display !== 'block') video.style.display = 'block';
        });

        const bgVideos = containerRef.current.querySelectorAll<HTMLVideoElement>('.zk-video-bg video');
        bgVideos.forEach((video) => {
          if (video.style.objectFit !== 'cover') video.style.objectFit = 'cover';
          if (video.style.objectPosition !== 'center') video.style.objectPosition = 'center';
          if (!video.style.filter) video.style.filter = 'blur(18px) brightness(0.75) saturate(1.2)';
          if (!video.style.transform) video.style.transform = 'scale(1.2)';
        });
      }
    });

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
          console.log('⏸️ ZKViewer: enabled=false');
          return;
        }
        if (clientRef.current) return;

        const result = await initAgora(useVP8Fallback);
        if (!result) return;

        const { client, agoraAppId, agoraToken } = result;
        clientRef.current = client;

        client.on('connection-state-change', (state: string) => {
          if (!mounted) return;
          console.log('🔌 ZKViewer: connection-state-change', state);
          if (state === 'DISCONNECTED') {
            setIsLive(false);
          }
        });

        client.on('token-privilege-will-expire', () => {
          console.warn('⚠️ ZKViewer: Token vai expirar!');
        });

        client.on('token-privilege-did-expire', () => {
          setError('Token expirado');
        });

        // ✅ NOVO: Detectar erros de decodificação e fazer fallback para VP8
        client.on('exception', (event: any) => {
          console.warn('⚠️ ZKViewer: Exception', event);

          if (event.code === 1005 || event.msg === 'RECV_VIDEO_DECODE_FAILED') {
            setDecodeErrorCount(prev => {
              const newCount = prev + 1;
              console.error(`❌ RECV_VIDEO_DECODE_FAILED (${newCount}x)`);

              if (newCount >= 3 && !useVP8Fallback) {
                console.log('🔄 Tentando VP8...');
                setUseVP8Fallback(true);

                if (clientRef.current) {
                  clientRef.current.leave().then(() => {
                    clientRef.current = null;
                    setReconnectCount(prev => prev + 1);
                  }).catch(() => {
                    clientRef.current = null;
                  });
                }
              }
              return newCount;
            });
          }
        });

        client.on('user-published', async (user: any, mediaType: 'video' | 'audio') => {
          if (!mounted) return;

          console.log('🎬 user-published', { uid: user.uid, mediaType });

          try {
            await client.subscribe(user, mediaType);

            if (mediaType === 'video') {
              setIsLive(true);
              setError(null);
              setDecodeErrorCount(0);

              if (connectionTimeout) {
                clearTimeout(connectionTimeout);
                setConnectionTimeout(null);
              }

              if (connectionStartTime) {
                const totalTime = Date.now() - connectionStartTime;
                console.log('🔴 isLive = TRUE', { connectionTime: `${totalTime}ms`, codec: useVP8Fallback ? 'VP8' : 'H.264' });
                setConnectionStartTime(null);
              }

              if (user.videoTrack) {
                videoTrackRef.current = user.videoTrack;

                // ✅ CORREÇÃO: Usar qualidade ALTA (1) e desabilitar fallback para manter qualidade
                try { 
                  await client.setRemoteVideoStreamType?.(user.uid, 1);
                  // Fallback option: 1 = Disable (não fazer fallback automático, manter qualidade alta)
                  client.setStreamFallbackOption?.(user.uid, 1);
                  console.log('✅ ZKViewer: Qualidade de vídeo configurada para ALTA');
                } catch (err) {
                  console.warn('⚠️ ZKViewer: Erro ao configurar qualidade:', err);
                }

                await user.videoTrack.play(fgRef.current!);
                console.log('✅ Vídeo reproduzindo!');

                // Background blur (apenas desktop)
                const attachBgFromFg = () => {
                  if (!bgRef.current || !fgRef.current) return false;

                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  if (isMobile) return false;

                  const fgVideo = fgRef.current.querySelector('video') as HTMLVideoElement | null;
                  const srcObj = fgVideo?.srcObject;
                  if (!(srcObj instanceof MediaStream)) return false;

                  const fgTrack = srcObj.getVideoTracks?.()?.[0];
                  if (!fgTrack) return false;

                  if (bgTrackRef.current) { try { bgTrackRef.current.stop(); } catch { } bgTrackRef.current = null; }
                  if (bgVideoElRef.current) {
                    try { bgVideoElRef.current.pause?.(); (bgVideoElRef.current as any).srcObject = null; } catch { }
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
                  bgVideo.srcObject = bgStream;

                  bgVideo.style.cssText = 'width:100%;height:100%;object-fit:cover;object-position:center;filter:blur(18px) brightness(0.75) saturate(1.2);transform:scale(1.2);position:absolute;inset:0';

                  bgRef.current.innerHTML = '';
                  bgRef.current.appendChild(bgVideo);
                  bgVideoElRef.current = bgVideo;
                  bgVideo.play?.().catch(() => { });
                  return true;
                };

                let tries = 0;
                const tick = () => {
                  if (!mounted) return;
                  tries++;
                  if (attachBgFromFg() || tries >= 10) return;
                  requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
              }
            }

            if (mediaType === 'audio' && user.audioTrack) {
              audioTrackRef.current = user.audioTrack;
              if (muteAudio) {
                user.audioTrack.setVolume(0);
              } else {
                await user.audioTrack.play();
              }
            }
          } catch (err) {
            console.error('❌ Erro ao processar stream:', err);
          }
        });

        client.on('user-unpublished', (user: any, mediaType: 'video' | 'audio') => {
          if (!mounted) return;

          if (mediaType === 'video') {
            setIsLive(false);
            setReconnectCount(prev => prev + 1);

            if (videoTrackRef.current) { videoTrackRef.current.stop(); videoTrackRef.current = null; }
            if (bgTrackRef.current) { try { bgTrackRef.current.stop(); } catch { } bgTrackRef.current = null; }
            if (bgVideoElRef.current) {
              try { bgVideoElRef.current.pause?.(); (bgVideoElRef.current as any).srcObject = null; } catch { }
              bgVideoElRef.current.remove();
              bgVideoElRef.current = null;
            }
          }
        });

        await client.setClientRole('audience', { level: 1 });

        console.log('🔌 Conectando...', { channel, codec: useVP8Fallback ? 'VP8' : 'H.264' });

        const startTime = Date.now();
        setConnectionStartTime(startTime);

        const timeoutId = setTimeout(() => {
          if (!isLive && mounted) {
            setError('Conexão demorou muito...');
            setTimeout(() => {
              if (mounted && enabled) {
                setReconnectCount(prev => prev + 1);
                setError(null);
                init();
              }
            }, 2000);
          }
        }, 15000) as unknown as NodeJS.Timeout;

        setConnectionTimeout(timeoutId);

        try {
          await client.join(agoraAppId, channel, agoraToken, null);
          clearTimeout(timeoutId);
          setConnectionTimeout(null);
          console.log('✅ Conectado!', { channel, connectionTime: `${Date.now() - startTime}ms` });
        } catch (joinError: any) {
          clearTimeout(timeoutId);
          throw joinError;
        }
      } catch (err: any) {
        console.error('❌ Erro:', err);
        if (mounted) {
          setError(err?.message || 'Erro ao conectar');

          if (!useVP8Fallback && reconnectCount < 2) {
            console.log('🔄 Tentando VP8...');
            setUseVP8Fallback(true);
            setTimeout(() => {
              if (mounted && enabled) { setReconnectCount(prev => prev + 1); setError(null); init(); }
            }, 1000);
          } else if (reconnectCount < 5) {
            setTimeout(() => {
              if (mounted && enabled) { setReconnectCount(prev => prev + 1); setError(null); init(); }
            }, 3000);
          } else {
            setError('Não foi possível conectar. Recarregue a página.');
          }
        }
      }
    };

    if (enabled) init();

    return () => {
      mounted = false;
      videoObserver.disconnect();
      videoTrackRef.current?.stop();
      audioTrackRef.current?.stop();
      if (clientRef.current) { clientRef.current.removeAllListeners(); clientRef.current.leave(); clientRef.current = null; }
      if (bgTrackRef.current) { try { bgTrackRef.current.stop(); } catch { } bgTrackRef.current = null; }
      if (bgVideoElRef.current) { try { bgVideoElRef.current.pause?.(); (bgVideoElRef.current as any).srcObject = null; } catch { } bgVideoElRef.current.remove(); bgVideoElRef.current = null; }
    };
  }, [appId, channel, token, muteAudio, enabled, useVP8Fallback, initAgora]);

  useEffect(() => {
    if (!enabled && clientRef.current) {
      setIsLive(false);
      setError(null);
      if (videoTrackRef.current) { try { videoTrackRef.current.stop(); } catch { } videoTrackRef.current = null; }
      if (audioTrackRef.current) { try { audioTrackRef.current.stop(); } catch { } audioTrackRef.current = null; }
      if (bgTrackRef.current) { try { bgTrackRef.current.stop(); } catch { } bgTrackRef.current = null; }
      if (bgVideoElRef.current) { try { bgVideoElRef.current.pause?.(); (bgVideoElRef.current as any).srcObject = null; } catch { } bgVideoElRef.current.remove(); bgVideoElRef.current = null; }
      const client = clientRef.current;
      clientRef.current = null;
      try { client.removeAllListeners(); client.leave().catch(() => { }); } catch { }
    }
  }, [enabled]);

  useEffect(() => {
    if (!connectionStartTime || isLive) { setConnectionElapsedTime(0); return; }
    const interval = setInterval(() => { setConnectionElapsedTime(Math.floor((Date.now() - connectionStartTime) / 1000)); }, 1000);
    return () => clearInterval(interval);
  }, [connectionStartTime, isLive]);

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-black text-white">
        <div className="text-center">
          <p className="mb-2">⚠️ {error}</p>
          <button onClick={() => { setError(null); setReconnectCount(0); setDecodeErrorCount(0); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm">🔄 Tentar Novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: 'black', overflow: 'hidden' }}>
      <div ref={bgRef} className="zk-video-bg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, backgroundColor: 'black' }} />
      <div ref={fgRef} className="zk-video-fg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, backgroundColor: 'transparent' }} />
      {!isLive && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 pb-10">
          <div className="w-10 h-10 border-2 border-white/10 border-t-rose-500 rounded-full animate-spin mb-4" />
          <p className="text-white/80 text-sm font-medium animate-pulse tracking-wide">{connectionStartTime ? 'CONECTANDO AO VIVO...' : 'AGUARDANDO TRANSMISSÃO...'}</p>
          {reconnectCount > 0 && <p className="text-white/50 text-xs mt-2">Tentativa {reconnectCount + 1}...</p>}
          {connectionStartTime && connectionElapsedTime > 0 && <p className="text-white/40 text-xs mt-1">{connectionElapsedTime}s</p>}
          {useVP8Fallback && <p className="text-yellow-400/60 text-xs mt-2">Usando codec alternativo</p>}
        </div>
      )}
    </div>
  );
}
