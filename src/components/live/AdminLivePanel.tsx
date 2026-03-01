import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, MessageSquare, Eye, TrendingUp, Clock, Copy, Share2, Crown, Sparkles } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminLivePanelProps {
  streamId: string;
  channelName: string;
  isActive: boolean;
}

interface StreamStats {
  totalViewers: number;
  activeViewers: number;
  totalMessages: number;
  avgWatchTime: number;
  uniqueSessions: number;
}

interface RecentVip {
  id: string;
  user_name: string;
  created_at: string;
}

const isLiveDebug = () => (import.meta as any).env?.DEV === true || (import.meta as any).env?.VITE_DEBUG_LIVE === '1';


const AdminLivePanel: React.FC<AdminLivePanelProps> = ({ streamId, channelName, isActive }) => {
  const [stats, setStats] = useState<StreamStats>({
    totalViewers: 0,
    activeViewers: 0,
    totalMessages: 0,
    avgWatchTime: 0,
    uniqueSessions: 0,
  });
  const [viewerCount, setViewerCount] = useState(0);
  const [streamLink, setStreamLink] = useState('');
  const [recentVips, setRecentVips] = useState<RecentVip[]>([]);
  const [isSimulatingVip, setIsSimulatingVip] = useState(false);

  // ✅ Socket.io para atualizações em tempo real
  const { socket, isConnected, on, off, emit } = useSocket({
    streamId: streamId,
    autoConnect: !!streamId && isActive
  });

  // ✅ Listener para atualizações de viewer count
  useEffect(() => {
    if (!streamId || !socket || !isConnected) return;

    const handleViewerCountUpdate = (data: { streamId: string; count: number }) => {
      if (data.streamId === streamId) {
        setViewerCount(data.count);
        setStats((prev) => ({ ...prev, activeViewers: data.count }));
      }
    };

    on('viewer-count-updated', handleViewerCountUpdate);
    return () => off('viewer-count-updated', handleViewerCountUpdate);
  }, [streamId, socket, isConnected, on, off]);

  // Carregar dados iniciais e VIPs
  useEffect(() => {
    const baseUrl = window.location.origin;
    setStreamLink(`${baseUrl}/live/${channelName}`);
    loadStats();
    loadRecentVips();

    // Listen para novos alertas VIP no painel admin
    const channel = supabase
      .channel('admin-vip-watcher')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vip_alerts' }, (payload) => {
        const newVip = payload.new as RecentVip;
        setRecentVips(prev => [newVip, ...prev].slice(0, 5));

        // Som de notificação
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
        audio.play().catch(e => console.log('Bloqueio de áudio pelo browser:', e));
        toast.success(`NOVO VIP: ${newVip.user_name} 💎`, {
          duration: 5000,
          icon: '👑',
          style: {
            background: '#1e293b',
            color: '#fbbf24',
            border: '1px solid #fbbf24'
          }
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamId, channelName]);

  const loadStats = async () => {
    if (!streamId) return;
    try {
      const { data, error } = await supabase.rpc('get_stream_statistics', { p_stream_id: streamId });
      if (error) throw error;
      if (data && data.length > 0) {
        const statsData = data[0];
        setStats(prev => ({
          ...prev,
          totalViewers: Number(statsData.total_viewers) || 0,
          activeViewers: Number(statsData.active_viewers) || 0,
          avgWatchTime: Number(statsData.avg_watch_time) || 0,
          uniqueSessions: Number(statsData.unique_sessions) || 0,
        }));
      }
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  };

  const loadRecentVips = async () => {
    if (!streamId) return;
    try {
      const { data, error } = await supabase
        .from('vip_alerts')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      setRecentVips(data || []);
    } catch (err) {
      console.error('Erro ao carregar VIPs:', err);
    }
  };

  const simulateVipPurchase = async () => {
    if (isSimulatingVip) return;
    setIsSimulatingVip(true);
    try {
      const names = ['Anderson', 'Gabriel', 'Ricardo', 'Talles', 'Marcos', 'Fernando'];
      const randomName = names[Math.floor(Math.random() * names.length)];

      // Emitir via Socket.io para broadcast imediato para todos
      emit('chat-vip-alert', {
        streamId,
        user_name: randomName,
        id: crypto.randomUUID?.() || Math.random().toString(36).substring(2)
      });

      const { error } = await supabase
        .from('vip_alerts')
        .insert([{ user_name: randomName, stream_id: streamId }]);

      if (error) {
        if (isLiveDebug()) console.warn('AdminLivePanel: Erro ao salvar VIP no Supabase, mas emitido via Socket:', error);
      }
      toast.success(`Simulando VIP: ${randomName}`);
    } catch (err) {
      toast.error('Erro ao simular VIP');
      console.error(err);
    } finally {
      setTimeout(() => setIsSimulatingVip(false), 2000);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(streamLink);
    toast.success('Link copiado!');
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header com Link e Controles Rápidos */}
      <div className="glass-panel p-6 sm:p-8 rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isActive ? 'bg-red-400' : 'bg-slate-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isActive ? 'bg-red-500' : 'bg-slate-500'}`}></span>
              </span>
              Painel de Controle
            </h2>
            <div className="flex items-center gap-2 group cursor-pointer" onClick={copyToClipboard}>
              <code className="text-[10px] font-mono text-white/40 bg-black/40 px-3 py-1 rounded-full border border-white/5 transition-colors group-hover:border-blue-500/30 group-hover:text-blue-400">
                {streamLink}
              </code>
              <Copy className="w-3 h-3 text-white/20 group-hover:text-blue-400 transition-colors" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              onClick={simulateVipPurchase}
              disabled={isSimulatingVip}
              className="flex-1 sm:flex-none px-6 py-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-black text-xs uppercase rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(234,179,8,0.3)] disabled:opacity-50 active:scale-95"
            >
              <Crown className={`w-4 h-4 ${isSimulatingVip ? 'animate-bounce' : ''}`} />
              LANÇAR VIP 💎
            </button>
            <button
              onClick={copyToClipboard}
              className="flex-1 sm:flex-none px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-3 font-black text-xs uppercase"
            >
              <Share2 className="w-4 h-4" />
              Compartilhar
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lado Esquerdo: Métricas Principais */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Viewers Ativos */}
          <div className="glass-panel p-8 rounded-[2rem] border border-blue-500/10 bg-blue-500/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Eye className="w-20 h-20 text-blue-500" />
            </div>
            <div className="relative z-10">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4 block">Viewers Ativos</span>
              <div className="h-14 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={isActive ? viewerCount : stats.activeViewers}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="text-5xl font-black text-white italic"
                  >
                    {isActive ? viewerCount : stats.activeViewers}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div className="mt-4 flex items-center gap-2 text-blue-300/60 font-bold text-[10px] uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Atualizado em tempo real
              </div>
            </div>
          </div>

          {/* Mensagens */}
          <div className="glass-panel p-8 rounded-[2rem] border border-emerald-500/10 bg-emerald-500/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <MessageSquare className="w-20 h-20 text-emerald-500" />
            </div>
            <div className="relative z-10">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-4 block">Mensagens</span>
              <p className="text-5xl font-black text-white italic">{stats.totalMessages || 0}</p>
              <div className="mt-4 text-emerald-400/60 font-bold text-[10px] uppercase">No chat ao vivo</div>
            </div>
          </div>

          {/* Outras métricas menores */}
          <div className="sm:col-span-2 grid grid-cols-3 gap-4">
            <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center">
              <Users className="w-4 h-4 text-purple-400 mb-2" />
              <span className="text-lg font-black text-white italic">{stats.uniqueSessions || 0}</span>
              <span className="text-[8px] text-white/40 uppercase font-black tracking-widest mt-1">Sessões</span>
            </div>
            <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center">
              <Clock className="w-4 h-4 text-amber-400 mb-2" />
              <span className="text-lg font-black text-white italic">{stats.uniqueSessions > 0 ? formatTime(stats.avgWatchTime) : '0s'}</span>
              <span className="text-[8px] text-white/40 uppercase font-black tracking-widest mt-1">Retenção</span>
            </div>
            <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center">
              <TrendingUp className="w-4 h-4 text-rose-400 mb-2" />
              <span className="text-lg font-black text-white italic">{stats.totalViewers}</span>
              <span className="text-[8px] text-white/40 uppercase font-black tracking-widest mt-1">Alcance</span>
            </div>
          </div>
        </div>

        {/* Lado Direito: VIPs Recentes */}
        <div className="glass-panel rounded-[2rem] border border-yellow-500/10 bg-yellow-500/5 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-yellow-500" />
              <h3 className="text-xs font-black text-yellow-500 uppercase tracking-widest">VIPs Recentes</h3>
            </div>
            <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
              <span className="text-[10px] font-black text-yellow-500 uppercase tracking-wider italic">Total</span>
              <span className="text-xs font-black text-white">{recentVips.length}</span>
            </div>
          </div>
          <div className="flex-1 p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
            <AnimatePresence initial={false}>
              {recentVips.length > 0 ? (
                <div className="space-y-3">
                  {recentVips.map((vip) => (
                    <motion.div
                      key={vip.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-yellow-500 flex items-center justify-center text-black font-black text-xs">
                          {vip.user_name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-white italic uppercase">{vip.user_name}</span>
                          <span className="text-[9px] text-yellow-500/60 font-bold uppercase tracking-wider">Novo Assinante 💎</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 p-8">
                  <Crown className="w-10 h-10 mb-4" />
                  <p className="text-[10px] uppercase font-black tracking-widest">Nenhum VIP recente</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLivePanel;

