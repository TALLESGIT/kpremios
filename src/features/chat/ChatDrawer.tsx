// =====================================================
// ChatDrawer - Drawer/BottomSheet para mobile fullscreen
// =====================================================

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatSlot } from './ChatSlot';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
  isActive?: boolean;
}

export function ChatDrawer({ isOpen, onClose, streamId, isActive }: ChatDrawerProps) {
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
            className="fixed bottom-0 left-0 right-0 h-[85vh] bg-gradient-to-t from-black via-slate-900 to-slate-900 backdrop-blur-md rounded-t-3xl border-t border-white/10 z-[9999] flex flex-col shadow-2xl"
          >
            {/* Drag handle sutil */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto my-3 flex-shrink-0" />

            {/* Chat Content */}
            <div className="flex-1 min-h-0 overflow-hidden" data-stream-id={streamId}>
              <ChatSlot
                id="mobile-drawer-chat"
                priority={95}
                className="h-full"
                showHeader={true}
                onClose={onClose}
                hideCloseButton={false}
                isActive={isActive}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
