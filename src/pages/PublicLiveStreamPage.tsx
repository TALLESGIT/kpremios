import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Users, Share2, Copy, Check, Eye, ArrowLeft, Home, Maximize2, Minimize2, MessageSquare, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import VideoStream from '../components/live/VideoStream';
import LiveChat from '../components/live/LiveChat';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';

const PublicLiveStreamPage: React.FC = () => {
  const { channelName } = useParams<{ channelName: string }>();
  const navigate = useNavigate();
  const [stream, setStream] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChatInFullscreen, setShowChatInFullscreen] = useState(false);
  const [showChatMobile, setShowChatMobile] = useState(false);

  useEffect(() => {
    if (channelName) {
      loadStream();
    }
  }, [channelName]);

  // Atualizar contador de visualizações
  useEffect(() => {
    if (!stream?.id) return;

    // Incrementar contador quando usuário entra
    const incrementViewer = async () => {
      try {
        await supabase.rpc('increment_viewer_count', { stream_id: stream.id });
      } catch (error) {
        console.error('Erro ao incrementar visualizações:', error);
      }
    };

    incrementViewer();

    // Atualizar contador periodicamente
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('live_streams')
          .select('viewer_count')
          .eq('id', stream.id)
          .single();
        
        if (data) {
          setViewerCount(data.viewer_count || 0);
        }
      } catch (error) {
        console.error('Erro ao atualizar contador:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [stream?.id]);

  const loadStream = async () => {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select('*')
        .eq('channel_name', channelName)
        .single();

      if (error) throw error;

      setStream(data);
    } catch (error) {
      console.error('Erro ao carregar stream:', error);
      toast.error('Transmissão não encontrada');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Função para entrar/sair de tela cheia
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Erro ao entrar em tela cheia:', err);
        toast.error('Não foi possível entrar em tela cheia');
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        setShowChatInFullscreen(false);
      }).catch((err) => {
        console.error('Erro ao sair de tela cheia:', err);
      });
    }
  };

  // Detectar mudanças no estado de tela cheia
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        setShowChatInFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="max-w-7xl mx-auto p-4 py-8">
          {/* Botão Voltar */}
          <button
            onClick={() => navigate('/')}
            className="mb-4 md:mb-6 flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors font-medium bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 rounded-lg border border-amber-500/30 w-auto"
          >
            <ArrowLeft size={18} />
            <span className="text-sm md:text-base">Voltar</span>
          </button>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Transmissão não encontrada</h2>
            <p className="text-slate-300 mb-6">Esta transmissão não existe ou foi encerrada.</p>
            <button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 mx-auto"
            >
              <Home size={20} />
              Ir para Início
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ${isFullscreen ? 'overflow-hidden' : ''}`}>
      {!isFullscreen && <Header />}
      
      <div className="max-w-7xl mx-auto p-4 py-8">
        {/* Botão Voltar - Fixo no topo para mobile */}
        <button
          onClick={() => navigate('/')}
          className="mb-4 md:mb-6 flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors font-medium bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 rounded-lg border border-amber-500/30 w-auto"
        >
          <ArrowLeft size={18} />
          <span className="text-sm md:text-base">Voltar</span>
        </button>

        {/* Título e Info */}
        <div className="mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-white break-words">{stream.title}</h1>
            {stream.is_active && (
              <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                <div className="flex items-center gap-2 bg-red-500/20 px-3 md:px-4 py-2 rounded-full border border-red-500/50">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-400 font-bold text-xs md:text-sm">AO VIVO</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Eye size={16} className="md:w-[18px] md:h-[18px]" />
                  <span className="font-medium text-sm md:text-base">{viewerCount} assistindo</span>
                </div>
              </div>
            )}
            {!stream.is_active && (
              <div className="flex items-center gap-2 bg-gray-500/20 px-3 md:px-4 py-2 rounded-full border border-gray-500/50">
                <span className="text-gray-400 font-medium text-xs md:text-sm">Encerrada</span>
              </div>
            )}
          </div>
          {stream.description && (
            <p className="text-slate-300 text-sm md:text-base break-words">{stream.description}</p>
          )}
        </div>

        {/* Layout: Vídeo + Chat */}
        {stream.is_active ? (
          <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
            {/* Container principal do vídeo */}
            <div className={`relative ${isFullscreen ? 'w-full h-full' : 'grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6'}`}>
              {/* Player de Vídeo */}
              <div className={`${isFullscreen ? 'w-full h-full' : 'lg:col-span-2'} relative`}>
                <div className={`${isFullscreen ? 'w-full h-full p-0' : 'bg-white/10 backdrop-blur-sm rounded-2xl p-3 md:p-6 border border-white/20'} relative`}>
                  <VideoStream
                    channelName={stream.channel_name}
                    isBroadcaster={false}
                  />
                  
                  {/* Botões de controle em tela cheia */}
                  {isFullscreen && (
                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                      {/* Botão de Chat */}
                      <button
                        onClick={() => setShowChatInFullscreen(!showChatInFullscreen)}
                        className="bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all backdrop-blur-sm border border-white/20"
                        aria-label="Toggle Chat"
                      >
                        {showChatInFullscreen ? <X size={20} /> : <MessageSquare size={20} />}
                      </button>
                      
                      {/* Botão de Sair da tela cheia */}
                      <button
                        onClick={toggleFullscreen}
                        className="bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all backdrop-blur-sm border border-white/20"
                        aria-label="Sair de tela cheia"
                      >
                        <Minimize2 size={20} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat - Normal (não em tela cheia) - Desktop */}
              {!isFullscreen && (
                <div className="hidden lg:block lg:col-span-1">
                  <LiveChat streamId={stream.id} channelName={stream.channel_name} />
                </div>
              )}

              {/* Chat - Mobile (não em tela cheia) - Overlay */}
              {!isFullscreen && showChatMobile && (
                <div className="lg:hidden fixed inset-0 z-50 bg-black/95 backdrop-blur-md">
                  <div className="h-full flex flex-col">
                    {/* Header do chat mobile */}
                    <div className="flex items-center justify-between p-4 border-b border-white/20">
                      <h3 className="text-white font-bold text-lg">Chat</h3>
                      <button
                        onClick={() => setShowChatMobile(false)}
                        className="text-white hover:text-gray-300 transition-colors"
                        aria-label="Fechar Chat"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    {/* Chat content */}
                    <div className="flex-1 overflow-hidden">
                      <LiveChat streamId={stream.id} channelName={stream.channel_name} />
                    </div>
                  </div>
                </div>
              )}

              {/* Botão flutuante de chat para mobile (não em tela cheia) */}
              {!isFullscreen && (
                <button
                  onClick={() => setShowChatMobile(true)}
                  className="lg:hidden fixed bottom-6 right-6 z-40 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white p-4 rounded-full shadow-lg transition-all flex items-center gap-2 font-medium"
                  aria-label="Abrir Chat"
                >
                  <MessageSquare size={20} />
                  <span className="text-sm font-bold">Chat</span>
                </button>
              )}

              {/* Chat - Overlay em tela cheia */}
              {isFullscreen && showChatInFullscreen && (
                <div className="absolute top-0 right-0 h-full w-full sm:w-96 bg-black/95 backdrop-blur-md border-l border-white/20 z-20 animate-slide-in-right">
                  <div className="h-full flex flex-col">
                    {/* Header do chat em tela cheia */}
                    <div className="flex items-center justify-between p-4 border-b border-white/20">
                      <h3 className="text-white font-bold text-lg">Chat</h3>
                      <button
                        onClick={() => setShowChatInFullscreen(false)}
                        className="text-white hover:text-gray-300 transition-colors"
                        aria-label="Fechar Chat"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    {/* Chat content */}
                    <div className="flex-1 overflow-hidden">
                      <LiveChat streamId={stream.id} channelName={stream.channel_name} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botão de tela cheia (fora do modo tela cheia) - Desktop */}
            {!isFullscreen && (
              <div className="hidden lg:flex justify-end mb-4">
                <button
                  onClick={toggleFullscreen}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-medium"
                  aria-label="Tela cheia"
                >
                  <Maximize2 size={18} />
                  <span className="text-sm md:text-base">Tela Cheia</span>
                </button>
              </div>
            )}

            {/* Botão de tela cheia flutuante para mobile (fora do modo tela cheia) */}
            {!isFullscreen && (
              <button
                onClick={toggleFullscreen}
                className="lg:hidden fixed bottom-24 right-6 z-40 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white p-4 rounded-full shadow-lg transition-all flex items-center gap-2 font-medium"
                aria-label="Tela cheia"
              >
                <Maximize2 size={20} />
              </button>
            )}
          </div>
        ) : (
          <div className="mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-white/20">
              <div className="w-full min-h-[300px] md:min-h-[400px] bg-slate-800 rounded-lg flex items-center justify-center">
                <div className="text-center px-4">
                  <div className="text-5xl md:text-6xl mb-4">📹</div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Transmissão Encerrada</h3>
                  <p className="text-slate-400 text-sm md:text-base mb-4">
                    Esta transmissão não está mais ao vivo.
                  </p>
                  <p className="text-slate-500 text-xs md:text-sm">
                    A transmissão foi finalizada. Fique atento para as próximas lives!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compartilhar */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Share2 className="text-amber-400 flex-shrink-0" size={20} />
            <div className="flex-1 min-w-0">
              <label className="block text-white text-xs md:text-sm mb-1">Compartilhar Transmissão</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={window.location.href}
                  readOnly
                  className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 text-xs md:text-sm truncate"
                />
                <button
                  onClick={copyLink}
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

      {!isFullscreen && <Footer />}
    </div>
  );
};

export default PublicLiveStreamPage;

