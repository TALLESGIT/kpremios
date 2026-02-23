import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Trophy, ChevronRight, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Zap } from 'lucide-react';

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
  const [activePoolCompetition, setActivePoolCompetition] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPageData();
  }, []);

  const loadPageData = async () => {
    setLoading(true);
    await Promise.all([
      loadCompetitionsWithData(),
      loadActivePoolInfo()
    ]);
    setLoading(false);
  };

  const loadActivePoolInfo = async () => {
    try {
      const { data: pool } = await supabase
        .from('match_pools')
        .select('competition_name')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pool) {
        setActivePoolCompetition(pool.competition_name);
      }
    } catch (err) {
      console.error('Erro ao carregar pool ativo:', err);
    }
  };

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
    <>
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-full mb-6">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 uppercase italic">
                Competições 2026
              </h1>
              <p className="text-blue-200 text-lg max-w-2xl mx-auto">
                Acompanhe o Cabuloso em todas as competições que disputará em 2026
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
              {COMPETITIONS_2026.map((competition, index) => {
                const hasData = competitionsWithData.has(competition.name);

                return (
                  <motion.div
                    key={competition.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleCompetitionClick(competition.name)}
                    className={`glass-panel p-6 rounded-3xl cursor-pointer group hover:bg-white/10 transition-all duration-300 hover:-translate-y-2 border-2 ${competition.color} ${!hasData ? 'opacity-60' : ''
                      }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="relative">
                        <div className="text-5xl">{competition.icon}</div>
                        {competition.name === activePoolCompetition && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg"
                          >
                            <Target className="w-3 h-3 text-slate-900" />
                          </motion.div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-white uppercase leading-tight group-hover:text-primary transition-colors">
                        {competition.name}
                      </h3>
                      {competition.name === activePoolCompetition && (
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                          <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Bolão Ativo</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-blue-200/60 font-bold">
                        <Calendar className="w-4 h-4" />
                        <span>{competition.year}</span>
                      </div>

                      {competition.name === activePoolCompetition && (
                        <div className="bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                          <p className="text-[9px] font-black text-yellow-500 uppercase tracking-tighter">Participar ⮕</p>
                        </div>
                      )}
                    </div>

                    {!hasData && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-xs text-slate-400 italic">
                          Tabela em breve
                        </p>
                      </div>
                    )}

                    {hasData && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-xs text-green-400 font-bold uppercase tracking-wider">
                          ✓ Tabela disponível
                        </p>
                      </div>
                    )}
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
    </>
  );
};

export default CompetitionsPage;

