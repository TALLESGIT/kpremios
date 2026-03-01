import { useEffect, useRef, useState, useCallback } from 'react';
import { useFpsMonitor } from '../hooks/useFpsMonitor';

interface HLSViewerProps {
  hlsUrl: string;
  className?: string;
  fitMode?: 'contain' | 'cover';
  initialInteracted?: boolean;
  showPerf?: boolean;
  /** Admin NUNCA deve ouvir — evita eco (já escuta áudio local do ZK Studio) */
  isAdmin?: boolean;
  /** Callback para notificar erro e permitir fallback */
  onError?: (error: string) => void;
}

/**
 * Player HLS para mobile (Android/iOS)
 * Usa video HTML5 nativo que suporta HLS
 * Respeita políticas de autoplay - vídeo inicia mutado, áudio só após interação
 */
export function HLSViewer({ hlsUrl, className = '', fitMode = 'contain', initialInteracted = false, showPerf = false, isAdmin = false, onError }: HLSViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [needsInteraction, setNeedsInteraction] = useState(true);
  const [userInteracted, setUserInteracted] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);

  const perf = useFpsMonitor(videoRef, showPerf && hasVideo);

  const handleUserInteraction = useCallback(async () => {
    const video = videoRef.current;
    if (!video || isAdmin) return;

    setUserInteracted(true);
    setNeedsInteraction(false);

    try {
      video.muted = false;
      await video.play();
    } catch (err) {
      console.error('❌ HLSViewer: Erro ao ativar áudio:', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    video.muted = true;
    video.playsInline = true;

    video.src = hlsUrl;
    video.load();

    const handleError = (e: any) => {
      console.error('❌ HLSViewer: Erro no elemento de vídeo:', e);
      if (onError) onError('Falha na reprodução nativa HLS');
    };
    const handleLoadStart = () => { };
    const handleCanPlay = async () => {
      setHasVideo(true);
      try {
        await video.play();
        if (video.paused) setNeedsInteraction(true);
      } catch {
        setNeedsInteraction(true);
      }
    };
    const handlePlay = () => setHasVideo(true);

    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);

    return () => {
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
    };
  }, [hlsUrl]);

  useEffect(() => {
    if (initialInteracted && hasVideo && !userInteracted) {
      handleUserInteraction();
    }
  }, [initialInteracted, hasVideo, userInteracted, handleUserInteraction]);

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`} style={{ background: '#000' }}>
      <video
        ref={videoRef}
        autoPlay
        muted={isAdmin ? true : !userInteracted}
        playsInline
        webkit-playsinline
        x-webkit-airplay="allow"
        controls
        preload="auto"
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          objectFit: fitMode,
        }}
      />

      {showPerf && hasVideo && (
        <div className="absolute top-2 left-2 z-20 px-3 py-2 rounded-lg bg-black/80 text-xs font-mono text-white border border-white/20 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">FPS:</span>
            <span className={perf.fps >= 24 ? 'text-green-400' : perf.fps >= 18 ? 'text-amber-400' : 'text-red-400'}>
              {perf.fps}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Vídeo drops:</span>
            <span className={perf.videoDroppedFrames === 0 ? 'text-green-400' : 'text-amber-400'}>
              {perf.videoDroppedFrames}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Estresse:</span>
            <span
              className={
                perf.stress === 'ok'
                  ? 'text-green-400'
                  : perf.stress === 'medio'
                    ? 'text-amber-400'
                    : 'text-red-400'
              }
            >
              {perf.stress === 'ok' ? 'OK' : perf.stress === 'medio' ? 'Médio' : 'Alto'}
            </span>
          </div>
        </div>
      )}

      {needsInteraction && hasVideo && !initialInteracted && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-10"
          onClick={handleUserInteraction}
        >
          <button
            onClick={handleUserInteraction}
            className="flex flex-col items-center justify-center gap-3 px-12 py-8 bg-white/15 border-2 border-white/40 rounded-2xl text-white font-semibold text-lg cursor-pointer transition-all hover:bg-white/25 hover:border-white/60 hover:scale-105 active:scale-100 shadow-2xl min-w-[200px]"
            aria-label="Tocar para assistir"
          >
            <span className="text-6xl leading-none drop-shadow-lg">▶</span>
            <span className="text-xl font-bold tracking-wide">Toque para assistir</span>
            <small className="text-sm opacity-80 font-normal mt-1">Clique para ativar o áudio</small>
          </button>
        </div>
      )}
    </div>
  );
}
