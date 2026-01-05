import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getLiveStream, LiveStreamData, getLiveStatus, LiveStatus } from '../services/liveService';

interface UseLiveStatusReturn {
  data: LiveStreamData | null;
  status: LiveStatus;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para gerenciar o status da live stream com Realtime Otimizado
 * @param channelName Nome do canal (padrão: 'zktv')
 */
export function useLiveStatus(channelName = 'zktv'): UseLiveStatusReturn {
  const [data, setData] = useState<LiveStreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let channel: any = null;

    // Carregar dados iniciais
    const loadInitialData = async () => {
      try {
        const streamData = await getLiveStream(channelName);
        if (mounted) {
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

    // Configurar Realtime Otimizado
    if (mounted) {
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
            console.log('📡 Realtime Payload:', payload);

            if (mounted) {
              if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                const newData = payload.new as LiveStreamData;
                console.log('✅ Realtime: Atualizando dados via payload direto (SEM RE-FETCH)');
                setData(newData);
                setError(null);
              } else if (payload.eventType === 'DELETE') {
                setData(null);
              } else {
                // Fallback para outros tipos de mudança
                getLiveStream(channelName).then(streamData => {
                  if (mounted) setData(streamData);
                });
              }
            }
          }
        )
        .subscribe();
    }

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
