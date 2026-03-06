import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ModernPitchView from '../components/lineup/ModernPitchView';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { supabase } from '../lib/supabase';

interface CruzeiroGame {
  opponent?: string;
  opponent_logo?: string;
}

const EscalacaoPage: React.FC = () => {
  const navigate = useNavigate();
  const [nextGame, setNextGame] = useState<CruzeiroGame | null>(null);

  useEffect(() => {
    const fetchNextGame = async () => {
      const { data } = await supabase
        .from('cruzeiro_games')
        .select('opponent, opponent_logo')
        .in('status', ['upcoming', 'live'])
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data) {
        setNextGame(data);
      } else {
        // Fallback para o último jogo finalizado
        const { data: recent } = await supabase
          .from('cruzeiro_games')
          .select('opponent, opponent_logo')
          .eq('status', 'finished')
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (recent) setNextGame(recent);
      }
    };
    fetchNextGame();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 pt-24 pb-12 px-4 overflow-x-hidden">
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
