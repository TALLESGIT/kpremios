import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Trophy, Shield } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { motion } from 'framer-motion';
import { CruzeiroStanding } from '../types';

const StandingsPage: React.FC = () => {
  const { competitionName } = useParams<{ competitionName: string }>();
  const navigate = useNavigate();
  const [standings, setStandings] = useState<CruzeiroStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [competition, setCompetition] = useState<string>('');

  useEffect(() => {
    if (competitionName) {
      const decoded = decodeURIComponent(competitionName);
      setCompetition(decoded);
      loadStandings(decoded);
    }
  }, [competitionName]);

  const loadStandings = async (compName: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cruzeiro_standings')
        .select('*')
        .eq('competition', compName)
        .order('position', { ascending: true });

      if (error) throw error;

      if (data) {
        setStandings(data);
      }
    } catch (err) {
      console.error('Erro ao carregar tabela:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPositionColor = (position: number, isCruzeiro: boolean) => {
    if (isCruzeiro) {
      return 'bg-blue-600/20 border-blue-500/50';
    }
    if (position <= 4) return 'bg-green-500/5 border-green-500/20';
    if (position <= 6) return 'bg-blue-500/5 border-blue-500/20';
    if (position >= standings.length - 3) return 'bg-red-500/5 border-red-500/20';
    return 'bg-white/5 border-white/10';
  };

  return (
    <div className="min-h-screen bg-[#030712] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      <Header />
      <main className="pt-24 pb-24 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/competicoes')}
              className="flex items-center gap-2 text-blue-200 hover:text-white mb-6 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-bold uppercase tracking-wider">Voltar</span>
            </button>

            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full mb-4 shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-white/10">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white mb-2 uppercase italic tracking-tighter">
                {competition}
              </h1>
              <p className="text-blue-200/40 text-xs font-black uppercase tracking-[0.2em]">Tabela de Classificação 2026</p>
            </motion.div>
          </div>

          {/* Tabela */}
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
              <p className="text-blue-200 mt-4">Carregando tabela...</p>
            </div>
          ) : standings.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl text-center">
              <Trophy className="w-16 h-16 text-blue-500/30 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Tabela Indisponível</h3>
              <p className="text-blue-200/60">
                A tabela desta competição ainda não foi atualizada.
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl"
            >
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="px-6 py-5 text-left text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Pos</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Time</th>
                      <th className="px-6 py-5 text-center text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Pts</th>
                      <th className="px-6 py-5 text-center text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">J</th>
                      <th className="px-6 py-5 text-center text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">V</th>
                      <th className="px-6 py-5 text-center text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">E</th>
                      <th className="px-6 py-5 text-center text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">D</th>
                      <th className="px-6 py-5 text-center text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">SG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team, index) => {
                      const goalDiff = team.goals_for - team.goals_against;
                      const isCruzeiro = team.is_cruzeiro;

                      return (
                        <motion.tr
                          key={team.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`border-b border-white/5 hover:bg-white/10 transition-colors ${isCruzeiro ? 'bg-blue-600/10' : ''
                            }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-black ${isCruzeiro ? 'text-primary' : 'text-white'
                                }`}>
                                {team.position}º
                              </span>
                              {isCruzeiro && (
                                <Shield className="w-4 h-4 text-primary" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {team.logo && (
                                <img src={team.logo} alt={team.team} className="w-8 h-8 object-contain drop-shadow-lg" />
                              )}
                              <span className={`text-sm font-bold uppercase italic ${isCruzeiro ? 'text-blue-400' : 'text-white'
                                }`}>
                                {team.team}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm font-black text-white">{team.points}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-blue-200">{team.played}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-green-400">{team.won}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-yellow-400">{team.drawn}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-red-400">{team.lost}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-sm font-bold ${goalDiff > 0 ? 'text-green-400' : goalDiff < 0 ? 'text-red-400' : 'text-white/60'
                              }`}>
                              {goalDiff > 0 ? '+' : ''}{goalDiff}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3 p-4">
                {standings.map((team, index) => {
                  const goalDiff = team.goals_for - team.goals_against;
                  const isCruzeiro = team.is_cruzeiro;

                  return (
                    <motion.div
                      key={team.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-2xl border-2 ${getPositionColor(team.position, isCruzeiro)}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${isCruzeiro ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/40'
                            }`}>
                            {team.position}
                          </div>
                          {team.logo && (
                            <img src={team.logo} alt={team.team} className="w-10 h-10 object-contain drop-shadow-md" />
                          )}
                          <div className="flex flex-col">
                            <span className={`text-sm font-black uppercase italic ${isCruzeiro ? 'text-blue-400' : 'text-white'
                              }`}>
                              {team.team}
                            </span>
                            {isCruzeiro && (
                              <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Cabuloso</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black text-white">{team.points}</span>
                          <span className="block text-[8px] font-black text-white/20 uppercase">Pontos</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 py-3 border-y border-white/5">
                        <div className="text-center">
                          <span className="block text-[8px] font-black text-white/20 uppercase mb-1">Jogos</span>
                          <span className="text-sm font-bold text-white">{team.played}</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-[8px] font-black text-green-500/40 uppercase mb-1">Vitórias</span>
                          <span className="text-sm font-bold text-green-400">{team.won}</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-[8px] font-black text-yellow-500/40 uppercase mb-1">Empates</span>
                          <span className="text-sm font-bold text-yellow-400">{team.drawn}</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-[8px] font-black text-red-500/40 uppercase mb-1">Derrotas</span>
                          <span className="text-sm font-bold text-red-400">{team.lost}</span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-blue-200">GP: </span>
                          <span className="text-white font-bold">{team.goals_for}</span>
                          <span className="text-blue-200 ml-3">GC: </span>
                          <span className="text-white font-bold">{team.goals_against}</span>
                        </div>
                        <span className={`font-bold ${goalDiff > 0 ? 'text-green-400' : goalDiff < 0 ? 'text-red-400' : 'text-white'
                          }`}>
                          SG: {goalDiff > 0 ? '+' : ''}{goalDiff}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Legenda */}
          {standings.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-8 bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10"
            >
              <h3 className="text-sm font-black text-white uppercase mb-4 tracking-wider">Legenda</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500/20 border border-green-500/30 rounded"></div>
                  <span className="text-blue-200">Zona de Classificação (Libertadores)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500/20 border border-blue-500/30 rounded"></div>
                  <span className="text-blue-200">Pré-Libertadores</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500/20 border border-red-500/30 rounded"></div>
                  <span className="text-blue-200">Zona de Rebaixamento</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StandingsPage;

