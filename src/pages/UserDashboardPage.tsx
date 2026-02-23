import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import {
  X, Gift, Calendar, Bell, Trophy, Zap,
  Gamepad2, Ticket, User, Phone, Edit, Save,
  LogOut, MessageCircle, ChevronRight, Star,
  Tv, Play, Shield
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface UserStats {
  totalBets: number;
  totalWins: number;
  activeMatches: number;
}

interface RecentActivity {
  id: string;
  type: 'win' | 'participation' | 'raffle_join';
  title: string;
  description: string;
  date: string;
  prize?: string;
}

const UserDashboardPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { currentUser: currentAppUser, reloadUserData } = useData();
  const navigate = useNavigate();

  const [stats, setStats] = useState<UserStats>({
    totalBets: 0,
    totalWins: 0,
    activeMatches: 0,
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Edit Form State
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: ''
  });

  useEffect(() => {
    if (currentAppUser) {
      setFormData({
        name: currentAppUser.name || '',
        whatsapp: currentAppUser.whatsapp || ''
      });

      setStats({
        totalBets: currentAppUser.total_bets || 0,
        totalWins: currentAppUser.total_wins || 0,
        activeMatches: 0 // Will load below
      });
    }
    loadExtraStats();
    loadRecentActivity();
  }, [currentAppUser]);

  const loadExtraStats = async () => {
    try {
      const { count } = await supabase
        .from('match_pools')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      setStats(prev => ({ ...prev, activeMatches: count || 0 }));
    } catch (error) {
      console.error('Error loading extra stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    if (!user) return;

    try {
      const { data: poolBets, error } = await supabase
        .from('pool_bets')
        .select(`
id,
  created_at,
  is_winner,
  match_pools(
    match_title
  )
    `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const activities: RecentActivity[] = poolBets?.map(bet => {
        const poolData = (Array.isArray(bet.match_pools) ? bet.match_pools[0] : bet.match_pools) as any;

        return {
          id: bet.id,
          type: bet.is_winner ? 'win' : 'participation',
          title: bet.is_winner ? 'Ganhamos o Bolão!' : 'Palpite Registrado',
          description: `Jogo: ${poolData?.match_title || 'Bolão ZK'} `,
          date: bet.created_at,
        };
      }) || [];

      setRecentActivity(activities);
    } catch (error) {
      console.error('Error loading activity:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setEditLoading(true);
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name,
          whatsapp: formData.whatsapp,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      await reloadUserData();
      setIsEditing(false);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar perfil');
    } finally {
      setEditLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      toast.error('Erro ao sair');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1529] pb-20">
      {/* Premium Hero Header */}
      <div className="relative pt-12 pb-24 overflow-hidden">
        {/* Background Patterns */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/20 to-transparent"></div>
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full"></div>

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6 backdrop-blur-md">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Membro Oficial ZK</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 uppercase italic tracking-tighter leading-tight">
            CENTRAL DO TORCEDOR <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">CABULOSO</span>
          </h1>

          <p className="text-blue-200/60 max-w-2xl mx-auto font-medium">
            Bem-vindo ao seu painel exclusivo, <span className="text-white font-bold">{currentAppUser?.name?.split(' ')[0]}</span>.
            Acompanhe seus resultados e torça com a gente!
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-16 relative z-10">

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="glass-panel-dark bg-slate-900/60 p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
            <Ticket className="w-8 h-8 text-blue-500/20 absolute -right-2 -bottom-2 group-hover:scale-125 transition-transform" />
            <p className="text-[10px] font-black text-blue-200/40 uppercase tracking-widest mb-1">Palpites</p>
            <p className="text-3xl font-black text-white italic">{stats.totalBets}</p>
          </div>

          <div className="glass-panel-dark bg-slate-900/60 p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-500"></div>
            <Trophy className="w-8 h-8 text-yellow-500/20 absolute -right-2 -bottom-2 group-hover:scale-125 transition-transform" />
            <p className="text-[10px] font-black text-yellow-200/40 uppercase tracking-widest mb-1">Acertos</p>
            <p className="text-3xl font-black text-white italic">{stats.totalWins}</p>
          </div>

          <div className="col-span-2 md:col-span-1 glass-panel-dark bg-slate-900/60 p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
            <Zap className="w-8 h-8 text-emerald-500/20 absolute -right-2 -bottom-2 group-hover:scale-125 transition-transform" />
            <p className="text-[10px] font-black text-emerald-200/40 uppercase tracking-widest mb-1">Jogos Ativos</p>
            <p className="text-3xl font-black text-white italic">{stats.activeMatches}</p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* ZK TV Card */}
          <Link to="/zk-tv" className="group relative overflow-hidden rounded-[2.5rem] p-8 min-h-[220px] flex flex-col justify-end">
            <div className="absolute inset-0 bg-blue-600"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
              <Tv className="w-32 h-32 text-white" />
            </div>

            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/20">
                <Play className="w-6 h-6 text-white fill-white" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase italic mb-2 tracking-tight">ZK TV AO VIVO</h3>
              <p className="text-white/60 text-sm font-medium">Assista aos jogos com a nossa narração exclusiva.</p>
            </div>
          </Link>

          {/* Ranking Card */}
          <Link to="/competicoes" className="group relative overflow-hidden rounded-[2.5rem] p-8 min-h-[220px] flex flex-col justify-end">
            <div className="absolute inset-0 bg-[#0c1a35]"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <Trophy className="w-32 h-32 text-blue-500" />
            </div>

            <div className="relative z-10">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase italic mb-2 tracking-tight">RANKING GERAL</h3>
              <p className="text-blue-200/60 text-sm font-medium">Veja quem são os maiores pontuadores da rodada.</p>
            </div>
          </Link>
        </div>

        {/* Profile Management Section */}
        <div className="glass-panel-dark bg-slate-900/40 p-1 rounded-[2.5rem] border border-white/5 mb-12 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Meus Dados</h3>
                  <p className="text-[10px] font-black text-blue-200/40 uppercase tracking-widest">Informações da Conta</p>
                </div>
              </div>

              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-blue-400 transition-colors border border-white/5"
                >
                  <Edit className="w-5 h-5" />
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-200/40 uppercase tracking-widest px-2">Nome Completo</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-200/40 uppercase tracking-widest px-2">WhatsApp</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                      <input
                        type="tel"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all uppercase italic text-xs tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-600/20 uppercase italic text-xs tracking-widest flex items-center justify-center gap-2"
                  >
                    {editLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Salvar Alterações
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/20 p-6 rounded-3xl border border-white/5">
                  <p className="text-[10px] font-black text-blue-200/40 uppercase tracking-widest mb-1">Nome</p>
                  <p className="text-white font-bold">{currentAppUser?.name}</p>
                </div>
                <div className="bg-black/20 p-6 rounded-3xl border border-white/5">
                  <p className="text-[10px] font-black text-blue-200/40 uppercase tracking-widest mb-1">E-mail</p>
                  <p className="text-white/60 font-bold">{currentAppUser?.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent History Table */}
        <div className="glass-panel-dark bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5">
          <h3 className="text-xl font-black text-white uppercase italic mb-8 flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-400" />
            Atividade Recente
          </h3>

          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${activity.type === 'win' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                      {activity.type === 'win' ? <Trophy className="w-6 h-6" /> : <Ticket className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="text-white font-black uppercase text-sm italic">{activity.title}</h4>
                      <p className="text-[10px] text-blue-200/40 font-bold uppercase tracking-widest">{activity.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                      {new Date(activity.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-black/10 rounded-[2rem] border border-dashed border-white/5">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 grayscale opacity-20">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <p className="text-blue-200/20 font-black uppercase tracking-widest text-xs">Nenhuma aposta registrada</p>
              </div>
            )}
          </div>
        </div>

        {/* Logout Area */}
        <div className="mt-12 text-center">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-8 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-2xl transition-all border border-red-500/20 uppercase italic text-xs tracking-widest"
          >
            <LogOut className="w-5 h-5" />
            Encerrar Sessão
          </button>
        </div>

      </div>
    </div>
  );
};

export default UserDashboardPage;
