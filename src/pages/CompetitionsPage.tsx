import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Trophy, ChevronRight, Calendar } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { motion } from 'framer-motion';

interface Competition {
  name: string;
  icon: string;
  color: string;
  year: number;
}

const COMPETITIONS_2026: Competition[] = [
  {
    name: 'Campeonato Brasileiro - Série A',
    icon: '🇧🇷',
    color: 'from-green-500/20 to-green-600/20 border-green-500/40',
    year: 2026
  },
  {
    name: 'Copa Conmebol Libertadores',
    icon: '🏆',
    color: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/40',
    year: 2026
  },
  {
    name: 'Copa do Brasil',
    icon: '🥇',
    color: 'from-blue-500/20 to-blue-600/20 border-blue-500/40',
    year: 2026
  },
  {
    name: 'Campeonato Mineiro',
    icon: '⚽',
    color: 'from-purple-500/20 to-purple-600/20 border-purple-500/40',
    year: 2026
  },
  {
    name: 'Copa Conmebol Sul-Americana',
    icon: '🌎',
    color: 'from-red-500/20 to-red-600/20 border-red-500/40',
    year: 2026
  }
];

const CompetitionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [competitionsWithData, setCompetitionsWithData] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompetitionsWithData();
  }, []);

  const loadCompetitionsWithData = async () => {
    try {
      const { data, error } = await supabase
        .from('cruzeiro_standings')
        .select('competition')
        .not('competition', 'is', null);

      if (!error && data) {
        const uniqueCompetitions = new Set(data.map(s => s.competition));
        setCompetitionsWithData(uniqueCompetitions);
      }
    } catch (err) {
      console.error('Erro ao carregar competições:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompetitionClick = (competitionName: string) => {
    navigate(`/tabela/${encodeURIComponent(competitionName)}`);
  };

  return (
    <div className="min-h-screen bg-[#030712] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      <Header />
      <main className="pt-24 pb-24 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full mb-6 shadow-[0_0_30px_rgba(59,130,246,0.5)] border border-white/10">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 uppercase italic tracking-tighter">
                ZK <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-700">Competições</span>
              </h1>
              <p className="text-blue-200/60 font-medium max-w-2xl mx-auto uppercase tracking-widest text-xs">
                Temporada 2026 • Cabuloso
              </p>
            </motion.div>
          </div>

          {/* Lista de Competições */}
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
              <p className="text-blue-200 mt-4">Carregando competições...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {COMPETITIONS_2026
                .map((competition, index) => {
                  const hasData = competitionsWithData.has(competition.name);

                  return (
                    <motion.div
                      key={competition.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleCompetitionClick(competition.name)}
                      className={`bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] cursor-pointer group hover:bg-white/10 transition-all duration-500 hover:-translate-y-2 border border-white/10 shadow-2xl relative overflow-hidden ${!hasData ? 'opacity-50' : ''
                        }`}
                    >
                      {/* Glow effect on hover */}
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/0 via-blue-600/0 to-blue-600/0 group-hover:from-blue-600/5 group-hover:via-blue-600/10 group-hover:to-blue-600/5 transition-all duration-500 rounded-[2rem]" />

                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-6">
                          <div className="text-6xl drop-shadow-2xl group-hover:scale-110 transition-transform duration-500">{competition.icon}</div>
                          <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-all duration-500">
                            <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
                          </div>
                        </div>

                        <h3 className="text-2xl font-black text-white mb-3 uppercase italic leading-tight group-hover:text-blue-400 transition-colors">
                          {competition.name}
                        </h3>

                        <div className="flex items-center gap-2 text-xs font-bold text-blue-200/40 uppercase tracking-widest">
                          <Calendar className="w-4 h-4" />
                          <span>Temporada {competition.year}</span>
                        </div>

                        {!hasData && (
                          <div className="mt-6 pt-6 border-t border-white/5">
                            <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] italic">
                              Tabela disponível em breve
                            </p>
                          </div>
                        )}

                        {hasData && (
                          <div className="mt-6 pt-6 border-t border-white/5">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                              <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em]">
                                Tabela Ativa
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          )}

          {/* Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <p className="text-blue-200/60 text-sm">
              Clique em uma competição para ver a tabela de classificação completa
            </p>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CompetitionsPage;

