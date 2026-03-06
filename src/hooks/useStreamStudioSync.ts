// Hook personalizado para sincronizar Stream Studio com transmissão ao vivo
import { useEffect, useState, useRef, useCallback } from 'react';
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
  const activeSceneIdRef = useRef<string | null>(null);
  const loadActiveSceneTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Carregar cena ativa - memoizado para evitar recriações
  // Com debounce para evitar múltiplos recarregamentos simultâneos
  const loadActiveScene = useCallback(async (immediate: boolean = false) => {
    // Cancelar timeout anterior se existir
    if (loadActiveSceneTimeoutRef.current && !immediate) {
      clearTimeout(loadActiveSceneTimeoutRef.current);
    }
    
    const load = async () => {
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

        // Atualizar ref
        activeSceneIdRef.current = scene.id;

        setActiveScene(sceneData);
        setLoading(false);
      } catch (error) {
        console.error('❌ Erro ao carregar cena ativa:', error);
        setActiveScene(null);
        setLoading(false);
      }
    };
    
    // Se immediate, carregar imediatamente; senão, debounce de 300ms
    if (immediate) {
      loadActiveSceneTimeoutRef.current = null;
      return load();
    } else {
      loadActiveSceneTimeoutRef.current = setTimeout(load, 300);
      return Promise.resolve(); // Retornar promise resolvida para manter compatibilidade
    }
  }, [streamId]);

  // Escutar mudanças em tempo real
  useEffect(() => {
    // Não iniciar se streamId estiver vazio
    if (!streamId || streamId.trim() === '') {
      return;
    }

    // Carregar cena inicial (imediato na primeira vez)
    loadActiveScene(true);

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
          const newScene = payload.new as any;
          const oldScene = payload.old as any;
          console.log('🔄 useStreamStudioSync - Cena atualizada via realtime:', {
            event: payload.eventType,
            sceneId: newScene?.id || oldScene?.id,
            isActive: newScene?.is_active
          });
          // Recarregar (com debounce para evitar múltiplas chamadas)
          loadActiveScene(false);
        }
      )
      .subscribe();

    // Subscription para mudanças nas fontes - atualiza quando qualquer fonte mudar
    const sourcesChannel = supabase
      .channel(`stream_sources_realtime_${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stream_sources'
        },
        (payload) => {
          const newSource = payload.new as any;
          const oldSource = payload.old as any;
          const sourceSceneId = newSource?.scene_id || oldSource?.scene_id;
          const sourceId = newSource?.id || oldSource?.id;
          const isVisible = newSource?.is_visible;
          const sourceName = newSource?.name || oldSource?.name;

          console.log('🔄 useStreamStudioSync - Fonte atualizada via realtime:', {
            event: payload.eventType,
            sourceId,
            sourceName,
            sceneId: sourceSceneId,
            isVisible,
            isVisibleOld: oldSource?.is_visible,
            currentActiveSceneId: activeSceneIdRef.current,
            payloadNew: newSource,
            payloadOld: oldSource
          });

          // Verificar se a fonte pertence à cena ativa
          const currentSceneId = activeSceneIdRef.current;
          
          if (currentSceneId && sourceSceneId === currentSceneId) {
            console.log('⚡ useStreamStudioSync - Fonte da cena ativa atualizada via realtime!');
            
            // Atualizar estado imediatamente com os novos dados do payload (atualização otimista)
            if (payload.eventType === 'UPDATE' && newSource && sourceId) {
              console.log('🔄 useStreamStudioSync - Aplicando atualização otimista no estado...');
              
              setActiveScene(prev => {
                if (!prev || prev.id !== currentSceneId) {
                  console.log('⚠️ useStreamStudioSync - Estado anterior não encontrado');
                  return prev;
                }
                
                // Verificar se a fonte existe antes de atualizar
                const sourceExists = prev.sources.some(s => s.id === sourceId);
                if (!sourceExists) {
                  console.log('⚠️ useStreamStudioSync - Fonte não encontrada no estado, recarregando...');
                  loadActiveScene(false);
                  return prev;
                }
                
                // Atualizar fonte específica no estado
                const updatedSources = prev.sources.map(source => {
                  if (source.id === sourceId) {
                    const updated = { 
                      ...source, 
                      ...newSource,
                      // Garantir que campos críticos estejam presentes
                      is_visible: newSource.is_visible !== undefined ? newSource.is_visible : source.is_visible,
                      opacity: newSource.opacity !== undefined ? newSource.opacity : source.opacity
                    };
                    console.log('🔄 useStreamStudioSync - Fonte atualizada no estado local:', {
                      sourceId,
                      sourceName,
                      oldVisible: source.is_visible,
                      newVisible: updated.is_visible,
                      hasChanged: source.is_visible !== updated.is_visible
                    });
                    return updated;
                  }
                  return source;
                });
                
                const visibleCount = updatedSources.filter(s => s.is_visible).length;
                
                console.log('✅ useStreamStudioSync - Estado atualizado OTIMISTAMENTE:', {
                  sourceId,
                  sourceName,
                  isVisible: newSource.is_visible,
                  totalSources: updatedSources.length,
                  visibleSources: visibleCount,
                  allSources: updatedSources.map(s => ({ id: s.id, name: s.name, visible: s.is_visible }))
                });
                
                // Criar um NOVO objeto sempre para garantir que React detecte a mudança
                return {
                  ...prev,
                  sources: [...updatedSources] // Nova array para garantir mudança de referência
                };
              });
              
              // NÃO recarregar do banco imediatamente - confiar na atualização otimista
              // O polling periódico ou próxima mudança realtime vai sincronizar
              // Isso evita múltiplos recarregamentos
            } else {
              // Se não temos newSource, recarregar (com debounce)
              console.log('🔄 useStreamStudioSync - Recarregando do banco (sem newSource)...');
              loadActiveScene(false);
            }
          } else if (!currentSceneId) {
            // Se não sabemos qual é a cena ativa, recarregar tudo (com debounce)
            loadActiveScene(false);
          }
        }
      )
      .subscribe();

    // Fallback: polling periódico caso Realtime não funcione
    // Intervalo aumentado para 10 segundos para evitar loops e sobrecarga
    // O Realtime deve ser suficiente para a maioria dos casos
    const pollingInterval = setInterval(() => {
      // Apenas fazer polling se houver uma cena ativa E se não houver mudanças recentes
      if (activeSceneIdRef.current) {
        // Verificar se já há uma subscription ativa antes de fazer polling
        // Isso reduz recarregamentos desnecessários
        loadActiveScene(false); // Com debounce para evitar sobrecarga
      }
    }, 10000); // Polling a cada 10 segundos como fallback (reduzido de 2s para evitar loops)

    // Log de confirmação de subscriptions
    console.log('✅ useStreamStudioSync - Subscriptions configuradas:', {
      sceneChannel: `stream_scene_${streamId}`,
      sourcesChannel: `stream_sources_realtime_${streamId}`,
      pollingEnabled: true
    });

    return () => {
      // Limpar timeout pendente
      if (loadActiveSceneTimeoutRef.current) {
        clearTimeout(loadActiveSceneTimeoutRef.current);
        loadActiveSceneTimeoutRef.current = null;
      }
      clearInterval(pollingInterval);
      supabase.removeChannel(sceneChannel);
      supabase.removeChannel(sourcesChannel);
      console.log('🔄 useStreamStudioSync - Subscriptions removidas');
    };
  }, [streamId, loadActiveScene]);

  return { activeScene, loading, refresh: loadActiveScene };
};

export default useStreamStudioSync;
