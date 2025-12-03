import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Eye } from 'lucide-react';
import VideoStream from '../components/live/VideoStream';
import LiveChat from '../components/live/LiveChat';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

interface LiveStream {
  id: string;
  title: string;
  description: string;
  channel_name: string;
  is_active: boolean;
  viewer_count: number;
  created_at: string;
}

const PublicLiveStreamPage: React.FC = () => {
  const { channelName } = useParams<{ channelName: string }>();
  const navigate = useNavigate();
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [sessionId] = useState(() => {
    // Tentar recuperar sessionId do localStorage para manter a mesma sessão entre recarregamentos
    const storageKey = `live_session_${channelName}`;
    const savedSessionId = localStorage.getItem(storageKey);
    
    if (savedSessionId) {
      return savedSessionId;
    }
    
    // Criar novo sessionId se não existir
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, newSessionId);
    return newSessionId;
  });

  useEffect(() => {
    if (channelName) {
      loadStream();
    }

    return () => {
      // Marcar sessão como encerrada ao sair
      if (stream) {
        endViewerSession();
      }
    };
  }, [channelName]);


  // Track viewer após stream ser carregado
  useEffect(() => {
    if (stream && channelName) {
      trackViewer();
    }
  }, [stream, channelName]);

  // Heartbeat e atualização do contador
  useEffect(() => {
    if (!stream) return;

    // Atualizar heartbeat e contador imediatamente
    updateHeartbeat();
    updateViewerCount();

    // Atualizar heartbeat a cada 30 segundos
    const heartbeatInterval = setInterval(() => {
      updateHeartbeat();
    }, 30000);

    // Atualizar contador a cada 5 segundos
    const countInterval = setInterval(() => {
      updateViewerCount();
    }, 5000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(countInterval);
    };
  }, [stream]);

  const loadStream = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('live_streams')
        .select('*')
        .eq('channel_name', channelName)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error('Transmissão não encontrada');
        navigate('/');
        return;
      }

      setStream(data);
      setViewerCount(data.viewer_count || 0);
      
      console.log('📺 Stream carregado:', { 
        id: data.id, 
        is_active: data.is_active, 
        title: data.title 
      });

      // Não mostrar toast se a transmissão não está ativa - a mensagem já aparece na tela
    } catch (error: any) {
      console.error('Erro ao carregar transmissão:', error);
      if (error.code === 'PGRST116') {
        toast.error('Transmissão não encontrada');
        navigate('/');
      } else {
        toast.error('Erro ao carregar transmissão');
      }
    } finally {
      setLoading(false);
    }
  };

  const trackViewer = async () => {
    if (!stream) {
      console.log('⏳ Stream ainda não carregado, aguardando...');
      return;
    }

    try {
      console.log('👤 Criando sessão de visualização...', {
        streamId: stream.id,
        sessionId,
        channelName
      });
      
      // Verificar se já existe sessão para este session_id (usando maybeSingle para evitar erro 406)
      const { data: existingSession, error: checkError } = await supabase
        .from('viewer_sessions')
        .select('id, is_active, ended_at')
        .eq('session_id', sessionId)
        .eq('stream_id', stream.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar sessão existente:', checkError);
      }

      if (existingSession) {
        // Se já existe, apenas reativar e atualizar heartbeat
        console.log('ℹ️ Sessão já existe, reativando...', existingSession);
        const { error: updateError } = await supabase
          .from('viewer_sessions')
          .update({ 
            is_active: true,
            last_heartbeat: new Date().toISOString(),
            ended_at: null,
            started_at: existingSession.ended_at ? new Date().toISOString() : undefined
          })
          .eq('session_id', sessionId)
          .eq('stream_id', stream.id);

        if (updateError) {
          console.error('❌ Erro ao reativar sessão:', updateError);
        } else {
          console.log('✅ Sessão reativada com sucesso');
        }
      } else {
        // Criar nova sessão de visualização
        const { data, error } = await supabase.from('viewer_sessions').insert({
          stream_id: stream.id,
          session_id: sessionId,
          is_active: true,
          user_agent: navigator.userAgent,
          last_heartbeat: new Date().toISOString(),
        }).select();

        if (error) {
          console.error('❌ Erro ao criar sessão de visualização:', error);
        } else {
          console.log('✅ Sessão de visualização criada:', data);
        }
      }
      
      // Limpar sessões antigas e atualizar contador
      await cleanupOldSessions();
      await updateViewerCount();
    } catch (error) {
      console.error('Erro ao rastrear viewer:', error);
    }
  };

  const updateHeartbeat = async () => {
    if (!stream) return;

    try {
      // Atualizar heartbeat usando função SQL
      const { error } = await supabase.rpc('update_viewer_heartbeat', {
        p_session_id: sessionId
      });

      if (error) {
        console.error('❌ Erro ao atualizar heartbeat:', error);
      }
    } catch (error) {
      console.error('Erro ao atualizar heartbeat:', error);
    }
  };

  const cleanupOldSessions = async () => {
    if (!stream) return;

    try {
      // Limpar sessões duplicadas primeiro
      const { error: dupError } = await supabase.rpc(
        'cleanup_duplicate_viewer_sessions',
        { p_stream_id: stream.id }
      );

      if (dupError) {
        console.error('❌ Erro ao limpar sessões duplicadas:', dupError);
      } else {
        console.log('🧹 Sessões duplicadas limpas');
      }

      // Limpar sessões antigas usando função SQL
      const { error } = await supabase.rpc('cleanup_inactive_viewer_sessions');

      if (error) {
        console.error('❌ Erro ao limpar sessões antigas:', error);
      } else {
        console.log('🧹 Sessões antigas limpas');
      }
    } catch (error) {
      console.error('Erro ao limpar sessões antigas:', error);
    }
  };

  const endViewerSession = async () => {
    if (!stream) return;

    try {
      console.log('👋 Encerrando sessão de visualização...', { sessionId, streamId: stream.id });
      
      const { error } = await supabase
        .from('viewer_sessions')
        .update({
          ended_at: new Date().toISOString(),
          is_active: false,
        })
        .eq('session_id', sessionId)
        .eq('stream_id', stream.id);

      if (error) {
        console.error('❌ Erro ao encerrar sessão:', error);
      } else {
        console.log('✅ Sessão encerrada com sucesso');
      }

      // Remover sessionId do localStorage ao sair
      const storageKey = `live_session_${channelName}`;
      localStorage.removeItem(storageKey);

      // Atualizar contador após encerrar sessão
      await updateViewerCount();
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error);
    }
  };

  const updateViewerCount = async () => {
    if (!stream) return;

    try {
      // Limpar sessões antigas primeiro
      await cleanupOldSessions();
      
      console.log('📊 Atualizando contador de viewers...', { streamId: stream.id });
      
      // Usar função SQL para contar apenas sessões únicas ativas
      const { data: countData, error } = await supabase.rpc(
        'count_active_unique_viewers',
        { p_stream_id: stream.id }
      );

      if (error) {
        console.error('❌ Erro ao contar viewers:', error);
        // Fallback: contar manualmente com DISTINCT
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: sessions, error: fallbackError } = await supabase
          .from('viewer_sessions')
          .select('session_id')
          .eq('stream_id', stream.id)
          .eq('is_active', true)
          .gte('last_heartbeat', fiveMinutesAgo);

        if (fallbackError) {
          throw fallbackError;
        }

        // Contar sessões únicas manualmente
        const uniqueSessions = new Set(sessions?.map(s => s.session_id) || []);
        const newCount = uniqueSessions.size;
        console.log('👥 Viewers únicos encontrados (fallback):', newCount);

        await supabase
          .from('live_streams')
          .update({ viewer_count: newCount })
          .eq('id', stream.id);

        setViewerCount(newCount);
        return;
      }

      const newCount = Number(countData) || 0;
      console.log('👥 Viewers únicos ativos encontrados:', newCount);

      // Atualizar contador na tabela live_streams
      const { error: updateError } = await supabase
        .from('live_streams')
        .update({ viewer_count: newCount })
        .eq('id', stream.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar viewer_count no banco:', updateError);
      } else {
        console.log('✅ Contador atualizado no banco:', newCount);
      }

      setViewerCount(newCount);
    } catch (error) {
      console.error('Erro ao atualizar contador de viewers:', error);
    }
  };

  // Subscribe para atualizações da transmissão e viewer_sessions
  useEffect(() => {
    if (!stream) return;

    console.log('🔔 Configurando subscription para stream:', stream.id, 'is_active:', stream.is_active);

    const channel = supabase
      .channel(`public_stream_${stream.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${stream.id}`,
        },
        (payload) => {
          const updated = payload.new as LiveStream;
          console.log('📡 Stream atualizado via subscription:', { 
            is_active: updated.is_active, 
            viewer_count: updated.viewer_count,
            old_is_active: stream?.is_active,
            payload: payload
          });
          
          // Forçar atualização do estado
          setStream((prev) => {
            if (prev && prev.id === updated.id) {
              return { ...prev, ...updated };
            }
            return updated;
          });
          setViewerCount(updated.viewer_count || 0);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'viewer_sessions',
          filter: `stream_id=eq.${stream.id}`,
        },
        (payload) => {
          console.log('📊 Mudança em viewer_sessions:', payload.eventType);
          // Atualizar contador quando houver mudanças nas sessões
          updateViewerCount();
        }
      )
      .subscribe();

    // Polling como fallback para garantir que o estado seja atualizado
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('live_streams')
          .select('*')
          .eq('id', stream.id)
          .single();

        if (!error && data) {
          setStream((prev) => {
            if (prev && prev.is_active !== data.is_active) {
              console.log('🔄 Estado do stream mudou via polling:', { 
                old: prev.is_active, 
                new: data.is_active 
              });
            }
            return data;
          });
          setViewerCount(data.viewer_count || 0);
        }
      } catch (error) {
        console.error('Erro ao fazer polling do stream:', error);
      }
    }, 5000); // Verificar a cada 5 segundos

    return () => {
      console.log('🔕 Removendo subscription do stream:', stream.id);
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [stream?.id]); // Usar apenas stream.id como dependência para evitar recriar subscription

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
          <p className="text-white">Carregando transmissão...</p>
        </div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Transmissão não encontrada</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <Header />

      {/* Conteúdo Principal */}
      <div className="flex-1 max-w-[1400px] mx-auto w-full p-4">
        {/* Header da Transmissão */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/')}
            className="text-amber-400 hover:text-amber-300 mb-2 flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{stream.title}</h1>
              {stream.description && (
                <p className="text-slate-400">{stream.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Eye className="w-5 h-5" />
              <span className="font-medium">{viewerCount > 0 ? viewerCount : stream?.viewer_count || 0}</span>
              <span className="text-sm text-slate-400">viewers</span>
            </div>
          </div>
        </div>

        {/* Status da Transmissão - Só mostra se realmente não estiver ativa */}
        {stream && !stream.is_active && (
          <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-300 text-center">
              ⏸️ Esta transmissão não está ativa no momento. Aguarde o início da transmissão.
            </p>
          </div>
        )}

        {/* Layout Principal - 16:9 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Vídeo - Ocupa 8 colunas */}
          <div className="lg:col-span-8">
            <div className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <VideoStream
                channelName={stream.channel_name}
                role="audience"
                onStreamError={(error) => {
                  console.error('Erro no stream:', error);
                  if (stream.is_active) {
                    toast.error('Erro ao conectar ao stream. Tente atualizar a página.');
                  }
                }}
              />
            </div>
          </div>

          {/* Chat - Ocupa 4 colunas */}
          <div className="lg:col-span-4">
            <div style={{ minHeight: '600px' }}>
              <LiveChat streamId={stream.id} isAdmin={false} />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PublicLiveStreamPage;

