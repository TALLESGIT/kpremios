import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { X, Gift, Calendar, Bell } from 'lucide-react';

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
      setRecentActivity([]);
    }
  };

  const handleViewRaffles = () => {
    if (stats.currentRaffles > 0) {
      // Se há sorteios ativos, navegar para a página inicial
      navigate('/');
    } else {
      // Se não há sorteios ativos, mostrar modal
      setShowNoRafflesModal(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-2" style={{
              textShadow: '2px 2px 0px rgba(251, 191, 36, 0.8)'
            }}>
              DASHBOARD
            </h1>
            <p className="text-blue-100 text-lg sm:text-xl">Bem-vindo, {currentAppUser?.name || user?.email?.split('@')[0]}!</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-semibold">Total de Sorteios</p>
                <p className="text-3xl font-black text-blue-600">{stats.totalRaffles}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-2xl">🎯</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-semibold">Sorteios Ganhos</p>
                <p className="text-3xl font-black text-blue-600">{stats.wonRaffles}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-2xl">🏆</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-semibold">Sorteios Ativos</p>
                <p className="text-3xl font-black text-blue-600">{stats.currentRaffles}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-2xl">⚡</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Sorteio ao Vivo */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-blue-200 shadow-xl">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-3xl">🎮</span>
              </div>
              <h3 className="text-2xl font-black text-blue-600 mb-4">Sorteio ao Vivo</h3>
              <p className="text-blue-600 mb-6 text-sm sm:text-base">
                Participe do emocionante jogo "Resta Um"! Escolha seu número da sorte e veja quem sobrevive até o final.
              </p>
              <Link
                to="/live-raffle"
                className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Participar Agora
              </Link>
            </div>
          </div>

          {/* Sorteios Gratuitos */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-blue-200 shadow-xl">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-3xl">🎁</span>
              </div>
              <h3 className="text-2xl font-black text-blue-600 mb-4">Sorteios Gratuitos</h3>
              <p className="text-blue-600 mb-6 text-sm sm:text-base">
                Participe de sorteios gratuitos e ganhe prêmios incríveis sem pagar nada!
              </p>
              <button
                onClick={handleViewRaffles}
                className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Ver Sorteios
              </button>
            </div>
          </div>
        </div>

        {/* Histórico Recente */}
        <div className="mt-8 bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-xl">
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

      {/* Modal - Nenhum Sorteio Ativo */}
      {showNoRafflesModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-600/30 w-full max-w-md mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 p-6 border-b border-slate-600/30 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                    <Gift className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">Sorteios Gratuitos</h3>
                    <p className="text-slate-300 text-sm">Aguarde novos sorteios</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNoRafflesModal(false)}
                  className="w-10 h-10 bg-slate-700/50 hover:bg-slate-700/70 rounded-xl flex items-center justify-center transition-colors duration-200"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>
            </div>
            
            {/* Conteúdo */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-amber-500/20 to-amber-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-10 w-10 text-amber-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Nenhum Sorteio Ativo</h4>
                <p className="text-slate-300 text-sm leading-relaxed">
                  No momento não há sorteios gratuitos disponíveis. 
                  Fique atento às nossas redes sociais para não perder os próximos sorteios!
                </p>
              </div>
              
              <div className="bg-slate-700/30 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <Bell className="h-5 w-5 text-amber-400" />
                  <h5 className="font-bold text-white">Como ser notificado?</h5>
                </div>
                <ul className="text-sm text-slate-300 space-y-2">
                  <li>• Siga nossas redes sociais</li>
                  <li>• Ative as notificações do app</li>
                  <li>• Verifique regularmente esta página</li>
                </ul>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNoRafflesModal(false)}
                  className="flex-1 bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 font-bold py-3 px-4 rounded-xl transition-all duration-200 border border-slate-600/30"
                >
                  Entendi
                </button>
                <button
                  onClick={() => {
                    setShowNoRafflesModal(false);
                    navigate('/');
                  }}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Ver Página
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboardPage;

