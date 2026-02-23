import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Shield, Users, ArrowUp, ArrowDown, Minus, Share2, Calendar } from 'lucide-react';
import { CruzeiroStanding } from '../types';
import { Calculator, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';

const StandingsPage: React.FC = () => {
  const { competitionName } = useParams<{ competitionName: string }>();
  const navigate = useNavigate();
  const [standings, setStandings] = useState<CruzeiroStanding[]>([]);
  const [simulatedStandings, setSimulatedStandings] = useState<CruzeiroStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [competition, setCompetition] = useState<string>('');
  const [communityStats, setCommunityStats] = useState<{ totalBets: number, activePoolId: string | null }>({ totalBets: 0, activePoolId: null });
  const [isSimulationMode, setIsSimulationMode] = useState(false);

  useEffect(() => {
    if (competitionName) {
      const decoded = decodeURIComponent(competitionName);
      setCompetition(decoded);
      loadStandings(decoded);
      loadCommunityStats();
    }
  }, [competitionName]);

  const loadCommunityStats = async () => {
    try {
      const { data: pool } = await supabase
        .from('match_pools')
        .select('id, total_participants')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pool) {
        setCommunityStats({
          totalBets: pool.total_participants || 0,
          activePoolId: pool.id
        });
      }
    } catch (err) {
      console.error('Erro ao carregar stats da comunidade:', err);
    }
  };

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
        setSimulatedStandings(data);
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


  return (
    <>
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

          {/* New: Community Insights & Simulation Controls */}
          {!loading && standings.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Community Insight Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-panel p-6 rounded-3xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500/30 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Zap className="w-16 h-16 text-yellow-400" />
                </div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Insights do Bolão</h3>
                    <p className="text-blue-200 text-xs">
                      <span className="text-white font-bold">{communityStats.totalBets} torcedores</span> já deixaram seu palpite para o próximo jogo!
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Simulation Mode Toggle */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setIsSimulationMode(!isSimulationMode)}
                className={`glass-panel p-6 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${isSimulationMode
                  ? 'border-yellow-500 bg-yellow-500/10'
                  : 'border-white/10 hover:border-white/30'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isSimulationMode ? 'bg-yellow-500/30' : 'bg-white/10'}`}>
                      <Calculator className={`w-6 h-6 ${isSimulationMode ? 'text-yellow-400' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">Modo Simulador</h3>
                      <p className="text-xs text-blue-200/60">
                        {isSimulationMode ? 'Editando a tabela...' : 'Clique para projetar resultados'}
                      </p>
                    </div>
                  </div>
                  {isSimulationMode && (
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const summary = simulatedStandings
                            .slice(0, 5)
                            .map(t => `${t.position}º ${t.team} - ${t.points}pts`)
                            .join('\n');
                          const text = `Simulador ZK Prêmios 🏆\nMinha projeção do ${competition}:\n\n${summary}\n\nFaça a sua também!`;

                          if (navigator.share) {
                            navigator.share({ title: 'Simulação Tabela', text }).catch(() => {
                              navigator.clipboard.writeText(text);
                              toast.success('Copiado para o seu Zap!');
                            });
                          } else {
                            navigator.clipboard.writeText(text);
                            toast.success('Copiado para o seu Zap!');
                          }
                        }}
                        className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary text-[10px] font-black uppercase rounded-xl transition-colors border border-primary/30 flex items-center gap-2"
                      >
                        <Share2 className="w-3 h-3" />
                        Compartilhar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSimulatedStandings(standings);
                          setIsSimulationMode(false);
                        }}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[10px] font-black uppercase rounded-xl transition-colors border border-red-500/30"
                      >
                        Sair
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

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
                      <th className="px-6 py-4 text-center text-xs font-black text-white uppercase tracking-wider">Forma</th>
                      <th className="px-6 py-4 text-center text-xs font-black text-white uppercase tracking-wider">SG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulatedStandings.map((team, index) => {
                      const goalDiff = team.goals_for - team.goals_against;
                      const isCruzeiro = team.is_cruzeiro;

                      const updateSimulatedValue = (key: keyof CruzeiroStanding, value: number) => {
                        const newStandings = [...simulatedStandings];
                        (newStandings[index] as any)[key] = value;
                        // Sort by points, then SG, then GP
                        newStandings.sort((a, b) => {
                          if (b.points !== a.points) return b.points - a.points;
                          const sgA = a.goals_for - a.goals_against;
                          const sgB = b.goals_for - b.goals_against;
                          if (sgB !== sgA) return sgB - sgA;
                          return b.goals_for - a.goals_for;
                        });
                        setSimulatedStandings(newStandings.map((t, i) => ({ ...t, position: i + 1 })));
                      };

                      return (
                        <motion.tr
                          key={team.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`border-b border-white/5 hover:bg-white/5 transition-colors ${getPositionColor(team.position, isCruzeiro)
                            }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-black ${isCruzeiro ? 'text-primary' : 'text-white'
                                }`}>
                                {team.position}º
                              </span>
                              <div className="flex flex-col">
                                {team.prev_position && team.prev_position !== team.position && (
                                  team.position < team.prev_position ? (
                                    <ArrowUp className="w-2.5 h-2.5 text-green-500" />
                                  ) : (
                                    <ArrowDown className="w-2.5 h-2.5 text-red-500" />
                                  )
                                )}
                                {(!team.prev_position || team.prev_position === team.position) && (
                                  <Minus className="w-2.5 h-2.5 text-white/20" />
                                )}
                              </div>
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
                              <div className="flex flex-col">
                                <span className={`text-sm font-bold ${isCruzeiro ? 'text-primary' : 'text-white'}`}>
                                  {team.team}
                                </span>
                                {team.next_opponent && (
                                  <span className="text-[10px] text-blue-200/40 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Próximo: {team.next_opponent}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isSimulationMode ? (
                              <input
                                type="number"
                                value={team.points}
                                onChange={(e) => updateSimulatedValue('points', parseInt(e.target.value) || 0)}
                                className="w-12 bg-slate-800 border border-white/10 rounded-lg text-center text-sm font-black text-white focus:outline-none focus:border-yellow-500"
                              />
                            ) : (
                              <span className="text-sm font-black text-white">{team.points}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-blue-100/70">{team.played}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-blue-100/70">{team.won}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-blue-100/70">{team.drawn}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-blue-100/70">{team.lost}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {team.last_5?.split('').map((status, i) => (
                                <div
                                  key={i}
                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${status === 'V' ? 'bg-green-500 text-white' :
                                    status === 'E' ? 'bg-yellow-500 text-black' :
                                      'bg-red-500 text-white'
                                    }`}
                                >
                                  {status}
                                </div>
                              ))}
                              {!team.last_5 && <span className="text-white/20">-</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-white">{team.goals_for}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-white">{team.goals_against}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-sm font-bold ${goalDiff > 0 ? 'text-green-400' : goalDiff < 0 ? 'text-red-400' : 'text-white'
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

              {/* Mobile Cards - Premium Redesign */}
              <div className="md:hidden space-y-4 p-4">
                {simulatedStandings.map((team, index) => {
                  const goalDiff = team.goals_for - team.goals_against;
                  const isCruzeiro = team.is_cruzeiro;

                  const updateSimulatedValue = (key: keyof CruzeiroStanding, value: number) => {
                    const newStandings = [...simulatedStandings];
                    const teamIdx = newStandings.findIndex(t => t.id === team.id);
                    (newStandings[teamIdx] as any)[key] = value;
                    newStandings.sort((a, b) => {
                      if (b.points !== a.points) return b.points - a.points;
                      const sgA = a.goals_for - a.goals_against;
                      const sgB = b.goals_for - b.goals_against;
                      if (sgB !== sgA) return sgB - sgA;
                      return b.goals_for - a.goals_for;
                    });
                    setSimulatedStandings(newStandings.map((t, i) => ({ ...t, position: i + 1 })));
                  };

                  return (
                    <motion.div
                      key={team.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={`relative overflow-hidden p-5 rounded-[2.5rem] border-2 transition-all duration-300 ${isCruzeiro
                        ? 'bg-gradient-to-br from-blue-600/20 to-blue-900/40 border-primary/50 shadow-lg shadow-primary/20'
                        : 'bg-slate-900/40 border-white/5'
                        }`}
                    >
                      {/* Background Decoration */}
                      <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl" />

                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="flex flex-col items-center">
                              <span className={`text-2xl font-black italic tracking-tighter ${isCruzeiro ? 'text-primary' : 'text-slate-500/50'}`}>
                                {team.position}º
                              </span>
                              <div className="flex items-center gap-0.5 mt-[-4px]">
                                {team.prev_position && team.prev_position !== team.position && (
                                  team.position < team.prev_position ? (
                                    <ArrowUp className="w-2 h-2 text-green-500" />
                                  ) : (
                                    <ArrowDown className="w-2 h-2 text-red-500" />
                                  )
                                )}
                                {(!team.prev_position || team.prev_position === team.position) && (
                                  <Minus className="w-2 h-2 text-white/10" />
                                )}
                              </div>
                            </div>
                            {isCruzeiro && (
                              <div className="absolute -top-1 -right-1">
                                <Shield className="w-4 h-4 text-primary fill-primary/20" />
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {team.logo && (
                              <div className="w-12 h-12 p-2 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center">
                                <img src={team.logo} alt={team.team} className="w-full h-full object-contain" />
                              </div>
                            )}
                            <div>
                              <h3 className={`text-sm font-black uppercase tracking-tight ${isCruzeiro ? 'text-white' : 'text-blue-100'}`}>
                                {team.team}
                              </h3>
                              <div className="flex flex-col gap-0.5">
                                <p className="text-[10px] text-blue-200/40 font-bold uppercase tracking-widest">
                                  {team.played} Jogos
                                </p>
                                {team.next_opponent && (
                                  <p className="text-[8px] text-blue-200/20 font-medium italic">
                                    P: {team.next_opponent}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          {isSimulationMode ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] font-black text-yellow-500 uppercase">Projetar</span>
                              <input
                                type="number"
                                value={team.points}
                                onChange={(e) => updateSimulatedValue('points', parseInt(e.target.value) || 0)}
                                className="w-16 bg-slate-800 border border-yellow-500/50 rounded-xl py-1 text-center text-lg font-black text-white focus:outline-none focus:ring-2 ring-yellow-500/20"
                              />
                            </div>
                          ) : (
                            <div>
                              <p className="text-2xl font-black text-white italic tracking-tighter">{team.points}</p>
                              <p className="text-[10px] text-blue-200/40 font-black uppercase">Pontos</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="mt-6 grid grid-cols-4 gap-3">
                        {[
                          { label: 'V', value: team.won, color: 'text-green-400' },
                          { label: 'E', value: team.drawn, color: 'text-yellow-400' },
                          { label: 'D', value: team.lost, color: 'text-red-400' },
                          { label: 'SG', value: goalDiff, color: goalDiff > 0 ? 'text-green-400' : goalDiff < 0 ? 'text-red-400' : 'text-blue-200' },
                        ].map((stat, sIdx) => (
                          <div key={sIdx} className="bg-white/5 rounded-2xl p-2 text-center border border-white/5">
                            <p className="text-[8px] font-black text-blue-200/40 uppercase mb-0.5">{stat.label}</p>
                            <p className={`text-xs font-black ${stat.color}`}>
                              {stat.label === 'SG' && stat.value > 0 ? '+' : ''}{stat.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Visual Zone Indicator */}
                      <div className={`mt-4 h-1 w-full rounded-full ${team.position <= 4 ? 'bg-green-500/30' :
                        team.position <= 6 ? 'bg-blue-500/30' :
                          team.position >= (standings.length - 3) ? 'bg-red-500/30' :
                            'bg-white/5'
                        }`} />

                      {/* Form Indicator Dots at bottom of card */}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex gap-1">
                          {team.last_5?.split('').map((status, i) => (
                            <div
                              key={i}
                              className={`w-2.5 h-2.5 rounded-full ${status === 'V' ? 'bg-green-500 shadow-sm shadow-green-500/20' :
                                status === 'E' ? 'bg-yellow-500 shadow-sm shadow-yellow-500/20' :
                                  'bg-red-500 shadow-sm shadow-red-500/20'
                                }`}
                            />
                          ))}
                        </div>
                        {isCruzeiro && <span className="text-[8px] font-black text-primary uppercase tracking-widest opacity-40">Destaque ZK</span>}
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
    </>
  );
};

export default StandingsPage;

