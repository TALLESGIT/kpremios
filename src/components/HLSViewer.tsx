import { useEffect, useRef, useState, useCallback } from 'react';
import { useFpsMonitor } from '../hooks/useFpsMonitor';
import Hls from 'hls.js';

interface HLSViewerProps {
  hlsUrl: string;
  className?: string;
  fitMode?: 'contain' | 'cover';
  initialInteracted?: boolean;
  showPerf?: boolean;
  isAdmin?: boolean;
  onError?: (error: string) => void;
}

// ✅ Detectar app nativo Capacitor
const isCapacitorNative = () =>
  typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();

export function HLSViewer({ hlsUrl, className = '', fitMode = 'contain', initialInteracted = false, showPerf = false, isAdmin = false, onError }: HLSViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);

  // ✅ Usar ref para onError evitar que mudança de referência cause re-render infinito
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const hlsInstanceRef = useRef<Hls | null>(null);

  const perf = useFpsMonitor(videoRef, showPerf && hasVideo);

  const handleUserInteraction = useCallback(async () => {
    const video = videoRef.current;
    if (!video || isAdmin) return;

    setUserInteracted(true);
    setNeedsInteraction(false);

    try {
      video.muted = false;
      video.volume = 1.0;
      // Forçar play novamente garantindo que não está mudo
      await video.play();
      
      // Retry para mobile nativo se necessário
      if (video.paused) {
        setTimeout(() => video.play().catch(e => console.error("[HLSViewer] Retry play failed:", e)), 100);
      }
    } catch (err: any) {
      console.error(`[HLSViewer] Erro ao ativar áudio: ${err?.message || err}`);
    }
  }, [isAdmin]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    // ✅ Evitar re-inicialização se já está rodando com a mesma URL
    if (hlsInstanceRef.current) {
      return;
    }

    video.muted = true;
    video.playsInline = true;
    // ✅ Atributos extras para mobile nativo
    // video.setAttribute('playsinline', 'true'); // redundante pois já está no JSX

    const handleError = (e: any) => {
      console.error(`[HLSViewer] Erro no elemento de vídeo nativo: ${e?.type}`);
      onErrorRef.current?.('Falha na reprodução nativa HLS');
    };

    // ✅ Função para tentar play com retry para mobile
    const attemptPlay = async () => {
      try {
        await video.play();
        setHasVideo(true);
        // ✅ Na web E no app nativo, oferecer botão para ativar áudio se estiver mutado
        setNeedsInteraction(true);
      } catch (e: any) {
        setNeedsInteraction(true);
        setHasVideo(true);
      }
    };

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 5,
        maxLiveSyncPlaybackRate: 1.5,
        maxBufferLength: 15,
        maxMaxBufferLength: 30,
      });

      hlsInstanceRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        attemptPlay();
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn(`[HLSViewer] Erro de rede fatal: ${data.details}. Tentando recuperar...`);
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn(`[HLSViewer] Erro de mídia fatal: ${data.details}. Recuperando...`);
              hls?.recoverMediaError();
              break;
            default:
              console.error(`[HLSViewer] Erro fatal irrecuperável: ${data.details}`);
              hls?.destroy();
              hlsInstanceRef.current = null;
              onErrorRef.current?.('Falha fatal HLS');
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        attemptPlay();
      });
      video.addEventListener('error', handleError);
    } else {
      console.warn('⚠️ Navegador não suporta HLS.');
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsInstanceRef.current = null;
      }
      video.removeEventListener('error', handleError);
    };
  }, [hlsUrl]); // ✅ Removido onError das deps — usa ref

  // ✅ Expor métodos para o pai via window se necessário ou via ref (mais limpo)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).hlsVideoElement = videoRef.current;
    }
    return () => {
      if (typeof window !== 'undefined') {
        (window as any).hlsVideoElement = null;
      }
    };
  }, []);

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
        // @ts-ignore
        {...{ 'webkit-playsinline': 'true' }}
        x-webkit-airplay="allow"
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
          className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-[60]"
          onClick={handleUserInteraction}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUserInteraction();
            }}
            className="flex flex-col items-center justify-center gap-4 px-10 py-8 bg-blue-600/20 border-2 border-blue-500/50 rounded-3xl text-white transition-all hover:bg-blue-600/30 hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(37,99,235,0.3)] animate-in fade-in zoom-in duration-300"
          >
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/40 animate-pulse">
              <span className="text-4xl text-white">🔊</span>
            </div>
            <div className="text-center">
              <span className="block text-xl font-black uppercase tracking-wider">Ativar Som</span>
              <span className="block text-xs text-blue-300/80 font-bold uppercase mt-1 tracking-widest">Clique para ouvir a live</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
