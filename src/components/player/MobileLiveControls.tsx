import React, { useState, useEffect } from 'react';
import { Maximize2, RotateCw, Minimize2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileLiveControlsProps {
  onFullscreen: () => void;
  onRotate: () => void;
  onMinimize?: () => void;
  isFullscreen?: boolean;
  showMinimize?: boolean;
}

const MobileLiveControls: React.FC<MobileLiveControlsProps> = ({ 
  onFullscreen, 
  onRotate,
  onMinimize,
  isFullscreen = false,
  showMinimize = false
}) => {
  const [visible, setVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Detectar se é mobile
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                    window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  useEffect(() => {
    if (!isMobile) return;
    
    // Auto-hide controls após 3 segundos (estilo YouTube)
    let timeoutId: NodeJS.Timeout;
    
    const resetTimer = () => {
      setVisible(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setVisible(false);
      }, 3000);
    };
    
    resetTimer();
    
    // Mostrar controles ao tocar na tela
    const handleTouchStart = () => {
      resetTimer();
    };
    
    document.addEventListener('touchstart', handleTouchStart);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isMobile]);
  
  // Não mostrar em desktop
  if (!isMobile) {
    return null;
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`absolute bottom-4 left-0 right-0 z-50 flex items-center justify-center gap-4 ${
        visible ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      {/* Badge AO VIVO */}
      <motion.div 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="bg-red-600 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-1.5"
      >
        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
        AO VIVO
      </motion.div>
      
      {/* Botão Minimizar (se habilitado) */}
      {showMinimize && onMinimize && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onMinimize}
          className="bg-black/70 backdrop-blur-md text-white p-3 rounded-lg shadow-lg hover:bg-black/80 transition-colors"
          aria-label="Minimizar"
        >
          <Minimize2 size={20} />
        </motion.button>
      )}
      
      {/* Botão Fullscreen */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onFullscreen}
        className="bg-black/70 backdrop-blur-md text-white p-3 rounded-lg shadow-lg hover:bg-black/80 transition-colors"
        aria-label={isFullscreen ? 'Sair de tela cheia' : 'Tela cheia'}
      >
        <Maximize2 size={20} />
      </motion.button>
      
      {/* Botão Rotacionar */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onRotate}
        className="bg-black/70 backdrop-blur-md text-white p-3 rounded-lg shadow-lg hover:bg-black/80 transition-colors"
        aria-label="Girar tela"
      >
        <RotateCw size={20} />
      </motion.button>
    </motion.div>
  );
};

export default MobileLiveControls;

