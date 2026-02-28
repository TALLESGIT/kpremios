// =====================================================
// ChatDrawer - Drawer/BottomSheet para mobile fullscreen
// =====================================================

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatSlot } from './ChatSlot';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
  isActive?: boolean;
}

export function ChatDrawer({ isOpen, onClose, streamId, isActive = true }: ChatDrawerProps) {
  // Prevenir scroll do body quando drawer estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-[9998]"
          />

          {/* Drawer */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose();
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 h-[75vh] bg-gradient-to-t from-black via-black/95 to-black/80 backdrop-blur-xl rounded-t-[2.5rem] border-t border-white/10 z-[9999] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header com Handle de Arrasto */}
            <div className="pt-2 pb-4 px-6 border-b border-white/5 flex flex-col items-center gap-4 relative shrink-0">
              <div className="w-12 h-1.5 bg-white/20 rounded-full mb-1" />
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  <h3 className="text-sm font-black text-white uppercase italic tracking-wider">Chat ao Vivo</h3>
                </div>
                <button
                  onClick={onClose}
                  className="w-12 h-12 -mr-2 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-all active:scale-90"
                  aria-label="Fechar Chat"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ChatSlot id="mobile-drawer-chat" priority={95} className="h-full" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
