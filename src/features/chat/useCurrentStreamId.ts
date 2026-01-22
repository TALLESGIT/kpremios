// =====================================================
// useCurrentStreamId - Hook para obter streamId atual da rota/página
// =====================================================

import { useParams, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * Hook que detecta o streamId atual baseado na rota:
 * - /live/:channelName -> busca stream por channel_name
 * - /zk-tv -> busca stream ativa ou zktv
 */
export function useCurrentStreamId(): string | null {
  const params = useParams<{ channelName?: string }>();
  const location = useLocation();
  const [streamId, setStreamId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const resolveStreamId = async () => {
      // Rota /live/:channelName
      if (params.channelName) {
        const { data } = await supabase
          .from('live_streams')
          .select('id')
          .eq('channel_name', params.channelName)
          .maybeSingle();
        
        if (mounted) {
          setStreamId(data?.id || null);
        }
        return;
      }

      // Rota /zk-tv
      if (location.pathname === '/zk-tv') {
        // Buscar stream ativa primeiro
        let { data, error } = await supabase
          .from('live_streams')
          .select('id')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Se não encontrar, buscar zktv
        if (!data || error) {
          const { data: zktvData } = await supabase
            .from('live_streams')
            .select('id')
            .eq('channel_name', 'zktv')
            .maybeSingle();
          data = zktvData;
        }

        if (mounted) {
          setStreamId(data?.id || null);
        }
        return;
      }

      // Outras rotas - sem stream
      if (mounted) {
        setStreamId(null);
      }
    };

    resolveStreamId();

    // Re-verificar periodicamente (para mudanças de stream ativa)
    const interval = setInterval(() => {
      if (mounted) {
        resolveStreamId();
      }
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [params.channelName, location.pathname]);

  return streamId;
}
