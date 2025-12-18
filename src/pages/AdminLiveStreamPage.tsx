import React, { useState, useEffect } from 'react';
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
  id: string;
  title: string;
  description: string;
  channel_name: string;
  is_active: boolean;
  viewer_count: number;
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

      // Atualizar o estado local do stream selecionado
      if (updatedStream) {
        setSelectedStream(updatedStream);
      }

      setIsStreaming(true);
      toast.success('Transmissão ativa! O ZK Studio Pro deve estar transmitindo no canal: ' + selectedStream.channel_name);
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

      if (updatedStream) {
        // Atualizar o estado local do stream selecionado
        setSelectedStream(updatedStream);
        console.log('🛑 Transmissão encerrada - Todos os viewers serão notificados imediatamente via Realtime');
      }

      setIsStreaming(false);
      toast.success('Transmissão encerrada - Todos os viewers serão desconectados');
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
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl mb-4 shadow-lg"
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-4xl font-black text-white"
              >
                ZK
              </motion.span>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-gray-700 text-xl font-semibold"
            >
              Carregando transmissões...
            </motion.p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <Header />
      <main className="flex-grow w-full py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-6 mb-6"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
              <div className="mb-4 sm:mb-0">
                <div className="flex items-center space-x-3 mb-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/admin/dashboard')}
                    className="text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </motion.button>
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg"
                  >
                    <Radio className="h-6 w-6 text-white" />
                  </motion.div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                      Transmissão ao Vivo
                    </h1>
                    <p className="text-gray-600 text-sm font-semibold">
                      Gerencie suas transmissões
                    </p>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nova Transmissão
              </motion.button>
            </div>
          </motion.div>

          {/* Modal de Criação */}
          {isCreating && (
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
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Radio className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900">Criar Nova Transmissão</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Título *
                    </label>
                    <input
                      type="text"
                      value={newStreamTitle}
                      onChange={(e) => {
                        setNewStreamTitle(e.target.value);
                        // Atualizar preview do link em tempo real
                        const slug = generateSlugFromTitle(e.target.value);
                        if (slug) {
                          setPreviewLink(`${window.location.origin}/live/${slug}`);
                        } else {
                          setPreviewLink('');
                        }
                      }}
                      placeholder="Ex: Cruzeiro x Santos"
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {previewLink && (
                      <p className="mt-2 text-xs text-gray-600 font-semibold">
                        Link: <span className="text-blue-600 font-mono">{previewLink}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Descrição
                    </label>
                    <textarea
                      value={newStreamDescription}
                      onChange={(e) => setNewStreamDescription(e.target.value)}
                      placeholder="Descrição da transmissão..."
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCreateStreamClick}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-bold transition-all duration-200 shadow-lg"
                    >
                      Criar
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setIsCreating(false);
                        setNewStreamTitle('');
                        setNewStreamDescription('');
                        setPreviewLink('');
                      }}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-bold transition-all duration-200"
                    >
                      Cancelar
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
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
            /* Lista de Transmissões */
            <div className="max-w-4xl mx-auto">
              {streams.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-8 text-center"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <Video className="h-8 w-8 text-blue-600" />
                  </motion.div>
                  <p className="text-gray-900 text-lg font-black mb-2">Nenhuma transmissão criada ainda</p>
                  <p className="text-gray-600 text-sm font-semibold">
                    Clique em "Nova Transmissão" para começar
                  </p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {streams.map((stream, index) => (
                    <motion.div
                      key={stream.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -5 }}
                      className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
                      onClick={() => setSelectedStream(stream)}
                    >
                      {/* Header */}
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 border-b-2 border-blue-300">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-black text-white mb-1">{stream.title}</h3>
                            {stream.description && (
                              <p className="text-sm text-blue-100 line-clamp-2">
                                {stream.description}
                              </p>
                            )}
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteStream(stream.id);
                            }}
                            className="text-white hover:text-red-200 transition-colors p-2 bg-white/20 rounded-lg"
                          >
                            <Trash2 className="w-5 h-5" />
                          </motion.button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {stream.is_active ? (
                              <>
                                <motion.div
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                  className="w-3 h-3 bg-red-500 rounded-full"
                                ></motion.div>
                                <span className="text-sm text-white font-bold">AO VIVO</span>
                              </>
                            ) : (
                              <span className="text-sm text-blue-100 font-semibold">Inativa</span>
                            )}
                          </div>
                          <span className="text-xs text-blue-100 font-semibold">
                            {new Date(stream.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Painel de Transmissão */
            <div className="space-y-6 w-full">
              {/* Controles Superiores */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-4 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={selectedStream.channel_name}
                      readOnly
                      className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-200 text-gray-900 rounded-lg font-bold text-sm sm:text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 w-full sm:w-auto">
                    {!isStreaming ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={startStream}
                        className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base"
                      >
                        <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="whitespace-nowrap">Iniciar Transmissão</span>
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={stopStream}
                        className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base"
                      >
                        <Square className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="whitespace-nowrap">Encerrar Transmissão</span>
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedStream(null);
                        setIsStreaming(false);
                      }}
                      className="px-4 py-2 sm:py-3 border-2 border-blue-300 bg-white hover:bg-blue-50 text-gray-700 rounded-lg font-bold transition-all duration-200 text-sm sm:text-base whitespace-nowrap"
                    >
                      Voltar
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* Layout Principal - Vídeo e Chat lado a lado */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                {/* Vídeo - Ocupa 2/3 da largura */}
                <div className="lg:col-span-2">
                  <div 
                    className="bg-black rounded-2xl overflow-hidden relative shadow-2xl border-2 border-blue-200" 
                    style={{ aspectRatio: '16/9', maxWidth: '100%' }}
                    onDoubleClick={() => {
                      // Duplo clique para fullscreen no admin também
                      const element = document.querySelector('.bg-black.rounded-2xl') as HTMLElement;
                      if (!document.fullscreenElement) {
                        element?.requestFullscreen?.();
                      } else {
                        document.exitFullscreen?.();
                      }
                    }}
                  >
                    {/* Admin SEMPRE vê o conteúdo (para preview antes de ir ao vivo) */}
                    {/* MUTAR ÁUDIO: Admin já tem áudio local do ZK Studio, não precisa ouvir o áudio do site (evita duplicação/delay) */}
                    <ZKViewer key="zkpremios-admin-preview" channel="ZkPremios" muteAudio={true} />
                  </div>
                </div>

                {/* Chat - Ocupa 1/3 da largura */}
                <div className="lg:col-span-1">
                  <div className="h-full bg-white rounded-2xl shadow-lg border-2 border-blue-200 overflow-hidden" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 300px)' }}>
                    <LiveChat streamId={selectedStream.id} isAdmin={true} />
                  </div>
                </div>
              </motion.div>

              {/* Painel de Métricas e Gerenciamento */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 overflow-hidden">
                  <AdminLivePanel
                    streamId={selectedStream.id}
                    channelName={selectedStream.channel_name}
                    isActive={selectedStream.is_active}
                  />
                </div>
                <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 overflow-hidden">
                  <ModeratorManager streamId={selectedStream.id} />
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdminLiveStreamPage;

