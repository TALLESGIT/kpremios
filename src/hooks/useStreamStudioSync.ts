// Hook personalizado para sincronizar Stream Studio com transmissão ao vivo
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ActiveScene {
  id: string;
  stream_id: string;
  name: string;
  sources: Array<{
    id: string;
    type: string;
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
  }>;
}

export const useStreamStudioSync = (streamId: string) => {
  const [activeScene, setActiveScene] = useState<ActiveScene | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar cena ativa
  const loadActiveScene = async () => {
    // Validar streamId antes de fazer query
    if (!streamId || streamId.trim() === '') {
      setActiveScene(null);
      setLoading(false);
      return;
    }

    try {
      // Buscar cena ativa
      const { data: scene, error: sceneError } = await supabase
        .from('stream_scenes')
        .select('*')
        .eq('stream_id', streamId)
        .eq('is_active', true)
        .maybeSingle(); // Usar maybeSingle ao invés de single

      if (sceneError) {
        console.error('Erro ao carregar cena ativa:', sceneError);
        setActiveScene(null);
        setLoading(false);
        return;
      }

      if (!scene) {
        console.log('⚠️ useStreamStudioSync - Nenhuma cena ativa encontrada para streamId:', streamId);
        setActiveScene(null);
        setLoading(false);
        return;
      }

      console.log('📋 useStreamStudioSync - Cena ativa encontrada:', {
        sceneId: scene.id,
        sceneName: scene.name,
        streamId: scene.stream_id
      });

      // Buscar TODAS as fontes da cena (visíveis e invisíveis)
      // O filtro is_visible será aplicado no render, mas precisamos de todas para o admin controlar
      const { data: sources, error: sourcesError } = await supabase
        .from('stream_sources')
        .select('*')
        .eq('scene_id', scene.id)
        .order('position->zIndex', { ascending: true });

      if (sourcesError) throw sourcesError;

      const sceneData = {
        ...scene,
        sources: sources || []
      };

      console.log('✅ useStreamStudioSync - Cena ativa carregada:', {
        sceneId: scene.id,
        sceneName: scene.name,
        totalSources: sources?.length || 0,
        visibleSources: sources?.filter(s => s.is_visible)?.length || 0,
        sources: sources?.map(s => ({ name: s.name, type: s.type, visible: s.is_visible }))
      });

      setActiveScene(sceneData);
      setLoading(false);
    } catch (error) {
      console.error('❌ Erro ao carregar cena ativa:', error);
      setActiveScene(null);
      setLoading(false);
    }
  };

  // Escutar mudanças em tempo real
  useEffect(() => {
    // Não iniciar se streamId estiver vazio
    if (!streamId || streamId.trim() === '') {
      return;
    }

    loadActiveScene();

    // Subscription para mudanças na cena ativa
    const sceneChannel = supabase
      .channel(`stream_scene_${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stream_scenes',
          filter: `stream_id=eq.${streamId}`
        },
        (payload) => {
          console.log('🔄 useStreamStudioSync - Cena atualizada via realtime:', {
            event: payload.eventType,
            new: payload.new,
            old: payload.old
          });
          // Aguardar um pouco para garantir que o banco foi atualizado
          setTimeout(() => {
            loadActiveScene();
          }, 500);
        }
      )
      .subscribe();

    // Subscription para mudanças nas fontes
    const sourcesChannel = supabase
      .channel(`stream_sources_${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stream_sources'
        },
        (payload) => {
          console.log('🔄 useStreamStudioSync - Fonte atualizada via realtime:', {
            event: payload.eventType,
            sourceId: payload.new?.id || payload.old?.id
          });
          // Aguardar um pouco para garantir que o banco foi atualizado
          setTimeout(() => {
            loadActiveScene();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sceneChannel);
      supabase.removeChannel(sourcesChannel);
    };
  }, [streamId]);

  return { activeScene, loading, refresh: loadActiveScene };
};

export default useStreamStudioSync;
