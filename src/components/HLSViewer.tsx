import { useEffect, useRef, useState, useCallback } from 'react';

interface HLSViewerProps {
  hlsUrl: string;
  className?: string;
  fitMode?: 'contain' | 'cover';
  initialInteracted?: boolean;
}

/**
 * Player HLS para mobile (Android/iOS)
 * Usa video HTML5 nativo que suporta HLS
 * Respeita políticas de autoplay - vídeo inicia mutado, áudio só após interação
 */
export function HLSViewer({ hlsUrl, className = '', fitMode = 'contain', initialInteracted = false }: HLSViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [needsInteraction, setNeedsInteraction] = useState(true);
  const [userInteracted, setUserInteracted] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);

  // Handler de interação do usuário
  const handleUserInteraction = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    console.log('👆 HLSViewer: Usuário interagiu - ativando áudio');

    setUserInteracted(true);
    setNeedsInteraction(false);

    try {
      // Desmutar vídeo e tentar play
      video.muted = false;
      await video.play();
      console.log('✅ HLSViewer: Áudio ativado após interação');
    } catch (err) {
      console.error('❌ HLSViewer: Erro ao ativar áudio:', err);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    // Vídeo SEMPRE inicia MUTADO
    video.muted = true;
    video.playsInline = true;

    // Tentar carregar o vídeo
    video.src = hlsUrl;
    video.load();

    // Tratamento de erros
    const handleError = (e: Event) => {
      console.error('❌ Erro ao carregar HLS:', e);
    };

    const handleLoadStart = () => {
      console.log('🔄 HLS: Iniciando carregamento...');
    };

    const handleCanPlay = async () => {
      console.log('✅ HLS: Vídeo pronto para reproduzir');
      setHasVideo(true);

      // Tentar play mutado (sempre permitido)
      try {
        await video.play();
        console.log('✅ HLS: Vídeo reproduzindo (mutado)');
        // Se autoplay foi bloqueado, mostrar botão
        if (video.paused) {
          setNeedsInteraction(true);
        }
      } catch (err: any) {
        console.warn('⚠️ HLS: Autoplay bloqueado:', err);
        setNeedsInteraction(true);
      }
    };

    const handlePlay = () => {
      console.log('▶️ HLS: Vídeo começou a reproduzir');
      setHasVideo(true);
    };

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

