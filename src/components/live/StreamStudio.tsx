import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Move, 
  Image as ImageIcon,
  Type,
  Video,
  Monitor,
  Camera,
  Award,
  Save,
  Grid,
  Layers,
  Settings,
  X,
  Copy,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
  Maximize2,
  HelpCircle,
  Megaphone
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import SourceEditor from './SourceEditor';
import DraggableSource from './DraggableSource';
import SceneTemplates from './SceneTemplates';
import QuickTutorial from './QuickTutorial';
import AdManager from './AdManager';

interface Scene {
  id: string;
  stream_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  layout_config: any;
  created_at: string;
  updated_at: string;
}

interface Source {
  id: string;
  scene_id: string;
  type: 'video' | 'camera' | 'screen' | 'screenshare' | 'image' | 'text' | 'logo' | 'sponsor' | 'scoreboard';
  name: string;
  url?: string;
  content: any;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
  };
  is_visible: boolean;
  opacity: number;
  transform: any;
  animation: any;
  created_at: string;
  updated_at: string;
}

interface StreamStudioProps {
  streamId: string;
  channelName: string;
  isLive: boolean;
  onGoLive?: (sceneId: string) => void;
}

const StreamStudio: React.FC<StreamStudioProps> = ({ 
  streamId, 
  channelName, 
  isLive,
  onGoLive 
}) => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [programSources, setProgramSources] = useState<Source[]>([]); // Fontes da cena ativa (PROGRAMA)
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [editingSource, setEditingSource] = useState<Source | null>(null); // Para o editor modal
  const [showAddScene, setShowAddScene] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [previewMode, setPreviewMode] = useState<'preview' | 'program'>('preview');
  const [showSourceLibrary, setShowSourceLibrary] = useState(false);
  const [showGrid, setShowGrid] = useState(true); // Grid de alinhamento
  const [snapToGrid, setSnapToGrid] = useState(true); // Snap to grid
  const [showTemplates, setShowTemplates] = useState(false); // Templates de cenas
  const [showTutorial, setShowTutorial] = useState(false); // Tutorial
  const [activeTab, setActiveTab] = useState<'scenes' | 'ads'>('scenes'); // Aba ativa
  const [overlayAd, setOverlayAd] = useState<{url: string; enabled: boolean} | null>(null); // Overlay fullscreen
  
  const previewCanvasRef = useRef<HTMLDivElement>(null);
  const programCanvasRef = useRef<HTMLDivElement>(null);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se estiver digitando em um input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'g':
          // Toggle Grid
          setShowGrid(prev => !prev);
          toast.success(showGrid ? 'Grid ocultado' : 'Grid ativado');
          break;
        
        case 's':
          // Toggle Snap to Grid
          setSnapToGrid(prev => !prev);
          toast.success(snapToGrid ? 'Snap desativado' : 'Snap ativado');
          break;
        
        case 'delete':
        case 'backspace':
          // Deletar fonte selecionada
          if (selectedSource) {
            e.preventDefault();
            deleteSource(selectedSource.id);
          }
          break;
        
        case 'escape':
          // Desselecionar
          setSelectedSource(null);
          setEditingSource(null);
          setShowSourceLibrary(false);
          break;
        
        case 'enter':
          // Editar fonte selecionada
          if (selectedSource) {
            setEditingSource(selectedSource);
          }
          break;
        
        case 'arrowup':
        case 'arrowdown':
        case 'arrowleft':
        case 'arrowright':
          // Mover fonte com setas
          if (selectedSource) {
            e.preventDefault();
            const step = e.shiftKey ? 10 : 1;
            let newX = selectedSource.position.x;
            let newY = selectedSource.position.y;

            switch (e.key.toLowerCase()) {
              case 'arrowup':
                newY = Math.max(0, newY - step);
                break;
              case 'arrowdown':
                newY += step;
                break;
              case 'arrowleft':
                newX = Math.max(0, newX - step);
                break;
              case 'arrowright':
                newX += step;
                break;
            }

            handleSourcePositionChange(selectedSource.id, { x: newX, y: newY });
          }
          break;
        
        case 'd':
          // Duplicar fonte selecionada (Ctrl/Cmd + D)
          if ((e.ctrlKey || e.metaKey) && selectedSource) {
            e.preventDefault();
            duplicateSource(selectedSource);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSource, showGrid, snapToGrid]);

  const duplicateSource = async (source: Source) => {
    try {
      const newPosition = {
        ...source.position,
        x: source.position.x + 20,
        y: source.position.y + 20
      };

      const { data, error } = await supabase
        .from('stream_sources')
        .insert({
          scene_id: source.scene_id,
          type: source.type,
          name: `${source.name} (Cópia)`,
          url: source.url,
          content: source.content,
          position: newPosition,
          is_visible: source.is_visible,
          opacity: source.opacity,
          transform: source.transform,
          animation: source.animation
        })
        .select()
        .single();

      if (error) throw error;

      setSources([...sources, data]);
      setSelectedSource(data);
      toast.success('Fonte duplicada!');
    } catch (error) {
      console.error('Erro ao duplicar fonte:', error);
      toast.error('Erro ao duplicar fonte');
    }
  };

  // Estados para adicionar nova cena
  const [newScene, setNewScene] = useState({
    name: '',
    description: ''
  });

  // Estados para adicionar nova fonte
  const [newSource, setNewSource] = useState({
    type: 'image' as Source['type'],
    name: '',
    url: '',
    content: {}
  });

  // Carregar cenas e fontes
  useEffect(() => {
    loadScenes();
  }, [streamId]);

  useEffect(() => {
    if (selectedScene) {
      loadSources(selectedScene.id);
    }
  }, [selectedScene]);

  // Carregar fontes da cena ativa (PROGRAMA)
  useEffect(() => {
    const activeScene = scenes.find(s => s.is_active);
    if (activeScene) {
      loadProgramSources(activeScene.id);
    } else {
      setProgramSources([]);
    }
  }, [scenes]);

  // Recarregar fontes do programa quando cena ativa mudar
  const loadProgramSources = async (sceneId: string) => {
    try {
      const { data, error } = await supabase
        .from('stream_sources')
        .select('*')
        .eq('scene_id', sceneId)
        .order('position->zIndex', { ascending: true });

      if (error) throw error;
      setProgramSources(data || []);
    } catch (error) {
      console.error('Erro ao carregar fontes do programa:', error);
    }
  };

  // Carregar overlay ad e escutar mudanças
  useEffect(() => {
    if (!streamId || streamId.trim() === '') return;
    
    const loadOverlayAd = async () => {
      try {
        const { data, error } = await supabase
          .from('stream_overlay_ads')
          .select('*')
          .eq('stream_id', streamId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao carregar overlay ad:', error);
          return;
        }

        if (data) {
          setOverlayAd({ url: data.url, enabled: data.enabled || false });
        } else {
          setOverlayAd(null);
        }
      } catch (error) {
        console.error('Erro ao carregar overlay ad:', error);
      }
    };

    loadOverlayAd();

    // Escutar mudanças em tempo real
    const channel = supabase
      .channel(`overlay_ad_${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stream_overlay_ads',
          filter: `stream_id=eq.${streamId}`
        },
        () => {
          loadOverlayAd();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  const loadScenes = async () => {
    try {
      const { data, error } = await supabase
        .from('stream_scenes')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setScenes(data || []);
      
      // Selecionar primeira cena ou cena ativa
      if (data && data.length > 0) {
        const activeScene = data.find(s => s.is_active);
        setSelectedScene(activeScene || data[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar cenas:', error);
      toast.error('Erro ao carregar cenas');
    }
  };

  const loadSources = async (sceneId: string) => {
    try {
      const { data, error } = await supabase
        .from('stream_sources')
        .select('*')
        .eq('scene_id', sceneId)
        .order('position->zIndex', { ascending: true });

      if (error) throw error;

      setSources(data || []);
    } catch (error) {
      console.error('Erro ao carregar fontes:', error);
      toast.error('Erro ao carregar fontes');
    }
  };

  const createScene = async () => {
    if (!newScene.name.trim()) {
      toast.error('Digite um nome para a cena');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('stream_scenes')
        .insert({
          stream_id: streamId,
          name: newScene.name,
          description: newScene.description,
          is_active: scenes.length === 0, // Primeira cena fica ativa
          layout_config: {}
        })
        .select()
        .single();

      if (error) throw error;

      setScenes([...scenes, data]);
      setNewScene({ name: '', description: '' });
      setShowAddScene(false);
      toast.success('Cena criada com sucesso!');
      
      if (scenes.length === 0) {
        setSelectedScene(data);
      }
    } catch (error) {
      console.error('Erro ao criar cena:', error);
      toast.error('Erro ao criar cena');
    }
  };

  const deleteScene = async (sceneId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta cena?')) return;

    try {
      const { error } = await supabase
        .from('stream_scenes')
        .delete()
        .eq('id', sceneId);

      if (error) throw error;

      setScenes(scenes.filter(s => s.id !== sceneId));
      if (selectedScene?.id === sceneId) {
        setSelectedScene(scenes[0] || null);
      }
      toast.success('Cena excluída');
    } catch (error) {
      console.error('Erro ao excluir cena:', error);
      toast.error('Erro ao excluir cena');
    }
  };

  const duplicateScene = async (scene: Scene) => {
    try {
      // Criar nova cena
      const { data: newSceneData, error: sceneError } = await supabase
        .from('stream_scenes')
        .insert({
          stream_id: streamId,
          name: `${scene.name} (Cópia)`,
          description: scene.description,
          is_active: false,
          layout_config: scene.layout_config
        })
        .select()
        .single();

      if (sceneError) throw sceneError;

      // Duplicar todas as fontes da cena
      const { data: sceneSources } = await supabase
        .from('stream_sources')
        .select('*')
        .eq('scene_id', scene.id);

      if (sceneSources && sceneSources.length > 0) {
        const newSources = sceneSources.map(source => ({
          scene_id: newSceneData.id,
          type: source.type,
          name: source.name,
          url: source.url,
          content: source.content,
          position: source.position,
          is_visible: source.is_visible,
          opacity: source.opacity,
          transform: source.transform,
          animation: source.animation
        }));

        await supabase
          .from('stream_sources')
          .insert(newSources);
      }

      setScenes([...scenes, newSceneData]);
      toast.success('Cena duplicada com sucesso!');
    } catch (error) {
      console.error('Erro ao duplicar cena:', error);
      toast.error('Erro ao duplicar cena');
    }
  };

  const setActiveScene = async (sceneId: string) => {
    console.log('🎬 StreamStudio - setActiveScene chamado:', sceneId);
    
    try {
      // Desativar todas as cenas
      console.log('🔄 StreamStudio - Desativando todas as cenas...');
      const { error: deactivateError } = await supabase
        .from('stream_scenes')
        .update({ is_active: false })
        .eq('stream_id', streamId);

      if (deactivateError) {
        console.error('❌ Erro ao desativar cenas:', deactivateError);
      }

      // Ativar cena selecionada
      console.log('🔄 StreamStudio - Ativando cena:', sceneId);
      const { error, data } = await supabase
        .from('stream_scenes')
        .update({ is_active: true })
        .eq('id', sceneId)
        .select();

      if (error) {
        console.error('❌ Erro ao ativar cena:', error);
        throw error;
      }

      console.log('✅ StreamStudio - Cena ativada no banco:', data);

      // IMPORTANTE: Desativar TODAS as fontes da cena ao enviar ao PROGRAMA
      // O admin deve ativar manualmente via Painel AO VIVO
      const { error: sourcesError } = await supabase
        .from('stream_sources')
        .update({ is_visible: false })
        .eq('scene_id', sceneId);

      if (sourcesError) {
        console.error('Aviso ao desativar fontes:', sourcesError);
      }

      const activatedScene = scenes.find(s => s.id === sceneId);
      setScenes(scenes.map(s => ({ ...s, is_active: s.id === sceneId })));
      
      // Recarregar fontes da cena ativada no PROGRAMA
      await loadProgramSources(sceneId);
      
      // Toast com nome da cena ativada
      toast.success(
        `🎬 Cena "${activatedScene?.name}" ATIVADA no PROGRAMA! Todas as fontes começam DESATIVADAS.`,
        {
          duration: 4000,
          icon: '🔴',
          style: {
            background: '#dc2626',
            color: '#fff',
            fontWeight: 'bold'
          }
        }
      );
      
      // Callback para sincronizar com transmissão
      if (onGoLive) {
        onGoLive(sceneId);
      }
    } catch (error) {
      console.error('Erro ao ativar cena:', error);
      toast.error('Erro ao ativar cena');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setNewSource({ ...newSource, url: base64 });
    };
    reader.readAsDataURL(file);
  };

  const addSource = async () => {
    if (!selectedScene) {
      toast.error('Selecione uma cena primeiro');
      return;
    }

    if (!newSource.name.trim()) {
      toast.error('Digite um nome para a fonte');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('stream_sources')
        .insert({
          scene_id: selectedScene.id,
          type: newSource.type,
          name: newSource.name,
          url: newSource.url || null,
          content: newSource.content,
          position: {
            x: 10,
            y: 10,
            width: newSource.type === 'text' ? 300 : 200,
            height: newSource.type === 'text' ? 100 : 150,
            zIndex: sources.length
          },
          is_visible: false, // Desativado por padrão - admin ativa quando necessário
          opacity: 1,
          transform: {},
          animation: {}
        })
        .select()
        .single();

      if (error) throw error;

      setSources([...sources, data]);
      setNewSource({ type: 'image', name: '', url: '', content: {} });
      setShowAddSource(false);
      toast.success('Fonte adicionada!');
    } catch (error) {
      console.error('Erro ao adicionar fonte:', error);
      toast.error('Erro ao adicionar fonte');
    }
  };

  const deleteSource = async (sourceId: string) => {
    try {
      const { error } = await supabase
        .from('stream_sources')
        .delete()
        .eq('id', sourceId);

      if (error) throw error;

      setSources(sources.filter(s => s.id !== sourceId));
      toast.success('Fonte removida');
    } catch (error) {
      console.error('Erro ao remover fonte:', error);
      toast.error('Erro ao remover fonte');
    }
  };

  const toggleSourceVisibility = async (source: Source) => {
    try {
      const { error } = await supabase
        .from('stream_sources')
        .update({ is_visible: !source.is_visible })
        .eq('id', source.id);

      if (error) throw error;

      setSources(sources.map(s => 
        s.id === source.id ? { ...s, is_visible: !s.is_visible } : s
      ));
    } catch (error) {
      console.error('Erro ao alterar visibilidade:', error);
      toast.error('Erro ao alterar visibilidade');
    }
  };

  const updateSourcePosition = async (sourceId: string, position: any) => {
    try {
      const { error } = await supabase
        .from('stream_sources')
        .update({ position })
        .eq('id', sourceId);

      if (error) throw error;

      setSources(sources.map(s => 
        s.id === sourceId ? { ...s, position } : s
      ));
    } catch (error) {
      console.error('Erro ao atualizar posição:', error);
    }
  };

  const getSourceIcon = (type: Source['type']) => {
    switch (type) {
      case 'video': return <Video size={16} />;
      case 'camera': return <Camera size={16} />;
      case 'screen': return <Monitor size={16} />;
      case 'image': return <ImageIcon size={16} />;
      case 'logo': return <ImageIcon size={16} />;
      case 'sponsor': return <Award size={16} />;
      case 'text': return <Type size={16} />;
      case 'scoreboard': return <Grid size={16} />;
      default: return <Layers size={16} />;
    }
  };

  const handleSourcePositionChange = async (sourceId: string, newPosition: any) => {
    try {
      const source = sources.find(s => s.id === sourceId);
      if (!source) return;

      const updatedPosition = {
        ...source.position,
        ...newPosition
      };

      const { error } = await supabase
        .from('stream_sources')
        .update({ position: updatedPosition })
        .eq('id', sourceId);

      if (error) throw error;

      setSources(sources.map(s => 
        s.id === sourceId ? { ...s, position: updatedPosition } : s
      ));
    } catch (error) {
      console.error('Erro ao atualizar posição:', error);
    }
  };

  return (
    <div className="h-full bg-slate-900 rounded-xl overflow-hidden flex flex-col">
      {/* Toolbar Superior */}
      <div className="bg-slate-800 border-b border-slate-700 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Layers className="text-amber-400" size={20} />
            <h3 className="text-white font-bold">Stream Studio</h3>
          </div>

          {/* Controles de Grid */}
          <div className="flex items-center gap-2 border-l border-slate-700 pl-4">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                showGrid 
                  ? 'bg-amber-500 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              title="Mostrar/Ocultar Grid (G)"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                snapToGrid 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              title="Snap to Grid (S)"
            >
              <Maximize2 size={16} />
            </button>
            <span className="text-slate-400 text-xs">
              {snapToGrid ? 'Snap: ON' : 'Snap: OFF'}
            </span>
          </div>

          {/* Atalhos */}
          <div className="hidden lg:flex items-center gap-2 border-l border-slate-700 pl-4">
            <span className="text-slate-400 text-xs">
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">G</kbd> Grid • 
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] ml-1">S</kbd> Snap • 
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] ml-1">Del</kbd> Deletar
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isLive && (
            <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded-full border border-red-500/50">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 font-bold text-sm">AO VIVO</span>
            </div>
          )}
          
          <button
            onClick={() => setShowTutorial(true)}
            className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-all"
            title="Ajuda e Tutorial"
          >
            <HelpCircle size={18} />
          </button>
          
          <button
            onClick={() => {
              if (!selectedScene) {
                toast.error('⚠️ Selecione ou crie uma cena primeiro!');
                return;
              }
              setShowSourceLibrary(!showSourceLibrary);
            }}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
              selectedScene
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
            }`}
            disabled={!selectedScene}
            title={!selectedScene ? 'Selecione uma cena primeiro' : 'Abrir biblioteca de fontes'}
          >
            <Plus size={16} />
            Biblioteca
          </button>
        </div>
      </div>

      {/* Sistema de Abas */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-1 px-4">
          <button
            onClick={() => setActiveTab('scenes')}
            className={`px-4 py-3 font-medium text-sm transition-all relative ${
              activeTab === 'scenes'
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers size={18} />
              <span>Cenas</span>
            </div>
            {activeTab === 'scenes' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`px-4 py-3 font-medium text-sm transition-all relative ${
              activeTab === 'ads'
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Megaphone size={18} />
              <span>Propagandas</span>
            </div>
            {activeTab === 'ads' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400"></div>
            )}
          </button>
        </div>
      </div>

      {/* Layout Principal: Preview/Program + Controls */}
      {activeTab === 'scenes' ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4 p-4 overflow-hidden">
        {/* Canvas de Preview e Program */}
        <div className="space-y-4 overflow-y-auto">
          {/* Preview Canvas */}
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-bold flex items-center gap-2">
                <Eye size={16} className="text-blue-400" />
                PREVIEW
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectedScene && setActiveScene(selectedScene.id)}
                  disabled={!selectedScene || selectedScene.is_active}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded font-medium text-sm transition-all flex items-center gap-2"
                >
                  <ArrowLeftRight size={14} />
                  Enviar ao PROGRAMA
                </button>
              </div>
            </div>
            
            {/* Canvas Preview - Proporção 16:9 */}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              {!selectedScene ? (
                <div className="absolute inset-0 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-700">
                  <div className="text-center text-slate-400 p-8">
                    <Layers size={64} className="mx-auto mb-4 opacity-30" />
                    <h4 className="text-lg font-semibold mb-2">Nenhuma Cena Selecionada</h4>
                    <p className="text-sm mb-4">Crie ou selecione uma cena para começar</p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => setShowAddScene(true)}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      >
                        Criar Cena
                      </button>
                      <button
                        onClick={() => setShowTemplates(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      >
                        Usar Template
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
              <div 
                ref={previewCanvasRef}
                className="absolute inset-0 bg-black rounded-lg overflow-hidden"
                onClick={() => setSelectedSource(null)}
              >
                {/* Grid de alinhamento */}
                {showGrid && (
                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, rgba(100, 116, 139, 0.1) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(100, 116, 139, 0.1) 1px, transparent 1px)
                      `,
                      backgroundSize: '20px 20px'
                    }}
                  />
                )}

                {/* Linhas guia centrais */}
                {showGrid && (
                  <>
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-amber-500/20 pointer-events-none" />
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-amber-500/20 pointer-events-none" />
                  </>
                )}

                {/* Fontes */}
                {selectedScene && sources.length > 0 ? (
                  sources
                    .sort((a, b) => a.position.zIndex - b.position.zIndex)
                    .map(source => (
                      <DraggableSource
                        key={source.id}
                        source={source}
                        isSelected={selectedSource?.id === source.id}
                        onSelect={() => setSelectedSource(source)}
                        onPositionChange={(newPosition) => handleSourcePositionChange(source.id, newPosition)}
                        onDoubleClick={() => setEditingSource(source)}
                        containerRef={previewCanvasRef}
                        snapToGrid={snapToGrid}
                        gridSize={10}
                      />
                    ))
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 pointer-events-none">
                    <div className="text-center">
                      <Video size={48} className="mx-auto mb-2 opacity-50" />
                      <p>Nenhuma fonte adicionada</p>
                      <p className="text-sm mt-1">Adicione fontes para compor sua cena</p>
                    </div>
                  </div>
                )}

                {/* Overlay Fullscreen (Preview) */}
                {overlayAd && overlayAd.enabled && overlayAd.url && (
                  <div className="absolute inset-0 z-[10000] bg-black">
                    <img 
                      src={overlayAd.url} 
                      alt="Overlay Ad" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-purple-600/80 text-white px-2 py-1 rounded text-xs font-bold">
                      OVERLAY FULLSCREEN
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>
          </div>

          {/* Program Canvas (Ao Vivo) */}
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-bold flex items-center gap-2">
                <Play size={16} className="text-red-400" />
                PROGRAMA (AO VIVO)
              </h4>
              {scenes.find(s => s.is_active) && (
                <span className="text-amber-400 text-sm font-medium">
                  {scenes.find(s => s.is_active)?.name}
                </span>
              )}
            </div>
            
            {/* Canvas Program - Proporção 16:9 */}
            <div 
              ref={programCanvasRef}
              className="relative w-full bg-black rounded-lg overflow-hidden border-2 border-red-500/50"
              style={{ paddingBottom: '56.25%' }} // 16:9 aspect ratio
            >
              <div className="absolute inset-0">
                {scenes.find(s => s.is_active) ? (
                  programSources.length > 0 ? (
                    // Renderizar fontes da cena ativa
                    programSources
                      .filter(s => s.is_visible)
                      .sort((a, b) => a.position.zIndex - b.position.zIndex)
                      .map(source => {
                        const style: React.CSSProperties = {
                          position: 'absolute',
                          left: `${(source.position.x / 1920) * 100}%`,
                          top: `${(source.position.y / 1080) * 100}%`,
                          width: `${(source.position.width / 1920) * 100}%`,
                          height: `${(source.position.height / 1080) * 100}%`,
                          opacity: source.opacity,
                          zIndex: source.position.zIndex,
                          pointerEvents: 'none'
                        };

                        switch (source.type) {
                          case 'image':
                          case 'logo':
                          case 'sponsor':
                            return source.url ? (
                              <div key={source.id} style={style}>
                                <img 
                                  src={source.url} 
                                  alt={source.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            ) : null;
                          
                          case 'text':
                            return (
                              <div 
                                key={source.id} 
                                style={{
                                  ...style,
                                  color: source.content.color || '#ffffff',
                                  fontSize: `${(source.content.fontSize || 24) * (100 / 1920)}vw`,
                                  fontWeight: source.content.fontWeight || 'bold',
                                  textAlign: source.content.textAlign || 'left',
                                  padding: '0.5%',
                                  backgroundColor: source.content.backgroundColor || 'transparent',
                                  overflow: 'hidden',
                                  wordWrap: 'break-word'
                                }}
                              >
                                {source.content.text || source.name}
                              </div>
                            );
                          
                          case 'scoreboard':
                            return (
                              <div 
                                key={source.id} 
                                style={style}
                                className="bg-gradient-to-r from-blue-900/90 to-blue-800/90 backdrop-blur-sm rounded-lg border border-blue-400/50 flex items-center justify-between gap-4 text-white px-4"
                              >
                                <div className="text-center flex-1">
                                  <div className="text-xs font-semibold">Cruzeiro</div>
                                  <div className="text-xl font-bold">{source.content.homeScore || 0}</div>
                                </div>
                                <div className="text-lg font-bold">×</div>
                                <div className="text-center flex-1">
                                  <div className="text-xs font-semibold truncate">{source.content.awayTeam || 'Visitante'}</div>
                                  <div className="text-xl font-bold">{source.content.awayScore || 0}</div>
                                </div>
                              </div>
                            );
                          
                          case 'screenshare':
                            return null; // Compartilhar tela é tratado pelo VideoStream
                          
                          default:
                            return null;
                        }
                      })
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <div className="text-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mx-auto mb-2"></div>
                        <p className="text-sm">Cena ativa: {scenes.find(s => s.is_active)?.name}</p>
                        <p className="text-xs text-slate-400 mt-1">Nenhuma fonte visível</p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    <p>Nenhuma cena ativa</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Painel de Controle Lateral */}
        <div className="bg-slate-800 rounded-lg p-4 overflow-y-auto space-y-4">
          {/* Cenas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-bold text-sm flex items-center gap-2">
                <Layers size={16} />
                CENAS
              </h4>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowTemplates(true)}
                  className="text-purple-400 hover:text-purple-300 transition-colors p-1"
                  title="Templates"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => setShowAddScene(!showAddScene)}
                  className="text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {showAddScene && (
              <div className="mb-3 p-3 bg-slate-700/50 rounded-lg space-y-2">
                <input
                  type="text"
                  value={newScene.name}
                  onChange={(e) => setNewScene({ ...newScene, name: e.target.value })}
                  placeholder="Nome da cena"
                  className="w-full px-3 py-2 bg-slate-600 text-white rounded border border-slate-500 focus:border-amber-500 focus:outline-none text-sm"
                />
                <input
                  type="text"
                  value={newScene.description}
                  onChange={(e) => setNewScene({ ...newScene, description: e.target.value })}
                  placeholder="Descrição (opcional)"
                  className="w-full px-3 py-2 bg-slate-600 text-white rounded border border-slate-500 focus:border-amber-500 focus:outline-none text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={createScene}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded font-medium text-sm"
                  >
                    Criar
                  </button>
                  <button
                    onClick={() => setShowAddScene(false)}
                    className="flex-1 bg-slate-600 hover:bg-slate-700 text-white px-3 py-2 rounded font-medium text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {scenes.map((scene) => (
                <div
                  key={scene.id}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedScene?.id === scene.id
                      ? 'bg-amber-500/20 border-amber-500'
                      : scene.is_active
                        ? 'bg-red-500/10 border-red-500/50'
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                  }`}
                  onClick={() => setSelectedScene(scene)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium text-sm">{scene.name}</span>
                    <div className="flex items-center gap-1">
                      {scene.is_active && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded font-bold">
                          LIVE
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateScene(scene);
                        }}
                        className="text-blue-400 hover:text-blue-300 p-1"
                        title="Duplicar cena"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteScene(scene.id);
                        }}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Excluir cena"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {scene.description && (
                    <p className="text-slate-400 text-xs">{scene.description}</p>
                  )}
                </div>
              ))}
              
              {scenes.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">
                  Nenhuma cena criada ainda
                </p>
              )}
            </div>
          </div>

          {/* Fontes (Sources) */}
          {selectedScene && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-bold text-sm flex items-center gap-2">
                  <Grid size={16} />
                  FONTES
                </h4>
                <button
                  onClick={() => setShowAddSource(!showAddSource)}
                  className="text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>

              {showAddSource && (
                <div className="mb-3 p-3 bg-slate-700/50 rounded-lg space-y-2">
                  <select
                    value={newSource.type}
                    onChange={(e) => setNewSource({ ...newSource, type: e.target.value as Source['type'] })}
                    className="w-full px-3 py-2 bg-slate-600 text-white rounded border border-slate-500 focus:border-amber-500 focus:outline-none text-sm"
                  >
                    <option value="image">Imagem</option>
                    <option value="logo">Logo</option>
                    <option value="sponsor">Patrocinador</option>
                    <option value="text">Texto</option>
                    <option value="scoreboard">Placar</option>
                    <option value="video">Vídeo</option>
                    <option value="camera">Câmera</option>
                    <option value="screen">Tela</option>
                  </select>
                  
                  <input
                    type="text"
                    value={newSource.name}
                    onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                    placeholder="Nome da fonte"
                    className="w-full px-3 py-2 bg-slate-600 text-white rounded border border-slate-500 focus:border-amber-500 focus:outline-none text-sm"
                  />

                  {['image', 'logo', 'sponsor'].includes(newSource.type) && (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="source-image-upload"
                      />
                      <label
                        htmlFor="source-image-upload"
                        className="w-full block px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer text-center text-sm"
                      >
                        📁 Fazer Upload de Imagem
                      </label>
                      {newSource.url && (
                        <img src={newSource.url} alt="Preview" className="w-full h-20 object-contain mt-2 rounded" />
                      )}
                    </div>
                  )}

                  {newSource.type === 'text' && (
                    <textarea
                      value={newSource.content.text || ''}
                      onChange={(e) => setNewSource({ 
                        ...newSource, 
                        content: { ...newSource.content, text: e.target.value } 
                      })}
                      placeholder="Digite o texto..."
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-600 text-white rounded border border-slate-500 focus:border-amber-500 focus:outline-none text-sm"
                    />
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={addSource}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded font-medium text-sm"
                    >
                      Adicionar
                    </button>
                    <button
                      onClick={() => setShowAddSource(false)}
                      className="flex-1 bg-slate-600 hover:bg-slate-700 text-white px-3 py-2 rounded font-medium text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className={`p-2 rounded-lg border transition-all cursor-pointer ${
                      selectedSource?.id === source.id
                        ? 'bg-amber-500/20 border-amber-500'
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                    onClick={() => setSelectedSource(source)}
                    onDoubleClick={() => setEditingSource(source)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-white">
                          {getSourceIcon(source.type)}
                        </span>
                        <span className="text-white text-sm truncate">{source.name}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSource(source);
                          }}
                          className="text-blue-400 hover:text-blue-300 p-1"
                          title="Editar fonte"
                        >
                          <Settings size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSourceVisibility(source);
                          }}
                          className={`p-1 ${source.is_visible ? 'text-green-400' : 'text-slate-500'}`}
                          title={source.is_visible ? 'Ocultar' : 'Mostrar'}
                        >
                          {source.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSource(source.id);
                          }}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Remover"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {sources.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-4">
                    Nenhuma fonte adicionada
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      ) : (
        /* Layout de Propagandas */
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <AdManager
                streamId={streamId}
                onAdImagesChange={(images) => {
                  // Callback para atualizar no componente pai se necessário
                }}
                onOverlayAdChange={(ad) => {
                  setOverlayAd(ad);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Biblioteca de Fontes Modal */}
      {showSourceLibrary && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">📚 Biblioteca de Fontes</h3>
              <button
                onClick={() => setShowSourceLibrary(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4">
              {!selectedScene ? (
                <div className="text-center py-12">
                  <Layers size={48} className="mx-auto mb-3 text-slate-500" />
                  <p className="text-white font-semibold mb-2">Nenhuma cena selecionada</p>
                  <p className="text-slate-400 text-sm">
                    Selecione ou crie uma cena primeiro para adicionar fontes
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Logo Cruzeiro */}
                <div 
                  className="bg-slate-700 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-600 transition-all"
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase
                        .from('stream_sources')
                        .insert({
                          scene_id: selectedScene.id,
                          type: 'logo',
                          name: 'Logo Cruzeiro',
                          url: null,
                          content: {},
                          position: { x: 760, y: 20, width: 100, height: 100, zIndex: 90 },
                          is_visible: false, // Desativado por padrão - admin ativa quando necessário
                          opacity: 1,
                          transform: {},
                          animation: {}
                        })
                        .select()
                        .single();

                      if (error) throw error;
                      setSources([...sources, data]);
                      setShowSourceLibrary(false);
                      toast.success('Logo do Cruzeiro adicionado! Faça upload da imagem.');
                    } catch (error) {
                      console.error('Erro:', error);
                      toast.error('Erro ao adicionar logo');
                    }
                  }}
                >
                  <ImageIcon size={32} className="mx-auto mb-2 text-amber-400" />
                  <p className="text-white text-sm font-medium">Logo Cruzeiro</p>
                  <p className="text-slate-400 text-xs mt-1">Logo oficial do time</p>
                </div>
                
                {/* Patrocinadores */}
                <div 
                  className="bg-slate-700 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-600 transition-all"
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase
                        .from('stream_sources')
                        .insert({
                          scene_id: selectedScene.id,
                          type: 'sponsor',
                          name: 'Patrocinador',
                          url: null,
                          content: {},
                          position: { x: 730, y: 470, width: 150, height: 80, zIndex: 85 },
                          is_visible: false, // Desativado por padrão - admin ativa quando necessário
                          opacity: 0.9,
                          transform: {},
                          animation: {}
                        })
                        .select()
                        .single();

                      if (error) throw error;
                      setSources([...sources, data]);
                      setShowSourceLibrary(false);
                      toast.success('Patrocinador adicionado! Faça upload da imagem.');
                    } catch (error) {
                      console.error('Erro:', error);
                      toast.error('Erro ao adicionar patrocinador');
                    }
                  }}
                >
                  <Award size={32} className="mx-auto mb-2 text-blue-400" />
                  <p className="text-white text-sm font-medium">Patrocinadores</p>
                  <p className="text-slate-400 text-xs mt-1">Logos dos patrocinadores</p>
                </div>
                
                {/* Placar */}
                <div 
                  className="bg-slate-700 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-600 transition-all"
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase
                        .from('stream_sources')
                        .insert({
                          scene_id: selectedScene.id,
                          type: 'scoreboard',
                          name: 'Placar',
                          url: null,
                          content: { homeScore: 0, awayScore: 0, awayTeam: 'Adversário' },
                          position: { x: 310, y: 20, width: 300, height: 80, zIndex: 100 },
                          is_visible: false, // Desativado por padrão - admin ativa quando necessário
                          opacity: 1,
                          transform: {},
                          animation: {}
                        })
                        .select()
                        .single();

                      if (error) throw error;
                      setSources([...sources, data]);
                      setShowSourceLibrary(false);
                      toast.success('Placar adicionado!');
                    } catch (error) {
                      console.error('Erro:', error);
                      toast.error('Erro ao adicionar placar');
                    }
                  }}
                >
                  <Grid size={32} className="mx-auto mb-2 text-green-400" />
                  <p className="text-white text-sm font-medium">Placar</p>
                  <p className="text-slate-400 text-xs mt-1">Placar do jogo</p>
                </div>
                
                {/* Texto Personalizado */}
                <div 
                  className="bg-slate-700 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-600 transition-all"
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase
                        .from('stream_sources')
                        .insert({
                          scene_id: selectedScene.id,
                          type: 'text',
                          name: 'Texto',
                          url: null,
                          content: {
                            text: 'Digite seu texto aqui',
                            fontSize: 32,
                            color: '#ffffff',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            backgroundColor: 'rgba(0, 0, 0, 0.7)'
                          },
                          position: { x: 260, y: 200, width: 400, height: 100, zIndex: 95 },
                          is_visible: false, // Desativado por padrão - admin ativa quando necessário
                          opacity: 1,
                          transform: {},
                          animation: {}
                        })
                        .select()
                        .single();

                      if (error) throw error;
                      setSources([...sources, data]);
                      setShowSourceLibrary(false);
                      toast.success('Texto adicionado!');
                    } catch (error) {
                      console.error('Erro:', error);
                      toast.error('Erro ao adicionar texto');
                    }
                  }}
                >
                  <Type size={32} className="mx-auto mb-2 text-purple-400" />
                  <p className="text-white text-sm font-medium">Texto Personalizado</p>
                  <p className="text-slate-400 text-xs mt-1">Adicionar texto</p>
                </div>
                
                {/* Imagem */}
                <div 
                  className="bg-slate-700 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-600 transition-all"
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase
                        .from('stream_sources')
                        .insert({
                          scene_id: selectedScene.id,
                          type: 'image',
                          name: 'Imagem',
                          url: null,
                          content: {},
                          position: { x: 50, y: 50, width: 200, height: 150, zIndex: 50 },
                          is_visible: false, // Desativado por padrão - admin ativa quando necessário
                          opacity: 1,
                          transform: {},
                          animation: {}
                        })
                        .select()
                        .single();

                      if (error) throw error;
                      setSources([...sources, data]);
                      setShowSourceLibrary(false);
                      toast.success('Imagem adicionada! Faça upload da imagem.');
                    } catch (error) {
                      console.error('Erro:', error);
                      toast.error('Erro ao adicionar imagem');
                    }
                  }}
                >
                  <ImageIcon size={32} className="mx-auto mb-2 text-pink-400" />
                  <p className="text-white text-sm font-medium">Imagem</p>
                  <p className="text-slate-400 text-xs mt-1">Banner ou foto</p>
                </div>
                
                {/* Compartilhar Tela */}
                <div 
                  className="bg-slate-700 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-600 transition-all"
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase
                        .from('stream_sources')
                        .insert({
                          scene_id: selectedScene.id,
                          type: 'screenshare',
                          name: 'Compartilhar Tela',
                          url: null,
                          content: {},
                          position: { x: 0, y: 0, width: 1920, height: 1080, zIndex: 10 },
                          is_visible: false, // Desativado por padrão - admin ativa quando for compartilhar
                          opacity: 1,
                          transform: {},
                          animation: {}
                        })
                        .select()
                        .single();

                      if (error) throw error;
                      setSources([...sources, data]);
                      setShowSourceLibrary(false);
                      toast.success('Compartilhar Tela adicionado! Ative quando for compartilhar a tela.');
                    } catch (error) {
                      console.error('Erro:', error);
                      toast.error('Erro ao adicionar compartilhar tela');
                    }
                  }}
                >
                  <Monitor size={32} className="mx-auto mb-2 text-cyan-400" />
                  <p className="text-white text-sm font-medium">Compartilhar Tela</p>
                  <p className="text-slate-400 text-xs mt-1">Capturar tela do computador</p>
                </div>
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Editor de Fonte Modal */}
      {editingSource && (
        <SourceEditor
          source={editingSource}
          onClose={() => setEditingSource(null)}
          onUpdate={(updatedSource) => {
            setSources(sources.map(s => s.id === updatedSource.id ? updatedSource : s));
            setEditingSource(null);
          }}
          onDelete={() => {
            deleteSource(editingSource.id);
            setEditingSource(null);
          }}
        />
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <SceneTemplates
          streamId={streamId}
          onClose={() => setShowTemplates(false)}
          onTemplateApplied={() => {
            loadScenes();
            setShowTemplates(false);
          }}
        />
      )}

      {/* Tutorial Modal */}
      {showTutorial && (
        <QuickTutorial onClose={() => setShowTutorial(false)} />
      )}
    </div>
  );
};

export default StreamStudio;
