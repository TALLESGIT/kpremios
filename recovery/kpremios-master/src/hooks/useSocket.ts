// =====================================================
// HOOK: useSocket - Conexão Socket.io Realtime
// =====================================================
// Substitui Supabase Realtime para suportar 1000+ viewers

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Função para determinar a URL do servidor Socket.IO dinamicamente
const getSocketServerUrl = (): string => {
  // 1. Verificar variável de ambiente explícita (prioridade máxima)
  const envUrl = import.meta.env.VITE_SOCKET_SERVER_URL;
  if (envUrl) {
    return envUrl;
  }

  // 2. Detectar ambiente baseado na URL atual
  const isProduction = window.location.hostname !== 'localhost' && 
                       window.location.hostname !== '127.0.0.1' &&
                       !window.location.hostname.startsWith('192.168.');

  if (isProduction) {
    // ⚠️ CRÍTICO: Em produção, SEMPRE usar api.zkoficial.com.br
    // Independente de onde o frontend está hospedado (Vercel, etc)
    // O backend Socket.IO está sempre em api.zkoficial.com.br
    return 'https://api.zkoficial.com.br';
  }

  // 3. Desenvolvimento local
  return 'http://localhost:3001';
};

const SOCKET_SERVER_URL = getSocketServerUrl();
const isSocketDebug = () => (import.meta as any).env?.DEV === true || (import.meta as any).env?.VITE_DEBUG_LIVE === '1';
if (isSocketDebug()) {
  console.log('🔌 useSocket: URL do servidor Socket.IO:', SOCKET_SERVER_URL);
}

// Singleton global para o socket
let globalSocket: Socket | null = null;
let socketConnectionCount = 0;
let globalListenersAttached = false;
const connectionCallbacks = new Set<() => void>();
const disconnectionCallbacks = new Set<() => void>();

// Função para notificar todos os componentes sobre mudança de conexão
const notifyConnectionChange = (connected: boolean) => {
  if (connected) {
    connectionCallbacks.forEach(callback => callback());
  } else {
    disconnectionCallbacks.forEach(callback => callback());
  }
};

interface UseSocketOptions {
  streamId?: string;
  autoConnect?: boolean;
  onError?: (error: any) => void;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  joinStream: (streamId: string) => void;
  leaveStream: (streamId: string) => void;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { streamId, autoConnect = true, onError } = options;
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Map<string, Set<Function>>>(new Map());

  // Inicializar Socket.io (usando singleton global)
  useEffect(() => {
    if (!autoConnect) return;

    // Reutilizar socket global se existir
    if (globalSocket && globalSocket.connected) {
      if (isSocketDebug()) console.log('🔌 useSocket: Reutilizando socket global existente');
      socketRef.current = globalSocket;
      setSocket(globalSocket);
      setIsConnected(true);
      socketConnectionCount++;
      
      // Se streamId fornecido, entrar na stream
      if (streamId && globalSocket.connected) {
        globalSocket.emit('join-stream', { streamId });
      }
      
      return () => {
        socketConnectionCount--;
        // Só desconectar se não houver mais componentes usando
        if (socketConnectionCount <= 0 && globalSocket) {
          if (isSocketDebug()) console.log('🔌 useSocket: Último componente, desconectando socket global');
          globalSocket.disconnect();
          globalSocket = null;
        }
      };
    }

    // Criar novo socket apenas se não existir um global
    if (!globalSocket) {
      const isProduction = window.location.hostname !== 'localhost' && 
                           window.location.hostname !== '127.0.0.1' &&
                           !window.location.hostname.startsWith('192.168.');
      
      if (isSocketDebug()) {
        console.log('🔌 useSocket: Criando novo socket global...', SOCKET_SERVER_URL);
        console.log('🔌 useSocket: Ambiente:', isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO');
      }

      const newSocket = io(SOCKET_SERVER_URL, {
        path: '/socket.io/', // Path explícito para Socket.IO
        // CRÍTICO: Socket.IO Engine.IO 4.x sempre precisa de handshake inicial via polling
        // Depois faz upgrade automático para websocket (melhor performance)
        // Sempre incluir polling primeiro, depois websocket
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        timeout: 20000,
        // Permitir upgrade de polling para websocket (recomendado)
        upgrade: true,
        rememberUpgrade: isProduction, // Em produção, lembrar upgrade para WebSocket
        // Credenciais para CORS
        withCredentials: true,
        // Auto-connect
        autoConnect: true
      });

      globalSocket = newSocket;
      socketConnectionCount = 1;
    } else {
      socketConnectionCount++;
    }

    socketRef.current = globalSocket;
    setSocket(globalSocket);

    // Registrar callbacks para notificação de mudança de conexão
    const handleConnect = () => {
      setIsConnected(true);
    };
    
    const handleDisconnect = () => {
      setIsConnected(false);
    };
    
    connectionCallbacks.add(handleConnect);
    disconnectionCallbacks.add(handleDisconnect);

    // Event listeners (apenas uma vez por socket)
    if (!globalListenersAttached && globalSocket) {
      globalSocket.on('connect', () => {
        if (isSocketDebug()) console.log('✅ useSocket: Socket global conectado');
        // Notificar todos os componentes
        notifyConnectionChange(true);
      });

      globalSocket.on('disconnect', (reason) => {
        if (isSocketDebug()) console.log('❌ useSocket: Socket global desconectado, motivo:', reason);
        // Notificar todos os componentes
        notifyConnectionChange(false);
      });

      globalSocket.on('connect_error', (error) => {
        console.error('❌ useSocket: Erro de conexão:', error);
        notifyConnectionChange(false);
        onError?.(error);
      });

      globalSocket.on('error', (error) => {
        console.error('❌ useSocket: Erro:', error);
        onError?.(error);
      });
      
      globalListenersAttached = true;
    }

    // Atualizar estado de conexão inicial (verificar diretamente o socket)
    const checkConnection = () => {
      if (globalSocket && globalSocket.connected) {
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    };
    
    checkConnection();
    
    // Verificar periodicamente se conectou (para casos onde o componente monta antes da conexão)
    const connectionCheckInterval = setInterval(() => {
      if (globalSocket && globalSocket.connected) {
        setIsConnected(true);
      }
    }, 1000);

    // Cleanup
    return () => {
      clearInterval(connectionCheckInterval);
      
      socketConnectionCount--;
      if (isSocketDebug()) console.log(`🔌 useSocket: Cleanup - componentes restantes: ${socketConnectionCount}`);
      
      // Remover callbacks de conexão
      connectionCallbacks.delete(handleConnect);
      disconnectionCallbacks.delete(handleDisconnect);
      
      // Remover listeners deste componente
      listenersRef.current.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          globalSocket?.off(event, callback as any);
        });
      });
      listenersRef.current.clear();
      
      // Só desconectar se não houver mais componentes usando
      if (socketConnectionCount <= 0 && globalSocket) {
        if (isSocketDebug()) console.log('🔌 useSocket: Último componente, desconectando socket global');
        globalSocket.disconnect();
        globalSocket = null;
        globalListenersAttached = false;
        connectionCallbacks.clear();
        disconnectionCallbacks.clear();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [autoConnect, onError]); // Removido streamId das dependências

  // Entrar na stream quando streamId mudar ou conectar
  useEffect(() => {
    if (!socketRef.current || !streamId) return;
    
    if (socketRef.current.connected) {
      if (isSocketDebug()) console.log('👥 useSocket: Entrando na stream:', streamId);
      socketRef.current.emit('join-stream', { streamId });
    } else {
      // Se não estiver conectado, esperar conexão
      const handleConnect = () => {
        if (isSocketDebug()) console.log('👥 useSocket: Conectado, entrando na stream:', streamId);
        socketRef.current?.emit('join-stream', { streamId });
      };
      
      socketRef.current.once('connect', handleConnect);
      
      return () => {
        socketRef.current?.off('connect', handleConnect);
      };
    }
  }, [streamId, isConnected]);

  // Entrar na sala da stream
  const joinStream = useCallback((streamIdToJoin: string) => {
    if (!socketRef.current) {
      if (isSocketDebug()) console.warn('⚠️ useSocket: Socket não conectado, tentando conectar...');
      return;
    }

    if (isSocketDebug()) console.log('👥 useSocket: Entrando na stream:', streamIdToJoin);
    socketRef.current.emit('join-stream', { streamId: streamIdToJoin });
  }, []);

  // Sair da sala da stream
  const leaveStream = useCallback((streamIdToLeave: string) => {
    if (!socketRef.current) return;

    if (isSocketDebug()) console.log('👋 useSocket: Saindo da stream:', streamIdToLeave);
    socketRef.current.emit('leave-stream', { streamId: streamIdToLeave });
  }, []);

  // Emitir evento
  const emit = useCallback((event: string, data: any) => {
    if (!socketRef.current || !isConnected) {
      if (isSocketDebug()) console.warn('⚠️ useSocket: Socket não conectado, não foi possível emitir:', event);
      return;
    }

    socketRef.current.emit(event, data);
  }, [isConnected]);

  // Escutar evento
  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (!socketRef.current) {
      if (isSocketDebug()) console.warn('⚠️ useSocket: Socket não conectado, não foi possível escutar:', event);
      return;
    }

    // Registrar listener
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);

    // Adicionar listener ao socket
    socketRef.current.on(event, callback);

    // Cleanup function
    return () => {
      socketRef.current?.off(event, callback);
      listenersRef.current.get(event)?.delete(callback);
    };
  }, []);

  // Remover listener
  const off = useCallback((event: string, callback?: (data: any) => void) => {
    if (!socketRef.current) return;

    if (callback) {
      socketRef.current.off(event, callback);
      listenersRef.current.get(event)?.delete(callback);
    } else {
      // Remover todos os listeners do evento
      const callbacks = listenersRef.current.get(event);
      if (callbacks) {
        callbacks.forEach(cb => {
          socketRef.current?.off(event, cb as any);
        });
        callbacks.clear();
      }
    }
  }, []);

  return {
    socket,
    isConnected,
    joinStream,
    leaveStream,
    emit,
    on,
    off
  };
}
