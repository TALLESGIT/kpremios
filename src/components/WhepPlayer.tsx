import { useEffect, useRef, useState, useCallback } from 'react';

// =============================================================================
// CONFIGURAÇÃO - Produção SaaS
// =============================================================================

const CONFIG = {
  FETCH_TIMEOUT_MS: 10_000,
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_BASE_DELAY_MS: 1_500,
  RECONNECT_MAX_DELAY_MS: 30_000,
  MAX_INITIAL_ATTEMPTS: 3,
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
  | 'disconnected';

interface WhepPlayerProps {
  channelName: string;
  autoPlay?: boolean;
  muted?: boolean;
  fitMode?: 'contain' | 'cover';
  className?: string;
  /** Prefixo do path MediaMTX. Default "live" → URL = {base}/live/{channel}/whep */
  pathPrefix?: string;
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
  muted = false,
  fitMode = 'contain',
  className = '',
  pathPrefix = 'live',
}: WhepPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const wasLiveRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const initialAttemptRef = useRef(0);

  const [status, setStatus] = useState<WhepPlayerStatus>('idle');

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
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        bundlePolicy: 'max-bundle',
        iceTransportPolicy: 'all',
      });

      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      pcRef.current = pc;

      pc.ontrack = (event) => {
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
            setStatusSafe('connected');
            break;

          case 'disconnected':
          case 'failed':
            if (wasLiveRef.current) {
              const attempt = reconnectAttemptRef.current;
              if (attempt >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
                setStatusSafe('error');
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
            setStatusSafe('disconnected');
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

        const timeoutId = setTimeout(
          () => controller.abort(),
          CONFIG.FETCH_TIMEOUT_MS
        );

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

        if (response.status === 404 || response.status === 502) {
          setStatusSafe('offline');
          cleanup();
          return;
        }

        if (!response.ok) {
          setStatusSafe('error');
          cleanup();
          return;
        }

        const answer = await response.text();
        await pc.setRemoteDescription({ type: 'answer', sdp: answer });
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
              setStatusSafe('error');
              cleanup();
            }
          } else {
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

        setStatusSafe('error');
        cleanup();
      }
    },
    [baseUrl, channelName, pathPrefix, cleanup, setStatusSafe]
  );

  useEffect(() => {
    mountedRef.current = true;
    wasLiveRef.current = false;
    reconnectAttemptRef.current = 0;
    initialAttemptRef.current = 0;

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

  const statusLabel: Record<WhepPlayerStatus, string> = {
    idle: '',
    connecting: 'Conectando...',
    connected: 'Ao vivo',
    offline: 'Aguardando transmissão...',
    reconnecting: 'Reconectando...',
    error: 'Erro de conexão',
    disconnected: 'Desconectado',
  };

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        controls
        className="w-full h-full"
        style={{
          objectFit: fitMode,
          backgroundColor: '#000',
        }}
      />
      <div
        className="absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-medium bg-black/60 text-white"
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
