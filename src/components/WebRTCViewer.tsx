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
  | 'error';

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

  const [status, setStatus] = useState<WebRTCViewerStatus>('idle');

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
            setStatusSafe('live');
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

        // 404/502 = stream ainda não começou → retry contínuo até entrar online
        if (response.status === 404 || response.status === 502) {
          setStatusSafe('offline');
          cleanup();
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            if (mountedRef.current) startConnection(false);
          }, 1500);
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
          if (
            'playoutDelayHint' in receiver &&
            receiver.track?.kind === 'video'
          ) {
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
              setStatusSafe('error');
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
    connecting: 'Conectando...',
    live: 'Ao vivo',
    offline: 'Aguardando transmissão...',
    reconnecting: 'Reconectando...',
    error: 'Erro de conexão',
  };

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
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
        {status === 'live' && <span className="ml-1 text-red-500">●</span>}
      </div>
    </div>
  );
}

export default WebRTCViewer;
export { WebRTCViewer };
export type { WebRTCViewerProps, WebRTCViewerStatus };
