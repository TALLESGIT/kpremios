import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye } from 'lucide-react';

interface ViewerCountDisplayProps {
  count: number;
  className?: string;
  isActive?: boolean;
}

export const ViewerCountDisplay: React.FC<ViewerCountDisplayProps> = ({
  count,
  className = "",
  isActive = true
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 px-4 py-2 bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl ${className}`}>
      <div className="relative flex items-center justify-center">
        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-slate-500'}`}>
          {isActive && (
            <motion.div
              className="absolute inset-0 bg-red-500 rounded-full"
              animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 min-w-[40px]">
        <Eye className="w-3.5 h-3.5 text-slate-400" />
        <div className="overflow-hidden h-5 flex flex-col justify-center">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={count}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="text-sm font-black text-white italic tabular-nums"
            >
              {count.toLocaleString()}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
        AO VIVO
      </span>
    </div>
  );
};
