import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase: Missing environment variables! Check your .env file or build configuration.');
}

const validUrl = String(supabaseUrl || '').trim();
const validKey = String(supabaseAnonKey || '').trim();

if (!validUrl || !validKey || validUrl === 'undefined' || validKey === 'undefined') {
  console.error('❌ Supabase: Invalid environment variables detected!', { url: validUrl, key: validKey ? 'exists' : 'missing' });
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