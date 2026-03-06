import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Maximize2, RotateCw, X, Minimize2, PictureInPicture, MessageSquare, Maximize, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileLiveControlsProps {
  onFullscreen: () => void;
  onRotate: () => void;
  onMinimize?: () => void;
  onPictureInPicture?: () => void;
  isFullscreen?: boolean;
  showMinimize?: boolean;
  isZoomLocked?: boolean;
  isPictureInPicture?: boolean;
  onTouchStart?: () => void;
  containerRef?: React.RefObject<HTMLDivElement>;
  isActive?: boolean; // Se a transmissão está ativa

  onToggleFit?: () => void;
  fitMode?: 'contain' | 'cover';
  isDocked?: boolean;
  onToggleAudio?: () => void;
  isAudioEnabled?: boolean;
  onChatToggle?: () => void;
}

const MobileLiveControls: React.FC<MobileLiveControlsProps> = ({
  onFullscreen,
  onRotate,
  onMinimize,
  onPictureInPicture,
  isFullscreen = false,
  showMinimize = false,
  isZoomLocked = false,
  isPictureInPicture = false,
  onTouchStart,
  containerRef,
  isActive = false,
  onToggleFit,
  fitMode = 'contain',
  isDocked = false,
  onToggleAudio,
  isAudioEnabled = false,
  onChatToggle
}) => {
  const [visible, setVisible] = useState(false); // Default hidden on desktop
  const [isMobile, setIsMobile] = useState(false);
  const lastTapRef = useRef<number>(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Detectar se é mobile
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        window.innerWidth <= 768;
      setIsMobile(mobile);
      // Em desktop, controles ficam ocultos por padrão (exceto se definido via props/hover)
      if (!mobile) {
        setVisible(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, [isFullscreen]);

  const showControls = useCallback(() => {
    setVisible(true);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    // Em mobile ou desktop em fullscreen, esconder após 3 segundos
    if (isMobile || (isFullscreen && !isMobile)) {
      timeoutRef.current = window.setTimeout(() => setVisible(false), 3000);
    }
    onTouchStart?.();
  }, [onTouchStart, isMobile, isFullscreen]);

  useEffect(() => {
    if (isMobile) {
      // Auto-hide controls após 3 segundos (estilo YouTube) - apenas mobile
      showControls();

      // Mostrar controles ao tocar na tela (apenas no container do vídeo)
      const handleTouchStart = (e: TouchEvent) => {
        // Verificar se o toque foi dentro do container do vídeo
        if (containerRef?.current && containerRef.current.contains(e.target as Node)) {
          showControls();
        }
      };

      // Também mostrar ao tocar diretamente nos controles
      const handleClick = () => {
        showControls();
      };

      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('click', handleClick);

      return () => {
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('click', handleClick);
      };
    } else {
      // Em desktop
      if (isFullscreen) {
        // Em fullscreen, ocultar por padrão e mostrar ao clicar
        setVisible(false);

        const handleClick = (e: MouseEvent) => {
          // Verificar se o clique foi dentro do container do vídeo
          if (containerRef?.current && containerRef.current.contains(e.target as Node)) {
            showControls();
          }
        };

        document.addEventListener('click', handleClick);

        return () => {
          if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
          document.removeEventListener('click', handleClick);
        };
      } else {
        // Fora do fullscreen, controles sempre visíveis
        setVisible(true);
      }
    }
  }, [isMobile, isFullscreen, showControls, containerRef]);

  return (
    <div
      onClick={() => {
        showControls();
        // Lógica de toque duplo para zoom
        if (isMobile && onToggleFit) {
          const now = Date.now();
          const DOUBLE_TAP_DELAY = 300;
          if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            onToggleFit();
            // Mostrar um feedback visual de zoom talvez? 
            // Por enquanto só o toggle.
          }
          lastTapRef.current = now;
        }
      }}
      onMouseEnter={() => {
        if (!isMobile) {
          setVisible(true);
        }
      }}
      onMouseLeave={() => {
        if (!isMobile) {
          setVisible(false);
        }
      }}
      className="absolute inset-0 z-50 pointer-events-none"
      style={{ touchAction: 'none' }}
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              duration: 0.3
            }}
            className={`absolute flex items-center gap-3 pointer-events-auto ${isDocked
              ? "top-4 right-4"
              : "bottom-1 right-4"
              }`}
          >
            {/* Botão de Áudio (Novo) */}
            {onToggleAudio && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAudio();
                  showControls(); // Keep controls visible
                }}
                className={`bg-black/20 backdrop-blur-sm p-3 rounded-full hover:bg-black/40 transition-colors ${!isAudioEnabled ? 'text-amber-400' : 'text-white'}`}
                aria-label={isAudioEnabled ? "Mutar" : "Ativar Áudio"}
                title={isAudioEnabled ? "Mutar" : "Ativar Áudio"}
              >
                {isAudioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </motion.button>
            )}

            {/* Botão de Zoom/Preencher (Apenas Fullscreen Mobile) */}
            {isFullscreen && onToggleFit && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  delay: 0.12
                }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFit();
                  showControls();
                }}
                className={`bg-black/20 backdrop-blur-sm p-3 rounded-full hover:bg-black/40 transition-colors ${fitMode === 'cover' ? 'text-blue-400 border border-blue-500/30' : 'text-white'}`}
                aria-label="Alternar Zoom"
                title={fitMode === 'cover' ? "Ajustar à tela" : "Preencher tela"}
              >
                <Maximize className={`w-5 h-5 ${fitMode === 'cover' ? 'scale-110' : ''}`} />
              </motion.button>
            )}

            {/* Botão de Chat (apenas mobile) */}
            {isMobile && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  delay: 0.1
                }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onChatToggle) {
                    onChatToggle();
                  } else {
                    // Fallback: disparar evento customizado
                    window.dispatchEvent(new CustomEvent('toggle-chat'));
                  }
                  showControls();
                }}
                className="bg-black/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/40 transition-colors"
                aria-label="Toggle Chat"
              >
                <MessageSquare className="w-5 h-5" />
              </motion.button>
            )}

            {/* Botão Rotate - desabilitado quando zoom travado (apenas mobile) */}
            {/* Serve para rotacionar o vídeo quando está em fullscreen no mobile */}
            {!isZoomLocked && isMobile && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  delay: 0.15
                }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRotate();
                  showControls();
                }}
                className="bg-black/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/40 transition-colors"
                aria-label="Rotacionar vídeo"
                title="Rotacionar vídeo"
              >
                <RotateCw className="w-5 h-5" />
              </motion.button>
            )}

            {/* Botão Picture-in-Picture (apenas mobile) */}
            {isMobile && onPictureInPicture && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  delay: isMobile ? 0.25 : 0
                }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onPictureInPicture();
                  showControls();
                }}
                className="bg-black/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/40 transition-colors"
                aria-label={isPictureInPicture ? "Sair do modo flutuante" : "Modo flutuante"}
                title={isPictureInPicture ? "Sair do modo flutuante" : "Modo flutuante"}
              >
                <PictureInPicture className="w-5 h-5" />
              </motion.button>
            )}

            {/* Botão Fullscreen - canto inferior direito, transparente */}
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 20,
                delay: isMobile ? 0.2 : 0
              }}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.1 }}
              onClick={(e) => {
                e.stopPropagation();
                onFullscreen();
                showControls();
              }}
              className="bg-black/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/40 transition-colors shadow-lg"
              aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5 md:w-6 md:h-6" /> : <Maximize2 className="w-5 h-5 md:w-6 md:h-6" />}
            </motion.button>

            {/* Botão Minimize (se disponível) */}
            {showMinimize && onMinimize && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  delay: 0.25
                }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onMinimize();
                  showControls();
                }}
                className="bg-black/60 backdrop-blur-md text-white p-3 rounded-full hover:bg-black/80 transition-colors"
                aria-label="Minimizar"
              >
                <X className="w-5 h-5" />
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badge AO VIVO - REMOVIDO: Não exibir para usuários */}
    </div>
  );
};

export default MobileLiveControls;

