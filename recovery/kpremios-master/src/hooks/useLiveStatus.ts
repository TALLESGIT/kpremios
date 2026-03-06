import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getLiveStream, LiveStreamData, getLiveStatus, LiveStatus } from '../services/liveService';
import { DEFAULT_LIVE_CHANNEL } from '../config/constants';

const isLiveStatusDebug = () => (import.meta as any).env?.DEV === true || (import.meta as any).env?.VITE_DEBUG_LIVE === '1';

interface UseLiveStatusReturn {
  data: LiveStreamData | null;
  status: LiveStatus;
  loading: boolean;
  error: string | null;
}

/** Campos que afetam o player (vídeo/estado); se só viewer_count mudou, não re-renderizamos. */
function onlyViewerCountChanged(prev: LiveStreamData | null, next: LiveStreamData): boolean {
  if (!prev || prev.id !== next.id) return false;
  return (
    prev.is_active === next.is_active &&
    (prev.hls_url ?? '') === (next.hls_url ?? '') &&
    prev.channel_name === next.channel_name &&
    (prev.started_at ?? '') === (next.started_at ?? '')
  );
}

/**
 * Hook para gerenciar o status da live stream com Realtime Otimizado
 * Evita re-renders do player quando só viewer_count é atualizado (reduz travamentos).
 * @param channelName Nome do canal (padrão: ZkOficial)
 */
export function useLiveStatus(channelName = DEFAULT_LIVE_CHANNEL): UseLiveStatusReturn {
  const [data, setData] = useState<LiveStreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef<LiveStreamData | null>(null);
  const lastViewerOnlyUpdateRef = useRef<number>(0);
  const VIEWER_ONLY_THROTTLE_MS = 3000;

  useEffect(() => {
    let mounted = true;
    let channel: any = null;

    const loadInitialData = async () => {
      try {
        const streamData = await getLiveStream(channelName);
        if (mounted) {
          dataRef.current = streamData;
          setData(streamData);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          console.error('❌ Erro ao carregar live:', err);
          setError(err.message || 'Erro ao carregar live');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    channel = supabase
      .channel(`live_status_${channelName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_streams',
          filter: `channel_name=eq.${channelName}`,
        },
        (payload) => {
          if (isLiveStatusDebug()) {
            console.log('📡 Realtime Payload:', payload);
          }

          if (!mounted) return;

          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newData = payload.new as LiveStreamData;
            // Evita re-render do LiveViewer/player quando só viewer_count (ou updated_at) mudou
            if (
              payload.eventType === 'UPDATE' &&
              onlyViewerCountChanged(dataRef.current, newData)
            ) {
              const now = Date.now();
              if (now - lastViewerOnlyUpdateRef.current < VIEWER_ONLY_THROTTLE_MS) return;
              lastViewerOnlyUpdateRef.current = now;
              dataRef.current = { ...dataRef.current!, viewer_count: newData.viewer_count };
              return;
            }
            dataRef.current = newData;
            if (isLiveStatusDebug()) {
              console.log('✅ Realtime: Atualizando dados via payload direto (SEM RE-FETCH)');
            }
            setData(newData);
            setError(null);
          } else if (payload.eventType === 'DELETE') {
            dataRef.current = null;
            setData(null);
          } else {
            getLiveStream(channelName).then(streamData => {
              if (mounted) {
                dataRef.current = streamData;
                setData(streamData);
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [channelName]);

  const status: LiveStatus = data ? getLiveStatus(data.is_active) : 'OFFLINE';

  return { data, status, loading, error };
}
