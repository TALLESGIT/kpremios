// =====================================================
// SERVIÇO DE LIVE STREAMS COM CACHE
// =====================================================
// Usa o backend Socket.IO com cache para reduzir 99% das requisições ao Supabase
// Fallback para Supabase se o backend estiver offline

import { supabase } from '../lib/supabase';

const isCacheDebug = () => (import.meta as any).env?.DEV === true || (import.meta as any).env?.VITE_DEBUG_LIVE === '1';

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_SERVER_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : 'https://api.zkoficial.com.br');

export interface LiveStreamData {
  id: string;
  title: string;
  channel_name: string;
  is_active: boolean;
  hls_url: string | null;
  started_at: string | null;
  viewer_count?: number;
  description?: string | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  overlay_ad_url?: string | null;
  overlay_ad_enabled?: boolean;
  camera_pip_x?: number;
  camera_pip_y?: number;
  layout_config?: any;
  slideshow_images?: any[];
  current_slide_index?: number;
  layout_updated_at?: string;
  slow_mode_seconds?: number;
  moderators_only_mode?: boolean;
  vip_audio_count?: number;
  vip_overlay_count?: number;
}

/**
 * Busca live streams ativas usando cache do backend Socket.IO
 * Reduz 99% das requisições ao Supabase
 * Fallback automático para Supabase se backend estiver offline
 */
export async function getActiveLiveStreams(): Promise<LiveStreamData[]> {
  try {
    if (isCacheDebug()) console.log('📦 Buscando live streams do CACHE (backend Socket.IO)');

    const response = await fetch(`${SOCKET_SERVER_URL}/api/live-streams/active`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Timeout de 5 segundos
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Backend retornou ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success && result.data) {
      if (isCacheDebug()) console.log(`✅ Live streams do CACHE: ${result.data.length} streams, cached: ${result.cached}`);
      return result.data;
    }

    throw new Error('Resposta inválida do backend');
  } catch (error) {
    if (isCacheDebug()) console.warn('⚠️ Backend offline, usando fallback para Supabase:', error);
    return getActiveLiveStreamsFromSupabase();
  }
}

/**
 * Fallback: Busca diretamente do Supabase
 * Usado apenas se o backend estiver offline
 */
async function getActiveLiveStreamsFromSupabase(): Promise<LiveStreamData[]> {
  try {
    if (isCacheDebug()) console.log('🔄 Fallback: Buscando live streams diretamente do Supabase');

    const { data, error } = await supabase
      .from('live_streams')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar do Supabase:', error);
      throw error;
    }

    if (isCacheDebug()) console.log(`✅ Live streams do Supabase (fallback): ${data?.length || 0} streams`);
    return data || [];
  } catch (error) {
    console.error('❌ Erro crítico ao buscar live streams:', error);
    return [];
  }
}

/**
 * Busca uma live stream específica por channel_name
 * Usa cache quando possível
 */
export async function getLiveStreamByChannel(channelName: string): Promise<LiveStreamData | null> {
  try {
    // Buscar todas as streams ativas do cache
    const streams = await getActiveLiveStreams();
    
    // Procurar pela stream específica
    const stream = streams.find(s => s.channel_name === channelName);
    
    if (stream) {
      if (isCacheDebug()) console.log(`✅ Stream encontrada no cache: ${channelName}`);
      return stream;
    }

    if (isCacheDebug()) console.log(`⚠️ Stream ${channelName} não encontrada no cache, buscando do Supabase`);
    const { data, error } = await supabase
      .from('live_streams')
      .select('*')
      .eq('channel_name', channelName)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        if (isCacheDebug()) console.log(`⚠️ Stream ${channelName} não encontrada`);
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`❌ Erro ao buscar stream ${channelName}:`, error);
    return null;
  }
}

/**
 * Busca todas as streams (ativas e inativas)
 * Usa Supabase diretamente (apenas para admin)
 */
export async function getAllLiveStreams(): Promise<LiveStreamData[]> {
  try {
    const { data, error } = await supabase
      .from('live_streams')
      .select('*')
      .order('created_at', { ascending: false});

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('❌ Erro ao buscar todas as streams:', error);
    return [];
  }
}
