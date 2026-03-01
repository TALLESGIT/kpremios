// =====================================================
// ChatProvider - Provider global para gerenciar sessões de chat por streamId
// =====================================================

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../context/AuthContext';
import { getChatSessionStore, destroyChatSessionStore, ChatSessionStore } from './chatSessionStore';
import type { ChatMessage } from '../../hooks/useSocketChat';

interface ChatContextValue {
  getChatSession: (streamId: string) => ChatSessionStore | null;
  sendMessage: (streamId: string, message: string, options?: {
    messageType?: 'text' | 'audio' | 'tts';
    ttsText?: string;
    audioUrl?: string;
    audioDuration?: number;
  }) => void;
  emit: (streamId: string, event: string, data: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback: (data: any) => void) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { user } = useAuth();
  const socket = useSocket({ autoConnect: true });
  const activeStoresRef = useRef<Set<string>>(new Set());

  // Inicializar store quando socket conectar e streamId for fornecido
  const initializeStore = (streamId: string) => {
    if (activeStoresRef.current.has(streamId)) return;

    const store = getChatSessionStore(streamId);
    store.initialize({
      socket: socket.socket,
      isConnected: socket.isConnected,
      emit: socket.emit,
      on: socket.on,
      off: socket.off
    });
    activeStoresRef.current.add(streamId);
  };

  // Re-inicializar stores quando socket conectar
  useEffect(() => {
    if (socket.isConnected) {
      // Re-inicializar todos os stores ativos
      activeStoresRef.current.forEach(streamId => {
        const store = getChatSessionStore(streamId);
        if (store) {
          store.initialize({
            socket: socket.socket,
            isConnected: socket.isConnected,
            emit: socket.emit,
            on: socket.on,
            off: socket.off
          });
        }
      });
    }
  }, [socket.isConnected, socket.socket, socket.emit, socket.on, socket.off]);

  // Função para obter sessão de chat
  const getChatSession = (streamId: string): ChatSessionStore | null => {
    if (!streamId) return null;

    // Inicializar se ainda não foi
    if (!activeStoresRef.current.has(streamId)) {
      initializeStore(streamId);
    }

    return getChatSessionStore(streamId);
  };

  // Função para enviar mensagem (com userId do contexto)
  const sendMessage = (streamId: string, message: string, options: {
    messageType?: 'text' | 'audio' | 'tts';
    ttsText?: string;
    audioUrl?: string;
    audioDuration?: number;
  } = {}) => {
    const store = getChatSessionStore(streamId);
    if (!store || !socket.isConnected) {
      console.warn('⚠️ ChatProvider: Não foi possível enviar mensagem - store ou socket não disponível');
      return;
    }

    // Enviar via socket com userId do contexto
    socket.emit('chat-message', {
      streamId,
      userId: user?.id || null,
      userName: (user as any)?.name || user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anônimo',
      message,
      ...options
    });
  };

  // Função para emitir evento customizado
  const emit = (streamId: string, event: string, data: any) => {
    const store = getChatSessionStore(streamId);
    if (!store || !socket.isConnected) {
      console.warn('⚠️ ChatProvider: Não foi possível emitir evento - store ou socket não disponível');
      return;
    }
    socket.emit(event, { ...data, streamId });
  };

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      // Não destruir stores aqui - eles podem ser reutilizados
      // Apenas limpar referências
      activeStoresRef.current.clear();
    };
  }, []);

  const value: ChatContextValue = {
    getChatSession,
    sendMessage,
    emit,
    on: socket.on,
    off: socket.off
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

// Hook para usar o ChatProvider
export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat deve ser usado dentro de ChatProvider');
  }
  return context;
}

// Hook para usar uma sessão específica de chat
export function useChatSession(streamId: string | null | undefined) {
  const { getChatSession } = useChat();
  const [state, setState] = React.useState<{
    messages: ChatMessage[];
    loading: boolean;
    connected: boolean;
    error: string | null;
  }>({
    messages: [],
    loading: false,
    connected: false,
    error: null
  });

  useEffect(() => {
    if (!streamId) {
      setState({
        messages: [],
        loading: false,
        connected: false,
        error: null
      });
      return;
    }

    const store = getChatSession(streamId);
    if (!store) return;

    // Subscribe para mudanças
    const unsubscribe = store.subscribe(setState);

    return () => {
      unsubscribe();
    };
  }, [streamId, getChatSession]);

  return state;
}
