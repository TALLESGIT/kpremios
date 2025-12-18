import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, MessageSquare, Eye, TrendingUp, Clock, Copy, Share2 } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

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
    <div className="bg-white p-6">
      <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        Painel de Controle
      </h3>

      {/* Link da Transmissão */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Link da Transmissão
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={streamLink}
            readOnly
            className="flex-1 px-4 py-2 bg-white border-2 border-blue-200 text-gray-900 rounded-lg text-sm font-semibold focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={copyLink}
            className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 font-bold shadow-lg"
            title="Copiar link"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={shareLink}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 font-bold shadow-lg"
            title="Compartilhar link"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Métricas em Tempo Real */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Viewers Ativos */}
        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-bold text-gray-700">Viewers Ativos</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{viewerCount}</p>
          <p className="text-xs text-gray-600 mt-1 font-semibold">
            {stats.totalViewers} total
          </p>
        </div>

        {/* Mensagens */}
        <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-5 h-5 text-green-600" />
            <span className="text-sm font-bold text-gray-700">Mensagens</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{stats.totalMessages}</p>
          <p className="text-xs text-gray-600 mt-1 font-semibold">No chat</p>
        </div>

        {/* Sessões Únicas */}
        <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-bold text-gray-700">Sessões</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{stats.uniqueSessions}</p>
          <p className="text-xs text-gray-600 mt-1 font-semibold">Únicas</p>
        </div>

        {/* Tempo Médio de Visualização */}
        <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-bold text-gray-700">Tempo Médio</span>
          </div>
          <p className="text-2xl font-black text-gray-900">
            {formatTime(stats.avgWatchTime)}
          </p>
          <p className="text-xs text-gray-600 mt-1 font-semibold">Por viewer</p>
        </div>

        {/* Viewers Totais */}
        <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-red-600" />
            <span className="text-sm font-bold text-gray-700">Total Viewers</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{stats.totalViewers}</p>
          <p className="text-xs text-gray-600 mt-1 font-semibold">Desde o início</p>
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  );
};

export default AdminLivePanel;

