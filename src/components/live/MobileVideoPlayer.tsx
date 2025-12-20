import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import MobileLiveControls from './MobileLiveControls';

interface MobileVideoPlayerProps {
  videoElement: HTMLVideoElement | null;
  isFullscreen: boolean;
  onFullscreen: () => void;
  onRotate: () => void;
  onPictureInPicture?: () => void;
  isPictureInPicture?: boolean;
  children?: React.ReactNode;
  isActive?: boolean;
  onToggleAudio?: () => void;
  isAudioEnabled?: boolean;
}

const MobileVideoPlayer: React.FC<MobileVideoPlayerProps> = ({
  videoElement,
  isFullscreen,
  onFullscreen,
  onRotate,
  onPictureInPicture,
  isPictureInPicture = false,
  children,
  isActive = false,
  onToggleAudio,
  isAudioEnabled = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomLocked, setZoomLocked] = useState(false);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const lastTouchRef = useRef<{ x: number; y: number; distance: number } | null>(null);
  const initialDistanceRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        window.innerWidth <= 768;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calcular distância entre dois toques
  const getDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Lock de orientação em fullscreen
  useEffect(() => {
    if (!isMobile || !isFullscreen) return;

    const lockOrientation = async () => {
      try {
        if (screen.orientation && 'lock' in screen.orientation) {
          await (screen.orientation as any).lock('landscape');
          console.log('🔒 Orientação travada em landscape');
        }
      } catch (error) {
        console.log('⚠️ Não foi possível travar orientação:', error);
        // Fallback para iOS/Safari
        if (window.DeviceOrientationEvent) {
          // Usar CSS para forçar landscape
          document.documentElement.style.setProperty('--orientation-lock', 'landscape');
        }
      }
    };

    lockOrientation();

    return () => {
      try {
        if (screen.orientation && 'unlock' in screen.orientation) {
          (screen.orientation as any).unlock();
          console.log('🔓 Orientação destravada');
        }
      } catch (error) {
        console.log('⚠️ Erro ao destravar orientação:', error);
      }
    };
  }, [isMobile, isFullscreen]);

  // Detectar pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !containerRef.current) return;

    if (e.touches.length === 2) {
      // Pinch gesture
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = getDistance(touch1, touch2);

      initialDistanceRef.current = distance;
      initialScaleRef.current = zoomScale;
      lastTouchRef.current = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
        distance
      };
    } else if (e.touches.length === 1 && zoomScale > 1) {
      // Drag quando está com zoom
      const touch = e.touches[0];
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
      setIsDragging(true);
    }
  }, [isMobile, zoomScale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !containerRef.current) return;

    if (e.touches.length === 2 && lastTouchRef.current) {
      // Pinch gesture em andamento
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = getDistance(touch1, touch2);

      const scale = initialScaleRef.current * (distance / initialDistanceRef.current);
      const newScale = Math.max(1, Math.min(scale, 3)); // Limitar entre 1x e 3x

      setZoomScale(newScale);

      // Ativar zoom lock quando scale > 1.05
      if (newScale > 1.05) {
        setZoomLocked(true);
      } else if (newScale < 0.98) {
        setZoomLocked(false);
        // Sair do fullscreen se zoom muito baixo
        if (isFullscreen && newScale < 0.95) {
          onFullscreen();
        }
      }
    } else if (e.touches.length === 1 && isDragging && dragStartRef.current && zoomScale > 1) {
      // Drag em andamento
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.x;
      const deltaY = touch.clientY - dragStartRef.current.y;

      // Limitar arraste dentro dos bounds do vídeo
      const maxX = (containerRef.current.offsetWidth * (zoomScale - 1)) / 2;
      const maxY = (containerRef.current.offsetHeight * (zoomScale - 1)) / 2;

      setPanX(prev => Math.max(-maxX, Math.min(maxX, prev + deltaX)));
      setPanY(prev => Math.max(-maxY, Math.min(maxY, prev + deltaY)));

      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  }, [isMobile, isDragging, zoomScale, isFullscreen, onFullscreen]);

  const handleTouchEnd = useCallback(() => {
    lastTouchRef.current = null;
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // Detectar swipe up/down para controles
  const swipeStartRef = useRef<{ y: number; time: number } | null>(null);
  const controlsVisibleRef = useRef(true);
  const [showControls, setShowControls] = useState(true);

  const handleSwipeStart = useCallback((e: React.TouchEvent) => {
    // Só detectar swipe se não estiver fazendo pinch
    if (e.touches.length === 1 && !zoomLocked) {
      swipeStartRef.current = {
        y: e.touches[0].clientY,
        time: Date.now()
      };
    }
  }, [zoomLocked]);

  const handleSwipeEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeStartRef.current || e.changedTouches.length === 0) return;
    if (e.touches.length > 0) return; // Ainda há toques ativos (pode ser pinch)

    const endY = e.changedTouches[0].clientY;
    const deltaY = swipeStartRef.current.y - endY;
    const deltaTime = Date.now() - swipeStartRef.current.time;
    const velocity = Math.abs(deltaY) / deltaTime;

    // Swipe rápido (velocidade > 0.3 px/ms) e distância > 60px
    if (velocity > 0.3 && Math.abs(deltaY) > 60) {
      if (deltaY > 0) {
        // Swipe up - mostrar controles
        setShowControls(true);
        controlsVisibleRef.current = true;
      } else {
        // Swipe down - ocultar controles
        setShowControls(false);
        controlsVisibleRef.current = false;
      }
    }

    swipeStartRef.current = null;
  }, []);

  // Reset zoom ao sair do fullscreen
  useEffect(() => {
    if (!isFullscreen) {
      setZoomScale(1);
      setZoomLocked(false);
      setPanX(0);
      setPanY(0);
    }
  }, [isFullscreen]);

  // Encontrar elemento de vídeo automaticamente
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || !isMobile) return;

    // Procurar elemento de vídeo dentro do container
    const videoElement = containerRef.current.querySelector('video') as HTMLVideoElement;
    if (videoElement && videoElement !== videoElementRef.current) {
      videoElementRef.current = videoElement;
    }
  }, [isMobile, containerRef]);

  // Aplicar transform no vídeo
  useEffect(() => {
    const currentVideoElement = videoElementRef.current || videoElement;
    if (!currentVideoElement || !isMobile) return;

    // Usar GPU acceleration com transform
    currentVideoElement.style.transform = `scale(${zoomScale}) translate(${panX / zoomScale}px, ${panY / zoomScale}px)`;
    currentVideoElement.style.transformOrigin = 'center center';
    currentVideoElement.style.transition = zoomLocked ? 'none' : 'transform 0.1s ease-out';
    currentVideoElement.style.willChange = 'transform';
  }, [videoElement, zoomScale, panX, panY, zoomLocked, isMobile]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      onTouchStart={(e) => {
        if (isMobile) {
          handleTouchStart(e);
          handleSwipeStart(e);
        }
      }}
      onTouchMove={isMobile ? handleTouchMove : undefined}
      onTouchEnd={(e) => {
        if (isMobile) {
          handleTouchEnd();
          handleSwipeEnd(e);
        }
      }}
      style={{ touchAction: isMobile ? 'none' : 'auto' }}
    >
      {children}

      {/* Overlay de blur quando necessário (apenas mobile com zoom) */}
      {isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: zoomLocked ? 0.1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 pointer-events-none z-40"
          style={{
            backdropFilter: 'blur(8px)',
            background: 'rgba(0, 0, 0, 0.25)'
          }}
        />
      )}

      {/* Controles - disponível em todos os dispositivos */}
      <MobileLiveControls
        onFullscreen={onFullscreen}
        onRotate={zoomLocked ? () => { } : onRotate}
        onPictureInPicture={onPictureInPicture}
        isFullscreen={isFullscreen}
        isPictureInPicture={isPictureInPicture}
        isZoomLocked={zoomLocked}
        containerRef={containerRef}
        isActive={isActive}
        onToggleAudio={onToggleAudio}
        isAudioEnabled={isAudioEnabled}
      />
    </div>
  );
};

export default MobileVideoPlayer;

