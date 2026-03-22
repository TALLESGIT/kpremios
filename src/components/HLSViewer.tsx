import { useEffect, useRef, useState, useCallback } from 'react';
import { useFpsMonitor } from '../hooks/useFpsMonitor';
import Hls from 'hls.js';
import { VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HLSViewerProps {
  hlsUrl: string;
  className?: string;
  fitMode?: 'contain' | 'cover';
  initialInteracted?: boolean;
  showPerf?: boolean;
  isAdmin?: boolean;
  onError?: (error: string) => void;
}

export function HLSViewer({ hlsUrl, className = '', fitMode = 'contain', initialInteracted = false, showPerf = false, onError }: HLSViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [userInteracted, setUserInteracted] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const hlsInstanceRef = useRef<Hls | null>(null);

  const perf = useFpsMonitor(videoRef, showPerf && hasVideo);

  const handleUserInteraction = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    setUserInteracted(true);

    try {
      // Prioridade Android: set volume -> muted false -> play
      video.volume = 1.0;
      video.muted = false;
      
      const playPromise = video.play();
      if (playPromise !== undefined) {
        await playPromise;
      }

      if (video.paused) {
        setTimeout(() => video.play().catch(e => console.error("[HLSViewer] Retry play failed:", e)), 100);
      }
    } catch (err: any) {
      console.error(`[HLSViewer] Erro ao ativar áudio: ${err?.message || err}`);
      try {
        video.muted = true;
        await video.play();
        setTimeout(() => {
          video.volume = 1.0;
          video.muted = false;
        }, 200);
      } catch (retryErr) {
        console.error('[HLSViewer] Retry com muted também falhou:', retryErr);
      }
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    // Se já havia uma instância, destruímos para criar a nova (troca de stream)
    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }

    video.muted = true;
    video.playsInline = true;
    setIsLoading(true);
    setHasVideo(false);

    // Timeout de segurança: se não carregar em 12s, para o loading para mostrar fallback ou erro
    const loadingTimeout = setTimeout(() => {
      if (!hasVideo && hlsInstanceRef.current) {
        console.warn('[HLSViewer] Tempo limite de carregamento excedido.');
        setIsLoading(false);
      }
    }, 12000);

    const handleError = (e: any) => {
      console.error(`[HLSViewer] Erro no elemento de vídeo nativo: ${e?.type || e}`);
      onErrorRef.current?.('Falha na reprodução nativa HLS');
      setIsLoading(false);
      clearTimeout(loadingTimeout);
    };

    const attemptPlay = async () => {
      try {
        await video.play();
        setHasVideo(true);
        setIsLoading(false);
        clearTimeout(loadingTimeout);
      } catch (e: any) {
        console.warn('[HLSViewer] Autoplay falhou ou bloqueado:', e.message);
        setHasVideo(true);
        setIsLoading(false);
        clearTimeout(loadingTimeout);
      }
    };

    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 15,         // Aumentado para melhor estabilidade em 4G/5G
        maxMaxBufferLength: 25,      // Limite máximo de buffer
        liveSyncDuration: 2.5,       // Latência alvo agressiva (segundos)
        liveMaxLatencyDuration: 5,   // Quando o atraso chega aqui, o HLS tenta pular para o live edge
        liveDurationInfinity: true,  // Indica que é uma live infinita
        fragLoadingMaxRetry: 10,     // Mais tentativas de carregar fragmentos em redes instáveis
        manifestLoadingMaxRetry: 10, // Mais tentativas de carregar manifesto
        testBandwidth: true,         // Estimar banda para selecionar melhor qualidade
      });

      hlsInstanceRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      // Lógica de Catch-up: Se o usuário ficar muito para trás, acelerar levemente o vídeo para encostar no ao vivo
      // Isso reduz o "atraso acumulado" sem causar travamentos bruscos (buffering/seeking)
      const catchupInterval = setInterval(() => {
        if (!video || video.paused || !hls || hls.liveSyncPosition === null) return;
        
        const latency = hls.liveSyncPosition - video.currentTime;
        
        // Se o atraso for maior que 6 segundos, acelerar para 1.15x
        if (latency > 6) {
          if (video.playbackRate !== 1.15) {
            console.log(`[HLSViewer] Catching up (Latency: ${latency.toFixed(1)}s) - speed: 1.15x`);
            video.playbackRate = 1.15;
          }
        } 
        // Se o atraso estiver OK (menor que 3s), voltar ao normal
        else if (latency < 3.5) {
          if (video.playbackRate !== 1.0) {
            video.playbackRate = 1.0;
          }
        }
        
        // Se o atraso for CRÍTICO (mais de 12s), fazer um salto (seek) para o live edge
        if (latency > 15) {
          console.warn(`[HLSViewer] Atraso crítico detectado (${latency.toFixed(1)}s). Saltando para o ao vivo.`);
          video.currentTime = hls.liveSyncPosition - 3;
        }

      }, 3000);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        attemptPlay();
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('[HLSViewer] Falha de rede, tentando recuperar...');
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('[HLSViewer] Falha de mídia, tentando recuperar...');
              hls?.recoverMediaError();
              break;
            default:
              console.error('[HLSViewer] Erro fatal HLS:', data.details);
              hls?.destroy();
              hlsInstanceRef.current = null;
              setIsLoading(false);
              onErrorRef.current?.('Falha fatal HLS');
              break;
          }
        }
      });

      return () => {
        hls?.destroy();
        hlsInstanceRef.current = null;
        clearInterval(catchupInterval);
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      const onLoaded = () => {
        attemptPlay();
        video.removeEventListener('loadedmetadata', onLoaded);
      };
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', handleError);
    } else {
      console.error('[HLSViewer] HLS não suportado neste navegador/webview');
      setIsLoading(false);
    }

    return () => {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
      video.removeEventListener('error', handleError);
    };
  }, [hlsUrl]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).activeVideoElement = videoRef.current;
      (window as any).hlsVideoElement = videoRef.current; // Retrocompatibilidade
    }
    return () => {
      if (typeof window !== 'undefined') {
        (window as any).activeVideoElement = null;
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
        muted
        playsInline
        // @ts-ignore
        {...{ 'webkit-playsinline': 'true' }}
        x-webkit-airplay="allow"
        preload="auto"
        onClick={handleUserInteraction}
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          objectFit: fitMode,
        }}
      />

      {/* Overlay de Áudio (Mobile UX) */}
      <AnimatePresence>
        {hasVideo && !userInteracted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleUserInteraction}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer group"
          >
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="bg-blue-600 p-6 rounded-full shadow-2xl border-2 border-white/20 mb-4 group-hover:bg-blue-500 transition-colors"
            >
              <VolumeX className="w-10 h-10 text-white" />
            </motion.div>
            <div className="text-center px-6">
              <h3 className="text-white font-black uppercase italic tracking-tighter text-xl mb-1">Vídeo Mutado</h3>
              <p className="text-blue-100/80 text-[10px] font-bold uppercase tracking-[0.2em]">Clique na tela para ativar o som</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-[55]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-blue-300/80 uppercase tracking-wider">Carregando transmissão...</span>
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
            <span className={perf.stress === 'ok' ? 'text-green-400' : perf.stress === 'medio' ? 'text-amber-400' : 'text-red-400'}>
              {perf.stress === 'ok' ? 'OK' : perf.stress === 'medio' ? 'Médio' : 'Alto'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
