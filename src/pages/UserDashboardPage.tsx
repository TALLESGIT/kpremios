import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

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
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    totalRaffles: 0,
    wonRaffles: 0,
    currentRaffles: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserStats();
    loadRecentActivity();
  }, [user]);

  // Subscription em tempo real para atualizar estatísticas
  useEffect(() => {
    if (!user) return;

    const subscriptions = [
      // Subscription para mudanças em draw_results
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
      
      // Subscription para mudanças em raffles (sorteios ativos)
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

    // Subscribe to all channels
    subscriptions.forEach(sub => sub.subscribe());

    // Cleanup function
    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [user]);

  const loadUserStats = async () => {
    if (!user) return;
    
    try {
      // Carregar estatísticas reais do usuário
      const [totalRafflesResult, wonRafflesResult, currentRafflesResult] = await Promise.all([
        // Total de sorteios que o usuário participou
        supabase
          .from('draw_results')
          .select('id', { count: 'exact' })
          .eq('winner_id', user.id),
        
        // Sorteios que o usuário ganhou
        supabase
          .from('draw_results')
          .select('id', { count: 'exact' })
          .eq('winner_id', user.id)
          .eq('is_winner', true),
        
        // Sorteios ativos (raffles com is_active = true)
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
      console.error('Erro ao carregar estatísticas:', error);
      // Fallback para dados mock em caso de erro
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
      // Buscar resultados de sorteios recentes do usuário
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

      // Converter para formato de atividade recente
      const activities: RecentActivity[] = drawResults?.map(result => ({
        id: result.id,
        type: result.is_winner ? 'win' : 'participation',
        title: result.is_winner ? 'Você ganhou um sorteio!' : 'Participou de um sorteio',
        description: result.is_winner 
          ? `Prêmio: ${result.prize_value ? `R$ ${result.prize_value}` : result.raffles?.prize || 'N/A'}`
          : `Sorteio: ${result.raffles?.title || 'N/A'}`,
        date: result.draw_date,
        prize: result.prize_value ? `R$ ${result.prize_value}` : result.raffles?.prize
      })) || [];

      setRecentActivity(activities);
    } catch (error) {
      console.error('Erro ao carregar atividade recente:', error);
      setRecentActivity([]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-white">ZK</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">ZK Prêmios</h1>
                <p className="text-gray-300">Bem-vindo, {user?.email?.split('@')[0]}!</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                to="/live-raffle"
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200"
              >
                🎮 Sorteio ao Vivo
              </Link>
              <button
                onClick={signOut}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Total de Sorteios</p>
                <p className="text-3xl font-bold text-white">{stats.totalRaffles}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Sorteios Ganhos</p>
                <p className="text-3xl font-bold text-white">{stats.wonRaffles}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">🏆</span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Sorteios Ativos</p>
                <p className="text-3xl font-bold text-white">{stats.currentRaffles}</p>
              </div>
              <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sorteio ao Vivo */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎮</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Sorteio ao Vivo</h3>
              <p className="text-gray-300 mb-6">
                Participe do emocionante jogo "Resta Um"! Escolha seu número da sorte e veja quem sobrevive até o final.
              </p>
              <Link
                to="/live-raffle"
                className="inline-block bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                Participar Agora
              </Link>
            </div>
          </div>

          {/* Sorteios Gratuitos */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎁</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Sorteios Gratuitos</h3>
              <p className="text-gray-300 mb-6">
                Participe de sorteios gratuitos e ganhe prêmios incríveis sem pagar nada!
              </p>
              <button
                onClick={() => {/* Navegar para sorteios gratuitos */}}
                className="inline-block bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                Ver Sorteios
              </button>
            </div>
          </div>
        </div>

        {/* Histórico Recente */}
        <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">Atividade Recente</h3>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'win' ? 'bg-green-500/20' : 
                      activity.type === 'participation' ? 'bg-blue-500/20' : 
                      'bg-amber-500/20'
                    }`}>
                      <span className={
                        activity.type === 'win' ? 'text-green-400' : 
                        activity.type === 'participation' ? 'text-blue-400' : 
                        'text-amber-400'
                      }>
                        {activity.type === 'win' ? '🏆' : 
                         activity.type === 'participation' ? '🎯' : 
                         '🎁'}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-semibold">{activity.title}</p>
                      <p className="text-gray-400 text-sm">{activity.description}</p>
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm">
                    {new Date(activity.date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">📊</div>
                <p>Nenhuma atividade recente</p>
                <p className="text-sm">Participe de sorteios para ver sua atividade aqui!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboardPage;

