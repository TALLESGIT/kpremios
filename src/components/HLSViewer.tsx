import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { useFpsMonitor } from '../hooks/useFpsMonitor';

interface HLSViewerProps {
  hlsUrl: string;
  className?: string;
  fitMode?: 'contain' | 'cover';
  initialInteracted?: boolean;
  showPerf?: boolean;
}

/**
 * Player HLS para mobile (Android/iOS)
 * Se hls.js estiver disponível (ex.: Android): usa hls.js e mostra seletor de qualidade.
 * Caso contrário (ex.: iOS Safari): usa video nativo (sem seletor de qualidade).
 * Respeita políticas de autoplay - vídeo inicia mutado, áudio só após interação.
 */
export function HLSViewer({ hlsUrl, className = '', fitMode = 'contain', initialInteracted = false, showPerf = false }: HLSViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [needsInteraction, setNeedsInteraction] = useState(true);
  const [userInteracted, setUserInteracted] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [levels, setLevels] = useState<Array<{ index: number; label: string }>>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const useHlsJs = Hls.isSupported();

  const perf = useFpsMonitor(videoRef, showPerf && hasVideo);

  const handleUserInteraction = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    setUserInteracted(true);
    setNeedsInteraction(false);

    try {
      video.muted = false;
      await video.play();
    } catch (err) {
      console.error('❌ HLSViewer: Erro ao ativar áudio:', err);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    video.muted = true;
    video.playsInline = true;

    if (useHlsJs) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        startLevel: -1,
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
      });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levelList = (hls.levels || []).map((lev: { height?: number }, idx: number) => ({
          index: idx,
          label: lev.height ? `${lev.height}p` : `Nível ${idx + 1}`,
        }));
        setLevels(levelList);
        video.play().then(() => setHasVideo(true)).catch(() => setNeedsInteraction(true));
      });

      hls.on(Hls.Events.FRAG_LOADED, () => setHasVideo(true));

      const onCanPlay = () => setHasVideo(true);
      video.addEventListener('canplay', onCanPlay);

      return () => {
        video.removeEventListener('canplay', onCanPlay);
        try {
          hls.destroy();
        } catch {}
        hlsRef.current = null;
      };
    }

    // Caminho nativo (iOS Safari, etc.)
    video.src = hlsUrl;
    video.load();

    const handleError = () => {};
    const handleLoadStart = () => {};
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
  }, [hlsUrl, useHlsJs]);

  // Unmute if initial interaction detected
  useEffect(() => {
    if (initialInteracted && hasVideo && !userInteracted) {
      console.log('⚡ HLSViewer: Interaction from parent, unmuting');
      handleUserInteraction();
    }
  }, [initialInteracted, hasVideo, userInteracted, handleUserInteraction]);

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`} style={{ background: '#000' }}>
      <video
        ref={videoRef}
        autoPlay
        muted
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

      {/* Seletor de qualidade (quando hls.js está em uso, ex.: Android) */}
      {hasVideo && levels.length > 0 && (
        <div className="absolute bottom-4 right-4 z-30">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowQualityMenu((v) => !v)}
              className="p-3 bg-black/70 hover:bg-black/90 rounded-lg text-white transition-colors flex items-center gap-2 text-sm"
              aria-label="Qualidade"
            >
              <span>{currentLevel === -1 ? 'Automático' : levels.find((l) => l.index === currentLevel)?.label ?? 'Automático'}</span>
            </button>
            {showQualityMenu && (
              <>
                <div className="fixed inset-0 z-40" aria-hidden onClick={() => setShowQualityMenu(false)} />
                <div className="absolute right-0 bottom-full mb-1 py-1 min-w-[120px] bg-black/95 rounded-lg border border-white/20 shadow-xl z-50">
                  <button
                    type="button"
                    onClick={() => {
                      if (hlsRef.current) {
                        hlsRef.current.currentLevel = -1;
                        setCurrentLevel(-1);
                      }
                      setShowQualityMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm ${currentLevel === -1 ? 'bg-white/20 text-white' : 'text-slate-300 hover:bg-white/10'}`}
                  >
                    Automático
                  </button>
                  {levels.map((lev) => (
                    <button
                      key={lev.index}
                      type="button"
                      onClick={() => {
                        if (hlsRef.current) {
                          hlsRef.current.currentLevel = lev.index;
                          setCurrentLevel(lev.index);
                        }
                        setShowQualityMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm ${currentLevel === lev.index ? 'bg-white/20 text-white' : 'text-slate-300 hover:bg-white/10'}`}
                    >
                      {lev.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Overlay de interação - estilo profissional */}
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

