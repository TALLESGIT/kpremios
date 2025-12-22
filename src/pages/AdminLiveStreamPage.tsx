import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Trash2, Play, Square, Radio } from 'lucide-react';
import LiveChat from '../components/live/LiveChat';
import AdminLivePanel from '../components/live/AdminLivePanel';
import ModeratorManager from '../components/live/ModeratorManager';
import ChatModerationControls from '../components/live/ChatModerationControls';
import ZKViewer from '../components/ZKViewer';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

interface LiveStream {
  is_active: boolean;
  id: string;
  title: string;
  description: string;
  channel_name: string;
  created_at: string;
}

const generateSlugFromTitle = (title: string): string => {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '') // Mantém letras, números, espaços e hifens
    .replace(/\s+/g, '-')       // Espaços viram hifens
    .replace(/-+/g, '-')        // Remove hifens duplicados
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
  const handleDoubleClick = () => {
    const videoContainer = document.querySelector('.zk-viewer-container');
    if (!videoContainer) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      (videoContainer as HTMLElement).requestFullscreen();
    }
  };

  useEffect(() => {
    loadStreams();
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
        .ilike('channel_name', `${baseSlug}%`);

      if (existing && existing.length > 0) {
        finalSlug = `${baseSlug}-${existing.length + 1}`;
      }

      const { data, error } = await supabase.from('live_streams').insert({
        title: newStreamTitle.trim(),
        channel_name: finalSlug,
        is_active: false,
        created_by: user?.id
      }).select().single();

      if (error) throw error;
      if (clear && streams.length > 0) await supabase.rpc('clear_stream_data', { p_stream_id: streams[0].id });

      toast.success('Live criada!');
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
      const { data, error } = await supabase.from('live_streams').update({ is_active: true }).eq('id', selectedStream.id).select().single();
      if (error) throw error;
      setIsStreaming(true);
      setSelectedStream(data); // Atualizar estado local instantaneamente
      toast.success('Ao vivo!');
    } catch (err) {
      toast.error('Erro ao iniciar');
    }
  };

  const stopStream = async () => {
    if (!selectedStream) return;
    try {
      // Limpar todas as mensagens do chat ao encerrar
      const { error: cleanupError } = await supabase.rpc('cleanup_chat_on_stream_end', {
        p_stream_id: selectedStream.id
      });
      
      if (cleanupError) {
        console.error('Erro ao limpar chat:', cleanupError);
      }
      
      await supabase.from('live_streams').update({ is_active: false, viewer_count: 0 }).eq('id', selectedStream.id);
      await supabase.rpc('end_all_active_viewer_sessions', { p_stream_id: selectedStream.id });
      const { data } = await supabase.from('live_streams').select('*').eq('id', selectedStream.id).single();
      setIsStreaming(false);
      if (data) setSelectedStream(data); // Atualizar estado local instantaneamente
      toast.success('Live encerrada e chat limpo');
    } catch (err) {
      toast.error('Erro ao encerrar');
    }
  };

  const deleteStream = async (id: string) => {
    if (!confirm('Deseja deletar?')) return;
    await supabase.from('live_streams').delete().eq('id', id);
    if (selectedStream?.id === id) setSelectedStream(null);
    await loadStreams();
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Header />
      <main className="flex-grow pt-24 px-4 max-w-5xl mx-auto w-full pb-20">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Central de Transmissão</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Gerencie suas lives ao vivo</p>
          </div>
          <button onClick={() => setIsCreating(true)} className="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:scale-105 transition-all uppercase italic text-sm">Nova Live</button>
        </div>

        {isCreating && (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
            <div className="bg-slate-800 p-8 rounded-[2.5rem] border border-white/10 w-full max-w-md shadow-2xl">
              <h3 className="text-2xl font-black text-white uppercase italic mb-8">Configurar Live</h3>
              <div className="space-y-4">
                <input type="text" value={newStreamTitle} onChange={(e) => setNewStreamTitle(e.target.value)} placeholder="Título da Live" className="w-full px-6 py-4 bg-slate-900 border border-white/5 rounded-2xl text-white font-bold" />
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setIsCreating(false)} className="py-4 bg-slate-700 text-white rounded-2xl font-black uppercase text-xs">Cancelar</button>
                  <button onClick={() => createStream(true)} className="py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs italic">Criar Live</button>
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
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${s.is_active ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-slate-400'}`}>
                    {s.is_active ? '● Ao Vivo' : 'Offline'}
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

              <div className="flex gap-4 w-full md:w-auto">
                {!isStreaming ? (
                  <button onClick={startStream} className="flex-1 md:flex-none px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 uppercase italic text-xs shadow-lg shadow-emerald-600/10">
                    <Play className="w-4 h-4 fill-current" /> Iniciar Live
                  </button>
                ) : (
                  <button onClick={stopStream} className="flex-1 md:flex-none px-10 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 uppercase italic text-xs shadow-lg shadow-red-600/10">
                    <Square className="w-4 h-4 fill-current" /> Encerrar Live
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-8">
                <div
                  className="zk-viewer-container bg-black aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative group cursor-pointer"
                  onDoubleClick={handleDoubleClick}
                  title="Duplo clique para tela cheia"
                >
                  <ZKViewer
                    channel={selectedStream.channel_name}
                    fitMode="contain"
                    enabled={true}
                    muteAudio={true}
                  />
                  {!isStreaming && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                      <div className="text-center">
                        <p className="text-white text-lg font-bold mb-2">Preview do ZK Studio</p>
                        <p className="text-slate-400 text-sm">Clique em "Iniciar Live" para liberar para os usuários</p>
                      </div>
                    </div>
                  )}
                </div>
                <AdminLivePanel streamId={selectedStream.id} channelName={selectedStream.channel_name} isActive={selectedStream.is_active} />
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
