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
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 h-[70vh] bg-gradient-to-t from-black via-black/90 to-black/60 backdrop-blur-md rounded-t-3xl border-t border-white/10 z-[9999] flex flex-col shadow-2xl"
          >
            {/* Header minimalista */}
            <div className="p-3 border-b border-white/10 flex items-center justify-between bg-black/40 rounded-t-3xl">
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
              <h3 className="text-xs font-black text-white uppercase italic tracking-tight mt-2">Chat ao Vivo</h3>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded-full transition-all bg-black/20 mt-1"
              >
                <X className="w-4 h-4 text-white" />
              </button>
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
