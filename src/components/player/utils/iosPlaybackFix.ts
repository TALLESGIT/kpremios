/**
 * Correções específicas para iOS/Safari para garantir autoplay e prevenir pause
 */

export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

export const isSafari = (): boolean => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

export const setupIOSPlaybackFix = (videoElement: HTMLVideoElement): (() => void) => {
  if (!isIOS() && !isSafari()) {
    return () => {}; // Não é iOS/Safari, não precisa de fix
  }
  
  console.log('🔧 Aplicando correções de playback para iOS/Safari');
  
  // Forçar atributos necessários para autoplay no iOS
  videoElement.setAttribute('playsinline', 'true');
  videoElement.setAttribute('webkit-playsinline', 'true');
  videoElement.muted = true; // iOS requer muted para autoplay
  
  // Listener para prevenir pause acidental
  const handlePause = () => {
    if (videoElement.paused && videoElement.readyState >= 2) {
      console.log('⚠️ Tentativa de pause detectada no iOS, forçando play...');
      videoElement.play().catch((err) => {
        console.warn('Erro ao forçar play após pause:', err);
      });
    }
  };
  
  // Listener para garantir play quando metadata carregar
  const handleLoadedMetadata = () => {
    if (videoElement.paused) {
      console.log('📹 Metadata carregada, iniciando play no iOS...');
      videoElement.play().catch((err) => {
        console.warn('Erro ao iniciar play após metadata:', err);
      });
    }
  };
  
  // Listener para garantir play quando canplay
  const handleCanPlay = () => {
    if (videoElement.paused) {
      console.log('▶️ Vídeo pode tocar, iniciando play no iOS...');
      videoElement.play().catch((err) => {
        console.warn('Erro ao iniciar play após canplay:', err);
      });
    }
  };
  
  videoElement.addEventListener('pause', handlePause);
  videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
  videoElement.addEventListener('canplay', handleCanPlay);
  
  // Cleanup function
  return () => {
    videoElement.removeEventListener('pause', handlePause);
    videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.removeEventListener('canplay', handleCanPlay);
  };
};

export const forcePlay = async (videoElement: HTMLVideoElement): Promise<void> => {
  try {
    if (videoElement.paused) {
      await videoElement.play();
    }
  } catch (err) {
    console.warn('Erro ao forçar play:', err);
    // Tentar novamente após um delay
    setTimeout(() => {
      videoElement.play().catch(() => {});
    }, 500);
  }
};

