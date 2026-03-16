import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { X, Gift, Calendar, Bell, Trophy, Zap, Ticket, Phone, AlertCircle, CreditCard, Settings, ChevronRight, Fingerprint, ShoppingBag } from 'lucide-react';
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

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
  status?: string;
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
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [updating, setUpdating] = useState(false);
  const [isBioActive, setIsBioActive] = useState(localStorage.getItem('zk_biometrics_active') === 'true');
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    loadUserStats();
    loadRecentActivity();
    checkBioAvailability();
  }, [user]);

  const checkBioAvailability = async () => {
    try {
      const result = await NativeBiometric.isAvailable();
      setBioAvailable(result.isAvailable);
    } catch (e) {
      setBioAvailable(false);
    }
  };

  const handleToggleBiometrics = async () => {
    if (!isBioActive) {
      // Activating needs verification
      try {
        await NativeBiometric.verifyIdentity({
          reason: "Para ativar o login biométrico",
          title: "Ativar Biometria",
        });

        localStorage.setItem('zk_biometrics_active', 'true');
        setIsBioActive(true);
        toast.success("Biometria ativada!");
      } catch (e) {
        toast.error("Falha ao verificar identidade.");
      }
    } else {
      // Deactivating
      localStorage.removeItem('zk_biometrics_active');
      setIsBioActive(false);
      toast.success("Biometria desativada.");
    }
  };

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

      const { data: storeOrders, error: storeError } = await supabase
        .from('store_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (drawError) throw drawError;
      if (storeError) throw storeError;

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

      const shopActivities: RecentActivity[] = storeOrders?.map(order => ({
        id: order.id,
        type: 'participation' as any,
        title: 'Compra na Loja ZK',
        description: `Pedido #${order.id.slice(0, 8)} - ${order.status === 'paid' ? 'Pago' : 'Pendente'}`,
        date: order.created_at,
        status: order.status
      })) || [];

      setRecentActivity([...activities, ...shopActivities].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ).slice(0, 6));
    } catch (error) {
      setRecentActivity([]);
    }
  };



  const formatWhatsApp = (value: string): string => {
    return value.replace(/\D/g, '');
  };

  const handleUpdateWhatsapp = async () => {
    if (!whatsappNumber.trim() || whatsappNumber.length < 10) {
      return;
    }

    if (!user) return;

    setUpdating(true);
    try {
      const cleanWhatsapp = formatWhatsApp(whatsappNumber);

      const { error } = await supabase
        .from('profiles')
        .update({ whatsapp: cleanWhatsapp })
        .eq('id', user.id);

      if (error) throw error;
      // await loadCurrentUser(); // Removed to fix missing prop in DataContext
      setShowWhatsAppModal(false);
    } catch (err) {
      console.error('Error updating WhatsApp:', err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] pt-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#030712] relative overflow-hidden pt-16">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      <Header />

      {/* Hero Section */}
      <div className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-blue-900/20"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>

        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px]" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-full mb-6">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Painel do Torcedor</span>
            </div>
            <h1 className="text-4xl md:text-7xl font-black text-white mb-2 uppercase italic tracking-tighter leading-none">
              Área do <span className="text-blue-500">Sócio.</span>
            </h1>
            <p className="text-blue-200/60 text-lg font-medium">
              Bem-vindo à sua central de torcedor, <span className="text-accent font-bold uppercase italic">{currentAppUser?.name || user?.email?.split('@')[0]}</span>
            </p>
          </motion.div>
        </div>
      </div>

      <div className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative z-10 -mt-8">
        {/* Aviso se não tiver WhatsApp */}
        {currentAppUser && (!currentAppUser.whatsapp || currentAppUser.whatsapp.trim() === '') && (
          <div className="mb-6 bg-yellow-500/10 backdrop-blur-xl p-6 rounded-3xl border border-yellow-500/30">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-white font-bold mb-1">WhatsApp não cadastrado</h3>
                <p className="text-yellow-200/80 text-sm mb-3">
                  Para poder recuperar sua conta caso esqueça o email, adicione seu WhatsApp.
                </p>
                <button
                  onClick={() => {
                    setWhatsappNumber(currentAppUser.whatsapp || '');
                    setShowWhatsAppModal(true);
                  }}
                  className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-2 px-4 rounded-xl transition-all"
                >
                  Adicionar WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group backdrop-blur-xl transition-all hover:bg-white/10 shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 -mr-16 -mt-16 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all" />
            <div className="flex justify-between items-center relative z-10">
              <div>
                <p className="text-blue-200/20 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Participações</p>
                <p className="text-5xl font-black text-white italic tracking-tighter">{stats.totalRaffles}</p>
              </div>
              <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform shadow-lg border border-blue-500/20">
                <Ticket className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group backdrop-blur-xl transition-all hover:bg-white/10 shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 -mr-16 -mt-16 rounded-full blur-3xl group-hover:bg-yellow-500/20 transition-all" />
            <div className="flex justify-between items-center relative z-10">
              <div>
                <p className="text-yellow-200/20 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Vitórias</p>
                <p className="text-5xl font-black text-white italic tracking-tighter">{stats.wonRaffles}</p>
              </div>
              <div className="w-16 h-16 bg-yellow-600/20 rounded-2xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform shadow-lg border border-yellow-500/20">
                <Trophy className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group backdrop-blur-xl transition-all hover:bg-white/10 shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 -mr-16 -mt-16 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all" />
            <div className="flex justify-between items-center relative z-10">
              <div>
                <p className="text-emerald-200/20 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Sócio VIP</p>
                <p className="text-5xl font-black text-white italic tracking-tighter">{currentAppUser?.is_vip ? 'ATIVO' : 'FREE'}</p>
              </div>
              <div className="w-16 h-16 bg-emerald-600/20 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform shadow-lg border border-emerald-500/20">
                <Zap className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Biometrics Toggle (App Only) */}
        {bioAvailable && (
          <div className="mb-6 bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center text-accent">
                <Fingerprint className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-bold">Login Biométrico</h3>
                <p className="text-blue-200/40 text-sm">Entre com sua digital ou face</p>
              </div>
            </div>
            <button
              onClick={handleToggleBiometrics}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${isBioActive ? 'bg-accent' : 'bg-white/10'
                }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isBioActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        )}

        {/* Menu Items */}
        <div className="space-y-4 mb-20">
          {[
            {
              icon: Ticket,
              label: 'Meus Bolões',
              description: 'Histórico de participações e resultados',
              path: '/my-numbers',
              color: 'text-blue-400',
              bg: 'bg-blue-500/10'
            },
            {
              icon: Gift,
              label: 'Indicar Amigo',
              description: 'Ganhe prêmios indicando novos torcedores',
              path: '/indicar',
              color: 'text-yellow-400',
              bg: 'bg-yellow-500/10'
            },
            {
              icon: CreditCard,
              label: 'Minha Carteira',
              description: 'Extrato de depósitos e prêmios',
              path: '/transacoes',
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10'
            },
            {
              icon: Phone,
              label: 'Suporte VIP',
              description: 'Fale diretamente com nossa equipe',
              path: 'https://wa.me/5531972393341',
              color: 'text-accent',
              bg: 'bg-accent/10',
              isExternal: true
            },
            {
              icon: ShoppingBag,
              label: 'Minhas Compras',
              description: 'Rastreio e histórico de pedidos na loja',
              path: '/dashboard?tab=compras',
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10'
            },
            {
              icon: Settings,
              label: 'Minha Conta',
              description: 'Segurança e dados pessoais',
              path: '/configuracoes',
              color: 'text-slate-400',
              bg: 'bg-white/5'
            },
          ].map((item: any, index) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => {
                if (item.isExternal) {
                  window.open(item.path, '_blank');
                } else {
                  navigate(item.path);
                }
              }}
              className="w-full flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 hover:border-blue-500/50 transition-all group shadow-xl"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${item.bg} rounded-2xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="text-white font-bold text-lg">{item.label}</h3>
                  <p className="text-blue-200/40 text-sm">{item.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-blue-200/20 group-hover:text-blue-400 transition-colors" />
            </motion.button>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
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
                      {activity.title.includes('Compra') ? <ShoppingBag className="w-6 h-6" /> : (
                        activity.type === 'participation' ? <Ticket className="w-6 h-6" /> :
                        activity.type === 'raffle_join' ? <Gift className="w-6 h-6" /> : null
                      )}
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
          <div className="bg-slate-900 max-w-md w-full p-0 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-center relative">
              <button onClick={() => setShowNoRafflesModal(false)} className="absolute top-4 right-4 text-white/60 hover:text-white">
                <X className="w-6 h-6" />
              </button>
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/20">
                <Bell className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-black text-white">Ops! Sem Sorteios</h3>
            </div>
            <div className="p-8 text-center">
              <p className="text-blue-200 mb-8 leading-relaxed">
                No momento não estamos com sorteios ativos. Mas não se preocupe, a nação azul não para!
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowNoRafflesModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold">
                  Fechar
                </button>
                <button onClick={() => { setShowNoRafflesModal(false); navigate('/'); }} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/40">
                  Ir para Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      <AnimatePresence>
        {showWhatsAppModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWhatsAppModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl"
            >
              <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 mx-auto">
                <Phone className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white text-center mb-2 uppercase italic">
                Atualizar <span className="text-emerald-400">WhatsApp</span>
              </h2>
              <p className="text-blue-200/60 text-center mb-8">
                Informe seu número para receber notificações exclusivas e suporte.
              </p>
              <div className="space-y-4">
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-white placeholder:text-blue-200/20 focus:border-emerald-500/50 outline-none transition-all"
                />
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowWhatsAppModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all">
                    Cancelar
                  </button>
                  <button onClick={handleUpdateWhatsapp} disabled={updating} className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black py-4 rounded-2xl transition-all uppercase italic">
                    {updating ? 'Salvando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default UserDashboardPage;
