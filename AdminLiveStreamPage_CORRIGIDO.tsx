import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Plus, Video, Trash2, Play, Square } from 'lucide-react';
import VideoStream from '../components/live/VideoStream';
import LiveChat from '../components/live/LiveChat';
import AdminLivePanel from '../components/live/AdminLivePanel';
import ModeratorManager from '../components/live/ModeratorManager';
import ZKViewer from '../components/ZKViewer';

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
    // Forçar scroll para o topo imediatamente
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Scroll para o topo quando selecionar um stream (mas não quando a live inicia)
  useEffect(() => {
    if (selectedStream && !isStreaming) {
      // Só fazer scroll se não estiver transmitindo (para evitar scroll quando a live inicia)
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedStream?.id]); // Usar apenas o ID para evitar scroll quando is_active muda

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
      // O ZK Studio Pro é quem realmente inicia a transmissão via Agora.io
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
      toast.success('Transmissão marcada como ativa! Certifique-se de que o ZK Studio Pro está transmitindo.');
      console.log('✅ Transmissão marcada como ativa. O ZK Studio Pro deve iniciar a transmissão via Agora.io.');
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

      // Atualizar viewer_count para 0
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
      } else if (updatedStream) {
        // Atualizar o estado local do stream selecionado
        setSelectedStream(updatedStream);
      }

      setIsStreaming(false);
      toast.success('Transmissão encerrada');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-[1400px] mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Transmissão ao Vivo</h1>
              <p className="text-sm text-slate-400">Gerencie suas transmissões</p>
            </div>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nova Transmissão
          </button>
        </div>
      </div>

      {/* Modal de Criação */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Criar Nova Transmissão</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
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
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none"
                />
                {previewLink && (
                  <p className="mt-2 text-xs text-slate-400">
                    Link: <span className="text-amber-400 font-mono">{previewLink}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descrição
                </label>
                <textarea
                  value={newStreamDescription}
                  onChange={(e) => setNewStreamDescription(e.target.value)}
                  placeholder="Descrição da transmissão..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateStreamClick}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg font-medium transition-all"
                >
                  Criar
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewStreamTitle('');
                    setNewStreamDescription('');
                    setPreviewLink('');
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação - Limpar Dados */}
      {showClearDataConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Limpar Dados da Transmissão Anterior?</h2>
            <p className="text-slate-300 mb-6">
              Existe uma transmissão anterior com dados (viewers, mensagens, etc). 
              Deseja limpar todos os dados da transmissão anterior antes de criar a nova?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowClearDataConfirm(false);
                  createStream(true); // Limpar dados
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all"
              >
                Sim, Limpar
              </button>
              <button
                onClick={() => {
                  setShowClearDataConfirm(false);
                  createStream(false); // Não limpar
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-lg font-medium transition-all"
              >
                Não, Manter
              </button>
              <button
                onClick={() => {
                  setShowClearDataConfirm(false);
                  setPreviousStreamId(null);
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <div className="max-w-[1400px] mx-auto p-4">
        {!selectedStream ? (
          /* Lista de Transmissões */
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {streams.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Video className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">Nenhuma transmissão criada ainda</p>
                <p className="text-slate-500 text-sm mt-2">
                  Clique em "Nova Transmissão" para começar
                </p>
              </div>
            ) : (
              streams.map((stream) => (
                <div
                  key={stream.id}
                  className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-amber-500/50 transition-all cursor-pointer"
                  onClick={() => setSelectedStream(stream)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{stream.title}</h3>
                      {stream.description && (
                        <p className="text-sm text-slate-400 line-clamp-2">
                          {stream.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteStream(stream.id);
                      }}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {stream.is_active ? (
                        <>
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-sm text-red-400 font-medium">AO VIVO</span>
                        </>
                      ) : (
                        <span className="text-sm text-slate-500">Inativa</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(stream.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))
            )}
            </div>
          </div>
        ) : (
          /* Painel de Transmissão */
          <div className="space-y-4 w-full max-w-[1400px] mx-auto">
            {/* Controles Superiores */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">{selectedStream.title}</h2>
                {selectedStream.description && (
                  <p className="text-sm text-slate-400 mt-1">{selectedStream.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {!isStreaming ? (
                  <button
                    onClick={startStream}
                    className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Iniciar Transmissão
                  </button>
                ) : (
                  <button
                    onClick={stopStream}
                    className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                  >
                    <Square className="w-5 h-5" />
                    Encerrar Transmissão
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedStream(null);
                    setIsStreaming(false);
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Voltar
                </button>
              </div>
            </div>

            {/* Layout Principal - Vídeo e Chat lado a lado */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Vídeo - Ocupa 2/3 da largura */}
              <div className="lg:col-span-2">
                <div className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', maxWidth: '100%' }}>
                  <VideoStream
                    channelName={selectedStream.channel_name}
                    role="audience"
                    isActive={selectedStream.is_active}
                    onStreamError={(error) => {
                      console.error('❌ Erro no VideoStream:', error);
                      toast.error(error.message || 'Erro no stream');
                    }}
                  />
                </div>
              </div>

              {/* Chat - Ocupa 1/3 da largura */}
              <div className="lg:col-span-1">
                <div className="h-full" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 300px)' }}>
                  <LiveChat streamId={selectedStream.id} isAdmin={true} />
                </div>
              </div>
            </div>

            {/* Preview da Transmissão (como os usuários veem) */}
            {isStreaming && (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-3">Preview (Como os usuários veem)</h3>
                <div className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', maxWidth: '100%' }}>
                  <ZKViewer channel={selectedStream.channel_name} />
                </div>
              </div>
            )}

            {/* Painel de Métricas e Gerenciamento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AdminLivePanel
                streamId={selectedStream.id}
                channelName={selectedStream.channel_name}
                isActive={selectedStream.is_active}
              />
              <ModeratorManager streamId={selectedStream.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLiveStreamPage;

