import { supabase } from '../lib/supabase';
import { DEFAULT_LIVE_CHANNEL } from '../config/constants';

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
 * Busca informações da live stream usando cache do backend Socket.IO
 * Reduz 99% das requisições ao Supabase
 * @param channelName Nome do canal (padrão: ZkOficial)
 * @returns Dados da live stream
 */
export async function getLiveStream(channelName = DEFAULT_LIVE_CHANNEL): Promise<LiveStreamData | null> {
  try {
    // ✅ OTIMIZAÇÃO: Usar cache do backend Socket.IO
    const { getLiveStreamByChannel } = await import('./cachedLiveService');
    return await getLiveStreamByChannel(channelName);
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

