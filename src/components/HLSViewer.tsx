import { useEffect, useRef, useState, useCallback } from 'react';
import { useFpsMonitor } from '../hooks/useFpsMonitor';
import Hls from 'hls.js';
import { Terminal } from 'lucide-react';

interface HLSViewerProps {
  hlsUrl: string;
  className?: string;
  fitMode?: 'contain' | 'cover';
  initialInteracted?: boolean;
  showPerf?: boolean;
  isAdmin?: boolean;
  onError?: (error: string) => void;
}

export function HLSViewer({ hlsUrl, className = '', fitMode = 'contain', initialInteracted = false, showPerf = false, isAdmin = false, onError }: HLSViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);

  // Debug Logs State
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`].slice(-30));
    console.log(`[HLSViewer] ${msg}`);
  }, []);

  const perf = useFpsMonitor(videoRef, showPerf && hasVideo);

  const handleUserInteraction = useCallback(async () => {
    const video = videoRef.current;
    if (!video || isAdmin) return;

    setUserInteracted(true);
    setNeedsInteraction(false);

    try {
      video.muted = false;
      await video.play();
      addLog('Áudio ativado via clique. Reproduzindo.');
    } catch (err: any) {
      addLog(`Erro ao ativar áudio: ${err?.message || err}`);
    }
  }, [isAdmin, addLog]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    video.muted = true;
    video.playsInline = true;

    addLog(`Inicializando HLS URL: ${hlsUrl}`);

    const handleError = (e: any) => {
      addLog(`Erro no elemento de vídeo nativo: ${e?.type}`);
      if (onError) onError('Falha na reprodução nativa HLS');
    };

    let hls: Hls | null = null;

    // Utilize hls.js por padrão na web (zkOfical)
    if (Hls.isSupported()) {
      addLog('Iniciando HLS.js...');
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 5,
        maxLiveSyncPlaybackRate: 1.5,
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        addLog('Manifest parsed via hls.js. Iniciando vídeo...');
        setHasVideo(true);
        video.play().then(() => addLog('Autoplay (mutado) funcionou.')).catch((e) => {
          addLog(`Autoplay (mutado) bloqueado: ${e.message}`);
          setNeedsInteraction(true);
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              addLog(`Erro de rede fatal: ${data.details}. Tentando recuperar...`);
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              addLog(`Erro de mídia fatal: ${data.details}. Recuperando...`);
              hls?.recoverMediaError();
              break;
            default:
              addLog(`Erro fatal irrecuperável: ${data.details}`);
              hls?.destroy();
              if (onError) onError('Falha fatal HLS');
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      addLog('Iniciando player nativo da Apple (video.src)...');
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        addLog('Metadados carregados via Player Nativo. Iniciando...');
        setHasVideo(true);
        video.play().then(() => addLog('Autoplay (mutado) funcionou.')).catch((e) => {
          addLog(`Autoplay (mutado) bloqueado: ${e.message}`);
          setNeedsInteraction(true);
        });
      });
      video.addEventListener('error', handleError);
    } else {
      addLog('⚠️ Navegador não suporta HLS.');
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      video.removeEventListener('error', handleError);
    };
  }, [hlsUrl, onError, addLog]);

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

      {/* Botão de Logs */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowLogs(!showLogs); }}
        className="absolute top-4 right-4 z-40 bg-black/60 backdrop-blur text-white p-2 rounded hover:bg-black/80 transition-all border border-white/10"
      >
        <Terminal size={18} />
      </button>

      {/* Painel de Logs */}
      {showLogs && (
        <div className="absolute top-16 right-4 w-72 max-w-[80vw] bg-black/80 backdrop-blur-md rounded-lg border border-white/20 p-3 z-50 shadow-2xl">
          <div className="flex justify-between items-center mb-2 border-b border-white/20 pb-1">
            <span className="text-white text-xs font-bold uppercase">HLS Logs</span>
            <button onClick={() => setShowLogs(false)} className="text-white/50 hover:text-white text-xs text-red-400">Fechar</button>
          </div>
          <div className="h-48 overflow-y-auto text-[10px] text-green-400 font-mono space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="break-words">{log}</div>
            ))}
            {logs.length === 0 && <div className="text-white/50">Nenhum log ainda...</div>}
          </div>
        </div>
      )}

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
