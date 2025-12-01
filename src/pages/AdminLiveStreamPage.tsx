import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Camera, Users, Share2, Copy, Check, ArrowLeft, Trash2, ChevronDown, ChevronUp, Settings as SettingsIcon, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import VideoStream from '../components/live/VideoStream';
import StreamStudio from '../components/live/StreamStudio';
import CameraSelector from '../components/live/CameraSelector';
import { useStreamStudioSync } from '../hooks/useStreamStudioSync';

interface LiveStream {
  id: string;
  title: string;
  description?: string;
  channel_name: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  viewer_count?: number;
  overlay_ad_url?: string | null;
  overlay_ad_enabled?: boolean;
  camera_pip_x?: number;
  camera_pip_y?: number;
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
    customChannelName: '',
  });
  const [autoGenerateSlug, setAutoGenerateSlug] = useState(true); // Controla se deve gerar automaticamente
  
  // Estado para seleção de câmera (OBS Virtual Camera, etc)
  const [selectedCameraDeviceId, setSelectedCameraDeviceId] = useState<string | undefined>(() => {
    // Tentar carregar preferência salva
    const saved = localStorage.getItem('selectedCameraDeviceId');
    return saved || undefined;
  });
  const [selectedCameraLabel, setSelectedCameraLabel] = useState<string>(() => {
    // Tentar carregar label salvo
    const saved = localStorage.getItem('selectedCameraLabel');
    return saved || '';
  });
  
  // Verificar se a câmera selecionada é OBS Virtual Camera
  const isOBSCamera = selectedCameraLabel.toLowerCase().includes('obs') || 
                      selectedCameraLabel.toLowerCase().includes('virtual');
  const [copied, setCopied] = useState(false);
  
  // Estados para gerenciar propagandas e slideshow
  const [adImages, setAdImages] = useState<Array<{id: string; url: string; enabled: boolean; duration?: number}>>([]);
  const [overlayAd, setOverlayAd] = useState<{url: string; enabled: boolean} | null>(null);
  const [showAdManager, setShowAdManager] = useState(false);
  const [showStats, setShowStats] = useState(false); // Estado para mostrar/ocultar estatísticas
  const [showStreamStudio, setShowStreamStudio] = useState(false); // Estado para o Stream Studio
  const [newAdImage, setNewAdImage] = useState<{url: string; file: File | null; duration: number}>({url: '', file: null, duration: 5});
  const [newOverlayAd, setNewOverlayAd] = useState<{url: string; file: File | null}>({url: '', file: null});
  
  // Atalho de teclado para abrir Stream Studio
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Shift+S para abrir Stream Studio
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (isOBSCamera) {
          toast.error('⚠️ Stream Studio está desabilitado quando usando OBS Virtual Camera. Configure tudo no OBS Studio.', {
            duration: 3000,
          });
          return;
        }
        if (currentStream && !showStreamStudio) {
          setShowStreamStudio(true);
          toast.success('🎬 Stream Studio aberto!', {
            duration: 1500,
            style: {
              background: '#7c3aed',
              color: '#fff',
              fontWeight: 'bold'
            }
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentStream, showStreamStudio, isOBSCamera]);
  
  // Sincronizar Stream Studio com transmissão ao vivo
  const { activeScene, loading: sceneLoading, refresh: refreshActiveScene } = useStreamStudioSync(currentStream?.id || '');

  // Log quando activeScene muda (com debounce para evitar spam)
  const lastSceneIdRef = React.useRef<string | null>(null);
  useEffect(() => {
    const currentSceneId = activeScene?.id || null;
    
    // Só logar se a cena realmente mudou (não apenas uma atualização de fontes)
    if (currentSceneId !== lastSceneIdRef.current) {
      if (activeScene) {
        console.log('📺 AdminLiveStreamPage - Cena ativa atualizada:', {
          sceneId: activeScene.id,
          sceneName: activeScene.name,
          totalSources: activeScene.sources?.length || 0,
          visibleSources: activeScene.sources?.filter(s => s.is_visible)?.length || 0
        });
      } else {
        console.log('⚠️ AdminLiveStreamPage - Nenhuma cena ativa');
      }
      lastSceneIdRef.current = currentSceneId;
    }
  }, [activeScene?.id, activeScene?.name]); // Só depende do ID e nome, não das fontes
  
  // Verificar se há fonte screenshare ativa (com log reduzido para evitar spam)
  const hasActiveScreenShare = React.useMemo(() => {
    if (!activeScene?.sources) return false;
    
    const screenshareSources = activeScene.sources.filter(
      s => s.type === 'screenshare'
    );
    const visibleScreenshare = screenshareSources.filter(s => s.is_visible);
    
    const result = visibleScreenshare.length > 0;
    
    // Log apenas quando o resultado muda (evitar spam)
    if (result !== (window as any)._lastScreenShareState) {
      console.log('🖥️ Screenshare Detection:', {
        totalSources: activeScene.sources.length,
        screenshareSources: screenshareSources.length,
        screenshareNames: screenshareSources.map(s => ({ name: s.name, visible: s.is_visible })),
        visibleCount: visibleScreenshare.length,
        hasActiveScreenShare: result
      });
      (window as any)._lastScreenShareState = result;
    }
    
    return result;
  }, [activeScene]);
  
  // Estatísticas da transmissão
  const [streamStats, setStreamStats] = useState<{
    viewerCount: number;
    connectionState: string;
    connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  } | null>(null);
  
  // Atualizar viewer count periodicamente
  const [viewerCount, setViewerCount] = useState(0);
  
  // Estatísticas detalhadas
  const [detailedStats, setDetailedStats] = useState<{
    avgWatchTime: number;
    totalWatchTime: number;
    uniqueSessions: number;
    adStats: Array<{
      ad_id: string;
      ad_type: string;
      total_views: number;
      total_duration: number;
      avg_duration: number;
    }>;
  } | null>(null);
  
  useEffect(() => {
    if (!currentStream?.id) return;
    
    const updateViewerCount = async () => {
      try {
        // Usar o número real de sessões ativas em vez do viewer_count
        const { count, error: sessionError } = await supabase
          .from('viewer_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('stream_id', currentStream.id)
          .eq('is_active', true);
        
        if (!sessionError && count !== null) {
          setViewerCount(count || 0);
        } else {
          // Fallback para viewer_count da tabela
          const { data } = await supabase
            .from('live_streams')
            .select('viewer_count')
            .eq('id', currentStream.id)
            .single();
          
          if (data) {
            setViewerCount(data.viewer_count || 0);
          }
        }
      } catch (error) {
        console.error('Erro ao atualizar viewer count:', error);
      }
    };
    
    const loadDetailedStats = async () => {
      try {
        // Carregar estatísticas de sessões
        const { data: sessionStats, error: sessionError } = await supabase
          .rpc('get_stream_statistics', { p_stream_id: currentStream.id });
        
        if (sessionError) {
          console.error('Erro ao carregar estatísticas de sessões:', sessionError);
          // Não lançar erro, apenas logar
        }
        
        // Carregar estatísticas de propagandas
        const { data: adStats, error: adError } = await supabase
          .rpc('get_ad_statistics', { p_stream_id: currentStream.id });
        
        if (adError) {
          console.error('Erro ao carregar estatísticas de propagandas:', adError);
          // Não lançar erro, apenas logar
        }
        
        // Sempre atualizar, mesmo se houver erro (para mostrar dados parciais)
        setDetailedStats({
          avgWatchTime: Number(sessionStats?.[0]?.avg_watch_time || 0),
          totalWatchTime: Number(sessionStats?.[0]?.total_watch_time || 0),
          uniqueSessions: Number(sessionStats?.[0]?.unique_sessions || 0),
          adStats: adStats || []
        });
      } catch (error) {
        console.error('Erro ao carregar estatísticas detalhadas:', error);
        // Manter dados anteriores se houver erro
      }
    };
    
    // Carregar imediatamente
    updateViewerCount();
    loadDetailedStats();
    
    // Atualizar em tempo real (a cada 2 segundos)
    const interval = setInterval(() => {
      updateViewerCount();
      loadDetailedStats();
    }, 2000); // Atualizar a cada 2 segundos para tempo real
    
    return () => clearInterval(interval);
  }, [currentStream?.id]);
  
  // Inicializar detailedStats como objeto vazio se não existir
  useEffect(() => {
    if (currentStream?.is_active && !detailedStats) {
      setDetailedStats({
        avgWatchTime: 0,
        totalWatchTime: 0,
        uniqueSessions: 0,
        adStats: []
      });
    }
  }, [currentStream?.is_active]);

  // Carregar overlayAd do banco quando currentStream mudar
  useEffect(() => {
    if (currentStream) {
      if (currentStream.overlay_ad_url) {
        setOverlayAd({
          url: currentStream.overlay_ad_url,
          enabled: currentStream.overlay_ad_enabled || false
        });
      } else {
        setOverlayAd(null);
      }
    } else {
      setOverlayAd(null);
    }
  }, [currentStream]);

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

  // Função para sanitizar nome do canal (URL-friendly)
  const sanitizeChannelName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .normalize('NFD') // Normalizar caracteres acentuados
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-z0-9-]/g, '-') // Substituir caracteres especiais por hífen
      .replace(/-+/g, '-') // Remover hífens duplicados
      .replace(/^-|-$/g, ''); // Remover hífens no início/fim
  };

  // Verificar se o nome do canal já existe
  const checkChannelNameExists = async (channelName: string): Promise<boolean> => {
    // Validar antes de fazer a query
    if (!channelName || channelName.trim().length < 2) {
      return false; // Não considerar como existente se muito curto
    }

    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select('id')
        .eq('channel_name', channelName.trim())
        .maybeSingle(); // Usar maybeSingle ao invés de single para evitar erro 406
      
      // Se houver erro e não for "PGRST116" (não encontrado), retornar false
      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar nome do canal:', error);
        return false;
      }
      
      return data !== null;
    } catch (error) {
      console.error('Erro ao verificar nome do canal:', error);
      return false;
    }
  };

  const createStream = async () => {
    if (!newStream.title.trim()) {
      toast.error('Digite um título para a transmissão');
      return;
    }

    try {
      // Gerar nome do canal: personalizado ou automático
      let channelName: string;
      
      if (newStream.customChannelName.trim()) {
        // Usar nome personalizado
        channelName = sanitizeChannelName(newStream.customChannelName);
        
        if (!channelName || channelName.length < 2) {
          toast.error('Nome do canal inválido. Use pelo menos 2 caracteres (letras, números e hífens).');
          return;
        }

        // Verificar se já existe (apenas se tiver pelo menos 2 caracteres)
        if (channelName.length >= 2) {
          const exists = await checkChannelNameExists(channelName);
          if (exists) {
            toast.error('Este nome de canal já está em uso. Escolha outro.');
            return;
          }
        }
      } else {
        // Gerar nome automático
        channelName = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
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

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast.error('Este nome de canal já está em uso. Escolha outro.');
          return;
        }
        throw error;
      }

      setCurrentStream(data);
      setIsCreating(false);
      setNewStream({ title: '', description: '', customChannelName: '' });
      toast.success('Transmissão criada! Clique em "Iniciar Transmissão" para começar.');
      loadStreams();
    } catch (error) {
      console.error('Erro ao criar stream:', error);
      toast.error('Erro ao criar transmissão');
    }
  };

  const startStream = async (stream: LiveStream) => {
    try {
      // Verificar se já existe alguma transmissão ativa
      const { data: activeStreams, error: checkError } = await supabase
        .from('live_streams')
        .select('id, title, created_by')
        .eq('is_active', true);

      if (checkError) throw checkError;

      // Se há transmissão ativa e não é a mesma que estamos tentando iniciar
      if (activeStreams && activeStreams.length > 0) {
        const otherActiveStream = activeStreams.find(s => s.id !== stream.id);
        if (otherActiveStream) {
          toast.error('⚠️ Já existe uma transmissão ativa! Apenas uma transmissão pode estar ativa por vez.');
          return;
        }
      }

      // Atualizar para ativo
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
    toast.success('✅ Link copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getStreamLink = () => {
    if (!currentStream) return '';
    return `${window.location.origin}/live/${currentStream.channel_name}`;
  };

  // Função para editar nome do canal (apenas se não estiver ativo)
  const [isEditingChannelName, setIsEditingChannelName] = useState(false);
  const [editedChannelName, setEditedChannelName] = useState('');

  const startEditingChannelName = () => {
    if (!currentStream) return;
    setEditedChannelName(currentStream.channel_name);
    setIsEditingChannelName(true);
  };

  const saveChannelName = async () => {
    if (!currentStream || !editedChannelName.trim()) return;

    const sanitized = sanitizeChannelName(editedChannelName);
    
    if (!sanitized) {
      toast.error('Nome do canal inválido. Use apenas letras, números e hífens.');
      return;
    }

    // Verificar se já existe (e não é o próprio canal)
    const { data: existing } = await supabase
      .from('live_streams')
      .select('id')
      .eq('channel_name', sanitized)
      .neq('id', currentStream.id)
      .single();

    if (existing) {
      toast.error('Este nome de canal já está em uso. Escolha outro.');
      return;
    }

    try {
      const { error } = await supabase
        .from('live_streams')
        .update({ channel_name: sanitized })
        .eq('id', currentStream.id);

      if (error) throw error;

      setCurrentStream({ ...currentStream, channel_name: sanitized });
      setIsEditingChannelName(false);
      toast.success('Nome do canal atualizado!');
      loadStreams();
    } catch (error) {
      console.error('Erro ao atualizar nome do canal:', error);
      toast.error('Erro ao atualizar nome do canal');
    }
  };

  // Funções para gerenciar propagandas e slideshow
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isOverlay: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (isOverlay) {
        setNewOverlayAd({ url: base64, file });
      } else {
        setNewAdImage({ ...newAdImage, url: base64, file });
      }
    };
    reader.readAsDataURL(file);
  };

  const addAdImage = () => {
    if (!newAdImage.url) {
      toast.error('Por favor, faça upload de uma imagem ou insira uma URL');
      return;
    }

    const newImage = {
      id: Date.now().toString(),
      url: newAdImage.url,
      enabled: true,
      duration: newAdImage.duration || 5
    };

    const updatedImages = [...adImages, newImage];
    setAdImages(updatedImages);
    // Sincronizar com localStorage para viewers
    if (currentStream) {
      localStorage.setItem(`adImages_${currentStream.channel_name}`, JSON.stringify(updatedImages));
    }
    setNewAdImage({ url: '', file: null, duration: 5 });
    toast.success('Imagem adicionada ao slideshow!');
  };

  const toggleAdImage = (id: string) => {
    const updatedImages = adImages.map(img => 
      img.id === id ? { ...img, enabled: !img.enabled } : img
    );
    setAdImages(updatedImages);
    // Sincronizar com localStorage para viewers
    if (currentStream) {
      localStorage.setItem(`adImages_${currentStream.channel_name}`, JSON.stringify(updatedImages));
    }
  };

  const removeAdImage = (id: string) => {
    const updatedImages = adImages.filter(img => img.id !== id);
    setAdImages(updatedImages);
    // Sincronizar com localStorage para viewers
    if (currentStream) {
      localStorage.setItem(`adImages_${currentStream.channel_name}`, JSON.stringify(updatedImages));
    }
    toast.success('Imagem removida!');
  };

  const setOverlayAdImage = async () => {
    if (!newOverlayAd.url) {
      toast.error('Por favor, faça upload de uma imagem ou insira uma URL');
      return;
    }

    if (!currentStream?.id) {
      toast.error('Nenhuma transmissão selecionada');
      return;
    }

    try {
      const { error } = await supabase
        .from('live_streams')
        .update({
          overlay_ad_url: newOverlayAd.url,
          overlay_ad_enabled: true
        })
        .eq('id', currentStream.id);

      if (error) throw error;

      setOverlayAd({ url: newOverlayAd.url, enabled: true });
      setNewOverlayAd({ url: '', file: null });
      
      // Atualizar currentStream localmente
      setCurrentStream({
        ...currentStream,
        overlay_ad_url: newOverlayAd.url,
        overlay_ad_enabled: true
      });
      
      toast.success('Propaganda overlay configurada!');
    } catch (error) {
      console.error('Erro ao salvar overlay:', error);
      toast.error('Erro ao configurar propaganda overlay');
    }
  };

  const toggleOverlayAd = async () => {
    if (!overlayAd || !currentStream?.id) return;

    const newEnabled = !overlayAd.enabled;

    try {
      const { error } = await supabase
        .from('live_streams')
        .update({
          overlay_ad_enabled: newEnabled
        })
        .eq('id', currentStream.id);

      if (error) throw error;

      setOverlayAd({ ...overlayAd, enabled: newEnabled });
      
      // Atualizar currentStream localmente
      setCurrentStream({
        ...currentStream,
        overlay_ad_enabled: newEnabled
      });
      
      toast.success(newEnabled ? 'Propaganda overlay ativada!' : 'Propaganda overlay desativada!');
    } catch (error) {
      console.error('Erro ao atualizar overlay:', error);
      toast.error('Erro ao atualizar propaganda overlay');
    }
  };

  const removeOverlayAd = async () => {
    if (!currentStream?.id) return;

    try {
      const { error } = await supabase
        .from('live_streams')
        .update({
          overlay_ad_url: null,
          overlay_ad_enabled: false
        })
        .eq('id', currentStream.id);

      if (error) throw error;

      setOverlayAd(null);
      
      // Atualizar currentStream localmente
      setCurrentStream({
        ...currentStream,
        overlay_ad_url: null,
        overlay_ad_enabled: false
      });
      
      toast.success('Propaganda overlay removida!');
    } catch (error) {
      console.error('Erro ao remover overlay:', error);
      toast.error('Erro ao remover propaganda overlay');
    }
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
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      // Se auto-geração está ativa, gerar slug automaticamente
                      if (autoGenerateSlug) {
                        const slug = sanitizeChannelName(newTitle);
                        setNewStream({ 
                          title: newTitle, 
                          description: newStream.description,
                          customChannelName: slug || ''
                        });
                      } else {
                        setNewStream({ ...newStream, title: newTitle });
                      }
                    }}
                    placeholder="Ex: Cruzeiro x Corintians"
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none"
                  />
                  {newStream.title && autoGenerateSlug && (
                    <p className="text-xs text-amber-400 mt-1">
                      💡 Link será gerado automaticamente: <span className="font-mono">/live/{sanitizeChannelName(newStream.title)}</span>
                    </p>
                  )}
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
                
                {/* Campo para nome personalizado do canal */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-300">
                      🔗 Nome do Link
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoGenerateSlug}
                        onChange={(e) => {
                          setAutoGenerateSlug(e.target.checked);
                          if (e.target.checked && newStream.title) {
                            const slug = sanitizeChannelName(newStream.title);
                            if (slug) {
                              setNewStream(prev => ({ ...prev, customChannelName: slug }));
                            }
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
                      />
                      <span>Gerar automaticamente do título</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={newStream.customChannelName}
                    onChange={(e) => {
                      // Sanitizar enquanto digita para evitar caracteres inválidos
                      const sanitized = sanitizeChannelName(e.target.value);
                      setNewStream({ ...newStream, customChannelName: sanitized || e.target.value });
                      setAutoGenerateSlug(false); // Desativar auto-geração quando editar manualmente
                    }}
                    onFocus={() => setAutoGenerateSlug(false)} // Desativar ao focar no campo
                    placeholder="Ex: cruzeiro-x-corintians"
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none"
                    minLength={2}
                    maxLength={100}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {autoGenerateSlug 
                      ? '✅ Gerado automaticamente do título. Desmarque a opção acima para editar manualmente.'
                      : 'Use apenas letras, números e hífens. Será convertido automaticamente para minúsculas.'
                    }
                  </p>
                  {newStream.customChannelName && (
                    <p className="text-xs text-amber-400 mt-1 font-medium">
                      🔗 Link completo: {window.location.origin}/live/{sanitizeChannelName(newStream.customChannelName) || '...'}
                    </p>
                  )}
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
                      setNewStream({ title: '', description: '', customChannelName: '' });
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
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                {!isOBSCamera && (
                  <button
                    onClick={() => setShowStreamStudio(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold transition-all text-sm md:text-base whitespace-nowrap flex items-center gap-2 group"
                    title="Abrir Stream Studio (Ctrl+Shift+S)"
                  >
                    <SettingsIcon size={16} className="group-hover:rotate-90 transition-transform" />
                    Stream Studio
                    <kbd className="hidden md:inline bg-purple-800/50 px-1.5 py-0.5 rounded text-xs ml-1">Ctrl+Shift+S</kbd>
                  </button>
                )}
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

            {/* Botão para mostrar/ocultar estatísticas */}
            {currentStream.is_active && (
              <button
                onClick={() => setShowStats(!showStats)}
                className="mb-4 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-sm md:text-base"
              >
                {showStats ? (
                  <>
                    <ChevronUp size={18} />
                    Ocultar Estatísticas
                  </>
                ) : (
                  <>
                    <ChevronDown size={18} />
                    Mostrar Estatísticas
                  </>
                )}
              </button>
            )}

            {/* Dashboard de Estatísticas - Oculto por padrão */}
            {currentStream.is_active && showStats && (
              <>
                <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="text-blue-400" size={20} />
                      <span className="text-slate-400 text-xs md:text-sm">Viewers</span>
                    </div>
                    <div className="text-2xl md:text-3xl font-bold text-white">
                      {streamStats?.viewerCount ?? viewerCount}
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        streamStats?.connectionQuality === 'excellent' ? 'bg-green-500' :
                        streamStats?.connectionQuality === 'good' ? 'bg-yellow-500' :
                        streamStats?.connectionQuality === 'poor' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}></div>
                      <span className="text-slate-400 text-xs md:text-sm">Conexão</span>
                    </div>
                    <div className="text-sm md:text-base font-semibold text-white capitalize">
                      {streamStats?.connectionQuality === 'excellent' ? 'Excelente' :
                       streamStats?.connectionQuality === 'good' ? 'Boa' :
                       streamStats?.connectionQuality === 'poor' ? 'Ruim' :
                       'Desconectado'}
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-slate-400 text-xs md:text-sm">Status</span>
                    </div>
                    <div className="text-sm md:text-base font-semibold text-white">
                      {streamStats?.connectionState === 'CONNECTED' ? '🟢 Conectado' :
                       streamStats?.connectionState === 'CONNECTING' ? '🟡 Conectando' :
                       streamStats?.connectionState === 'DISCONNECTING' ? '🟠 Desconectando' :
                       '🔴 Desconectado'}
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-slate-400 text-xs md:text-sm">Propagandas</span>
                    </div>
                    <div className="text-2xl md:text-3xl font-bold text-white">
                      {adImages.filter(img => img.enabled).length}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">ativas</div>
                  </div>
                </div>

                {/* Relatórios Detalhados */}
                {currentStream.is_active && (
                  <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tempo Médio de Visualização */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-slate-700">
                      <h3 className="text-lg font-bold text-white mb-4">⏱️ Tempo de Visualização</h3>
                      {detailedStats ? (
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-400">Tempo Médio</span>
                              <span className="text-white font-semibold">
                                {detailedStats.avgWatchTime > 0 ? (
                                  <>
                                    {Math.floor(detailedStats.avgWatchTime / 60)}min {Math.floor(detailedStats.avgWatchTime % 60)}s
                                  </>
                                ) : (
                                  '0min 0s'
                                )}
                              </span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                              <div 
                                className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${Math.min((detailedStats.avgWatchTime / 300) * 100, 100)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-4">
                            <div>
                              <div className="text-slate-400 text-xs">Total Assistido</div>
                              <div className="text-white font-bold">
                                {detailedStats.totalWatchTime > 0 ? (
                                  <>
                                    {Math.floor(detailedStats.totalWatchTime / 3600)}h {Math.floor((detailedStats.totalWatchTime % 3600) / 60)}min
                                  </>
                                ) : (
                                  '0h 0min'
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-400 text-xs">Sessões Únicas</div>
                              <div className="text-white font-bold">{detailedStats.uniqueSessions || 0}</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-400 text-sm text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400 mx-auto mb-2"></div>
                          Carregando estatísticas...
                        </div>
                      )}
                    </div>

                    {/* Propagandas Mais Vistas */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-slate-700">
                      <h3 className="text-lg font-bold text-white mb-4">📊 Propagandas Mais Vistas</h3>
                      {detailedStats && detailedStats.adStats && detailedStats.adStats.length > 0 ? (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {detailedStats.adStats.slice(0, 5).map((ad, index) => (
                            <div key={ad.ad_id} className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-white text-sm font-medium truncate">
                                    {ad.ad_type === 'slideshow' ? 'Slideshow' : 'Overlay'}
                                  </span>
                                  <span className="text-amber-400 font-bold text-sm">{ad.total_views}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-1.5">
                                  <div 
                                    className="bg-blue-500 h-1.5 rounded-full transition-all"
                                    style={{ 
                                      width: `${(ad.total_views / (detailedStats.adStats[0]?.total_views || 1)) * 100}%` 
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-400 text-sm text-center py-4">
                          Nenhuma propaganda visualizada ainda
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Player de Vídeo */}
            <div className="mb-4">
              {!currentStream.is_active ? (
                <div className="bg-slate-800 rounded-lg p-8">
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-4">📹</div>
                    <h3 className="text-xl font-bold text-white mb-2">Transmissão Pronta</h3>
                    <p className="text-slate-400">
                      Configure sua câmera e clique no botão abaixo para iniciar
                    </p>
                  </div>
                  
                  {/* Seletor de Câmera */}
                  <div className="mb-6 max-w-md mx-auto">
                    <CameraSelector
                      onSelectCamera={(deviceId, label) => {
                        const previousDeviceId = selectedCameraDeviceId;
                        setSelectedCameraDeviceId(deviceId);
                        setSelectedCameraLabel(label);
                        // Salvar preferência
                        localStorage.setItem('selectedCameraDeviceId', deviceId);
                        localStorage.setItem('selectedCameraLabel', label);
                        // Só mostrar toast se a câmera realmente mudou (seleção manual do usuário)
                        if (previousDeviceId && previousDeviceId !== deviceId) {
                          toast.success('Câmera selecionada!');
                        }
                      }}
                      selectedDeviceId={selectedCameraDeviceId}
                    />
                  </div>
                  
                  {/* Aviso quando usando OBS */}
                  {isOBSCamera && (
                    <div className="mb-6 max-w-md mx-auto bg-purple-900/30 border-2 border-purple-500 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">🎬</div>
                        <div className="flex-1">
                          <h4 className="text-white font-bold mb-1">Modo OBS Studio Ativo</h4>
                          <p className="text-purple-200 text-sm">
                            Você está usando OBS Virtual Camera. Configure suas cenas, overlays e controles diretamente no OBS Studio. 
                            O Stream Studio do site estará desabilitado enquanto usar OBS.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <button
                      onClick={async () => {
                        // Verificar se já existe transmissão ativa antes de iniciar
                        const { data: activeStreams } = await supabase
                          .from('live_streams')
                          .select('id, title')
                          .eq('is_active', true);
                        
                        if (activeStreams && activeStreams.length > 0) {
                          const otherStream = activeStreams.find(s => s.id !== currentStream.id);
                          if (otherStream) {
                            toast.error(`⚠️ Já existe uma transmissão ativa: "${otherStream.title}". Apenas uma transmissão pode estar ativa por vez.`);
                            return;
                          }
                        }
                        
                        startStream(currentStream);
                      }}
                      className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 mx-auto"
                    >
                      <Camera size={20} />
                      Iniciar Transmissão
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                    <VideoStream
                      channelName={currentStream.channel_name}
                      isBroadcaster={true}
                      onEnd={endStream}
                      adImages={adImages}
                      overlayAd={overlayAd || undefined}
                      onStatsUpdate={setStreamStats}
                      screenShareEnabled={hasActiveScreenShare}
                      hideScreenShareButton={!!activeScene}
                      activeScene={activeScene}
                      cameraDeviceId={selectedCameraDeviceId}
                      key={`video-${currentStream.id}-${hasActiveScreenShare}-${selectedCameraDeviceId || 'default'}`}
                    />
                </div>
              )}
            </div>
            
            {/* Gerenciador de Propagandas foi integrado no Stream Studio - Aba "Propagandas" */}

            {/* Compartilhar Link */}
            <div className="bg-slate-800/50 rounded-lg p-3 md:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Share2 className="text-amber-400 flex-shrink-0" size={20} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-white text-xs md:text-sm">Link da Transmissão</label>
                    {!currentStream.is_active && (
                      <button
                        onClick={() => {
                          if (isEditingChannelName) {
                            setIsEditingChannelName(false);
                          } else {
                            startEditingChannelName();
                          }
                        }}
                        className="text-xs text-amber-400 hover:text-amber-300 underline"
                      >
                        {isEditingChannelName ? 'Cancelar' : 'Editar nome'}
                      </button>
                    )}
                  </div>
                  {isEditingChannelName ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={editedChannelName}
                        onChange={(e) => setEditedChannelName(e.target.value)}
                        placeholder="nome-personalizado"
                        className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg border border-amber-500 text-xs md:text-sm"
                      />
                      <button
                        onClick={saveChannelName}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-all text-sm md:text-base whitespace-nowrap"
                      >
                        Salvar
                      </button>
                    </div>
                  ) : (
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
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {currentStream.is_active 
                      ? '⚠️ Não é possível editar o nome enquanto a transmissão estiver ativa'
                      : '💡 Você pode personalizar o nome do link antes de iniciar a transmissão'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal do Stream Studio - Controle Profissional */}
        {currentStream && showStreamStudio && !isOBSCamera && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-2xl w-full max-w-[95vw] h-[90vh] flex flex-col border border-slate-700 shadow-2xl">
              {/* Header do Stream Studio */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-gradient-to-r from-purple-900/50 to-blue-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <SettingsIcon className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Stream Studio</h3>
                    <p className="text-slate-300 text-sm">Controle Profissional de Transmissão</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStreamStudio(false)}
                  className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                >
                  <X size={24} />
                </button>
              </div>
              
              {/* Conteúdo do Stream Studio */}
              <div className="flex-1 overflow-hidden">
                <StreamStudio
                  streamId={currentStream.id}
                  channelName={currentStream.channel_name}
                  isLive={currentStream.is_active}
                  onGoLive={(sceneId) => {
                    console.log('🎬 AdminLiveStreamPage - onGoLive chamado:', sceneId);
                    // Forçar refresh da cena ativa após um pequeno delay
                    setTimeout(() => {
                      console.log('🔄 AdminLiveStreamPage - Forçando refresh da cena ativa...');
                      refreshActiveScene();
                    }, 800);
                  }}
                />
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
                          onClick={async () => {
                            // Verificar se já existe transmissão ativa
                            const { data: activeStreams } = await supabase
                              .from('live_streams')
                              .select('id, title')
                              .eq('is_active', true);
                            
                            if (activeStreams && activeStreams.length > 0) {
                              const otherStream = activeStreams.find(s => s.id !== stream.id);
                              if (otherStream) {
                                toast.error(`⚠️ Já existe uma transmissão ativa: "${otherStream.title}". Apenas uma transmissão pode estar ativa por vez.`);
                                return;
                              }
                            }
                            
                            startStream(stream);
                          }}
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

