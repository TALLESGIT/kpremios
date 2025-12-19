import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Plus, Video, Trash2, Play, Square, Radio } from 'lucide-react';
import LiveChat from '../components/live/LiveChat';
import AdminLivePanel from '../components/live/AdminLivePanel';
import ModeratorManager from '../components/live/ModeratorManager';
import ZKViewer from '../components/ZKViewer';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

interface LiveStream {
  is_active: any;
  id: string;
  title: string;
  description: string;
  channel_name: string;
  created_at: string;
}

// Função para gerar slug personalizado a partir do título
const generateSlugFromTitle = (title: string): string => {
  return title
    .toLowerCase()
    .normalize('NFD') // Remove acentos
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
    .replace(/[^a-z0-9\sx]/g, '') // Remove caracteres especiais, mantém letras, números, espaços e 'x'
    .replace(/\s+/g, '') // Remove espaços
    .trim();
};

const AdminLiveStreamPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newStreamTitle, setNewStreamTitle] = useState('');
  const [newStreamDescription, setNewStreamDescription] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [previewLink, setPreviewLink] = useState('');
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [previousStreamId, setPreviousStreamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStreams();
  }, []);

  // Scroll para o topo quando a página carregar (após renderização)
  useEffect(() => {
    // Forçar scroll para o topo imediatamente e após um pequeno delay
    window.scrollTo(0, 0);
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Scroll para o topo quando selecionar um stream
  useEffect(() => {
    if (selectedStream) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 100);
    }
  }, [selectedStream]);

  const loadStreams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('live_streams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStreams(data || []);

      // Se houver stream ativo, selecionar automaticamente
      const activeStream = data?.find((s) => s.is_active);
      if (activeStream) {
        setSelectedStream(activeStream);
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Erro ao carregar transmissões:', error);
      toast.error('Erro ao carregar transmissões');
    } finally {
      setLoading(false);
    }
  };

  const createStream = async (clearPreviousData: boolean = false) => {
    if (!newStreamTitle.trim()) {
      toast.error('Por favor, insira um título');
      return;
    }

    try {
      // Se solicitado, limpar dados da transmissão anterior
      if (clearPreviousData && previousStreamId) {
        const { error: clearError } = await supabase.rpc('clear_stream_data', {
          p_stream_id: previousStreamId
        });

        if (clearError) {
          console.error('Erro ao limpar dados anteriores:', clearError);
          toast.error('Erro ao limpar dados da transmissão anterior');
        } else {
          toast.success('Dados da transmissão anterior limpos');
        }
      }

      // Gerar channel_name personalizado baseado no título
      let titleSlug = generateSlugFromTitle(newStreamTitle.trim());

      // Se o slug estiver vazio, usar um padrão
      if (!titleSlug) {
        titleSlug = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      } else {
        // Verificar se já existe um channel_name com esse slug
        const { data: existingStreams } = await supabase
          .from('live_streams')
          .select('channel_name')
          .eq('channel_name', titleSlug)
          .limit(1);

        // Se já existir, adicionar um sufixo numérico
        if (existingStreams && existingStreams.length > 0) {
          let counter = 1;
          let newSlug = `${titleSlug}${counter}`;

          while (true) {
            const { data: checkStreams } = await supabase
              .from('live_streams')
              .select('channel_name')
              .eq('channel_name', newSlug)
              .limit(1);

            if (!checkStreams || checkStreams.length === 0) {
              titleSlug = newSlug;
              break;
            }
            counter++;
            newSlug = `${titleSlug}${counter}`;
          }
        }
      }

      const channelName = titleSlug;

      const { data, error } = await supabase
        .from('live_streams')
        .insert({
          title: newStreamTitle.trim(),
          description: newStreamDescription.trim() || null,
          channel_name: channelName,
          is_active: false,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Transmissão criada com sucesso!');
      setNewStreamTitle('');
      setNewStreamDescription('');
      setPreviewLink('');
      setIsCreating(false);
      setShowClearDataConfirm(false);
      setPreviousStreamId(null);
      await loadStreams();
      setSelectedStream(data);
    } catch (error: any) {
      console.error('Erro ao criar transmissão:', error);
      toast.error(error.message || 'Erro ao criar transmissão');
    }
  };

  const handleCreateStreamClick = async () => {
    if (!newStreamTitle.trim()) {
      toast.error('Por favor, insira um título');
      return;
    }

    // Verificar se há transmissões anteriores com dados
    if (streams.length > 0) {
      // Verificar se alguma transmissão anterior tem dados (viewers, mensagens, etc)
      const hasPreviousData = streams.some(stream => {
        // Verificar se tem sessões ou mensagens
        return true; // Por enquanto sempre pergunta, pode melhorar depois
      });

      if (hasPreviousData) {
        // Guardar ID da primeira transmissão anterior para limpar
        setPreviousStreamId(streams[0].id);
        setShowClearDataConfirm(true);
        return;
      }
    }

    // Se não há dados anteriores, criar diretamente
    await createStream(false);
  };

  const startStream = async () => {
    if (!selectedStream) return;

    try {
      // Atualizar banco de dados para marcar a transmissão como ativa
      // IMPORTANTE: O ZK Studio Pro é quem realmente inicia a transmissão via Agora.io
      // O site apenas recebe o stream como "audience" (espectador)
      const { data: updatedStream, error } = await supabase
        .from('live_streams')
        .update({ is_active: true })
        .eq('id', selectedStream.id)
        .select()
        .single();

      if (error) throw error;

      // --- SINCRONIZAÇÃO ZK TV ---
      // Atualizar automaticamente as configurações da ZK TV
      try {
        const liveUrl = `${window.location.origin}/live/${selectedStream.channel_name}`;

        // Primeiro, tentar encontrar a configuração existente
        const { data: settings } = await supabase
          .from('cruzeiro_settings')
          .select('id')
          .single();

        await supabase
          .from('cruzeiro_settings')
          .upsert({
            id: settings?.id, // Se existir, mantém o ID
            live_url: liveUrl,
            is_live: true,
            updated_at: new Date().toISOString()
          });

        console.log('✅ ZK TV Sincronizada: Link atualizado para', liveUrl);
      } catch (syncError) {
        console.error('Erro ao sincronizar com ZK TV:', syncError);
        // Não bloqueia a live se a sincronização falhar, mas avisa no console
      }
      // -------------------------

      // Atualizar o estado local do stream selecionado
      if (updatedStream) {
        setSelectedStream(updatedStream);
      }

      setIsStreaming(true);
      toast.success('Transmissão ativa! O ZK TV foi atualizado automaticamente.');
      console.log('✅ Transmissão marcada como ativa. Canal:', selectedStream.channel_name);
    } catch (error: any) {
      console.error('Erro ao atualizar transmissão:', error);
      toast.error(error.message || 'Erro ao atualizar transmissão');
    }
  };

  const stopStream = async () => {
    if (!selectedStream) return;

    try {
      // Primeiro, encerrar todas as sessões ativas
      const { error: endSessionsErr } = await supabase.rpc(
        'end_all_active_viewer_sessions',
        { p_stream_id: selectedStream.id }
      );

      if (endSessionsErr) {
        console.error('Erro ao encerrar sessões:', endSessionsErr);
      }

      // Limpar sessões antigas e duplicadas
      await supabase.rpc('cleanup_inactive_viewer_sessions');
      await supabase.rpc('cleanup_duplicate_viewer_sessions', {
        p_stream_id: selectedStream.id
      });

      // Atualizar viewer_count para 0 e marcar como inativo
      // IMPORTANTE: Usar .select() para garantir que o Supabase propague a mudança via Realtime imediatamente
      const { data: updatedStream, error: updateError } = await supabase
        .from('live_streams')
        .update({
          is_active: false,
          viewer_count: 0
        })
        .eq('id', selectedStream.id)
        .select()
        .single();

      if (updateError) {
        console.error('Erro ao atualizar stream:', updateError);
        toast.error('Erro ao encerrar transmissão');
        return;
      }

      // --- SINCRONIZAÇÃO ZK TV ---
      // Desativar automaticamente o indicador "AO VIVO" na ZK TV
      try {
        const { data: settings } = await supabase
          .from('cruzeiro_settings')
          .select('id')
          .single();

        if (settings) {
          await supabase
            .from('cruzeiro_settings')
            .update({
              is_live: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', settings.id);
          console.log('✅ ZK TV Sincronizada: Status "Offline" atualizado.');
        }
      } catch (syncError) {
        console.error('Erro ao sincronizar com ZK TV na parada:', syncError);
      }
      // -------------------------

      if (updatedStream) {
        // Atualizar o estado local do stream selecionado
        setSelectedStream(updatedStream);
        console.log('🛑 Transmissão encerrada - Todos os viewers serão notificados imediatamente via Realtime');
      }

      setIsStreaming(false);
      toast.success('Transmissão encerrada - ZK TV atualizada para Offline');
      await loadStreams();
    } catch (error) {
      console.error('Erro ao encerrar transmissão:', error);
      toast.error('Erro ao encerrar transmissão');
    }
  };

  const deleteStream = async (streamId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta transmissão?')) return;

    try {
      const { error } = await supabase
        .from('live_streams')
        .delete()
        .eq('id', streamId);

      if (error) throw error;

      if (selectedStream?.id === streamId) {
        setSelectedStream(null);
        setIsStreaming(false);
      }

      toast.success('Transmissão deletada');
      await loadStreams();
    } catch (error) {
      console.error('Erro ao deletar transmissão:', error);
      toast.error('Erro ao deletar transmissão');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900 font-sans">
        <Header />
        <main className="flex-grow flex items-center justify-center relative overflow-hidden">
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-[500px] bg-blue-600/10 blur-[100px]" />
            <div className="absolute bottom-0 right-0 w-full h-[500px] bg-blue-900/20 blur-[100px]" />
          </div>
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20 animate-pulse">
              <Radio className="h-8 w-8 text-blue-400" />
            </div>
            <p className="text-blue-200/60 text-lg font-medium animate-pulse">Carregando transmissões...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 font-sans">
      <Header />
      <main className="flex-grow w-full relative overflow-hidden pt-12 lg:pt-20">
        {/* Decorative Background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-900/20 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 px-4">
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all border border-white/10"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-4xl lg:text-5xl font-black text-white mb-2 tracking-tight italic uppercase">
                  Transmissão <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">AO VIVO</span>
                </h1>
                <p className="text-blue-200/60 text-lg font-medium">
                  Gerencie e monitore suas lives em tempo real.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black rounded-[2rem] transition-all duration-300 shadow-xl shadow-blue-600/20 hover:-translate-y-1 active:scale-[0.98] uppercase tracking-wider italic text-sm"
            >
              <Plus className="w-5 h-5 mr-3 fill-current" />
              Nova Transmissão
            </button>
          </div>

          {/* Modal de Criação */}
          {isCreating && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
              <div className="glass-panel p-0 rounded-[2.5rem] border border-white/10 bg-slate-800 w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-slate-800/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      <Radio className="h-6 w-6 text-blue-400" />
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase italic">Nova Live</h3>
                  </div>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewStreamTitle('');
                      setNewStreamDescription('');
                    }}
                    className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-slate-400"
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-200/40 uppercase tracking-[0.2em] ml-1">Título da Transmissão</label>
                    <input
                      type="text"
                      value={newStreamTitle}
                      onChange={(e) => {
                        setNewStreamTitle(e.target.value);
                        const slug = generateSlugFromTitle(e.target.value);
                        setPreviewLink(slug ? `${window.location.origin}/live/${slug}` : '');
                      }}
                      className="w-full px-5 py-4 bg-slate-900/50 border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold placeholder-slate-600"
                      placeholder="Ex: Cruzeiro vs Atletico MG"
                    />
                    {previewLink && (
                      <p className="px-2 text-[10px] text-blue-400/80 font-bold truncate">
                        Link: {previewLink}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-200/40 uppercase tracking-[0.2em] ml-1">Descrição</label>
                    <textarea
                      value={newStreamDescription}
                      onChange={(e) => setNewStreamDescription(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-900/50 border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium resize-none placeholder-slate-600"
                      rows={3}
                      placeholder="Sobre o que é esta transmissão?"
                    />
                  </div>
                </div>

                <div className="p-8 bg-slate-900/30 border-t border-white/5 flex gap-4">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white font-black rounded-2xl transition-all uppercase text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateStreamClick}
                    className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-600/25 uppercase italic text-xs tracking-wider"
                  >
                    Criar Transmissão
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Confirmação - Limpar Dados */}
          {showClearDataConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md border-2 border-blue-200 shadow-2xl"
              >
                <h2 className="text-xl font-black text-gray-900 mb-4">Limpar Dados da Transmissão Anterior?</h2>
                <p className="text-gray-700 mb-6 font-semibold">
                  Existe uma transmissão anterior com dados (viewers, mensagens, etc).
                  Deseja limpar todos os dados da transmissão anterior antes de criar a nova?
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowClearDataConfirm(false);
                      createStream(true); // Limpar dados
                    }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-bold transition-all duration-200 shadow-lg"
                  >
                    Sim, Limpar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowClearDataConfirm(false);
                      createStream(false); // Não limpar
                    }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg font-bold transition-all duration-200 shadow-lg"
                  >
                    Não, Manter
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowClearDataConfirm(false);
                      setPreviousStreamId(null);
                    }}
                    className="px-4 py-3 border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-bold transition-all duration-200"
                  >
                    Cancelar
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Conteúdo Principal */}
          {!selectedStream ? (
            <div className="max-w-7xl mx-auto pb-20">
              {streams.length === 0 ? (
                <div className="glass-panel p-20 rounded-[3rem] text-center border border-white/5 bg-slate-800/50 backdrop-blur-xl max-w-2xl mx-auto">
                  <div className="w-24 h-24 bg-blue-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-blue-500/20">
                    <Video className="h-12 w-12 text-blue-400" />
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4 italic uppercase">Nenhuma live criada</h3>
                  <p className="text-blue-200/60 mb-10 text-lg">Comece criando sua primeira transmissão ao vivo para interagir com seus usuários.</p>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Criar Primeira Live
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
                  {streams.map((stream) => (
                    <div
                      key={stream.id}
                      onClick={() => setSelectedStream(stream)}
                      className="glass-panel group relative flex flex-col h-full rounded-[2.5rem] border border-white/5 bg-slate-800/40 backdrop-blur-md hover:bg-slate-800/60 hover:border-white/10 transition-all duration-500 cursor-pointer overflow-hidden"
                    >
                      {/* Status Overlay */}
                      <div className="absolute top-6 right-6 z-20">
                        {stream.is_active ? (
                          <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)] backdrop-blur-md animate-pulse">
                            ● AO VIVO
                          </span>
                        ) : (
                          <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-slate-500/10 text-slate-400 border border-slate-500/20 backdrop-blur-md">
                            Inativa
                          </span>
                        )}
                      </div>

                      <div className="p-8 pb-0 flex-grow">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-600 group-hover:border-blue-500 transition-all duration-500">
                            <Video className="h-6 w-6 text-blue-400 group-hover:text-white transition-colors" />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteStream(stream.id);
                              }}
                              className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-2xl font-black text-white mb-2 leading-tight uppercase italic group-hover:text-blue-400 transition-colors">{stream.title}</h3>
                        <p className="text-slate-400 text-sm font-medium line-clamp-2 mb-8">{stream.description || 'Sem descrição.'}</p>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-white/5 mb-8">
                          <div className="flex items-center gap-3">
                            <Radio className="w-4 h-4 text-blue-400" />
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{stream.channel_name}</span>
                          </div>
                          <span className="text-[10px] font-black text-slate-500 uppercase">
                            {new Date(stream.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="p-8 pt-0 mt-auto">
                        <button className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl border border-white/5 transition-all text-sm uppercase italic">
                          Abrir Painel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8 w-full pb-20">
              {/* Controles Superiores */}
              <div className="glass-panel p-6 rounded-[2rem] border border-white/5 bg-slate-800/40 backdrop-blur-md">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="w-full md:w-auto flex-1 max-w-lg">
                    <div className="relative">
                      <Radio className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                      <input
                        type="text"
                        value={selectedStream.channel_name}
                        readOnly
                        className="w-full pl-12 pr-4 py-4 bg-slate-900 border border-white/5 text-blue-400 rounded-2xl font-black text-sm uppercase tracking-widest focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {!isStreaming ? (
                      <button
                        onClick={startStream}
                        className="flex-1 md:flex-none px-10 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/10 uppercase italic text-sm"
                      >
                        <Play className="w-5 h-5 fill-current" />
                        Iniciar Transmissão
                      </button>
                    ) : (
                      <button
                        onClick={stopStream}
                        className="flex-1 md:flex-none px-10 py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-red-600/10 uppercase italic text-sm"
                      >
                        <Square className="w-5 h-5 fill-current" />
                        Encerrar Transmissão
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedStream(null);
                        setIsStreaming(false);
                      }}
                      className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-black rounded-2xl transition-all text-sm uppercase"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              </div>

              {/* Layout Principal - Vídeo e Chat */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4">
                <div className="lg:col-span-2">
                  <div
                    ref={videoContainerRef}
                    className="glass-panel rounded-[2.5rem] overflow-hidden relative shadow-2xl border border-white/10 bg-black aspect-video group"
                    onDoubleClick={() => {
                      const element = videoContainerRef.current;
                      if (!document.fullscreenElement) element?.requestFullscreen?.();
                      else document.exitFullscreen?.();
                    }}
                  >
                    <ZKViewer key="zkpremios-admin-preview" channel="ZkPremios" muteAudio={true} />
                    <div className="absolute top-6 left-6 z-30 flex items-center gap-3">
                      <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-black/60 text-white border border-white/10 backdrop-blur-md">
                        Preview Admin
                      </span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1">
                  <div className="glass-panel h-full rounded-[2.5rem] border border-white/5 bg-slate-800/40 backdrop-blur-md overflow-hidden min-h-[500px]">
                    <LiveChat streamId={selectedStream.id} isAdmin={true} />
                  </div>
                </div>
              </div>

              {/* Painel de Métricas e Gerenciamento */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4">
                <div className="glass-panel rounded-[2.5rem] border border-white/5 bg-slate-800/40 backdrop-blur-md overflow-hidden">
                  <AdminLivePanel
                    streamId={selectedStream.id}
                    channelName={selectedStream.channel_name}
                    isActive={selectedStream.is_active}
                  />
                </div>
                <div className="glass-panel rounded-[2.5rem] border border-white/5 bg-slate-800/40 backdrop-blur-md overflow-hidden">
                  <ModeratorManager streamId={selectedStream.id} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminLiveStreamPage;

