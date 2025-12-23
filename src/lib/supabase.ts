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
    detectSessionInUrl: false,
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    },
    // Configuração para lidar melhor com erros de conexão WebSocket
    log_level: import.meta.env.DEV ? 'warn' : 'error', // Reduz logs de erro no console
    // Timeout para conexão WebSocket (5 segundos)
    timeout: 5000,
    // Configuração de reconexão
    heartbeatIntervalMs: 30000,
    reconnectAfterMs: (tries: number) => {
      // Aumentar intervalo entre tentativas (máximo 30 segundos)
      return Math.min(tries * 1000, 30000);
    }
  }
});