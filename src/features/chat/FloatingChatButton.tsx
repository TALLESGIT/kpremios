// =====================================================
// FloatingChatButton - Botão flutuante para abrir chat no fullscreen mobile
// =====================================================

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingChatButtonProps {
  onClick: () => void;
  unreadCount?: number;
  className?: string;
}

export function FloatingChatButton({ onClick, unreadCount = 0, className }: FloatingChatButtonProps) {
  return (
    <AnimatePresence>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={`fixed bottom-6 right-6 z-50 p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl shadow-blue-600/50 transition-all ${className || ''}`}
        title="Abrir chat"
      >
        <div className="relative">
          <MessageSquare className="w-6 h-6" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black rounded-full w-5 h-5 flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </div>
      </motion.button>
    </AnimatePresence>
  );
}
