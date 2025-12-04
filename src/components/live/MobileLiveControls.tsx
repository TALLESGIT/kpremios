import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Maximize2, RotateCw, X, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileLiveControlsProps {
  onFullscreen: () => void;
  onRotate: () => void;
  onMinimize?: () => void;
  isFullscreen?: boolean;
  showMinimize?: boolean;
  isZoomLocked?: boolean;
  onTouchStart?: () => void;
  containerRef?: React.RefObject<HTMLDivElement>;
  isActive?: boolean; // Se a transmissão está ativa
}

const MobileLiveControls: React.FC<MobileLiveControlsProps> = ({ 
  onFullscreen, 
  onRotate,
  onMinimize,
  isFullscreen = false,
  showMinimize = false,
  isZoomLocked = false,
  onTouchStart,
  containerRef,
  isActive = false
}) => {
  const [visible, setVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    // Detectar se é mobile
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                    window.innerWidth <= 768;
      setIsMobile(mobile);
      // Em desktop, controles ficam sempre visíveis (exceto em fullscreen)
      if (!mobile) {
        // Se estiver em fullscreen, ocultar por padrão
        if (isFullscreen) {
          setVisible(false);
        } else {
          setVisible(true);
        }
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
      onClick={showControls}
      onMouseEnter={() => {
        if (!isMobile) {
          setIsHovering(true);
          setVisible(true);
        }
      }}
      onMouseLeave={() => {
        if (!isMobile) {
          setIsHovering(false);
          // Manter visível em desktop, mas pode adicionar fade se quiser
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
            className="absolute bottom-1 right-4 flex items-center gap-3 pointer-events-auto"
          >
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
      
      {/* Badge AO VIVO - Canto superior direito, apenas quando ativo */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 20
          }}
          className="absolute top-3 right-3 md:top-4 md:right-4 z-50 pointer-events-auto"
        >
          <div className="bg-red-600/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-lg border border-red-500/30">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
            <span className="text-[10px] md:text-xs">AO VIVO</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MobileLiveControls;

