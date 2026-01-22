import { useState, useEffect, useMemo, useRef } from 'react';
import React from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Trash2, Play, Square, Radio } from 'lucide-react';
import LiveChat from '../components/live/LiveChat';
import AdminLivePanel from '../components/live/AdminLivePanel';
import ModeratorManager from '../components/live/ModeratorManager';
import ChatModerationControls from '../components/live/ChatModerationControls';
import PollManager from '../components/live/PollManager';
import PollDisplay from '../components/live/PollDisplay';
import PinnedLinkOverlay from '../components/live/PinnedLinkOverlay';
import { LiveViewer } from '../components/LiveViewer';

// ✅ Memoizar LiveViewer para evitar recriações desnecessárias
const MemoizedLiveViewer = React.memo(LiveViewer);
import LivePlayerWithHeader from '../components/LivePlayerWithHeader';
import VipMessageOverlay from '../components/live/VipMessageOverlay';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import PoolManager from '../components/pool/PoolManager';

interface LiveStream {
  is_active: boolean;
  id: string;
  title: string;
  description: string;
  channel_name: string;
  created_at: string;
  viewer_count?: number;
  hls_url?: string | null;
  started_at?: string | null;
}

const generateSlugFromTitle = (title: string): string => {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

const AdminLiveStreamPage: React.FC = () => {
  const { user } = useAuth();
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newStreamTitle, setNewStreamTitle] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // ✅ THROTTLE: useRef para persistir entre re-renders
  const lastRealtimeUpdateRef = useRef<number>(0);

  // Handler para duplo clique - tela cheia
  const handleDoubleClick = (containerSelector: string) => {
    const videoContainer = document.querySelector(containerSelector);
    if (!videoContainer) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      (videoContainer as HTMLElement).requestFullscreen();
    }
  };

  useEffect(() => {
    loadStreams();

    const channel = supabase
      .channel('admin-live-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_streams',
        },
        (payload) => {
          console.log('📡 AdminLiveStreamPage: Mudança detectada na live stream:', payload.eventType);

          if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedStream = payload.new as LiveStream;
            const now = Date.now();

            // ✅ THROTTLE: Ignorar UPDATEs frequentes (< 3s) para evitar lags
            if (now - lastRealtimeUpdateRef.current < 3000) {
              console.log('⏭️ Ignorando UPDATE (throttle de 3s)');
              return;
            }
            lastRealtimeUpdateRef.current = now;

            // Se for mudança no status de ativação, atualizamos na hora!
            const statusChanged = updatedStream.is_active !== (selectedStream?.is_active ?? false);

            if (statusChanged || updatedStream.title !== selectedStream?.title) {
              console.log('✅ AdminLiveStreamPage: Status/Título mudou via Realtime, atualizando...');
              setSelectedStream(updatedStream);
              setIsStreaming(updatedStream.is_active);

              // Atualizar na lista também
              setStreams(prev => prev.map(s => s.id === updatedStream.id ? updatedStream : s));

              if (updatedStream.is_active && statusChanged) {
                toast.success('Live ativada pelo ZK Studio!', { duration: 3000 });
              }
            } else {
              // ✅ OTIMIZAÇÃO CRÍTICA:
              // Atualizamos a lista (setStreams) para refletir viewer_count, mas...
              // NÃO atualizamos selectedStream a menos que seja vital (título, status, hls).
              // Isso evita que o LiveViewer seja desmontado/remontado a cada atualização de contador.
              setStreams(prev => prev.map(s => s.id === updatedStream.id ? updatedStream : s));

              if (selectedStream?.id === updatedStream.id) {
                const criticalFieldsChanged =
                  selectedStream.is_active !== updatedStream.is_active ||
                  selectedStream.channel_name !== updatedStream.channel_name ||
                  selectedStream.hls_url !== updatedStream.hls_url ||
                  selectedStream.title !== updatedStream.title;

                if (criticalFieldsChanged) {
                  console.log('🔄 Atualizando selectedStream por mudança crítica');
                  setSelectedStream(updatedStream);
                } else {
                  // Ignorar atualização no selectedStream para manter estabilidade do player
                }
              }
            }
          } else {
            // Para outros eventos (INSERT/DELETE), recarregar a lista
            loadStreams();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedStream?.id, selectedStream?.is_active, selectedStream?.title]);

  const loadStreams = async () => {
    try {
      setLoading(true);
      // ✅ Admin usa Supabase direto (apenas 1 usuário, não sobrecarrega)
      // Viewers usam cache do backend Socket.IO
      const { data, error } = await supabase.from('live_streams').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setStreams(data || []);
      const active = data?.find(s => s.is_active);
      if (active) { setSelectedStream(active); setIsStreaming(true); }
    } catch (err) {
      toast.error('Erro ao carregar lives');
    } finally {
      setLoading(false);
    }
  };

  const createStream = async (clear: boolean) => {
    if (!newStreamTitle.trim()) return;
    try {
      const baseSlug = generateSlugFromTitle(newStreamTitle);

      // Verificação simples de duplicidade
      let finalSlug = baseSlug;
      const { data: existing } = await supabase
        .from('live_streams')
        .select('channel_name')
        .ilike('channel_name', `${baseSlug}% `);

      if (existing && existing.length > 0) {
        finalSlug = `${baseSlug} -${existing.length + 1} `;
      }

      const { data, error } = await supabase.from('live_streams').insert({
        title: newStreamTitle.trim(),
        channel_name: finalSlug,
        is_active: false,
        created_by: user?.id
      }).select().single();

      if (error) throw error;
      if (clear && streams.length > 0) await supabase.rpc('clear_stream_data', { p_stream_id: streams[0].id });

      // Gerar link da live
      const baseUrl = window.location.origin;
      const liveLink = `${baseUrl}/live/${finalSlug}`;

      toast.success('Live criada com sucesso!', {
        duration: 5000,
        icon: '✅',
      });

      // Copiar link automaticamente para área de transferência
      try {
        await navigator.clipboard.writeText(liveLink);
        toast.success(`Link copiado: ${liveLink}`, {
          duration: 8000,
        });
      } catch (err) {
        console.warn('Não foi possível copiar link automaticamente');
      }

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
      console.log(`Usando streamId: ${selectedStream.id}`);

      const { data, error } = await supabase
        .from('live_streams')
        .update({
          is_active: true,
          started_at: new Date().toISOString(),
        })
        .eq('id', selectedStream.id)
        .select()
        .single();

      if (error) throw error;

      console.log('Supabase atualizado com sucesso');
      setIsStreaming(true);
      setSelectedStream(data);

      // Gerar e copiar link da live automaticamente
      const baseUrl = window.location.origin;
      const liveLink = `${baseUrl}/live/${selectedStream.channel_name}`;

      try {
        await navigator.clipboard.writeText(liveLink);
        toast.success(`Você está AO VIVO! Link copiado: ${liveLink}`, {
          duration: 8000,
        });
      } catch (err) {
        toast.success('Você está AO VIVO!', {
          duration: 5000,
        });
        console.warn('Não foi possível copiar link automaticamente');
      }
    } catch (err) {
      console.error('Erro ao iniciar:', err);
      toast.error('Erro ao iniciar');
    }
  };

  const stopStream = async () => {
    if (!selectedStream) return;
    try {
      // Limpar chat
      await supabase.rpc('delete_all_chat_messages', { p_stream_id: selectedStream.id });

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

      toast.success('Live encerrada com sucesso!');
    } catch (err) {
      console.error('Erro ao encerrar:', err);
      toast.error('Erro ao encerrar');
    }
  };

  const deleteStream = async (id: string) => {
    try {
      // Verificar se há bolões ativos associados a esta live
      const { data: activePools, error: poolsError } = await supabase
        .from('match_pools')
        .select('id, match_title, is_active, total_participants')
        .eq('live_stream_id', id)
        .eq('is_active', true);

      if (poolsError) {
        console.error('Erro ao verificar bolões:', poolsError);
        toast.error('Erro ao verificar bolões ativos');
        return;
      }

      // PROTEÇÃO: Não permitir exclusão se houver bolão ativo
      if (activePools && activePools.length > 0) {
        const poolsList = activePools.map(p => `"${p.match_title}" (${p.total_participants || 0} participantes)`).join('\n');

        toast.error(
          `🚫 NÃO É POSSÍVEL EXCLUIR ESTA LIVE!\n\nHá ${activePools.length} bolão(ões) ATIVO(S) associado(s):\n\n${poolsList}\n\nFinalize ou desative os bolões antes de excluir a live.`,
          {
            duration: 8000,
            icon: '🚫',
            style: {
              maxWidth: '500px',
              whiteSpace: 'pre-line'
            }
          }
        );
        return;
      }

      // Buscar informações da live antes de deletar
      const { data: streamData, error: fetchError } = await supabase
        .from('live_streams')
        .select('title, is_active')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const streamTitle = streamData?.title || 'Live';
      const isActive = streamData?.is_active || false;

      // PROTEÇÃO: Não permitir exclusão se a live estiver ativa
      if (isActive) {
        toast.error(`⚠️ Não é possível excluir "${streamTitle}" enquanto está ATIVA! Encerre a live primeiro.`, {
          duration: 6000,
          icon: '🚫'
        });
        return;
      }

      // Verificar se há bolões (mesmo inativos) para avisar
      const { data: allPools, error: allPoolsError } = await supabase
        .from('match_pools')
        .select('id, match_title, total_participants')
        .eq('live_stream_id', id);

      let confirmMessage = `⚠️ EXCLUIR LIVE: "${streamTitle}"\n\n`;

      if (allPools && allPools.length > 0) {
        const totalParticipants = allPools.reduce((sum, p) => sum + (p.total_participants || 0), 0);
        confirmMessage += `🚨 ATENÇÃO: Esta live tem ${allPools.length} bolão(ões) com ${totalParticipants} participante(s)!\n\n`;
        confirmMessage += `Ao excluir, TODOS os bolões e participantes serão PERMANENTEMENTE removidos.\n\n`;
        confirmMessage += `Esta ação NÃO PODE ser desfeita!\n\n`;
      }

      confirmMessage += `Deseja realmente excluir esta live?`;

      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) {
        toast('Exclusão cancelada');
        return;
      }

      // Segunda confirmação se houver bolões
      if (allPools && allPools.length > 0) {
        const totalParticipants = allPools.reduce((sum, p) => sum + (p.total_participants || 0), 0);
        const secondConfirm = window.confirm(
          `🚨 ÚLTIMA CHANCE!\n\nVocê está prestes a excluir "${streamTitle}" e remover ${allPools.length} bolão(ões) com ${totalParticipants} participante(s) permanentemente.\n\nTem CERTEZA ABSOLUTA?`
        );
        if (!secondConfirm) {
          toast('Exclusão cancelada');
          return;
        }
      }

      // Deletar a live (CASCADE vai deletar os bolões automaticamente)
      const { error } = await supabase
        .from('live_streams')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (selectedStream?.id === id) setSelectedStream(null);

      if (allPools && allPools.length > 0) {
        const totalParticipants = allPools.reduce((sum, p) => sum + (p.total_participants || 0), 0);
        toast.success(`Live "${streamTitle}" excluída. ${allPools.length} bolão(ões) e ${totalParticipants} participante(s) foram removidos.`, {
          duration: 6000,
          icon: '⚠️'
        });
      } else {
        toast.success(`Live "${streamTitle}" excluída com sucesso!`);
      }

      await loadStreams();
    } catch (error) {
      console.error('Erro ao excluir live:', error);
      toast.error('Erro ao excluir live');
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
      <main className="flex-grow pt-24 px-4 max-w-6xl mx-auto w-full pb-20">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">ZK Studio</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Central de Controle de Transmissão</p>
          </div>
          <button onClick={() => setIsCreating(true)} className="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:scale-105 transition-all uppercase italic text-sm">Nova Transmissão</button>
        </div>

        {isCreating && (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
            <div className="bg-slate-800 p-8 rounded-[2.5rem] border border-white/10 w-full max-w-md shadow-2xl">
              <h3 className="text-2xl font-black text-white uppercase italic mb-8">Configurar Live</h3>
              <div className="space-y-4">
                <input type="text" value={newStreamTitle} onChange={(e) => setNewStreamTitle(e.target.value)} placeholder="Título da Transmissão" className="w-full px-6 py-4 bg-slate-900 border border-white/5 rounded-2xl text-white font-bold" />
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setIsCreating(false)} className="py-4 bg-slate-700 text-white rounded-2xl font-black uppercase text-xs">Cancelar</button>
                  <button onClick={() => createStream(true)} className="py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs italic">Criar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!selectedStream ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {streams.map(s => (
              <div key={s.id} onClick={() => setSelectedStream(s)} className="group bg-slate-800/40 p-8 rounded-[2.5rem] border border-white/5 cursor-pointer hover:bg-slate-800/60 hover:border-blue-500/30 transition-all relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div className={`px - 4 py - 1.5 rounded - full text - [10px] font - black uppercase tracking - widest ${s.is_active ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-slate-400'} `}>
                    {s.is_active ? '● NO AR' : 'OFFLINE'}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteStream(s.id); }} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                </div>
                <h3 className="text-2xl font-black text-white uppercase italic mb-2 group-hover:text-blue-400 transition-colors">{s.title}</h3>
                <div className="flex items-center gap-2 text-slate-500">
                  <Radio className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{s.channel_name}</span>
                </div>
              </div>
            ))}
            {streams.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <p className="text-slate-500 font-black uppercase tracking-widest italic">Nenhuma transmissão encontrada</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center bg-slate-800/40 p-6 rounded-[2rem] border border-white/5 gap-6">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <button onClick={() => setSelectedStream(null)} className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all font-bold uppercase text-xs">Voltar</button>
                <div className="h-8 w-[1px] bg-white/10 hidden md:block" />
                <h2 className="text-xl font-black text-white uppercase italic truncate max-w-[200px] md:max-w-md">{selectedStream.title}</h2>
              </div>

              <div className="flex gap-4 w-full md:w-auto flex-wrap justify-end">
                {!isStreaming ? (
                  <button onClick={startStream} className="flex-1 md:flex-none px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 uppercase italic text-xs shadow-lg shadow-emerald-600/10 transition-all hover:scale-105 animate-pulse">
                    <Play className="w-4 h-4 fill-current" /> INICIAR LIVE
                  </button>
                ) : (
                  <button onClick={stopStream} className="flex-1 md:flex-none px-10 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 uppercase italic text-xs shadow-lg shadow-red-600/10 transition-all hover:scale-105">
                    <Square className="w-4 h-4 fill-current" /> ENCERRAR TRANSMISSÃO
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-8">

                {/* Visualizador Principal (A LIVE QUE VAI PRO AR) */}
                <div
                  className={`zk-viewer-container bg-black aspect-video rounded-3xl overflow-hidden border shadow-2xl relative group cursor-pointer transition-all ${isStreaming ? 'border-red-500/50 shadow-red-500/10' : 'border-white/10'} `}
                  onDoubleClick={() => handleDoubleClick('.zk-viewer-container')}
                  title="Duplo clique para tela cheia (Live)"
                >
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-white/50 tracking-widest">Canal Principal: ZkPremios</span>
                  </div>

                  {/* ✅ SEMPRE mostrar preview (mesmo quando não está transmitindo) */}
                  {/* Admin pode ver preview do ZK Studio mesmo com is_active=false */}
                  <MemoizedLiveViewer
                    channelName={selectedStream.channel_name || 'ZkPremios'}
                    fitMode="contain"
                    showOfflineMessage={false}
                    isAdmin={true}
                  />
                  {!isStreaming && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm pointer-events-none">
                      <div className="text-center space-y-4">
                        <div className="text-5xl animate-pulse">📡</div>
                        <p className="text-white font-black uppercase italic tracking-widest">Preview (Privado)</p>
                        <p className="text-slate-400 text-xs font-bold uppercase">Inicie a transmissão para tornar público</p>
                      </div>
                    </div>
                  )}
                  {isStreaming && (
                    <>
                      {/* Overlay VIP */}
                      {selectedStream.is_active && selectedStream.id && (
                        <VipMessageOverlay streamId={selectedStream.id} isActive={selectedStream.is_active} />
                      )}
                    </>
                  )}
                </div>

                <AdminLivePanel streamId={selectedStream.id} channelName={selectedStream.channel_name} isActive={selectedStream.is_active} />
                <PoolManager streamId={selectedStream.id} />
                <PollManager streamId={selectedStream.id} />
                <ChatModerationControls streamId={selectedStream.id} />
              </div>
              <div className="lg:col-span-4 space-y-4">
                {/* Enquete e Link Fixado - Admin pode visualizar */}
                <div className="space-y-3">
                  <PollDisplay streamId={selectedStream.id} />
                  <PinnedLinkOverlay streamId={selectedStream.id} />
                </div>
                <div className="h-[650px] overflow-hidden rounded-[2.5rem] border border-white/5 bg-slate-900 shadow-2xl">
                  <LiveChat streamId={selectedStream.id} isActive={selectedStream.is_active} />
                </div>
              </div>
            </div>
            <ModeratorManager streamId={selectedStream.id} />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminLiveStreamPage;
