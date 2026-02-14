import { useEffect, useRef, useState, useCallback } from 'react';
import { useFpsMonitor } from '../hooks/useFpsMonitor';

interface WebRTCViewerProps {
  whepUrl: string;
  fitMode?: 'contain' | 'cover';
  className?: string;
  showPerf?: boolean;
}

type Status = 'loading' | 'playing' | 'error' | 'offline';

/**
 * Player WebRTC via WHEP para baixa latência (Admin).
 * Usa RTCPeerConnection + fetch POST do SDP no endpoint WHEP do MediaMTX.
 */
export function WebRTCViewer({
  whepUrl,
  fitMode = 'contain',
  className = '',
  showPerf = false,
}: WebRTCViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasVideo, setHasVideo] = useState(false);

  const perf = useFpsMonitor(videoRef, showPerf && hasVideo);

  const cleanup = useCallback(() => {
    const pc = pcRef.current;
    if (pc) {
      try {
        pc.close();
      } catch (e) {
        console.warn('WebRTCViewer: Erro ao fechar RTCPeerConnection:', e);
      }
      pcRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!whepUrl || !whepUrl.trim()) {
      setStatus('error');
      setErrorMessage('URL WHEP inválida');
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    setStatus('loading');
    setErrorMessage(null);
    setHasVideo(false);

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (cancelled) return;
      if (event.streams && event.streams[0]) {
        video.srcObject = event.streams[0];
        setHasVideo(true);
        video
          .play()
          .then(() => setStatus('playing'))
          .catch(() => setStatus('playing'));
      }
    };

    pc.onconnectionstatechange = () => {
      if (cancelled) return;
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setStatus('error');
        setErrorMessage('Conexão WebRTC falhou');
      } else if (pc.connectionState === 'closed') {
        setStatus('offline');
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (cancelled) return;
      if (pc.iceConnectionState === 'failed') {
        setStatus('error');
        setErrorMessage('Conexão WebRTC falhou (ICE)');
      }
    };

    (async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const sdp = offer.sdp;
        if (!sdp) throw new Error('SDP vazio');

        const res = await fetch(whepUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: sdp,
        });

        if (cancelled) return;

        if (!res.ok) {
          if (res.status === 404 || res.status === 502) {
            setStatus('offline');
            setErrorMessage('Transmissão não disponível no momento');
          } else {
            setStatus('error');
            setErrorMessage(`Erro ${res.status}: ${res.statusText}`);
          }
          cleanup();
          return;
        }

        const answerSdp = await res.text();
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      } catch (err) {
        if (cancelled) return;
        console.error('WebRTCViewer: Erro WHEP:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Erro ao conectar WebRTC');
        cleanup();
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [whepUrl, cleanup]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
      style={{ background: '#000' }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        controls
        preload="auto"
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          objectFit: fitMode,
        }}
      />

      {status !== 'playing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-10">
          {status === 'loading' && (
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
              <p className="text-white text-sm font-medium">Conectando WebRTC (low latency)...</p>
            </div>
          )}
          {(status === 'error' || status === 'offline') && (
            <div className="text-center space-y-4 px-8">
              <div className="text-6xl">{status === 'offline' ? '📡' : '⚠️'}</div>
              <h2 className="text-xl font-bold text-white">
                {status === 'offline' ? 'Transmissão offline' : 'Erro de conexão'}
              </h2>
              <p className="text-slate-400 text-sm">{errorMessage || 'Tente novamente'}</p>
            </div>
          )}
        </div>
      )}

      {showPerf && hasVideo && status === 'playing' && (
        <div className="absolute top-2 left-2 z-20 px-3 py-2 rounded-lg bg-black/80 text-xs font-mono text-white border border-white/20 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">FPS:</span>
            <span
              className={
                perf.fps >= 24 ? 'text-green-400' : perf.fps >= 18 ? 'text-amber-400' : 'text-red-400'
              }
            >
              {perf.fps}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Vídeo drops:</span>
            <span
              className={
                perf.videoDroppedFrames === 0 ? 'text-green-400' : 'text-amber-400'
              }
            >
              {perf.videoDroppedFrames}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">WebRTC</span>
            <span className="text-emerald-400">Low Latency</span>
          </div>
        </div>
      )}
    </div>
  );
}
