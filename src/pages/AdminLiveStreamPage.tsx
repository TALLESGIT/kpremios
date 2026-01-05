import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Trash2, Play, Square, Radio } from 'lucide-react';
import LiveChat from '../components/live/LiveChat';
import AdminLivePanel from '../components/live/AdminLivePanel';
import ModeratorManager from '../components/live/ModeratorManager';
import ChatModerationControls from '../components/live/ChatModerationControls';
import PollManager from '../components/live/PollManager';
import { LiveViewer } from '../components/LiveViewer';
import LivePlayerWithHeader from '../components/LivePlayerWithHeader';
import VipMessageOverlay from '../components/live/VipMessageOverlay';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import PoolManager from '../components/pool/PoolManager';
import { updateLiveTitle } from '../services/liveTitleService';

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

    // Listener Realtime para atualizar automaticamente quando ZK Studio ativar a live
    let lastUpdateTime = 0;
    const DEBOUNCE_MS = 2000; // Evitar atualizações muito frequentes

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
          const now = Date.now();

          // Debounce: evitar atualizações muito frequentes
          if (now - lastUpdateTime < DEBOUNCE_MS) {
            console.log('⏭️ AdminLiveStreamPage: Ignorando atualização (debounce)');
            return;
          }

          lastUpdateTime = now;
          console.log('📡 AdminLiveStreamPage: Mudança detectada na live stream:', payload.eventType);

          // Se a live foi ativada, atualizar estado diretamente sem recarregar tudo
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedStream = payload.new as LiveStream;

            // Atualizar apenas se realmente mudou algo relevante
            if (updatedStream.is_active && (!selectedStream || selectedStream.id !== updatedStream.id || !selectedStream.is_active)) {
              console.log('✅ AdminLiveStreamPage: Live ativada, atualizando estado');
              setSelectedStream(updatedStream);
              setIsStreaming(true);

              // Atualizar na lista de streams também
              setStreams(prev => {
                const updated = prev.map(s => s.id === updatedStream.id ? updatedStream : s);
                return updated;
              });

              toast.success('Live ativada pelo ZK Studio!', { duration: 3000 });
            } else if (!updatedStream.is_active && selectedStream?.id === updatedStream.id) {
              // Live foi desativada
              setIsStreaming(false);
              setSelectedStream(updatedStream);
            }
          } else {
            // Para outros eventos, recarregar streams (mas com debounce)
            setTimeout(() => {
              loadStreams();
            }, 500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStreams = async () => {
    try {
      setLoading(true);
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
      // Atualizar título baseado no jogo do Cruzeiro antes de iniciar
      await updateLiveTitle(selectedStream.id, selectedStream.channel_name);

      console.log(`Usando streamId: ${selectedStream.id}`);

      const { data, error } = await supabase
        .from('live_streams')
        .update({
          is_active: true,
          started_at: new Date().toISOString()
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
    if (!confirm('Tem certeza que deseja excluir esta live?')) return;
    await supabase.from('live_streams').delete().eq('id', id);
    if (selectedStream?.id === id) setSelectedStream(null);
    await loadStreams();
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
                    <div className={`px - 2 py - 1 rounded text - [10px] font - black uppercase ${isStreaming ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-600 text-slate-300'} `}>
                      {isStreaming ? '● AO VIVO' : 'OFFLINE'}
                    </div>
                    <span className="text-[10px] uppercase font-bold text-white/50 tracking-widest">Canal Principal: ZkPremios</span>
                  </div>

                  {!isStreaming ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                      <div className="text-center space-y-4">
                        <div className="text-5xl animate-pulse">📡</div>
                        <p className="text-white font-black uppercase italic tracking-widest">Aguardando Início</p>
                        <p className="text-slate-400 text-xs font-bold uppercase">Abra o ZK Studio para transmitir</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* LiveViewer (HLS) quando ESTÁ transmitindo - mostra o que os usuários veem */}
                      {/* IMPORTANTE: Admin vê exatamente o que os usuários veem (título + botão copiar) */}
                      {selectedStream.hls_url ? (
                        <LivePlayerWithHeader
                          title={selectedStream.title || 'ZK TV'}
                          hlsUrl={selectedStream.hls_url}
                          isLive={selectedStream.is_active}
                          streamId={selectedStream.id}
                          channelName={selectedStream.channel_name}
                        />
                      ) : (
                        <LiveViewer
                          channelName={selectedStream.channel_name}
                          fitMode="contain"
                          showOfflineMessage={false}
                        />
                      )}
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
              <div className="lg:col-span-4 h-[650px] overflow-hidden rounded-[2.5rem] border border-white/5 bg-slate-900 shadow-2xl">
                <LiveChat streamId={selectedStream.id} isActive={selectedStream.is_active} />
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
