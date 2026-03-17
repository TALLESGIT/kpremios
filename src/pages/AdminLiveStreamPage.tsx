import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useRegisterStreamId } from '../features/chat/useRegisterStreamId';
import { ChatSlot } from '../features/chat/ChatSlot';
import {
  Users,
  Radio,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DEFAULT_LIVE_CHANNEL } from '../config/constants';
import { LiveViewer } from '../components/LiveViewer';
import AdminLivePanel from '../components/live/AdminLivePanel';
import VipMessageOverlay from '../components/live/VipMessageOverlay';
import VipAlertOverlay from '../components/live/VipAlertOverlay';
import PoolManager from '../components/pool/PoolManager';
import PollManager from '../components/live/PollManager';
import ChatModerationControls from '../components/live/ChatModerationControls';
import ModeratorManager from '../components/live/ModeratorManager';

interface LiveStream {
  id: string;
  title: string;
  channel_name: string;
  is_active: boolean;
  viewer_count: number;
  hls_url: string | null;
  started_at: string | null;
}

const AdminLiveStreamPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);

  // Registrar o streamId globalmente para o ChatHost (unificação do chat)
  useRegisterStreamId(selectedStream?.id);
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newStreamTitle, setNewStreamTitle] = useState('');

  const loadStreams = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStreams(data || []);

      // Se houver uma stream selecionada, atualizar seus dados
      if (selectedStream) {
        const updated = data?.find(s => s.id === selectedStream.id);
        if (updated) {
          // Só atualizar se algo crítico mudou para evitar recursão infinita no useEffect
          const hasBigChange = updated.is_active !== selectedStream.is_active ||
            updated.hls_url !== selectedStream.hls_url ||
            updated.title !== selectedStream.title;

          if (hasBigChange) {
            setSelectedStream(updated);
            setIsStreaming(updated.is_active);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar lives:', error);
      toast.error('Erro ao carregar transmissões');
    } finally {
      setLoading(false);
    }
  }, [selectedStream]);

  useEffect(() => {
    // Executa a limpeza de bolões com mais de 7 dias automaticamente ao abrir o painel
    const cleanOldPools = async () => {
      try {
        await supabase.rpc('delete_old_pools');
      } catch (err) {
        console.error('Erro ao limpar bolões antigos', err);
      }
    };
    cleanOldPools();
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Role check - Solo administradores podem acessar
    const checkAdmin = async () => {
      try {
        // Primeiro tenta na tabela users (sistema principal)
        let { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle();

        // Se não encontrar ou der erro, tenta na tabela profiles (Resta Um)
        if (!userRecord || userError) {
          const { data: profileRecord } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .maybeSingle();

          if (profileRecord) {
            userRecord = profileRecord;
          }
        }

        if (!userRecord || !userRecord.is_admin) {
          toast.error('Acesso restrito a administradores');
          navigate('/');
        }
      } catch (err) {
        console.error('Erro ao verificar admin:', err);
        navigate('/');
      }
    };

    checkAdmin();
    loadStreams();
  }, [user, navigate, loadStreams]);

  // Real-time subscription - Refatorado para estabilidade
  useEffect(() => {
    if (!supabase || !loadStreams) return;

    const channel = supabase
      .channel('admin-live-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_streams'
        },
        (payload) => {
          // Se for uma atualização de uma stream específica que estamos vendo
          if (payload.eventType === 'UPDATE') {
            const updatedStream = payload.new as LiveStream;

            setSelectedStream(prev => {
              if (prev && prev.id === updatedStream.id) {
                // Throttle updates: apenas atualizar se campos críticos mudarem
                const criticalFieldsChanged =
                  prev.is_active !== updatedStream.is_active ||
                  prev.hls_url !== updatedStream.hls_url;

                if (criticalFieldsChanged) {
                  setIsStreaming(updatedStream.is_active);
                  return updatedStream;
                }
              }
              return prev;
            });

            // Recarregar lista para garantir ordem
            loadStreams();
          } else {
            // INSERT ou DELETE, recarregar tudo
            loadStreams();
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, loadStreams]);

  const generateSlugFromTitle = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const createStream = async () => {
    if (!newStreamTitle.trim()) return;
    try {
      const baseSlug = generateSlugFromTitle(newStreamTitle);

      const { data, error } = await supabase.from('live_streams').insert({
        title: newStreamTitle.trim(),
        channel_name: baseSlug,
        is_active: false,
        created_by: user?.id
      }).select().single();

      if (error) throw error;

      toast.success('Live criada com sucesso!');

      setIsCreating(false);
      setNewStreamTitle('');
      await loadStreams();
      setSelectedStream(data);
    } catch (err) {
      console.error('Erro ao criar live:', err);
      toast.error('Erro ao criar');
    }
  };

  const startStream = async () => {
    if (!selectedStream) return;
    try {
      // Título é mantido como o admin definiu (não sobrescrever)

      // Se MediaMTX estiver configurado, definir hls_url automaticamente para o site
      const mediaMtxBase = (import.meta.env.VITE_MEDIAMTX_HLS_BASE_URL as string | undefined)?.trim();
      const updatePayload: Record<string, any> = {
        is_active: true,
        started_at: new Date().toISOString(),
      };

      // Canal fixo: O terminal do MediaMTX deve bater com o que foi configurado no OBS/ZK Studio
      if (mediaMtxBase) {
        // ✅ EMERGÊNCIA: Forçamos o uso do canal padrão 'ZkOficial' para bater com o OBS do usuário
        const channelPath = DEFAULT_LIVE_CHANNEL;
        updatePayload.hls_url = `${mediaMtxBase.replace(/\/$/, '')}/live/${channelPath}/index.m3u8`;
      }

      const { data, error } = await supabase
        .from('live_streams')
        .update(updatePayload)
        .eq('id', selectedStream.id)
        .select()
        .single();

      if (error) throw error;

      setIsStreaming(true);
      setSelectedStream(data);

      toast.success('Você está AO VIVO!');

      // NOTA: A notificação push agora é disparada automaticamente pelo Trigger do Banco de Dados
      // na tabela 'live_streams' quando is_active muda para true. Isso evita duplicidade.
    } catch (err) {
      console.error('Erro ao iniciar:', err);
      toast.error('Erro ao iniciar');
    }
  };

  const stopStream = async () => {
    if (!selectedStream) return;
    try {
      // Atualizar stream
      const { error: updateError } = await supabase
        .from('live_streams')
        .update({
          is_active: false,
          viewer_count: 0,
          hls_url: null // Limpar URL HLS quando encerrar
        })
        .eq('id', selectedStream.id);

      if (updateError) throw updateError;

      // Encerrar sessões
      await supabase.rpc('end_all_active_viewer_sessions', { p_stream_id: selectedStream.id });

      const { data } = await supabase.from('live_streams').select('*').eq('id', selectedStream.id).single();
      setIsStreaming(false);
      if (data) setSelectedStream(data);

      toast.success('Live encerrada!');
    } catch (err) {
      console.error('Erro ao encerrar:', err);
      toast.error('Erro ao encerrar');
    }
  };

  const deleteStream = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta live?')) return;
    try {
      const { error } = await supabase
        .from('live_streams')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (selectedStream?.id === id) setSelectedStream(null);

      toast.success('Live excluída!');

      await loadStreams();
    } catch (error) {
      console.error('Erro ao excluir live:', error);
      toast.error('Erro ao excluir');
    }
  };

  const notifyExpiringVips = async () => {
    if (!confirm('Deseja enviar uma notificação para todos os VIPs que expiram nos próximos 3 dias?')) return;
    
    const loadingToast = toast.loading('Enviando notificações para VIPs...');
    try {
      const { data, error } = await supabase.functions.invoke('notify-vip-expiring');
      
      if (error) throw error;
      
      toast.success(`Notificações enviadas! VIPs encontrados: ${data.total_vips_found || 0}.`, { id: loadingToast });
    } catch (err) {
      console.error('Erro ao notificar VIPs:', err);
      toast.error('Falha ao enviar notificações VIP.', { id: loadingToast });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Header />
      <main className="flex-grow pt-32 md:pt-40 px-4 max-w-6xl mx-auto w-full pb-20">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-white italic uppercase">Controle de Live</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Gerencie suas transmissões</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={notifyExpiringVips}
              className="px-6 py-3 bg-slate-800 text-amber-400 border border-amber-400/30 font-bold rounded-xl hover:bg-amber-400/10 transition-all uppercase text-[10px] tracking-widest flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
              Lembrete VIP
            </button>
            <button onClick={() => setIsCreating(true)} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-all uppercase text-sm">Nova Live</button>
          </div>
        </div>

        {isCreating && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-slate-800 p-8 rounded-3xl border border-white/10 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-6">Criar Transmissão</h3>
              <input
                type="text"
                value={newStreamTitle}
                onChange={(e) => setNewStreamTitle(e.target.value)}
                placeholder="Título da Transmissão"
                className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white mb-6"
              />
              <div className="flex gap-4">
                <button onClick={() => setIsCreating(false)} className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-bold uppercase text-xs">Cancelar</button>
                <button onClick={createStream} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs">Criar</button>
              </div>
            </div>
          </div>
        )}

        {!selectedStream ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {streams.map(s => (
              <div key={s.id} onClick={() => setSelectedStream(s)} className="bg-slate-800/50 p-6 rounded-3xl border border-white/5 cursor-pointer hover:border-blue-500/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${s.is_active ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                    {s.is_active ? 'AO VIVO' : 'OFFLINE'}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteStream(s.id); }} className="text-slate-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{s.title}</h3>
                <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase">
                  <Radio className="w-3 h-3" /> {s.channel_name}
                </div>
              </div>
            ))}
            {streams.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <p className="text-slate-500 font-bold uppercase tracking-widest">Nenhuma transmissão encontrada</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/5 flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedStream(null)} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-xs font-bold uppercase">Voltar</button>
                <h2 className="text-lg font-bold text-white uppercase">{selectedStream.title}</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-lg border border-white/5">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-white font-bold">{selectedStream.viewer_count || 0}</span>
                </div>
                {isStreaming ? (
                  <button onClick={stopStream} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs uppercase">Encerrar</button>
                ) : (
                  <button onClick={startStream} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs uppercase">Iniciar Live</button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-white/5 relative">
                  <LiveViewer
                    streamId={selectedStream.id}
                    channelName={selectedStream.channel_name}
                    hlsUrl={selectedStream.hls_url}
                    isActive={selectedStream.is_active}
                    isAdmin={true}
                    className={!isStreaming ? 'opacity-90 grayscale-[0.2]' : ''}
                  />
                  <VipMessageOverlay streamId={selectedStream.id} isActive={selectedStream.is_active} />
                  <VipAlertOverlay streamId={selectedStream.id} />

                  {/* Overlay de Preview para o Admin */}
                  {!isStreaming && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 pointer-events-none">
                      <div className="bg-blue-600/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                        <span className="text-white text-xs font-black uppercase tracking-widest">Visualização Prévia (OFFLINE)</span>
                      </div>
                    </div>
                  )}
                </div>
                <AdminLivePanel
                  streamId={selectedStream.id}
                  channelName={selectedStream.channel_name}
                  isActive={selectedStream.is_active}
                />
              </div>
              <div className="h-[600px] bg-slate-800/50 rounded-3xl border border-white/5 overflow-hidden">
                <ChatSlot id="admin-chat" priority={1} isActive={selectedStream.is_active} />
              </div>
            </div>

            {/* Painéis Administrativos e Moderadores */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="space-y-6">
                <PoolManager streamId={selectedStream.id} />
                <PollManager streamId={selectedStream.id} />
              </div>
              <div className="space-y-6">
                <ChatModerationControls streamId={selectedStream.id} />
                <ModeratorManager streamId={selectedStream.id} />
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminLiveStreamPage;
