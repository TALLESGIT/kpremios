import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import ModernPitchView from '../components/lineup/ModernPitchView';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

// No generic interface needed if not used

const EscalacaoPage: React.FC = () => {

  // O ModernPitchView interno já gerencia o carregamento dos dados baseado no club_slug do usuário
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 pt-[calc(6rem+env(safe-area-inset-top,0px))] pb-12 px-4 overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          className="relative z-10"
        >
          <ModernPitchView />
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default EscalacaoPage;
