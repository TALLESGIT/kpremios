import React, { useEffect, useRef, useState, useCallback } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

interface ZKViewerProps {
  appId?: string;
  channel: string;
  token?: string | null;
  fitMode?: 'contain' | 'cover';
  muteAudio?: boolean;
  enabled?: boolean;
}

export function ZKViewer({ appId, channel, token, fitMode = 'contain', muteAudio = false, enabled = true }: ZKViewerProps) {
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
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null); // ✅ Ref para acessar timeout em callbacks
  const [connectionStartTime, setConnectionStartTime] = useState<number | null>(null);
  const [connectionElapsedTime, setConnectionElapsedTime] = useState<number>(0);

  // ✅ NOVO: Estado para fallback de codec
  const [useVP8Fallback, setUseVP8Fallback] = useState(false);
  const [decodeErrorCount, setDecodeErrorCount] = useState(0);

  // ✅ Seletor de qualidade (Agora: Automático / Alta / Baixa) - ajuda em 4G/Wi‑Fi ruim
  const [qualityPreference, setQualityPreference] = useState<'auto' | 'high' | 'low'>('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const remoteVideoUidRef = useRef<number | string | null>(null);
  const qualityPreferenceRef = useRef<'auto' | 'high' | 'low'>('auto');
  qualityPreferenceRef.current = qualityPreference;



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
          
          // ✅ CORREÇÃO: Limpar timeout quando conectado
          if (state === 'CONNECTED' && connectionTimeoutRef.current) {
            console.log('✅ ZKViewer: Conexão estabelecida, aguardando stream...');
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
            setConnectionTimeout(null);
            // Não limpar erro aqui - aguardar user-published para isso
          }
          
          if (state === 'DISCONNECTED') {
            setIsLive(false);
            // Se desconectou, permitir timeout novamente
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
              setConnectionTimeout(null);
            }
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

          // Monitorar erro ICE 701
          if (event.code === 701) {
            console.error('❌ ZKViewer: Erro ICE 701 - Verifique firewall/nat');
          }

          if (event.code === 1005 || event.msg === 'RECV_VIDEO_DECODE_FAILED') {
            setDecodeErrorCount(prev => {
              const newCount = prev + 1;
              console.error(`❌ RECV_VIDEO_DECODE_FAILED (${newCount}x)`);

              if (newCount >= 3 && !useVP8Fallback) {
                console.log('🔄 Tentando VP8...');
                setUseVP8Fallback(true);
                // Trigger retry via state
                setReconnectCount(prev => prev + 1);
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

              // ✅ CORREÇÃO: Limpar timeout quando stream aparece
              if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
                connectionTimeoutRef.current = null;
                setConnectionTimeout(null);
              }

              if (connectionStartTime) {
                const totalTime = Date.now() - connectionStartTime;
                console.log('🔴 isLive = TRUE', { connectionTime: `${totalTime}ms`, codec: useVP8Fallback ? 'VP8' : 'H.264' });
                setConnectionStartTime(null);
              }

              if (user.videoTrack) {
                videoTrackRef.current = user.videoTrack;
                remoteVideoUidRef.current = user.uid;

                // ✅ Aplicar preferência de qualidade (Automático / Alta / Baixa)
                try {
                  const q = qualityPreferenceRef.current;
                  const streamType = q === 'low' ? 0 : 1; // 0 = baixa, 1 = alta
                  const fallbackOption = q === 'auto' ? 0 : 1; // 0 = permitir fallback, 1 = desabilitar
                  await client.setRemoteVideoStreamType?.(user.uid, streamType);
                  client.setStreamFallbackOption?.(user.uid, fallbackOption);
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
            remoteVideoUidRef.current = null;

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

        console.log('🔌 Conectando...', { channel, codec: useVP8Fallback ? 'VP8' : 'H.264', attempt: reconnectCount + 1 });

        const startTime = Date.now();
        setConnectionStartTime(startTime);

        const timeoutId = setTimeout(() => {
          // ✅ CORREÇÃO: Só mostrar erro se realmente não estiver conectado
          // Verificar connection state antes de mostrar erro
          const connectionState = clientRef.current?.connectionState;
          const isConnected = connectionState === 'CONNECTED' || connectionState === 'CONNECTING';
          
          if (!isLive && !isConnected && mounted) {
            console.warn('⚠️ ZKViewer: Timeout de conexão - tentando reconectar...');
            setError('Conexão demorou muito...');
            // Retry automático após timeout
            setTimeout(() => {
              if (mounted && enabled) {
                setReconnectCount(prev => prev + 1);
                setError(null);
              }
            }, 2000);
          } else if (isConnected && !isLive) {
            // Se está conectado mas ainda não recebeu stream, aguardar mais
            console.log('⏳ ZKViewer: Conectado, aguardando stream...');
            // Não mostrar erro, apenas aguardar
          }
        }, 30000) as unknown as NodeJS.Timeout; // ✅ Aumentado para 30 segundos

        connectionTimeoutRef.current = timeoutId;
        setConnectionTimeout(timeoutId);

        try {
          await client.join(agoraAppId, channel, agoraToken, null);
          console.log('✅ Conectado!', { channel, connectionTime: `${Date.now() - startTime}ms` });
          
          // ✅ CORREÇÃO: Limpar timeout quando join é bem-sucedido
          // O timeout só deve disparar se realmente não conseguir conectar
          // Se conectou, aguardar o stream aparecer (user-published)
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
            setConnectionTimeout(null);
          }
        } catch (joinError: any) {
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
            setConnectionTimeout(null);
          }
          throw joinError;
        }
      } catch (err: any) {
        console.error('❌ Erro de conexão:', err);
        if (mounted) {
          setError(err?.message || 'Erro ao conectar');

          // Cleanup force
          if (clientRef.current) {
            try { clientRef.current.leave(); } catch { }
            clientRef.current = null;
          }

          if (!useVP8Fallback && reconnectCount < 2) {
            console.log('🔄 Tentando VP8 após falha...');
            setUseVP8Fallback(true);
            // O setUseVP8Fallback já vai triggerar o effect? Não, ele está na dependência? Sim.
            // Mas incrementamos reconnectCount para garantir reset
            setTimeout(() => {
              if (mounted && enabled) setReconnectCount(prev => prev + 1);
            }, 1000);

          } else if (reconnectCount < 10) { // Aumentei tentativas
            console.log(`🔄 Tentando novamente em 3s (Tentativa ${reconnectCount + 1})...`);
            setTimeout(() => {
              if (mounted && enabled) {
                setError(null);
                setReconnectCount(prev => prev + 1);
              }
            }, 3000);
          } else {
            setError('Não foi possível conectar. Verifique sua internet.');
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
  }, [appId, channel, token, muteAudio, enabled, useVP8Fallback, initAgora, reconnectCount]);

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
      {isLive && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowQualityMenu((v) => !v)}
              className="p-3 bg-black/70 hover:bg-black/90 rounded-lg text-white transition-colors flex items-center gap-2 text-sm"
              aria-label="Qualidade do vídeo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span>
                {qualityPreference === 'auto' ? 'Automático' : qualityPreference === 'high' ? 'Alta' : 'Baixa'}
              </span>
            </button>
            {showQualityMenu && (
              <>
                <div className="fixed inset-0 z-40" aria-hidden onClick={() => setShowQualityMenu(false)} />
                <div className="absolute right-0 bottom-full mb-1 py-1 min-w-[140px] bg-black/95 rounded-lg border border-white/20 shadow-xl z-50">
                  {(['auto', 'high', 'low'] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        setQualityPreference(q);
                        setShowQualityMenu(false);
                        const uid = remoteVideoUidRef.current;
                        const client = clientRef.current;
                        if (uid != null && client?.setRemoteVideoStreamType) {
                          const streamType = q === 'low' ? 0 : 1;
                          const fallbackOption = q === 'auto' ? 0 : 1;
                          client.setRemoteVideoStreamType(uid, streamType).catch(() => {});
                          client.setStreamFallbackOption?.(uid, fallbackOption);
                        }
                      }}
                      className={`w-full px-4 py-2 text-left text-sm ${qualityPreference === q ? 'bg-white/20 text-white' : 'text-slate-300 hover:bg-white/10'}`}
                    >
                      {q === 'auto' ? 'Automático' : q === 'high' ? 'Alta' : 'Baixa'}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!isLive && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950">
          <div className="flex flex-col items-center space-y-6 animate-in fade-in duration-700">
            {/* Logo ou Ícone Minimalista */}
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-white font-bold tracking-widest uppercase text-sm">
                {connectionStartTime ? 'Sincronizando Sinal' : 'Aguardando Transmissão'}
              </h3>
              <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">
                {connectionStartTime ? 'Estabelecendo conexão segura...' : 'O evento começará em breve'}
              </p>
            </div>
          </div>

          {/* Indicador discreto de tentativas (apenas visual, sem números) */}
          {reconnectCount > 0 && (
            <div className="absolute bottom-8 flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < (reconnectCount % 3) + 1 ? 'bg-blue-500/50' : 'bg-zinc-800'} transition-all`} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ✅ OTIMIZAÇÃO: Memoizar o componente para evitar re-renders se props não mudarem
export default React.memo(ZKViewer);
