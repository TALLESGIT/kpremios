import { useEffect, useRef } from 'react';

interface HLSViewerProps {
  hlsUrl: string;
  className?: string;
  fitMode?: 'contain' | 'cover';
}

/**
 * Player HLS para mobile (Android/iOS)
 * Usa video HTML5 nativo que suporta HLS
 */
export function HLSViewer({ hlsUrl, className = '', fitMode = 'contain' }: HLSViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

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

    const handleCanPlay = () => {
      console.log('✅ HLS: Vídeo pronto para reproduzir');
    };

    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [hlsUrl]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      controls
      preload="auto"
      className={className}
      style={{
        width: '100%',
        height: '100%',
        background: '#000',
        objectFit: fitMode,
      }}
    />
  );
}

