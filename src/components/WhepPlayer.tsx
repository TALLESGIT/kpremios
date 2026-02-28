import { useEffect, useRef, useState, useCallback } from 'react';

// =============================================================================
// CONFIGURAÇÃO - Produção SaaS
// =============================================================================

const CONFIG = {
  /** Timeout do fetch WHEP — reduzir para falhar mais rápido e retentar */
  FETCH_TIMEOUT_MS: 6_000,
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_BASE_DELAY_MS: 1_500,
  RECONNECT_MAX_DELAY_MS: 30_000,
  MAX_INITIAL_ATTEMPTS: 3,
  /** Backoff para 404 quando expectLive=false (usuário só navegando) */
  OFFLINE_RETRY_BASE_MS: 1_500,
  OFFLINE_RETRY_MAX_MS: 8_000,
  /** Retries mais rápidos quando live está ativa no DB (expectLive=true) — reduz ~15s para ~5s */
  OFFLINE_RETRY_BASE_MS_EXPECT_LIVE: 500,
  OFFLINE_RETRY_MAX_MS_EXPECT_LIVE: 2_000,
} as const;

// =============================================================================
// TIPOS
// =============================================================================

export type WhepPlayerStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'offline'
  | 'reconnecting'
  | 'error'
  | 'disconnected'
  | 'ended';

interface WhepPlayerProps {
  channelName: string;
  autoPlay?: boolean;
  muted?: boolean;
  fitMode?: 'contain' | 'cover';
  className?: string;
  /** Prefixo do path MediaMTX. Default "live" → URL = {base}/live/{channel}/whep */
  pathPrefix?: string;
  /** Admin NUNCA deve ouvir WebRTC — evita eco (já escuta áudio local do ZK Studio) */
  isAdmin?: boolean;
  /** Quando true (live ativa no DB), retry mais agressivo para conectar assim que SRT subir */
  expectLive?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function normalizeWhepBaseUrl(url: string | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}

function buildWhepUrl(
  baseUrl: string,
  channelName: string,
  pathPrefix: string
): string {
  const base = baseUrl.replace(/\/+$/, '');
  const channel = channelName.replace(/^\/+|\/+$/g, '') || 'ZkOficial';
  const path = pathPrefix
    ? `${pathPrefix.replace(/^\/+|\/+$/g, '')}/${channel}`
    : channel;
  return `${base}/${path}/whep`;
}

// =============================================================================
// COMPONENTE
// =============================================================================

/**
 * Player WHEP robusto para produção.
 * Fluxo: ZK Studio → SRT → MediaMTX → WebRTC (WHEP) → React
 *
 * - addTransceiver recvonly explícito (vídeo + áudio)
 * - VITE_WHEP_BASE_URL
 * - pathPrefix para MediaMTX (default "live")
 * - AbortController, cleanup, reconexão com backoff
 */
function WhepPlayer({
  channelName = 'ZkOficial',
  autoPlay = true,
  muted = true,
  fitMode = 'contain',
  className = '',
  pathPrefix = 'live',
  isAdmin = false,
  expectLive = false,
}: WhepPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveEdgeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const wasLiveRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const initialAttemptRef = useRef(0);
  const offline404CountRef = useRef(0);
  const expectLiveRef = useRef(expectLive);

  const [status, setStatus] = useState<WhepPlayerStatus>('idle');
  const [isUserMuted, setIsUserMuted] = useState(muted);

  const baseUrl = normalizeWhepBaseUrl(
    import.meta.env.VITE_WHEP_BASE_URL as string | undefined
  );

  const setStatusSafe = useCallback((next: WhepPlayerStatus) => {
    if (mountedRef.current) setStatus(next);
  }, []);

  const cleanup = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }

    if (liveEdgeIntervalRef.current) {
      clearInterval(liveEdgeIntervalRef.current);
      liveEdgeIntervalRef.current = null;
    }

    const pc = pcRef.current;
    if (pc) {
      try {
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        pc.close();
      } catch {
        // ignore
      }
      pcRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startConnection = useCallback(
    async (isReconnect = false) => {
      if (!baseUrl) {
        setStatusSafe('error');
        return;
      }

      setStatusSafe(isReconnect ? 'reconnecting' : 'connecting');

      const whepUrl = buildWhepUrl(baseUrl, channelName, pathPrefix);
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
        bundlePolicy: 'max-bundle',
        iceTransportPolicy: 'all',
      });
      pc.getConfiguration();

      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      pcRef.current = pc;

      pc.ontrack = (event) => {
        console.log('TRACK:', event.track.kind);
        const stream = event.streams[0];
        if (stream && videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      };

      pc.onconnectionstatechange = () => {
        if (!pcRef.current || pcRef.current !== pc) return;
        if (!mountedRef.current) return;

        switch (pc.connectionState) {
          case 'connected':
            wasLiveRef.current = true;
            reconnectAttemptRef.current = 0;
            offline404CountRef.current = 0;
            // Limpar timer de disconnected se houver
            if (disconnectTimerRef.current) {
              clearTimeout(disconnectTimerRef.current);
              disconnectTimerRef.current = null;
            }
            setStatusSafe('connected');
            // Iniciar live edge sync para manter o player no tempo real
            startLiveEdgeSync();
            break;

          case 'disconnected':
            // "disconnected" é temporário no WebRTC — dar 5s para se recuperar
            console.log('[whep] Disconnected, aguardando 5s para recuperar...');
            if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
            disconnectTimerRef.current = setTimeout(() => {
              disconnectTimerRef.current = null;
              if (!pcRef.current || pcRef.current !== pc || !mountedRef.current) return;
              if (pc.connectionState === 'disconnected') {
                console.log('[whep] Não recuperou, reconectando...');
                handleReconnect();
              }
            }, 5000);
            break;

          case 'failed':
            handleReconnect();
            break;

          case 'closed':
            setStatusSafe('disconnected');
            break;

          default:
            break;
        }
      };

      function handleReconnect() {
        if (wasLiveRef.current) {
          const attempt = reconnectAttemptRef.current;
          if (attempt >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
            setStatusSafe('ended');
            cleanup();
            return;
          }
          reconnectAttemptRef.current = attempt + 1;
          const delay =
            attempt === 0
              ? 0
              : Math.min(
                CONFIG.RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt),
                CONFIG.RECONNECT_MAX_DELAY_MS
              );
          setStatusSafe('reconnecting');
          cleanup();
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            if (mountedRef.current) startConnection(true);
          }, delay);
        } else {
          setStatusSafe('offline');
          cleanup();
        }
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (!offer.sdp) {
          throw new Error('SDP vazio');
        }

        // ⚡ Aguardar ICE gathering completar antes de enviar
        const localSDP = await waitForICEGathering(pc, 3000);

        const timeoutId = setTimeout(
          () => controller.abort(),
          CONFIG.FETCH_TIMEOUT_MS
        );

        const response = await fetch(whepUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/sdp',
            'Authorization': 'Basic ' + btoa('zk_viewer:@zk_view_2026')
          },
          body: localSDP,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));

        abortControllerRef.current = null;

        if (!mountedRef.current) {
          cleanup();
          return;
        }

        // 404/502 = stream indisponível
        if (response.status === 404 || response.status === 502) {
          if (wasLiveRef.current) {
            // Estava assistindo e o stream sumiu → ZK Studio encerrou (não usa Supabase)
            setStatusSafe('ended');
            cleanup();
            return;
          }
          const count = offline404CountRef.current;
          offline404CountRef.current = count + 1;
          const expectLive = expectLiveRef.current;
          const baseMs = expectLive ? CONFIG.OFFLINE_RETRY_BASE_MS_EXPECT_LIVE : CONFIG.OFFLINE_RETRY_BASE_MS;
          const maxMs = expectLive ? CONFIG.OFFLINE_RETRY_MAX_MS_EXPECT_LIVE : CONFIG.OFFLINE_RETRY_MAX_MS;
          const exponent = expectLive ? 1.25 : 1.4;
          const delay = Math.min(
            baseMs * Math.pow(exponent, Math.min(count, 12)),
            maxMs
          );
          setStatusSafe('offline');
          cleanup();
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            if (mountedRef.current) startConnection(false);
          }, delay);
          return;
        }

        if (!response.ok) {
          setStatusSafe('error');
          cleanup();
          return;
        }

        const answer = await response.text();
        await pc.setRemoteDescription({ type: 'answer', sdp: answer });

        pc.getReceivers().forEach((receiver) => {
          if ('playoutDelayHint' in receiver) {
            (receiver as any).playoutDelayHint = 0;
          }
        });
      } catch (err) {
        abortControllerRef.current = null;

        if (!mountedRef.current) {
          cleanup();
          return;
        }

        const isAbort = (err as Error)?.name === 'AbortError';

        if (isAbort) {
          if (wasLiveRef.current) {
            const attempt = reconnectAttemptRef.current;
            if (attempt < CONFIG.MAX_RECONNECT_ATTEMPTS) {
              reconnectAttemptRef.current = attempt + 1;
              // Primeira tentativa: delay 0 — detecta fim da transmissão (404) imediatamente
              const delay =
                attempt === 0
                  ? 0
                  : Math.min(
                    CONFIG.RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt),
                    CONFIG.RECONNECT_MAX_DELAY_MS
                  );
              setStatusSafe('reconnecting');
              cleanup();
              reconnectTimeoutRef.current = setTimeout(() => {
                reconnectTimeoutRef.current = null;
                if (mountedRef.current) startConnection(true);
              }, delay);
            } else {
              setStatusSafe('ended');
              cleanup();
            }
          } else {
            const attempt = initialAttemptRef.current;
            if (attempt < CONFIG.MAX_INITIAL_ATTEMPTS - 1) {
              initialAttemptRef.current = attempt + 1;
              const baseMs = expectLiveRef.current ? CONFIG.OFFLINE_RETRY_BASE_MS_EXPECT_LIVE : CONFIG.RECONNECT_BASE_DELAY_MS;
              const delay = baseMs * (attempt + 1);
              setStatusSafe('connecting');
              cleanup();
              reconnectTimeoutRef.current = setTimeout(() => {
                reconnectTimeoutRef.current = null;
                if (mountedRef.current) startConnection(false);
              }, delay);
            } else {
              setStatusSafe('offline');
              cleanup();
            }
          }
          return;
        }

        setStatusSafe('error');
        cleanup();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseUrl, channelName, pathPrefix, cleanup, setStatusSafe]
  );

  // Aguarda ICE gathering completar ou timeout
  function waitForICEGathering(pc: RTCPeerConnection, timeoutMs: number): Promise<string> {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve(pc.localDescription!.sdp);
        return;
      }
      const timer = setTimeout(() => {
        console.log('[ice] Gathering timeout, sending partial candidates');
        resolve(pc.localDescription!.sdp);
      }, timeoutMs);

      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timer);
          console.log('[ice] Gathering complete');
          resolve(pc.localDescription!.sdp);
        }
      };
    });
  }

  // Live edge sync — mantém o player no tempo real
  function startLiveEdgeSync() {
    if (liveEdgeIntervalRef.current) clearInterval(liveEdgeIntervalRef.current);
    liveEdgeIntervalRef.current = setInterval(() => {
      const vid = videoRef.current;
      if (!vid || !vid.srcObject || vid.paused || !vid.buffered.length) return;
      const liveEdge = vid.buffered.end(vid.buffered.length - 1);
      const behind = liveEdge - vid.currentTime;
      if (behind > 0.5) {
        console.log(`[sync] ${behind.toFixed(1)}s atrás, pulando para live edge`);
        vid.currentTime = liveEdge - 0.05;
      }
    }, 3000);
  }

  expectLiveRef.current = expectLive;

  useEffect(() => {
    mountedRef.current = true;
    wasLiveRef.current = false;
    reconnectAttemptRef.current = 0;
    initialAttemptRef.current = 0;
    offline404CountRef.current = 0;
    expectLiveRef.current = expectLive;

    if (!baseUrl) {
      setStatus('error');
      return;
    }

    startConnection(false);

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [baseUrl, channelName, pathPrefix]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    expectLiveRef.current = expectLive;
    if (!expectLive || !baseUrl) return;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    offline404CountRef.current = 0;
    // Só reconectar em 'offline' (aguardando stream). Em 'ended' NÃO retentar — evita spam de 404 no console
    if (status === 'offline' && mountedRef.current) {
      startConnection(false);
    }
  }, [expectLive, baseUrl, status, startConnection]);

  const statusLabel: Record<WhepPlayerStatus, string> = {
    idle: '',
    connecting: 'Estabelecendo conexão...',
    connected: 'Ao vivo',
    offline: 'A transmissão começará em breve',
    reconnecting: 'Reconectando...',
    error: 'Erro de conexão',
    disconnected: 'Desconectado',
    ended: '',
  };

  const handleVideoClick = useCallback(() => {
    if (videoRef.current && status === 'connected' && isUserMuted) {
      videoRef.current.muted = false;
      setIsUserMuted(false);
    }
  }, [status, isUserMuted]);

  return (
    <div
      className={`relative w-full h-full bg-black cursor-pointer ${className}`}
      onClick={handleVideoClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleVideoClick()}
      aria-label={isUserMuted && status === 'connected' ? 'Clique para ativar o áudio' : undefined}
    >
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        playsInline
        muted={isAdmin ? true : isUserMuted}
        controls
        className="w-full h-full pointer-events-none"
        style={{
          objectFit: fitMode,
          backgroundColor: '#000',
        }}
      />
      {status === 'ended' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-sm z-20"
          aria-hidden
        >
          <div className="flex flex-col items-center space-y-6 animate-in fade-in duration-500">
            <div className="w-20 h-20 rounded-full border-2 border-white/10 flex items-center justify-center bg-white/5">
              <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-center space-y-3 px-8 max-w-sm">
              <h3 className="text-white font-semibold text-lg tracking-tight">Transmissão encerrada</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Obrigado por assistir! A transmissão chegou ao fim.
                <br />
                Fique atento para as próximas lives.
              </p>
            </div>
            <div className="w-16 h-0.5 bg-white/10 rounded-full" />
          </div>
        </div>
      )}
      {status === 'connected' && isUserMuted && !isAdmin && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 transition-opacity hover:bg-black/20"
          aria-hidden
        >
          <div className="flex flex-col items-center gap-2 text-white/90">
            <svg
              className="w-14 h-14"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
              />
            </svg>
            <span className="text-sm font-medium tracking-wide">Clique para ativar o áudio</span>
          </div>
        </div>
      )}
      <div
        className="absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-medium bg-black/60 text-white pointer-events-none"
        aria-live="polite"
      >
        {statusLabel[status]}
        {status === 'connected' && <span className="ml-1 text-red-500">●</span>}
      </div>
    </div>
  );
}

export default WhepPlayer;
export { WhepPlayer };
export type { WhepPlayerProps };
