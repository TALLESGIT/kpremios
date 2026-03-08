import React, { useState, useEffect } from 'react';
import { Trophy, Clock, RefreshCw, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, Navigate } from 'react-router-dom';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const MyNumbersPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [poolBets, setPoolBets] = useState<any[]>([]);
  const [loadingBets, setLoadingBets] = useState(true);

  const loadPoolBets = async () => {
    if (!user) {
      setLoadingBets(false);
      return;
    }

    try {
      setLoadingBets(true);
      const { data, error } = await supabase
        .from('pool_bets')
        .select(`
          *,
          match_pools!inner (
            id,
            match_title,
            home_team,
            away_team,
            is_active,
            result_home_score,
            result_away_score,
            winners_count,
            prize_per_winner,
            total_pool_amount,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPoolBets(data || []);
    } catch (err) {
      console.error('Erro ao carregar palpites do bolão:', err);
      setPoolBets([]);
    } finally {
      setLoadingBets(false);
    }
  };

  useEffect(() => {
    loadPoolBets();
  }, [user]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />

      {/* Hero Section */}
      <div className="relative pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-blue-900/40"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>

        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px]" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h1 className="text-4xl md:text-6xl font-black text-white mb-2 uppercase italic tracking-tighter leading-none">
              Meus <span className="text-blue-500">Palpites.</span>
            </h1>
            <p className="text-blue-200/60 text-lg font-medium">
              Acompanhe seu desempenho nos <span className="text-accent font-bold uppercase italic">Bolões do ZK</span>
            </p>
          </motion.div>
        </div>
      </div>

      <div className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative z-10">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl">
            <p className="text-blue-200/40 text-[10px] font-black uppercase tracking-widest mb-1">Total de Jogos</p>
            <p className="text-3xl font-black text-white italic">{poolBets.length}</p>
          </div>
          <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl">
            <p className="text-yellow-200/40 text-[10px] font-black uppercase tracking-widest mb-1">Vitórias</p>
            <p className="text-3xl font-black text-white italic">
              {poolBets.filter(b => b.is_winner).length}
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-white uppercase italic flex items-center gap-2">
            <Trophy className="w-5 h-5 text-blue-500" />
            Histórico Recente
          </h2>
          <button
            onClick={loadPoolBets}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-blue-200/60 hover:text-white transition-all transform active:scale-95"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-5 h-5 ${loadingBets ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingBets ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500/20 border-t-blue-500 mb-4"></div>
            <p className="text-blue-200/40 font-medium">Carregando seus bilhetes...</p>
          </div>
        ) : poolBets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-20">
            {poolBets.map((bet, index) => {
              const pool = bet.match_pools;
              const isFinished = pool.result_home_score !== null && pool.result_away_score !== null;

              return (
                <motion.div
                  key={bet.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl overflow-hidden group hover:border-blue-500/40 transition-all"
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-blue-500/10 text-blue-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                        {pool?.match_title || 'Bolão ZK'}
                      </span>
                      <span className="text-blue-200/30 text-[10px] font-medium">
                        {new Date(bet.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 flex items-center justify-center gap-3">
                        <div className="text-right">
                          <p className="text-white font-black uppercase text-sm truncate max-w-[80px]">
                            {pool?.home_team || 'Time A'}
                          </p>
                        </div>
                        <div className="bg-slate-900 border border-white/5 w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black text-white italic">
                          {bet.home_score}
                        </div>
                        <span className="text-blue-200/20 font-black text-xs uppercase">VS</span>
                        <div className="bg-slate-900 border border-white/5 w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black text-white italic">
                          {bet.away_score}
                        </div>
                        <div className="text-left">
                          <p className="text-white font-black uppercase text-sm truncate max-w-[80px]">
                            {pool?.away_team || 'Time B'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {isFinished && (
                      <div className="mt-4 p-3 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center">
                        <p className="text-blue-200/20 text-[10px] font-black uppercase mb-1">Resultado Final</p>
                        <p className="text-blue-200 font-black italic">
                          {pool.result_home_score} - {pool.result_away_score}
                        </p>
                      </div>
                    )}

                    <div className="mt-5 pt-5 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-200/20" />
                        <span className="text-blue-200/40 text-[10px] font-bold uppercase tracking-wider">
                          {pool?.is_active ? 'Aguardando' : 'Finalizado'}
                        </span>
                      </div>
                      {bet.is_winner ? (
                        <div className="flex items-center gap-1.5 text-accent font-black text-xs uppercase italic animate-pulse">
                          <Trophy className="w-4 h-4" />
                          Ganhou!
                        </div>
                      ) : !pool?.is_active && isFinished && (
                        <div className="text-white/20 font-black text-xs uppercase italic">
                          Perdeu
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white/5 border border-dashed border-white/10 rounded-[2.5rem] p-12 text-center">
            <div className="w-20 h-20 bg-blue-500/10 rounded-[2rem] flex items-center justify-center text-blue-400 mx-auto mb-6">
              <Ticket className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase italic">Nenhum palpite</h3>
            <p className="text-blue-200/40 mb-8 max-w-xs mx-auto">
              Você ainda não participou de nenhum bolão. Que tal começar agora?
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-8 rounded-2xl transition-all uppercase italic shadow-lg shadow-blue-900/40"
            >
              Ver Bolões Ativos
            </button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default MyNumbersPage;