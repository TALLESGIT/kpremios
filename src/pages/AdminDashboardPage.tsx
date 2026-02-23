import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { Users, Hash, BarChart, Settings, CheckCircle, MessageSquare, Trash2, Video, Tv, Image as ImageIcon, X, AlertTriangle, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { WhatsAppTestPanel } from '../components/admin/WhatsAppTestPanel';
import WhatsAppMonitoringPanelSimple from '../components/admin/WhatsAppMonitoringPanelSimple';
import SocialSettingsPanel from '../components/admin/SocialSettingsPanel';
import { LiveViewer } from '../components/LiveViewer';

export default function AdminDashboardPage() {
  const {
    getAvailableNumbersCount,
    getPendingRequestsCount,
  } = useData();
  const [showWhatsAppTest, setShowWhatsAppTest] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [activePoolParticipants, setActivePoolParticipants] = useState(0);
  const [vipPromo103Count, setVipPromo103Count] = useState(0);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [poolParticipants, setPoolParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [activePoolId, setActivePoolId] = useState<string | null>(null);


  // Load all dashboard data on component mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        console.log('AdminDashboardPage - Carregando todos os dados do dashboard...');

        // Carregar participantes do bolão ativo
        const { data: activePool } = await supabase
          .from('match_pools')
          .select('id, total_participants')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activePool) {
          setActivePoolParticipants(activePool.total_participants || 0);
          setActivePoolId(activePool.id);
        } else {
          setActivePoolParticipants(0);
          setActivePoolId(null);
        }

        // Carregar contagem da promoção VIP 103 (quantos slots ainda disponíveis)
        const { count: vipGrantedCount, error: vipError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('is_vip', true)
          .not('vip_expires_at', 'is', null)
          .lte('vip_expires_at', '2026-02-01T23:59:59.999Z');

        if (!vipError && vipGrantedCount !== null) {
          const availableSlots = Math.max(0, 103 - vipGrantedCount);
          setVipPromo103Count(availableSlots);
        } else {
          setVipPromo103Count(103);
        }

        const [availableCount, pendingCount] = await Promise.all([
          getAvailableNumbersCount(),
          getPendingRequestsCount()
        ]);
      } catch (error) {
        console.error('AdminDashboardPage - Erro ao carregar dados:', error);
      }
    };

    loadAllData();
  }, [getAvailableNumbersCount, getPendingRequestsCount]);

  // Real-time updates for counters every 5 seconds
  useEffect(() => {
    const updateCounters = async () => {
      try {
        const { data: activePool } = await supabase
          .from('match_pools')
          .select('id, total_participants')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activePool) {
          setActivePoolParticipants(activePool.total_participants || 0);
          setActivePoolId(activePool.id);
        }

        const { count: vipGrantedCount, error: vipError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('is_vip', true)
          .not('vip_expires_at', 'is', null)
          .lte('vip_expires_at', '2026-02-01T23:59:59.999Z');

        if (!vipError && vipGrantedCount !== null) {
          const availableSlots = Math.max(0, 103 - vipGrantedCount);
          setVipPromo103Count(availableSlots);
        }

        await Promise.all([
          getAvailableNumbersCount(),
          getPendingRequestsCount()
        ]);
      } catch (error) {
        console.error('AdminDashboardPage - Erro ao atualizar contadores:', error);
      }
    };

    updateCounters();
    const interval = setInterval(updateCounters, 5000);
    return () => clearInterval(interval);
  }, [getAvailableNumbersCount, getPendingRequestsCount]);

  const [realtimeNotification, setRealtimeNotification] = useState<{ message: string, type: 'success' | 'info' | 'warning' } | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Notificação em tempo real */}
      {realtimeNotification && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
          <div className={`px-6 py-4 rounded-lg shadow-lg border-l-4 ${realtimeNotification.type === 'success'
            ? 'bg-green-50 border-green-500 text-green-800'
            : realtimeNotification.type === 'warning'
              ? 'bg-yellow-50 border-yellow-500 text-yellow-800'
              : 'bg-blue-50 border-blue-500 text-blue-800'
            }`}>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {realtimeNotification.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : realtimeNotification.type === 'warning' ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                ) : (
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                )}
              </div>
              <div>
                <p className="font-bold">{realtimeNotification.message}</p>
                <p className="text-sm opacity-75">Atualização em tempo real</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow w-full overflow-x-hidden">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 py-6 sm:py-8 lg:py-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-300 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white mb-2 sm:mb-4 tracking-tight" style={{
                textShadow: '2px 2px 0px rgba(251, 191, 36, 0.8)'
              }}>PAINEL ADMINISTRATIVO</h1>
              <p className="text-blue-100 text-sm sm:text-base lg:text-lg xl:text-xl font-medium">Gerencie o sistema de bolões ZK Oficial</p>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-8 pt-4 sm:pt-6">

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              {
                label: 'Participantes',
                value: activePoolParticipants,
                icon: Users,
                color: 'from-blue-600 to-blue-400',
                shadow: 'shadow-blue-500/20',
                clickable: true,
                onClick: async () => {
                  if (!activePoolId) {
                    toast.error('Nenhum bolão ativo encontrado');
                    return;
                  }
                  setLoadingParticipants(true);
                  setShowParticipantsModal(true);
                  try {
                    const { data, error } = await supabase
                      .from('pool_bets')
                      .select(`
                        id,
                        users!inner (
                          name,
                          whatsapp
                        ),
                        predicted_home_score,
                        predicted_away_score,
                        payment_status,
                        created_at
                      `)
                      .eq('pool_id', activePoolId)
                      .eq('payment_status', 'approved')
                      .order('created_at', { ascending: false });

                    if (error) throw error;
                    setPoolParticipants(data || []);
                  } catch (err) {
                    console.error('Erro ao carregar participantes:', err);
                    toast.error('Erro ao carregar participantes');
                  } finally {
                    setLoadingParticipants(false);
                  }
                }
              },
              { label: 'Disponíveis', value: vipPromo103Count, icon: Hash, color: 'from-emerald-600 to-emerald-400', shadow: 'shadow-emerald-500/20' },
              { label: 'Participantes', value: activePoolParticipants, icon: Users, color: 'from-blue-600 to-blue-400', shadow: 'shadow-blue-500/20', progress: 100, clickable: true, onClick: () => setShowParticipantsModal(true) },
              { label: 'Conversão', value: `${activePoolParticipants > 0 ? '100%' : '0%'}`, icon: BarChart, color: 'from-purple-600 to-purple-400', shadow: 'shadow-purple-500/20' },
            ].map((stat, idx) => (
              <div
                key={idx}
                onClick={stat.clickable && stat.onClick ? stat.onClick : undefined}
                className={`glass-panel group relative overflow-hidden rounded-[2rem] border border-white/5 bg-slate-800/40 p-1 hover:border-white/10 transition-all duration-500 ${stat.clickable ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
              >
                <div className="bg-slate-900/40 rounded-[1.8rem] p-6 h-full backdrop-blur-3xl">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} p-0.5 ${stat.shadow} shadow-lg group-hover:scale-110 transition-transform`}>
                      <div className="w-full h-full bg-slate-900 rounded-[0.9rem] flex items-center justify-center">
                        <stat.icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-blue-300/40 uppercase tracking-[0.2em] mb-1">{stat.label}</h4>
                    <p className="text-3xl font-black text-white italic">{stat.value}</p>
                  </div>
                  {stat.progress !== undefined && (
                    <div className="mt-4 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${stat.color}`}
                        style={{ width: `${stat.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* DASHBOARD SECTIONS */}
          <div className="space-y-16 pb-20">

            {/* 🎥 Ferramentas de Live */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-6 px-2">
                <div className="w-1.5 h-10 bg-gradient-to-b from-red-500 to-red-700 rounded-full"></div>
                <div>
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Ferramentas de Live</h2>
                  <p className="text-red-300/40 text-[10px] font-black uppercase tracking-[0.3em]">Gestão de Transmissão</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel rounded-2xl border border-white/5 bg-slate-800/40 relative overflow-hidden group hover:border-red-500/30 transition-all duration-300 flex flex-col">
                  <div className="p-6 pb-2 relative z-10 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                        <Video className="w-5 h-5 text-red-500" />
                      </div>
                      <h3 className="text-xl font-bold text-white uppercase italic tracking-tight">Live Agora</h3>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 rounded-full border border-red-500/20">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                      <span className="text-[10px] uppercase font-black text-red-400 tracking-widest">Sinal On</span>
                    </div>
                  </div>

                  <div className="flex-1 min-h-[220px] relative mt-2 bg-black border-y border-white/5">
                    <LiveViewer enabled={true} isAdmin={true} />
                  </div>

                  <div className="p-4 bg-slate-900/40 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-black text-slate-500 tracking-widest">Reporter Web</span>
                      <span className="text-[10px] text-blue-400 font-mono italic truncate max-w-[150px]">{window.location.origin}/reporter</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/reporter`);
                          toast.success('Link do repórter copiado!');
                        }}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-white/5 transition-all"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <Link
                        to="/admin/live-stream"
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-lg transition-all text-[10px] uppercase italic shadow-lg shadow-red-900/20"
                      >
                        Estúdio Pro
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-slate-800/40 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-3 bg-slate-900 rounded-xl border border-white/10 shadow-lg">
                      <MessageSquare className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Ferramentas de Teste WhatsApp</h3>
                  <p className="text-slate-400 text-sm mb-6">Teste o envio de notificações de cadastro e ganhadores.</p>

                  <div className="flex gap-2 relative z-10">
                    <button
                      onClick={() => setShowWhatsAppTest(true)}
                      className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                    >
                      Testar Mensagens
                    </button>
                  </div>
                </div>
              </div>
            </section>


            {/* 📺 ZK TV & Mídia */}
            <section>
              <div className="flex items-center gap-4 mb-8 px-2">
                <div className="w-1.5 h-10 bg-gradient-to-b from-red-500 to-indigo-700 rounded-full"></div>
                <div>
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-tight">ZK TV & Mídia</h2>
                  <p className="text-blue-300/40 text-[10px] font-black uppercase tracking-[0.3em]">Streaming e Conteúdo</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel rounded-[2.5rem] group relative overflow-hidden border border-white/5 bg-slate-800/40 p-8 hover:border-red-500/30 transition-all duration-500">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform">
                      <Video className="h-8 w-8 text-red-500" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-3 italic uppercase">Transmissões</h3>
                  <Link
                    to="/admin/live-stream"
                    className="inline-flex items-center px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-red-600/20 uppercase italic text-xs tracking-wider"
                  >
                    Abrir Estúdio ZK
                  </Link>
                </div>

                <div className="glass-panel rounded-[2.5rem] group relative overflow-hidden border border-white/5 bg-slate-800/40 p-8 hover:border-blue-500/30 transition-all duration-500">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                      <Tv className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-3 italic uppercase">ZK TV</h3>
                  <Link
                    to="/admin/zk-tv"
                    className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-600/20 uppercase italic text-xs tracking-wider"
                  >
                    Gerenciar ZK TV
                  </Link>
                </div>
              </div>
            </section>

            {/* 🛠️ Manutenção & Configurações */}
            <section>
              <div className="flex items-center gap-4 mb-8 px-2">
                <div className="w-1.5 h-10 bg-gradient-to-b from-slate-500 to-slate-800 rounded-full"></div>
                <div>
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-tight">Manutenção & Configurações</h2>
                  <p className="text-blue-300/40 text-[10px] font-black uppercase tracking-[0.3em]">Segurança e Links</p>
                </div>
              </div>

              <div className="space-y-6 px-2">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <button
                    onClick={() => alert('Recurso em manutenção')}
                    className="glass-panel group flex items-center gap-4 p-6 rounded-[2rem] border border-white/5 bg-slate-800/20 hover:scale-[1.02] transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-emerald-500 transition-all">
                      <Settings className="w-6 h-6 text-emerald-400 group-hover:text-white" />
                    </div>
                    <span className="text-sm font-black text-white uppercase tracking-widest">Limpar Órfãos</span>
                  </button>
                  <button
                    onClick={() => alert('Recurso em manutenção')}
                    className="glass-panel group flex items-center gap-4 p-6 rounded-[2rem] border border-white/5 bg-slate-800/20 hover:scale-[1.02] transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-purple-500 transition-all">
                      <Trash2 className="w-6 h-6 text-purple-400 group-hover:text-white" />
                    </div>
                    <span className="text-sm font-black text-white uppercase tracking-widest">Limpar Bolões</span>
                  </button>
                </div>

                <SocialSettingsPanel />
              </div>
            </section>
          </div>
        </div >

        {showWhatsAppTest && (
          <div className="fixed z-50 inset-0 overflow-y-auto no-scrollbar backdrop-blur-md">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" onClick={() => setShowWhatsAppTest(false)}>
                <div className="absolute inset-0 bg-black/60"></div>
              </div>
              <div className="inline-block align-bottom bg-white rounded-3xl px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">🧪 Teste de WhatsApp</h3>
                  <button
                    onClick={() => setShowWhatsAppTest(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <WhatsAppTestPanel onClose={() => setShowWhatsAppTest(false)} />
              </div>
            </div>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}
