import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Edit2, ChevronDown, ChevronUp, Layers, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface LiveControlPanelProps {
  streamId: string;
  channelName: string;
}

interface Scene {
  id: string;
  name: string;
  is_active: boolean;
}

interface Source {
  id: string;
  scene_id: string;
  type: string;
  name: string;
  is_visible: boolean;
  content: any;
}

const LiveControlPanel: React.FC<LiveControlPanelProps> = ({ streamId, channelName }) => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeSources, setActiveSources] = useState<Source[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [quickEditValue, setQuickEditValue] = useState('');

  // Carregar cenas
  useEffect(() => {
    // Validar streamId
    if (!streamId || streamId.trim() === '') {
      return;
    }

    loadScenes();
    const interval = setInterval(loadScenes, 2000); // Atualizar a cada 2s
    return () => clearInterval(interval);
  }, [streamId]);

  // Carregar fontes da cena ativa com sincronização em tempo real
  useEffect(() => {
    const activeScene = scenes.find(s => s.is_active);
    if (activeScene) {
      loadActiveSources(activeScene.id);
      
      // Subscription em tempo real para mudanças nas fontes
      const sourcesChannel = supabase
        .channel(`live_control_sources_${activeScene.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'stream_sources',
            filter: `scene_id=eq.${activeScene.id}`
          },
          (payload) => {
            console.log('🔄 LiveControlPanel - Fonte atualizada via realtime:', {
              event: payload.eventType,
              sourceId: payload.new?.id || payload.old?.id,
              visible: payload.new?.is_visible
            });
            // Recarregar fontes imediatamente
            loadActiveSources(activeScene.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(sourcesChannel);
      };
    }
  }, [scenes]);

  const loadScenes = async () => {
    // Validar streamId
    if (!streamId || streamId.trim() === '') {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('stream_scenes')
        .select('id, name, is_active')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setScenes(data || []);
    } catch (error) {
      console.error('Erro ao carregar cenas:', error);
    }
  };

  const loadActiveSources = async (sceneId: string) => {
    try {
      const { data, error } = await supabase
        .from('stream_sources')
        .select('*')
        .eq('scene_id', sceneId)
        .order('position->zIndex', { ascending: false });

      if (error) throw error;
      setActiveSources(data || []);
    } catch (error) {
      console.error('Erro ao carregar fontes:', error);
    }
  };

  const switchScene = async (sceneId: string) => {
    try {
      // Desativar todas as cenas
      await supabase
        .from('stream_scenes')
        .update({ is_active: false })
        .eq('stream_id', streamId);

      // Ativar cena selecionada
      const { error } = await supabase
        .from('stream_scenes')
        .update({ is_active: true })
        .eq('id', sceneId);

      if (error) throw error;

      // IMPORTANTE: Desativar TODAS as fontes da nova cena ao trocar
      // O admin deve ativar manualmente via toggle
      const { error: sourcesError } = await supabase
        .from('stream_sources')
        .update({ is_visible: false })
        .eq('scene_id', sceneId);

      if (sourcesError) {
        console.error('Aviso ao desativar fontes:', sourcesError);
      }

      toast.success(`Cena "${scenes.find(s => s.id === sceneId)?.name}" ativada! Fontes desativadas. 🎬`, {
        duration: 3000,
        icon: '🔴',
        style: {
          background: '#dc2626',
          color: '#fff',
          fontWeight: 'bold'
        }
      });
      
      loadScenes();
      // Recarregar fontes da nova cena
      loadActiveSources(sceneId);
    } catch (error) {
      console.error('Erro ao trocar cena:', error);
      toast.error('Erro ao trocar cena');
    }
  };

  const toggleSourceVisibility = async (source: Source) => {
    const newVisibility = !source.is_visible;
    
    // Atualizar estado local imediatamente para feedback instantâneo
    setActiveSources(activeSources.map(s =>
      s.id === source.id ? { ...s, is_visible: newVisibility } : s
    ));

    try {
      const { error } = await supabase
        .from('stream_sources')
        .update({ is_visible: newVisibility })
        .eq('id', source.id);

      if (error) throw error;

      toast.success(
        newVisibility
          ? `${source.name} visível ✅` 
          : `${source.name} ocultado 🚫`,
        {
          duration: 1500,
          style: {
            background: newVisibility ? '#10b981' : '#64748b',
            color: '#fff',
            fontWeight: 'bold'
          }
        }
      );
      
      console.log('✅ LiveControlPanel - Visibilidade atualizada:', {
        sourceId: source.id,
        sourceName: source.name,
        isVisible: newVisibility
      });
    } catch (error) {
      console.error('❌ Erro ao alterar visibilidade:', error);
      // Reverter estado local em caso de erro
      setActiveSources(activeSources.map(s =>
        s.id === source.id ? { ...s, is_visible: source.is_visible } : s
      ));
      toast.error('Erro ao alterar visibilidade');
    }
  };

  const quickEditSource = async (source: Source) => {
    if (source.type === 'scoreboard') {
      const scores = quickEditValue.split('x').map(s => parseInt(s.trim()) || 0);
      const newContent = {
        ...source.content,
        homeScore: scores[0] || 0,
        awayScore: scores[1] || 0
      };

      try {
        const { error } = await supabase
          .from('stream_sources')
          .update({ content: newContent })
          .eq('id', source.id);

        if (error) throw error;

        setActiveSources(activeSources.map(s =>
          s.id === source.id ? { ...s, content: newContent } : s
        ));

        toast.success('⚽ Placar atualizado!', {
          duration: 1500,
          style: {
            background: '#059669',
            color: '#fff',
            fontWeight: 'bold'
          }
        });
        setEditingSource(null);
        setQuickEditValue('');
      } catch (error) {
        console.error('Erro:', error);
        toast.error('Erro ao atualizar placar');
      }
    } else if (source.type === 'text') {
      const newContent = {
        ...source.content,
        text: quickEditValue
      };

      try {
        const { error } = await supabase
          .from('stream_sources')
          .update({ content: newContent })
          .eq('id', source.id);

        if (error) throw error;

        setActiveSources(activeSources.map(s =>
          s.id === source.id ? { ...s, content: newContent } : s
        ));

        toast.success('📝 Texto atualizado!', {
          duration: 1500,
          style: {
            background: '#059669',
            color: '#fff',
            fontWeight: 'bold'
          }
        });
        setEditingSource(null);
        setQuickEditValue('');
      } catch (error) {
        console.error('Erro:', error);
        toast.error('Erro ao atualizar texto');
      }
    }
  };

  if (!expanded) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setExpanded(true)}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 font-bold transition-all hover:scale-105 animate-pulse"
        >
          <div className="relative">
            <Zap size={20} className="text-white" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping"></div>
          </div>
          Controles AO VIVO
          <ChevronUp size={16} />
        </button>
      </div>
    );
  }

  const activeScene = scenes.find(s => s.is_active);

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 max-h-[70vh] bg-slate-900/95 backdrop-blur-md rounded-xl border border-red-500/50 shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 p-3 rounded-t-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Zap size={18} className="text-white" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
          <span className="text-white font-bold text-sm">Controles AO VIVO</span>
          <div className="bg-white/20 px-2 py-0.5 rounded text-xs text-white animate-pulse">
            🔴 ON AIR
          </div>
        </div>
        <button
          onClick={() => setExpanded(false)}
          className="text-white hover:bg-white/20 p-1 rounded transition-colors"
        >
          <ChevronDown size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Cenas */}
        <div>
          <h4 className="text-white font-semibold text-xs mb-2 flex items-center gap-1">
            🎬 CENAS
          </h4>
          <div className="space-y-1">
            {scenes.map(scene => (
              <button
                key={scene.id}
                onClick={() => switchScene(scene.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  scene.is_active
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {scene.is_active && '🔴 '}
                {scene.name}
              </button>
            ))}
          </div>
        </div>

        {/* Fontes da Cena Ativa */}
        {activeScene && activeSources.length > 0 && (
          <div>
            <h4 className="text-white font-semibold text-xs mb-2 flex items-center gap-1">
              ⚡ CONTROLES RÁPIDOS
            </h4>
            <div className="space-y-1">
              {activeSources.map(source => (
                <div key={source.id} className="bg-slate-800 rounded-lg p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-xs font-medium truncate flex-1">
                      {source.name}
                    </span>
                    <div className="flex items-center gap-1">
                      {/* Edição rápida para placar e texto */}
                      {(source.type === 'scoreboard' || source.type === 'text') && (
                        <button
                          onClick={() => {
                            setEditingSource(source);
                            if (source.type === 'scoreboard') {
                              setQuickEditValue(`${source.content.homeScore || 0} x ${source.content.awayScore || 0}`);
                            } else {
                              setQuickEditValue(source.content.text || '');
                            }
                          }}
                          className="text-blue-400 hover:text-blue-300 p-1"
                          title="Editar rápido"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                      
                      {/* Toggle visibilidade */}
                      <button
                        onClick={() => toggleSourceVisibility(source)}
                        className={`p-1 ${source.is_visible ? 'text-green-400' : 'text-slate-500'}`}
                        title={source.is_visible ? 'Ocultar' : 'Mostrar'}
                      >
                        {source.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Edição rápida */}
                  {editingSource?.id === source.id && (
                    <div className="mt-2 space-y-1">
                      <input
                        type="text"
                        value={quickEditValue}
                        onChange={(e) => setQuickEditValue(e.target.value)}
                        placeholder={source.type === 'scoreboard' ? '2 x 1' : 'Texto...'}
                        className="w-full px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600 focus:border-purple-500 focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            quickEditSource(source);
                          } else if (e.key === 'Escape') {
                            setEditingSource(null);
                            setQuickEditValue('');
                          }
                        }}
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => quickEditSource(source)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium"
                        >
                          ✓ Salvar
                        </button>
                        <button
                          onClick={() => {
                            setEditingSource(null);
                            setQuickEditValue('');
                          }}
                          className="flex-1 bg-slate-600 hover:bg-slate-700 text-white px-2 py-1 rounded text-xs font-medium"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Info do conteúdo */}
                  {source.type === 'scoreboard' && !editingSource && (
                    <div className="text-xs text-slate-400 mt-1">
                      {source.content.homeScore || 0} × {source.content.awayScore || 0}
                    </div>
                  )}
                  {source.type === 'text' && !editingSource && (
                    <div className="text-xs text-slate-400 mt-1 truncate">
                      {source.content.text || 'Sem texto'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dica */}
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2 mt-3">
          <p className="text-purple-300 text-xs">
            💡 <strong>Dica:</strong> Use este painel para controlar tudo ao vivo sem abrir o Studio!
          </p>
        </div>
      </div>
    </div>
  );
};

export default LiveControlPanel;
