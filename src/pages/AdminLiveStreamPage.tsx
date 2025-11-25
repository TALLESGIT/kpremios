import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Camera, Users, Share2, Copy, Check, ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import VideoStream from '../components/live/VideoStream';

interface LiveStream {
  id: string;
  title: string;
  description?: string;
  channel_name: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  viewer_count?: number;
}

const AdminLiveStreamPage: React.FC = () => {
  const { user } = useAuth();
  const { currentUser: currentAppUser, loading: dataLoading } = useData();
  const navigate = useNavigate();
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [currentStream, setCurrentStream] = useState<LiveStream | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newStream, setNewStream] = useState({
    title: '',
    description: '',
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (dataLoading) return;
    
    if (!user) {
      navigate('/admin/login', { replace: true });
      return;
    }

    if (!(currentAppUser?.is_admin || user?.user_metadata?.is_admin)) {
      navigate('/admin/login', { replace: true });
      return;
    }

    loadStreams();
  }, [user, currentAppUser?.is_admin, dataLoading]);

  const loadStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStreams(data || []);
    } catch (error) {
      console.error('Erro ao carregar streams:', error);
      toast.error('Erro ao carregar transmissões');
    }
  };

  const createStream = async () => {
    if (!newStream.title.trim()) {
      toast.error('Digite um título para a transmissão');
      return;
    }

    try {
      const channelName = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase
        .from('live_streams')
        .insert({
          title: newStream.title,
          description: newStream.description,
          channel_name: channelName,
          is_active: false,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentStream(data);
      setIsCreating(false);
      setNewStream({ title: '', description: '' });
      toast.success('Transmissão criada! Clique em "Iniciar Transmissão" para começar.');
      loadStreams();
    } catch (error) {
      console.error('Erro ao criar stream:', error);
      toast.error('Erro ao criar transmissão');
    }
  };

  const startStream = async (stream: LiveStream) => {
    try {
      const { error } = await supabase
        .from('live_streams')
        .update({ is_active: true })
        .eq('id', stream.id);

      if (error) throw error;

      setCurrentStream({ ...stream, is_active: true });
      toast.success('🎥 Transmissão iniciada! Agora você pode começar a transmitir.');
      loadStreams();
      
      // Aguardar um pouco para o VideoStream inicializar
      setTimeout(() => {
        // O VideoStream vai iniciar automaticamente quando is_active for true
      }, 500);
    } catch (error) {
      console.error('Erro ao iniciar stream:', error);
      toast.error('Erro ao iniciar transmissão');
    }
  };

  const endStream = async () => {
    if (!currentStream) return;

    try {
      const { error } = await supabase
        .from('live_streams')
        .update({ is_active: false })
        .eq('id', currentStream.id);

      if (error) throw error;

      setCurrentStream(null);
      toast.success('Transmissão encerrada');
      loadStreams();
    } catch (error) {
      console.error('Erro ao encerrar stream:', error);
      toast.error('Erro ao encerrar transmissão');
    }
  };

  const deleteStream = async (streamId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transmissão? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('live_streams')
        .delete()
        .eq('id', streamId);

      if (error) throw error;

      // Se a transmissão deletada é a atual, limpar
      if (currentStream?.id === streamId) {
        setCurrentStream(null);
      }

      toast.success('Transmissão excluída com sucesso');
      loadStreams();
    } catch (error) {
      console.error('Erro ao excluir stream:', error);
      toast.error('Erro ao excluir transmissão');
    }
  };

  const backToList = () => {
    setCurrentStream(null);
  };

  const copyStreamLink = () => {
    if (!currentStream) return;

    const link = `${window.location.origin}/live/${currentStream.channel_name}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getStreamLink = () => {
    if (!currentStream) return '';
    return `${window.location.origin}/live/${currentStream.channel_name}`;
  };

  const isAdmin = !!(currentAppUser?.is_admin || user?.user_metadata?.is_admin);

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Botão Voltar - Fixo no topo para mobile */}
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="mb-4 md:mb-6 flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors font-medium bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 rounded-lg border border-amber-500/30 w-auto"
        >
          <ArrowLeft size={18} />
          <span className="text-sm md:text-base">Voltar</span>
        </button>

        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
            📹 Transmissão ao Vivo
          </h1>
          <p className="text-slate-300 text-sm md:text-base">
            Transmita vídeo ao vivo diretamente do seu navegador
          </p>
        </div>

        {/* Criar Nova Transmissão */}
        {!currentStream && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6 mb-6 md:mb-8 border border-white/20">
            <h2 className="text-lg md:text-xl font-bold text-white mb-4">Nova Transmissão</h2>
            
            {!isCreating ? (
              <button
                onClick={() => setIsCreating(true)}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 md:px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 w-full md:w-auto text-sm md:text-base"
              >
                <Camera size={20} />
                <span className="whitespace-nowrap">Criar Nova Transmissão</span>
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-white mb-2">Título *</label>
                  <input
                    type="text"
                    value={newStream.title}
                    onChange={(e) => setNewStream({ ...newStream, title: e.target.value })}
                    placeholder="Ex: Sorteio ao Vivo - Prêmio R$ 10.000"
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-white mb-2">Descrição (opcional)</label>
                  <textarea
                    value={newStream.description}
                    onChange={(e) => setNewStream({ ...newStream, description: e.target.value })}
                    placeholder="Descreva o que será transmitido..."
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={createStream}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 md:px-6 py-3 rounded-xl font-bold transition-all duration-300 text-sm md:text-base flex-1 sm:flex-none"
                  >
                    Criar Transmissão
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewStream({ title: '', description: '' });
                    }}
                    className="bg-slate-600 hover:bg-slate-700 text-white px-4 md:px-6 py-3 rounded-xl font-bold transition-all duration-300 text-sm md:text-base flex-1 sm:flex-none"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Player de Transmissão Ativa */}
        {currentStream && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6 mb-6 md:mb-8 border border-white/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg md:text-2xl font-bold text-white break-words">{currentStream.title}</h2>
                {currentStream.description && (
                  <p className="text-slate-300 mt-1 text-sm md:text-base break-words">{currentStream.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={backToList}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold transition-all text-sm md:text-base whitespace-nowrap flex items-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Voltar para Lista
                </button>
                {currentStream.is_active ? (
                  <button
                    onClick={endStream}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold transition-all text-sm md:text-base whitespace-nowrap"
                  >
                    Encerrar Transmissão
                  </button>
                ) : (
                  <button
                    onClick={() => deleteStream(currentStream.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold transition-all text-sm md:text-base whitespace-nowrap flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Excluir
                  </button>
                )}
              </div>
            </div>

            {/* Player de Vídeo */}
            <div className="mb-4">
              {!currentStream.is_active ? (
                <div className="bg-slate-800 rounded-lg p-8 text-center">
                  <div className="text-6xl mb-4">📹</div>
                  <h3 className="text-xl font-bold text-white mb-2">Transmissão Pronta</h3>
                  <p className="text-slate-400 mb-6">
                    Clique no botão abaixo para iniciar a transmissão ao vivo
                  </p>
                  <button
                    onClick={() => startStream(currentStream)}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 mx-auto"
                  >
                    <Camera size={20} />
                    Iniciar Transmissão
                  </button>
                </div>
              ) : (
                <VideoStream
                  channelName={currentStream.channel_name}
                  isBroadcaster={true}
                  onEnd={endStream}
                />
              )}
            </div>

            {/* Compartilhar Link */}
            <div className="bg-slate-800/50 rounded-lg p-3 md:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Share2 className="text-amber-400 flex-shrink-0" size={20} />
                <div className="flex-1 min-w-0">
                  <label className="block text-white text-xs md:text-sm mb-1">Link da Transmissão</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={getStreamLink()}
                      readOnly
                      className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 text-xs md:text-sm truncate"
                    />
                    <button
                      onClick={copyStreamLink}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm md:text-base whitespace-nowrap"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Transmissões Anteriores */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
          <h2 className="text-lg md:text-xl font-bold text-white mb-4">Transmissões Anteriores</h2>
          
          {streams.length === 0 ? (
            <p className="text-slate-400 text-sm md:text-base">Nenhuma transmissão criada ainda</p>
          ) : (
            <div className="space-y-3">
              {streams.map((stream) => (
                <div
                  key={stream.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-sm md:text-base truncate">{stream.title}</h3>
                    <p className="text-slate-400 text-xs md:text-sm">
                      {new Date(stream.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    {stream.is_active ? (
                      <>
                        <span className="px-2 md:px-3 py-1 bg-red-500 text-white rounded-full text-xs md:text-sm font-medium whitespace-nowrap">
                          AO VIVO
                        </span>
                        <button
                          onClick={() => setCurrentStream(stream)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg font-bold transition-all text-xs md:text-sm whitespace-nowrap"
                        >
                          Ver
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="px-2 md:px-3 py-1 bg-gray-500 text-white rounded-full text-xs md:text-sm font-medium whitespace-nowrap">
                          Encerrada
                        </span>
                        <button
                          onClick={() => startStream(stream)}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-3 md:px-4 py-2 rounded-lg font-bold transition-all text-xs md:text-sm whitespace-nowrap"
                        >
                          Reiniciar
                        </button>
                        <button
                          onClick={() => deleteStream(stream.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 md:px-4 py-2 rounded-lg font-bold transition-all text-xs md:text-sm whitespace-nowrap flex items-center gap-1"
                          title="Excluir transmissão"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLiveStreamPage;

