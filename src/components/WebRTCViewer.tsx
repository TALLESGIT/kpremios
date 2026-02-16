import { useEffect, useRef, useState, useCallback } from 'react';

interface Props {
  streamName?: string;
}

type Status =
  | 'idle'
  | 'connecting'
  | 'live'
  | 'offline'
  | 'reconnecting'
  | 'error';

/**
 * Player WebRTC (WHEP) de baixa latência para o viewer principal.
 * Usa RTCPeerConnection + POST SDP no endpoint WHEP do MediaMTX.
 * Endpoint base: VITE_WHEP_BASE_URL (sem IP hardcoded).
 */
function WebRTCViewer({ streamName = 'live' }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  const baseUrl = (import.meta.env.VITE_WHEP_BASE_URL as string | undefined)?.trim();

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {
        console.warn('WebRTCViewer: erro ao fechar RTCPeerConnection:', e);
      }
      pcRef.current = null;
    }
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.srcObject = null;
    }
  }, []);

  const startConnection = useCallback(async () => {
    if (!baseUrl) {
      setStatus('error');
      return;
    }

    setStatus('connecting');

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (!videoRef.current) return;
      const [stream] = event.streams;
      if (!stream) return;

      videoRef.current.srcObject = stream;
    };

    pc.onconnectionstatechange = () => {
      if (!pcRef.current) return;

      switch (pc.connectionState) {
        case 'connected':
          setStatus('live');
          break;
        case 'disconnected':
        case 'failed':
          setStatus('reconnecting');
          reconnect();
          break;
        case 'closed':
          setStatus('offline');
          break;
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (!offer.sdp) {
        throw new Error('SDP vazio');
      }

      // Timeout simples para evitar fetch pendurado
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 8000);

      const response = await fetch(
        `${baseUrl.replace(/\/$/, '')}/${streamName}/whep`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: offer.sdp,
          signal: controller.signal,
        }
      ).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        // 404/502: stream offline → não ficar em loop infinito
        if (response.status === 404 || response.status === 502) {
          setStatus('offline');
        } else {
          setStatus('error');
        }
        cleanup();
        return;
      }

      const answer = await response.text();

      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answer,
      });
    } catch (err) {
      if ((err as any)?.name === 'AbortError') {
        // Timeout/abort → tratar como offline, sem flood
        setStatus('offline');
      } else {
        console.error('WebRTCViewer: erro WHEP:', err);
        setStatus('error');
      }
      cleanup();
    }
  }, [baseUrl, cleanup, streamName]);

  const reconnect = useCallback(() => {
    cleanup();
    // Pequeno delay para não floodar servidor / cliente
    setTimeout(() => {
      startConnection();
    }, 1500);
  }, [cleanup, startConnection]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!mounted) return;
      await startConnection();
    };

    run();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [startConnection, cleanup]);

  const renderStatus = () => {
    switch (status) {
      case 'connecting':
        return 'Conectando...';
      case 'live':
        return 'Ao vivo 🔴';
      case 'offline':
        return 'Aguardando transmissão...';
      case 'reconnecting':
        return 'Reconectando...';
      case 'error':
        return 'Erro de conexão';
      default:
        return '';
    }
  };

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        controls
        style={{ width: '100%', backgroundColor: 'black' }}
      />
      <p style={{ color: 'white' }}>{renderStatus()}</p>
    </div>
  );
}

export default WebRTCViewer;
export { WebRTCViewer };
