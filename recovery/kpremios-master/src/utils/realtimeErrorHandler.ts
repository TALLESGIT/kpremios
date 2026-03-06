/**
 * Utilitário para tratar erros de conexão Realtime do Supabase
 * 
 * Este módulo fornece funções para lidar graciosamente com falhas
 * de conexão WebSocket do Supabase Realtime.
 */

/**
 * Verifica se um erro é relacionado a conexão WebSocket
 */
export function isWebSocketError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorString = String(error).toLowerCase();
  
  return (
    errorMessage.includes('websocket') ||
    errorMessage.includes('realtime') ||
    errorMessage.includes('connection failed') ||
    errorString.includes('websocket') ||
    errorString.includes('realtime')
  );
}

/**
 * Trata erros de conexão Realtime de forma silenciosa
 * Loga apenas em desenvolvimento
 */
export function handleRealtimeError(error: any, context?: string): void {
  if (isWebSocketError(error)) {
    // Em desenvolvimento, loga o erro para debug
    if (import.meta.env.DEV) {
      console.warn(
        `[Realtime] Erro de conexão WebSocket${context ? ` em ${context}` : ''}:`,
        error
      );
      console.info(
        '[Realtime] Dica: Verifique se o Realtime está habilitado no seu projeto Supabase.'
      );
    }
    // Em produção, não loga para não poluir o console
  } else {
    // Erros não relacionados a WebSocket são logados normalmente
    console.error('Erro:', error);
  }
}

/**
 * Wrapper para subscriptions Realtime com tratamento de erro
 */
export function createSafeRealtimeSubscription(
  channel: any,
  onError?: (error: any) => void
) {
  const originalSubscribe = channel.subscribe.bind(channel);
  
  channel.subscribe = (callback?: (status: string, err?: any) => void) => {
    return originalSubscribe((status: string, err?: any) => {
      if (err) {
        handleRealtimeError(err);
        if (onError) {
          onError(err);
        }
      }
      
      if (callback) {
        callback(status, err);
      }
    });
  };
  
  return channel;
}


