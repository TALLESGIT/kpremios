import React from 'react';
import { motion } from 'framer-motion';
import PitchView from '../components/lineup/ModernPitchView';

const EscalacaoPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#000814]">
      <main className="flex-1 pt-4 pb-24 px-4 overflow-x-hidden">
        {/* Pitch Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          className="relative z-10"
        >
          <PitchView />
        </motion.div>
      </main>
    </div>
  );
};

export default EscalacaoPage;
