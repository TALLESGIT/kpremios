import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, MessageSquare, Eye, TrendingUp, Clock, Copy, Share2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

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

  useEffect(() => {
    // Gerar link da transmissão
    const baseUrl = window.location.origin;
    setStreamLink(`${baseUrl}/live/${channelName}`);

    // Carregar estatísticas iniciais
    loadStats();

    // Subscribe para atualizações em tempo real apenas se estiver ativa
    let viewerChannel: any = null;
    let messageChannel: any = null;

    if (isActive) {
      viewerChannel = supabase
        .channel(`viewer_count_${streamId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'viewer_sessions',
            filter: `stream_id=eq.${streamId}`,
          },
          () => {
            loadStats();
          }
        )
        .subscribe();

      messageChannel = supabase
        .channel(`message_count_${streamId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'live_chat_messages',
            filter: `stream_id=eq.${streamId}`,
          },
          () => {
            loadMessageCount();
          }
        )
        .subscribe();
    }

    // Atualizar contador de viewers periodicamente apenas se estiver ativa
    const interval = setInterval(() => {
      if (isActive) {
        loadViewerCount();
      }
    }, 5000);

    return () => {
      if (viewerChannel) supabase.removeChannel(viewerChannel);
      if (messageChannel) supabase.removeChannel(messageChannel);
      clearInterval(interval);
    };
  }, [streamId, channelName, isActive]);

  const loadStats = async () => {
    try {
      // Se a transmissão não está ativa, não atualizar estatísticas em tempo real
      if (!isActive) {
        // Carregar apenas estatísticas históricas (sessões encerradas)
        const { data: viewerStats, error: viewerError } = await supabase.rpc(
          'get_stream_statistics',
          { p_stream_id: streamId }
        );

        if (!viewerError && viewerStats && viewerStats.length > 0) {
          const statsData = viewerStats[0];
          setStats((prev) => ({
            ...prev,
            totalViewers: Number(statsData.total_viewers) || 0,
            activeViewers: 0, // Sempre 0 quando inativa
            avgWatchTime: Number(statsData.avg_watch_time) || 0,
            uniqueSessions: Number(statsData.unique_sessions) || 0,
          }));
        }
        return;
      }

      // Carregar estatísticas de viewers (apenas quando ativa)
      const { data: viewerStats, error: viewerError } = await supabase.rpc(
        'get_stream_statistics',
        { p_stream_id: streamId }
      );

      if (viewerError) throw viewerError;

      if (viewerStats && viewerStats.length > 0) {
        const statsData = viewerStats[0];
        setStats((prev) => ({
          ...prev,
          totalViewers: Number(statsData.total_viewers) || 0,
          activeViewers: Number(statsData.active_viewers) || 0,
          avgWatchTime: Number(statsData.avg_watch_time) || 0,
          uniqueSessions: Number(statsData.unique_sessions) || 0,
        }));
      }

      // Carregar contagem de mensagens
      await loadMessageCount();
      await loadViewerCount();
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const loadMessageCount = async () => {
    try {
      const { count, error } = await supabase
        .from('live_chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('stream_id', streamId);

      if (error) throw error;

      setStats((prev) => ({
        ...prev,
        totalMessages: count || 0,
      }));
    } catch (error) {
      console.error('Erro ao carregar contagem de mensagens:', error);
    }
  };

  const loadViewerCount = async () => {
    try {
      // Se a transmissão não está ativa, mostrar 0 viewers ativos
      if (!isActive) {
        setViewerCount(0);
        setStats((prev) => ({
          ...prev,
          activeViewers: 0,
        }));
        return;
      }

      // Limpar sessões antigas primeiro
      await supabase.rpc('cleanup_inactive_viewer_sessions');

      // Usar função SQL para contar apenas sessões únicas ativas
      const { data: countData, error } = await supabase.rpc(
        'count_active_unique_viewers',
        { p_stream_id: streamId }
      );

      if (error) {
        console.error('❌ Erro ao contar viewers:', error);
        // Fallback: contar manualmente
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: sessions, error: fallbackError } = await supabase
          .from('viewer_sessions')
          .select('session_id')
          .eq('stream_id', streamId)
          .eq('is_active', true)
          .gte('last_heartbeat', fiveMinutesAgo);

        if (fallbackError) {
          throw fallbackError;
        }

        const uniqueSessions = new Set(sessions?.map(s => s.session_id) || []);
        const activeCount = uniqueSessions.size;

        await supabase
          .from('live_streams')
          .update({ viewer_count: activeCount })
          .eq('id', streamId);

        setViewerCount(activeCount);
        setStats((prev) => ({
          ...prev,
          activeViewers: activeCount,
        }));
        return;
      }

      const activeCount = Number(countData) || 0;

      // Atualizar viewer_count na tabela live_streams apenas se estiver ativa
      await supabase
        .from('live_streams')
        .update({ viewer_count: activeCount })
        .eq('id', streamId);

      setViewerCount(activeCount);
      setStats((prev) => ({
        ...prev,
        activeViewers: activeCount,
      }));
    } catch (error) {
      console.error('Erro ao carregar contador de viewers:', error);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(streamLink);
      toast.success('Link copiado');
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      toast.error('Erro ao copiar link');
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Transmissão ao Vivo',
          text: 'Assista à transmissão ao vivo!',
          url: streamLink,
        });
      } catch (error) {
        // Usuário cancelou ou erro
      }
    } else {
      copyLink();
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
          <TrendingUp className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-white uppercase italic">Painel de Métricas</h3>
          <p className="text-slate-400 text-sm font-medium">Desempenho da transmissão em tempo real</p>
        </div>
      </div>

      {/* Link da Transmissão */}
      <div className="mb-10 p-6 rounded-[2rem] bg-slate-900/50 border border-white/5 space-y-4">
        <label className="text-[10px] font-black text-blue-200/40 uppercase tracking-[0.2em] ml-1">
          Link da Transmissão
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={streamLink}
            readOnly
            className="flex-1 px-5 py-4 bg-slate-800/50 border border-white/5 text-blue-400 rounded-2xl text-sm font-bold focus:outline-none"
          />
          <div className="flex gap-3">
            <button
              onClick={copyLink}
              className="flex-1 sm:flex-none px-6 py-4 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-600/20 transition-all flex items-center justify-center gap-3 font-black text-xs uppercase"
              title="Copiar link"
            >
              <Copy className="w-4 h-4" />
              Copiar
            </button>
            <button
              onClick={shareLink}
              className="flex-1 sm:flex-none px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-3 font-black text-xs uppercase"
              title="Compartilhar link"
            >
              <Share2 className="w-4 h-4" />
              Dividir
            </button>
          </div>
        </div>
      </div>

      {/* Métricas em Tempo Real */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Viewers Ativos */}
        <div className="glass-panel p-6 rounded-[2rem] border border-blue-500/10 bg-blue-500/5 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Eye className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-[11px] font-black text-blue-200/60 uppercase tracking-widest">Ativos</span>
          </div>
          <p className="text-4xl font-black text-white italic">{viewerCount}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">
              {stats.totalViewers} Acumulado
            </p>
          </div>
        </div>

        {/* Mensagens */}
        <div className="glass-panel p-6 rounded-[2rem] border border-emerald-500/10 bg-emerald-500/5 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-[11px] font-black text-emerald-200/60 uppercase tracking-widest">Mensagens</span>
          </div>
          <p className="text-4xl font-black text-white italic">{stats.totalMessages}</p>
          <p className="mt-2 text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider">No chat ao vivo</p>
        </div>

        {/* Sessões Únicas */}
        <div className="glass-panel p-6 rounded-[2rem] border border-purple-500/10 bg-purple-500/5 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-[11px] font-black text-purple-200/60 uppercase tracking-widest">Sessões</span>
          </div>
          <p className="text-4xl font-black text-white italic">{stats.uniqueSessions}</p>
          <p className="mt-2 text-[10px] text-purple-400/80 font-bold uppercase tracking-wider">Únicas totais</p>
        </div>

        {/* Tempo Médio */}
        <div className="glass-panel p-6 rounded-[2rem] border border-amber-500/10 bg-amber-500/5 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-[11px] font-black text-amber-200/60 uppercase tracking-widest">Retenção</span>
          </div>
          <p className="text-3xl font-black text-white italic">
            {formatTime(stats.avgWatchTime)}
          </p>
          <p className="mt-2 text-[10px] text-amber-400/80 font-bold uppercase tracking-wider">Tempo médio</p>
        </div>

        {/* Viewers Totais */}
        <div className="glass-panel p-6 rounded-[2rem] border border-rose-500/10 bg-rose-500/5 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
              <TrendingUp className="w-5 h-5 text-rose-400" />
            </div>
            <span className="text-[11px] font-black text-rose-200/60 uppercase tracking-widest">Alcance</span>
          </div>
          <p className="text-4xl font-black text-white italic">{stats.totalViewers}</p>
          <p className="mt-2 text-[10px] text-rose-400/80 font-bold uppercase tracking-wider">Total de visitas</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLivePanel;

