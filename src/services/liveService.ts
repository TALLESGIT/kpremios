import { supabase } from '../lib/supabase';

export type LiveStatus = 'LIVE' | 'OFFLINE';

export interface LiveStreamData {
  id: string;
  title: string;
  channel_name: string;
  is_active: boolean;
  hls_url: string | null;
  started_at: string | null;
  viewer_count?: number;
}

/**
 * Busca informações da live stream do Supabase
 * @param channelName Nome do canal (padrão: 'zktv')
 * @returns Dados da live stream
 */
export async function getLiveStream(channelName = 'zktv'): Promise<LiveStreamData | null> {
  try {
    const { data, error } = await supabase
      .from('live_streams')
      .select('id, title, channel_name, is_active, hls_url, started_at, viewer_count')
      .eq('channel_name', channelName)
      .single();

    if (error) {
      // Se não encontrar registro, retorna null (não é erro crítico)
      if (error.code === 'PGRST116') {
        console.log('⚠️ Live stream não encontrada:', channelName);
        return null;
      }
      throw error;
    }

    return data as LiveStreamData;
  } catch (error: any) {
    console.error('❌ Erro ao buscar live stream:', error);
    throw error;
  }
}

/**
 * Converte is_active (boolean) para status (LIVE/OFFLINE)
 */
export function getLiveStatus(isActive: boolean): LiveStatus {
  return isActive ? 'LIVE' : 'OFFLINE';
}

