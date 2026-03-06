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
      return 'bg-gradient-to-r from-primary/30 to-primary-dark/30 border-primary/50';
    }
    if (position <= 4) return 'bg-green-500/10 border-green-500/30';
    if (position <= 6) return 'bg-blue-500/10 border-blue-500/30';
    if (position >= standings.length - 3) return 'bg-red-500/10 border-red-500/30';
    return 'bg-white/5 border-white/10';
  };

  const getPositionLabel = (position: number) => {
    if (position <= 4) return 'Libertadores';
    if (position <= 6) return 'Pré-Libertadores';
    if (position >= standings.length - 3) return 'Rebaixamento';
    return '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background-dark via-background to-background-dark">
      <Header />
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
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
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-full mb-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 uppercase italic">
                {competition}
              </h1>
              <p className="text-blue-200">Tabela de Classificação 2026</p>
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
              className="glass-panel rounded-3xl overflow-hidden"
            >
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-primary/20 to-primary-dark/20 border-b border-white/10">
                      <th className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-wider">Pos</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-wider">Time</th>
                      <th className="px-6 py-4 text-center text-xs font-black text-white uppercase tracking-wider">Pts</th>
                      <th className="px-6 py-4 text-center text-xs font-black text-white uppercase tracking-wider">J</th>
                      <th className="px-6 py-4 text-center text-xs font-black text-white uppercase tracking-wider">V</th>
                      <th className="px-6 py-4 text-center text-xs font-black text-white uppercase tracking-wider">E</th>
                      <th className="px-6 py-4 text-center text-xs font-black text-white uppercase tracking-wider">D</th>
                      <th className="px-6 py-4 text-center text-xs font-black text-white uppercase tracking-wider">GP</th>
                      <th className="px-6 py-4 text-center text-xs font-black text-white uppercase tracking-wider">GC</th>
                      <th className="px-6 py-4 text-center text-xs font-black text-white uppercase tracking-wider">SG</th>
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
                          className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                            getPositionColor(team.position, isCruzeiro)
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-black ${
                                isCruzeiro ? 'text-primary' : 'text-white'
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
                                <img src={team.logo} alt={team.team} className="w-8 h-8 object-contain" />
                              )}
                              <span className={`text-sm font-bold uppercase ${
                                isCruzeiro ? 'text-primary' : 'text-white'
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
                            <span className="text-sm text-white">{team.goals_for}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-white">{team.goals_against}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-sm font-bold ${
                              goalDiff > 0 ? 'text-green-400' : goalDiff < 0 ? 'text-red-400' : 'text-white'
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
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-black ${
                            isCruzeiro ? 'text-primary' : 'text-white'
                          }`}>
                            {team.position}º
                          </span>
                          {team.logo && (
                            <img src={team.logo} alt={team.team} className="w-8 h-8 object-contain" />
                          )}
                          <span className={`text-sm font-bold uppercase ${
                            isCruzeiro ? 'text-primary' : 'text-white'
                          }`}>
                            {team.team}
                          </span>
                          {isCruzeiro && (
                            <Shield className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <span className="text-lg font-black text-white">{team.points} PTS</span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-blue-200">J: </span>
                          <span className="text-white font-bold">{team.played}</span>
                        </div>
                        <div>
                          <span className="text-green-400">V: </span>
                          <span className="text-white font-bold">{team.won}</span>
                        </div>
                        <div>
                          <span className="text-yellow-400">E: </span>
                          <span className="text-white font-bold">{team.drawn}</span>
                        </div>
                        <div>
                          <span className="text-red-400">D: </span>
                          <span className="text-white font-bold">{team.lost}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-blue-200">GP: </span>
                          <span className="text-white font-bold">{team.goals_for}</span>
                          <span className="text-blue-200 ml-3">GC: </span>
                          <span className="text-white font-bold">{team.goals_against}</span>
                        </div>
                        <span className={`font-bold ${
                          goalDiff > 0 ? 'text-green-400' : goalDiff < 0 ? 'text-red-400' : 'text-white'
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
              className="mt-8 glass-panel p-6 rounded-3xl"
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

