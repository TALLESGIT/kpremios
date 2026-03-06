import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2 } from 'lucide-react';

interface MiniPlayerProps {
  stream: MediaStream | null;
  onClose: () => void;
  onRestore: () => void;
  initialRight?: number;
  initialBottom?: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const MiniPlayer: React.FC<MiniPlayerProps> = ({
  stream,
  onClose,
  onRestore,
  initialRight = 16,
  initialBottom = 16,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState({ right: initialRight, bottom: initialBottom });
  const startPointer = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!videoRef.current || !stream) return;
    const v = videoRef.current;
    v.srcObject = stream;
    v.play().catch(() => {});
  }, [stream]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onPointerDown = (ev: PointerEvent) => {
      (ev.target as Element).setPointerCapture?.(ev.pointerId);
      dragging.current = true;
      startPointer.current = { x: ev.clientX, y: ev.clientY };
      lastPos.current = { x: pos.right, y: pos.bottom };
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (!dragging.current || !startPointer.current) return;
      const dx = startPointer.current.x - ev.clientX;
      const dy = startPointer.current.y - ev.clientY;
      const newRight = clamp(lastPos.current.x + dx, 8, window.innerWidth - 320);
      const newBottom = clamp(lastPos.current.y + dy, 8, window.innerHeight - 180);
      setPos({ right: newRight, bottom: newBottom });
    };

    const onPointerUp = () => {
      dragging.current = false;
      startPointer.current = null;
    };

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [pos]);

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed z-[10000] bg-black rounded-lg overflow-hidden shadow-2xl border border-white/20"
        style={{
          right: `${pos.right}px`,
          bottom: `${pos.bottom}px`,
          width: '280px',
          height: '158px',
          aspectRatio: '16/9',
          cursor: dragging.current ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        onClick={(e) => {
          // Se não está arrastando, restaurar ao clicar
          if (!dragging.current && e.target === e.currentTarget) {
            onRestore();
          }
        }}
      >
        {/* Vídeo */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={false}
          className="w-full h-full object-cover"
        />

        {/* Overlay com controles */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none">
          {/* Botões de controle */}
          <div className="absolute top-2 right-2 flex gap-2 pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRestore();
              }}
              className="bg-black/70 backdrop-blur-md text-white p-1.5 rounded hover:bg-black/80 transition-colors"
              aria-label="Restaurar"
            >
              <Maximize2 size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="bg-black/70 backdrop-blur-md text-white p-1.5 rounded hover:bg-black/80 transition-colors"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          {/* Badge AO VIVO */}
          <div className="absolute bottom-2 left-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
            AO VIVO
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MiniPlayer;

