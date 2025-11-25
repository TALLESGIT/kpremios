import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {

  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'zk-premios-app'
    }
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