import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Garantir que os valores são strings válidas e não estão vazias
const validUrl = String(supabaseUrl).trim();
const validKey = String(supabaseAnonKey).trim();

if (!validUrl || !validKey || validUrl === 'undefined' || validKey === 'undefined') {
  throw new Error('Invalid Supabase environment variables. Values must be non-empty strings.');
}

// Configuração mínima do Supabase sem headers customizados que podem causar problemas
export const supabase = createClient(validUrl, validKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // ✅ CORREÇÃO: Não tentar refresh automático em caso de erro 400
    // Isso evita loops de erro quando o token está inválido
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase.auth.token',
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    },
    // Configuração para lidar melhor com erros de conexão WebSocket
    log_level: 'info', // Aumentado para ver detalhes da falha
    // Timeout para conexão WebSocket (10 segundos para lidar com cold starts do tenant)
    timeout: 10000,
    // Configuração de reconexão
    heartbeatIntervalMs: 30000,
    reconnectAfterMs: (tries: number) => {
      // Aumentar intervalo entre tentativas (máximo 30 segundos)
      return Math.min(tries * 2000, 30000);
    }
  }
});