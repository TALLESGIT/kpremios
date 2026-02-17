import { useEffect, useRef, useState, useCallback } from 'react';

// =============================================================================
// CONFIGURAÇÃO - Produção SaaS
// =============================================================================

const CONFIG = {
  /** Timeout do fetch WHEP (ms) */
  FETCH_TIMEOUT_MS: 10_000,
  /** Máximo de tentativas de reconexão após ter estado "live" */
  MAX_RECONNECT_ATTEMPTS: 5,
  /** Delay base para backoff exponencial (ms) */
  RECONNECT_BASE_DELAY_MS: 1_500,
  /** Máximo delay entre tentativas (ms) */
  RECONNECT_MAX_DELAY_MS: 30_000,
  /** Tentativas iniciais (antes de conectar) para timeout/erro de rede */
  MAX_INITIAL_ATTEMPTS: 3,
  /** Backoff para 404: primeiros retries rápidos, depois mais espaçados (reduz spam no console) */
  OFFLINE_RETRY_BASE_MS: 1_500,
  OFFLINE_RETRY_MAX_MS: 8_000,
} as const;

// =============================================================================
// TIPOS
// =============================================================================

type WebRTCViewerStatus =
  | 'idle'
  | 'connecting'
  | 'live'
  | 'offline'
  | 'reconnecting'
  | 'error'
  | 'ended';

interface WebRTCViewerProps {
  /** Path completo MediaMTX (ex: live/ZkOficial). SRT publica em live/ZkOficial */
  streamName?: string;
  fitMode?: 'contain' | 'cover';
  className?: string;
  muted?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function normalizeWhepBaseUrl(url: string | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}

function buildWhepUrl(baseUrl: string, streamName: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const path = streamName.replace(/^\/+|\/+$/g, '') || 'live/ZkOficial';
  return `${base}/${path}/whep`;
}

// =============================================================================
// COMPONENTE
// =============================================================================

/**
 * Player WebRTC (WHEP) de baixa latência para produção.
 * Fluxo: ZK Studio → SRT → MediaMTX → WebRTC (WHEP) → React
 *
 * - RTCPeerConnection com ICE config adequado
 * - Cleanup completo (PeerConnection, srcObject, listeners)
 * - Reconexão com backoff exponencial (sem loop infinito)
 * - 404/502 = stream offline (não reconecta)
 * - AbortController para fetch e unmount
 * - Estados claros: connecting | live | offline | reconnecting | error
 */
function WebRTCViewer({
  streamName = 'live/ZkOficial',
  fitMode = 'contain',
  className = '',
  muted = true,
}: WebRTCViewerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const wasLiveRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const initialAttemptRef = useRef(0);
  const offline404CountRef = useRef(0);

  const [status, setStatus] = useState<WebRTCViewerStatus>('idle');
  const [isUserMuted, setIsUserMuted] = useState(muted);

  const baseUrl = normalizeWhepBaseUrl(
    import.meta.env.VITE_WHEP_BASE_URL as string | undefined
  );

  // ---------------------------------------------------------------------------
  // Safe setState (evita setState após unmount)
  // ---------------------------------------------------------------------------
  const setStatusSafe = useCallback((next: WebRTCViewerStatus) => {
    if (mountedRef.current) {
      setStatus(next);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Cleanup completo
  // ---------------------------------------------------------------------------
  const cleanup = useCallback(() => {
    // Cancelar fetch em andamento
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    // Cancelar timeout de reconexão
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Fechar RTCPeerConnection e remover referências
    const pc = pcRef.current;
    if (pc) {
      try {
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        pc.oniceconnectionstatechange = null;
        pc.close();
      } catch (e) {
        // Ignorar erros ao fechar (pode já estar closed)
      }
      pcRef.current = null;
    }

    // Limpar vídeo
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Iniciar conexão WHEP
  // ---------------------------------------------------------------------------
  const startConnection = useCallback(
    async (isReconnect = false) => {
      if (!baseUrl) {
        setStatusSafe('error');
        return;
      }

      setStatusSafe(isReconnect ? 'reconnecting' : 'connecting');

      const whepUrl = buildWhepUrl(baseUrl, streamName);
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
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
            setStatusSafe('live');
            break;

          case 'disconnected':
          case 'failed':
            if (wasLiveRef.current) {
              const attempt = reconnectAttemptRef.current;
              if (attempt >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
                setStatusSafe('ended');
                cleanup();
                return;
              }
              reconnectAttemptRef.current = attempt + 1;
              const delay = Math.min(
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
            break;

          case 'closed':
            setStatusSafe('offline');
            break;

          default:
            break;
        }
      };

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (!offer.sdp) {
          throw new Error('SDP vazio');
        }

        const timeoutId = setTimeout(() => controller.abort(), CONFIG.FETCH_TIMEOUT_MS);

        const response = await fetch(whepUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: offer.sdp,
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
            setStatusSafe('ended');
            cleanup();
            return;
          }
          const count = offline404CountRef.current;
          offline404CountRef.current = count + 1;
          const delay = Math.min(
            CONFIG.OFFLINE_RETRY_BASE_MS * Math.pow(1.4, Math.min(count, 12)),
            CONFIG.OFFLINE_RETRY_MAX_MS
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
          // Timeout ou unmount
          if (wasLiveRef.current) {
            // Já estava live - tratar como desconexão, reconectar
            const attempt = reconnectAttemptRef.current;
            if (attempt < CONFIG.MAX_RECONNECT_ATTEMPTS) {
              reconnectAttemptRef.current = attempt + 1;
              const delay = Math.min(
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
            // Tentativa inicial - retry com backoff
            const attempt = initialAttemptRef.current;
            if (attempt < CONFIG.MAX_INITIAL_ATTEMPTS - 1) {
              initialAttemptRef.current = attempt + 1;
              const delay = CONFIG.RECONNECT_BASE_DELAY_MS * (attempt + 1);
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

        // Outros erros (rede, etc.)
        setStatusSafe('error');
        cleanup();
      }
    },
    [baseUrl, streamName, cleanup, setStatusSafe]
  );

  // ---------------------------------------------------------------------------
  // Effect principal
  // ---------------------------------------------------------------------------
  useEffect(() => {
    mountedRef.current = true;
    wasLiveRef.current = false;
    reconnectAttemptRef.current = 0;
    initialAttemptRef.current = 0;
    offline404CountRef.current = 0;

    if (!baseUrl) {
      setStatus('error');
      return;
    }

    startConnection(false);

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [baseUrl, streamName]); // eslint-disable-line react-hooks/exhaustive-deps -- cleanup é estável

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const statusLabel: Record<WebRTCViewerStatus, string> = {
    idle: '',
    connecting: 'Estabelecendo conexão...',
    live: 'Ao vivo',
    offline: 'A transmissão começará em breve',
    reconnecting: 'Reconectando...',
    error: 'Erro de conexão',
    ended: '',
  };

  const handleVideoClick = useCallback(() => {
    if (videoRef.current && status === 'live' && isUserMuted) {
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
      aria-label={isUserMuted && status === 'live' ? 'Clique para ativar o áudio' : undefined}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isUserMuted}
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
      {status === 'live' && isUserMuted && (
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
        {status === 'live' && <span className="ml-1 text-red-500">●</span>}
      </div>
    </div>
  );
}

export default WebRTCViewer;
export { WebRTCViewer };
export type { WebRTCViewerProps, WebRTCViewerStatus };
