import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { useFpsMonitor } from "../hooks/useFpsMonitor";

type Status = "offline" | "loading" | "waiting_hls" | "playing" | "error" | "reconnecting";

interface LiveHlsPlayerProps {
  hlsUrl: string | null;
  isLive: boolean;
  className?: string;
  /** Mostra overlay de FPS/GPU (vídeo) para analisar se a live está caindo. Ativar com ?perf=1 na URL. */
  showPerf?: boolean;
}

export default function LiveHlsPlayer({ hlsUrl, isLive, className = "", showPerf = false }: LiveHlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reconnectAttempts = useRef(0);
  const waitingHlsAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const maxWaitingHlsAttempts = 10;
  const reconnectDelay = 3000;
  const waitingHlsDelay = 5000;

  const [status, setStatus] = useState<Status>("offline");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsInteraction, setNeedsInteraction] = useState(false);

  const perf = useFpsMonitor(videoRef, showPerf && status === "playing");

  const cleanup = useCallback(() => {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (e) {
        console.warn("Erro ao destruir HLS:", e);
      }
      hlsRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.src = "";
      video.load();
    }
  }, []);

  const handleUserInteraction = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    setNeedsInteraction(false);
    try {
      video.muted = false;
      video.volume = 1.0; // ✅ Garantir volume máximo
      await video.play();
    } catch (err) {
      console.warn("Erro ao ativar áudio:", err);
    }
  }, []);

  const attemptReconnect = useCallback(() => {
    if (!hlsUrl || reconnectAttempts.current >= maxReconnectAttempts) {
      setStatus("error");
      setErrorMessage("Não foi possível reconectar. Recarregue a página.");
      return;
    }

    reconnectAttempts.current += 1;
    setStatus("reconnecting");

    setTimeout(() => {
      if (videoRef.current && hlsUrl) {
        loadHls(hlsUrl);
      }
    }, reconnectDelay);
  }, [hlsUrl, reconnectDelay]);

  const loadHls = useCallback(
    (url: string) => {
      const video = videoRef.current;
      if (!video) {
        console.warn("⚠️ LiveHlsPlayer: Elemento de vídeo não disponível");
        return;
      }

      if (!url || !url.trim()) {
        setStatus("offline");
        return;
      }

      if (!url.endsWith(".m3u8")) {
        setStatus("error");
        setErrorMessage("URL HLS inválida. Deve terminar em .m3u8");
        return;
      }

      cleanup();
      setStatus("loading");
      setErrorMessage(null);
      reconnectAttempts.current = 0;

      video.muted = false; // ✅ Não mutar por padrão para ter áudio
      video.playsInline = true;
      video.preload = "auto";
      video.volume = 1.0; // ✅ Volume máximo por padrão

      // ✅ Detecção melhorada de suporte HLS (mais permissiva)
      const isNativeHlsSupported = video.canPlayType('application/vnd.apple.mpegurl') !== '' || 
                                    video.canPlayType('application/x-mpegURL') !== '' ||
                                    video.canPlayType('video/mp2t') !== '';

      if (isNativeHlsSupported) {
        video.src = url;
        video.load();

        video.addEventListener(
          "loadedmetadata",
          () => {
            video
              .play()
              .then(() => {
                setStatus("playing");
                reconnectAttempts.current = 0;
              })
              .catch(() => {
                setNeedsInteraction(true);
                setStatus("playing");
              });
          },
          { once: true }
        );

        video.addEventListener("error", () => {
          const error = video.error;
          if (error) {
            if (error.code === error.MEDIA_ERR_NETWORK) {
              attemptReconnect();
            } else {
              setStatus("error");
              setErrorMessage("Erro ao carregar transmissão");
            }
          }
        });
      } else if (Hls.isSupported()) {
        // ✅ Configuração ULTRA otimizada para reduzir travamento
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 10,         // Reduzido de 30 para 10 (mínimo buffer atrás)
          maxBufferLength: 10,          // Reduzido de 15 para 10 (buffer mínimo à frente)
          maxMaxBufferLength: 20,       // Reduzido de 30 para 20
          startLevel: -1,
          maxLiveSyncPlaybackRate: 1.5,
          debug: false,
          // ✅ Configurações adicionais para mobile
          maxBufferSize: 20 * 1000 * 1000,  // 20MB max buffer (reduzido de 30MB)
          maxBufferHole: 0.3,           // Tolerar buracos menores (mais agressivo)
          manifestLoadingTimeOut: 10000,
          manifestLoadingMaxRetry: 4,
          levelLoadingTimeOut: 10000,
          levelLoadingMaxRetry: 4,
          // ✅ Configurações de latência
          liveSyncDurationCount: 3,     // Manter apenas 3 segmentos de sincronização
          liveMaxLatencyDurationCount: 5, // Máximo 5 segmentos de latência
          maxFragLookUpTolerance: 0.2,  // Tolerância de busca de fragmento
        });

        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video
            .play()
            .then(() => {
              setStatus("playing");
              reconnectAttempts.current = 0;
              waitingHlsAttempts.current = 0;
            })
            .catch(() => {
              setNeedsInteraction(true);
              setStatus("playing");
            });
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (waitingHlsAttempts.current < maxWaitingHlsAttempts) {
                  waitingHlsAttempts.current += 1;
                  setStatus("waiting_hls");
                  setTimeout(() => {
                    if (hlsRef.current && url) {
                      hlsRef.current.loadSource(url);
                    }
                  }, waitingHlsDelay);
                } else {
                  attemptReconnect();
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                try {
                  hls.recoverMediaError();
                } catch (e) {
                  attemptReconnect();
                }
                break;
              default:
                setStatus("error");
                setErrorMessage("Erro ao carregar transmissão");
                cleanup();
                break;
            }
          }
        });
      } else {
        setStatus("error");
        setErrorMessage("Seu navegador não suporta reprodução de vídeo ao vivo");
      }
    },
    [cleanup, attemptReconnect, waitingHlsDelay, maxWaitingHlsAttempts]
  );

  useEffect(() => {
    if (!isLive) {
      cleanup();
      setStatus("offline");
      return;
    }

    if (!hlsUrl || !hlsUrl.trim()) {
      if (waitingHlsAttempts.current < maxWaitingHlsAttempts) {
        waitingHlsAttempts.current += 1;
        setStatus("waiting_hls");
        const timer = setTimeout(() => {
          if (isLive && !hlsUrl) {
            setStatus("waiting_hls");
          }
        }, waitingHlsDelay);
        return () => clearTimeout(timer);
      } else {
        setStatus("offline");
        return;
      }
    }

    const video = videoRef.current;
    if (!video) {
      const timer = setTimeout(() => {
        if (videoRef.current && hlsUrl) {
          loadHls(hlsUrl);
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    loadHls(hlsUrl);

    return cleanup;
  }, [isLive, hlsUrl, loadHls, cleanup]);

  const handleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      container.requestFullscreen().catch(() => {});
    }
  }, []);

  const renderStatusMessage = () => {
    switch (status) {
      case "offline":
        return (
          <div className="text-center space-y-4 px-8">
            <div className="text-6xl">📡</div>
            <h2 className="text-2xl font-black text-white uppercase italic">Live Offline</h2>
            <p className="text-slate-400 text-sm font-bold">A transmissão não está disponível no momento</p>
          </div>
        );
      case "loading":
        return (
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="text-white text-sm font-medium">Carregando transmissão...</p>
          </div>
        );
      case "waiting_hls":
        return (
          <div className="text-center space-y-3">
            <div className="animate-pulse rounded-full h-12 w-12 border-2 border-yellow-500 mx-auto flex items-center justify-center">
              <span className="text-yellow-500 text-2xl">⏳</span>
            </div>
            <p className="text-white text-sm font-medium">Aguardando transmissão iniciar...</p>
            <p className="text-slate-400 text-xs">Aguardando o stream HLS ficar disponível</p>
          </div>
        );
      case "reconnecting":
        return (
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
            <p className="text-white text-sm font-medium">Reconectando...</p>
            <p className="text-slate-400 text-xs">Tentativa {reconnectAttempts.current} de {maxReconnectAttempts}</p>
          </div>
        );
      case "error":
        return (
          <div className="text-center space-y-4 px-8">
            <div className="text-6xl">⚠️</div>
            <h2 className="text-xl font-bold text-white">Erro ao carregar</h2>
            <p className="text-slate-400 text-sm">{errorMessage || "Erro ao carregar transmissão"}</p>
            <button
              onClick={() => {
                reconnectAttempts.current = 0;
                waitingHlsAttempts.current = 0;
                if (hlsUrl) {
                  loadHls(hlsUrl);
                }
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full h-full bg-black overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        playsInline
        autoPlay
        preload="auto"
      />

      {status !== "playing" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-10">
          {renderStatusMessage()}
        </div>
      )}

      {needsInteraction && status === "playing" && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-20 cursor-pointer"
          onClick={handleUserInteraction}
        >
          <button
            onClick={handleUserInteraction}
            className="flex flex-col items-center justify-center gap-3 px-12 py-8 bg-white/15 border-2 border-white/40 rounded-2xl text-white font-semibold text-lg transition-all hover:bg-white/25 hover:border-white/60 hover:scale-105 active:scale-100 shadow-2xl min-w-[200px]"
          >
            <span className="text-6xl leading-none drop-shadow-lg">▶</span>
            <span className="text-xl font-bold tracking-wide">Toque para assistir</span>
            <small className="text-sm opacity-80 font-normal mt-1">Clique para ativar o áudio</small>
          </button>
        </div>
      )}

      {showPerf && status === "playing" && (
        <div className="absolute top-2 left-2 z-30 px-3 py-2 rounded-lg bg-black/80 text-xs font-mono text-white border border-white/20 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">FPS:</span>
            <span className={perf.fps >= 24 ? "text-green-400" : perf.fps >= 18 ? "text-amber-400" : "text-red-400"}>
              {perf.fps}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Vídeo drops:</span>
            <span className={perf.videoDroppedFrames === 0 ? "text-green-400" : "text-amber-400"}>
              {perf.videoDroppedFrames}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Estresse:</span>
            <span
              className={
                perf.stress === "ok"
                  ? "text-green-400"
                  : perf.stress === "medio"
                    ? "text-amber-400"
                    : "text-red-400"
              }
            >
              {perf.stress === "ok" ? "OK" : perf.stress === "medio" ? "Médio" : "Alto"}
            </span>
          </div>
        </div>
      )}

      {status === "playing" && (
        <button
          onClick={handleFullscreen}
          className="absolute bottom-4 right-4 z-30 p-3 bg-black/70 hover:bg-black/90 rounded-lg text-white transition-colors"
          aria-label="Tela cheia"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
