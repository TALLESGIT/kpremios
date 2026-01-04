import { supabase } from '../lib/supabase';

export type LiveKitRole = 'admin' | 'reporter' | 'viewer';

interface TokenResponse {
  token: string;
}

interface TokenError {
  error: string;
}

/**
 * Obtém um token LiveKit para acessar uma sala
 * @param room Nome da sala (ex: 'zktv')
 * @param role Role do usuário (admin, reporter, viewer)
 * @returns Token JWT do LiveKit
 */
export async function getLiveKitToken(
  room: string,
  role: LiveKitRole = 'viewer'
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('livekit-token', {
      body: { room, role },
    });

    if (error) {
      console.error('❌ Erro ao obter token LiveKit:', error);
      throw new Error(error.message || 'Erro ao obter token LiveKit');
    }

    const response = data as TokenResponse | TokenError;

    if ('error' in response) {
      throw new Error(response.error);
    }

    return response.token;
  } catch (err: any) {
    console.error('❌ Erro ao chamar Edge Function:', err);
    throw new Error(err.message || 'Erro ao obter token LiveKit');
  }
}

/**
 * Obtém a URL HLS da transmissão LiveKit
 * @param room Nome da sala
 * @returns URL HLS (.m3u8)
 */
export function getLiveKitHlsUrl(room: string): string {
  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL || 'wss://zkoficial-6xokn1hv.livekit.cloud';
  // Converter wss:// para https:// e adicionar /hls/
  const httpsUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
  return `${httpsUrl}/hls/${room}/index.m3u8`;
}

/**
 * Notifica o Supabase que a transmissão LiveKit começou
 * Atualiza is_active e hls_url no banco de dados
 * @param streamId ID da stream no Supabase
 * @param channelName Nome do canal (room do LiveKit)
 * @returns true se atualizado com sucesso
 */
export async function notifyStreamStarted(
  streamId: string,
  channelName: string
): Promise<boolean> {
  try {
    console.log(`Usando streamId: ${streamId}`);
    
    const hlsUrl = getLiveKitHlsUrl(channelName);
    console.log(`HLS URL FINAL: ${hlsUrl}`);
    
    const { error } = await supabase
      .from('live_streams')
      .update({
        is_active: true,
        hls_url: hlsUrl,
        started_at: new Date().toISOString(),
      })
      .eq('id', streamId);

    if (error) {
      console.error('❌ Erro ao notificar início da stream:', error);
      throw error;
    }

    console.log('Supabase atualizado com sucesso');
    return true;
  } catch (err: any) {
    console.error('❌ Erro ao notificar início da stream:', err);
    throw err;
  }
}

/**
 * Notifica o Supabase que a transmissão LiveKit foi encerrada
 * @param streamId ID da stream no Supabase
 * @returns true se atualizado com sucesso
 */
export async function notifyStreamStopped(streamId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('live_streams')
      .update({
        is_active: false,
        hls_url: null,
      })
      .eq('id', streamId);

    if (error) {
      console.error('❌ Erro ao notificar fim da stream:', error);
      throw error;
    }

    console.log('✅ Stream encerrada no Supabase:', streamId);
    return true;
  } catch (err: any) {
    console.error('❌ Erro ao notificar fim da stream:', err);
    throw err;
  }
}
