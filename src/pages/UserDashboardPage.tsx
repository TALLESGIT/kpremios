import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { X, Gift, Calendar, Bell, Trophy, Zap, Gamepad2, Ticket } from 'lucide-react';

interface UserStats {
  totalRaffles: number;
  wonRaffles: number;
  currentRaffles: number;
}

interface RecentActivity {
  id: string;
  type: 'win' | 'participation' | 'raffle_join';
  title: string;
  description: string;
  date: string;
  prize?: string;
  number?: number;
}

const UserDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { currentUser: currentAppUser } = useData();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats>({
    totalRaffles: 0,
    wonRaffles: 0,
    currentRaffles: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNoRafflesModal, setShowNoRafflesModal] = useState(false);

  useEffect(() => {
    loadUserStats();
    loadRecentActivity();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const subscriptions = [
      supabase
        .channel('user-draw-results')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'draw_results',
          filter: `winner_id=eq.${user.id}`
        }, () => {
          loadUserStats();
        }),

      supabase
        .channel('active-raffles')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'raffles',
          filter: 'is_active=eq.true'
        }, () => {
          loadUserStats();
        })
    ];

    subscriptions.forEach(sub => sub.subscribe());

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [user]);

  const loadUserStats = async () => {
    if (!user) return;

    try {
      const [totalRafflesResult, wonRafflesResult, currentRafflesResult] = await Promise.all([
        supabase
          .from('draw_results')
          .select('id', { count: 'exact' })
          .eq('winner_id', user.id),

        supabase
          .from('draw_results')
          .select('id', { count: 'exact' })
          .eq('winner_id', user.id)
          .eq('is_winner', true),

        supabase
          .from('raffles')
          .select('id', { count: 'exact' })
          .eq('is_active', true)
      ]);

      setStats({
        totalRaffles: totalRafflesResult.count || 0,
        wonRaffles: wonRafflesResult.count || 0,
        currentRaffles: currentRafflesResult.count || 0,
      });
    } catch (error) {
      setStats({
        totalRaffles: 0,
        wonRaffles: 0,
        currentRaffles: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    if (!user) return;

    try {
      const { data: drawResults, error: drawError } = await supabase
        .from('draw_results')
        .select(`
          id,
          draw_date,
          is_winner,
          prize_value,
          raffles:raffle_id (
            title,
            prize
          )
        `)
        .eq('winner_id', user.id)
        .order('draw_date', { ascending: false })
        .limit(5);

      if (drawError) throw drawError;

      const activities: RecentActivity[] = drawResults?.map(result => {
        const raffleData = (Array.isArray(result.raffles) ? result.raffles[0] : result.raffles) as any;

        return {
          id: result.id,
          type: result.is_winner ? 'win' : 'participation',
          title: result.is_winner ? 'Você ganhou um sorteio!' : 'Participou de um sorteio',
          description: result.is_winner
            ? `Prêmio: ${result.prize_value ? `R$ ${result.prize_value}` : raffleData?.prize || 'N/A'}`
            : `Sorteio: ${raffleData?.title || 'N/A'}`,
          date: result.draw_date,
          prize: result.prize_value ? `R$ ${result.prize_value}` : raffleData?.prize
        };
      }) || [];

      setRecentActivity(activities);
    } catch (error) {
      setRecentActivity([]);
    }
  };

  const handleViewRaffles = () => {
    if (stats.currentRaffles > 0) {
      navigate('/');
    } else {
      setShowNoRafflesModal(true);
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-accent"></div>
      </div>
    );
  }

  return (
    <>

      {/* Hero Section */}
      <div className="relative py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-dark via-primary to-primary-dark opacity-90"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-5xl font-black text-white mb-2 uppercase tracking-tight">
            Área do Torcedor
          </h1>
          <p className="text-blue-100 text-lg">
            Bem-vindo de volta, <span className="text-accent font-bold">{currentAppUser?.name || user?.email?.split('@')[0]}</span>!
          </p>
        </div>
      </div>

      <div className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative z-10 -mt-8">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Total Participations */}
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-200 text-sm font-bold uppercase tracking-wider mb-1">Participações</p>
                <p className="text-4xl font-black text-white">{stats.totalRaffles}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
                <Ticket className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Wins */}
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute top-0 left-0 w-2 h-full bg-accent"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-yellow-200 text-sm font-bold uppercase tracking-wider mb-1">Vitórias</p>
                <p className="text-4xl font-black text-white">{stats.wonRaffles}</p>
              </div>
              <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center text-accent">
                <Trophy className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Active Raffles */}
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute top-0 left-0 w-2 h-full bg-green-500"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-green-200 text-sm font-bold uppercase tracking-wider mb-1">Sorteios Ativos</p>
                <p className="text-4xl font-black text-white">{stats.currentRaffles}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-400">
                <Zap className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Live Game Action */}
          <div className="glass-panel p-8 rounded-3xl relative overflow-hidden text-center group">
            <div className="absolute inset-0 bg-primary-dark/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center mb-6 shadow-xl border border-white/10 group-hover:scale-110 transition-transform">
                <Gamepad2 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Restam Poucos!</h3>
              <p className="text-blue-200 mb-6 max-w-md mx-auto">Participe do sorteio ao vivo e mostre que você tem sorte de campeão.</p>
              <Link to="/live-raffle" className="btn btn-primary w-full max-w-xs mx-auto shadow-blue-900/50">
                Participar Agora
              </Link>
            </div>
          </div>

          {/* Free Raffles Action */}
          <div className="glass-panel p-8 rounded-3xl relative overflow-hidden text-center group lg:col-span-2">
            <div className="absolute inset-0 bg-primary-dark/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-accent to-yellow-600 rounded-full flex items-center justify-center mb-6 shadow-xl border border-white/10 group-hover:scale-110 transition-transform">
                <Gift className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Sorteios Gratuitos</h3>
              <p className="text-blue-200 mb-6 max-w-md mx-auto">Não perca a chance de ganhar prêmios incríveis totalmente na faixa.</p>
              <button onClick={handleViewRaffles} className="btn btn-outline border-white/20 hover:bg-white/10 text-white w-full max-w-xs mx-auto">
                Ver Sorteios
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-panel p-8 rounded-3xl">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            Histórico de Atividades
          </h3>

          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-white/5">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${activity.type === 'win' ? 'bg-accent/20 text-accent' :
                      activity.type === 'participation' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-white/10 text-gray-400'
                      }`}>
                      {activity.type === 'win' && <Trophy className="w-6 h-6" />}
                      {activity.type === 'participation' && <Ticket className="w-6 h-6" />}
                      {activity.type === 'raffle_join' && <Gift className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="text-white font-bold">{activity.title}</p>
                      <p className="text-blue-200/60 text-sm">{activity.description}</p>
                    </div>
                  </div>
                  <span className="text-blue-200/40 text-xs font-mono bg-black/20 px-2 py-1 rounded">
                    {new Date(activity.date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-blue-200/40">
                <div className="text-4xl mb-4 grayscale opacity-50">📊</div>
                <p>Nenhuma atividade recente registrada.</p>
                <p className="text-sm mt-1">Participe dos sorteios para ver seu histórico aqui!</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal - Nenhum Sorteio Ativo */}
      {showNoRafflesModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass-panel-dark max-w-md w-full p-0 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary-dark p-6 text-center relative">
              <button
                onClick={() => setShowNoRafflesModal(false)}
                className="absolute top-4 right-4 text-white/60 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/20">
                <Bell className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-black text-white">Ops! Sem Sorteios</h3>
            </div>

            {/* Content */}
            <div className="p-8 text-center">
              <p className="text-blue-200 mb-8 leading-relaxed">
                No momento não estamos com sorteios ativos. Mas não se preocupe, a nação azul não para! Fique ligado nas nossas redes.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowNoRafflesModal(false)}
                  className="flex-1 btn btn-outline border-white/10 hover:bg-white/5 text-white py-3 rounded-xl"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    setShowNoRafflesModal(false);
                    navigate('/');
                  }}
                  className="flex-1 btn btn-primary py-3 rounded-xl"
                >
                  Ir para Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default UserDashboardPage;
