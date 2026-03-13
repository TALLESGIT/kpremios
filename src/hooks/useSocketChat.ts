// =====================================================
// HOOK: useSocketChat - Chat em Tempo Real via Socket.io
// =====================================================
// Substitui Supabase Realtime para chat

import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './useSocket';
import { useAuth } from '../context/AuthContext';

export interface ChatMessage {
  id: string;
  stream_id: string;
  user_id: string | null;
  user_name?: string;
  user_email?: string;
  message: string;
  message_type?: 'text' | 'audio' | 'tts';
  is_pinned?: boolean;
  pinned_link?: string;
  likes_count?: number;
  user_is_admin?: boolean;
  user_is_vip?: boolean;
  user_is_moderator?: boolean;
  tts_text?: string;
  audio_url?: string;
  audio_duration?: number;
  vip_color?: string;
  created_at: string;
}

interface UseSocketChatOptions {
  streamId: string;
  enabled?: boolean;
}

export interface UseSocketChatReturn {
  messages: ChatMessage[];
  isConnected: boolean;
  loading: boolean;
  sendMessage: (message: string, options?: MessageOptions) => Promise<void>;
  updateMessage: (messageId: string, updates: any) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
  onMessageUpdate: (callback: (data: any) => void) => void;
  onMessageDelete: (callback: (data: any) => void) => void;
}

interface MessageOptions {
  messageType?: 'text' | 'audio' | 'tts';
  ttsText?: string;
  audioUrl?: string;
  audioDuration?: number;
  isPinned?: boolean;
  pinnedLink?: string;
  vip_color?: string;
}

export const useSocketChat = (options: UseSocketChatOptions): UseSocketChatReturn => {
  const { streamId, enabled = true } = options;
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const { isConnected, emit, on, off } = useSocket({
    streamId,
    autoConnect: enabled
  });

  // Carregar mensagens iniciais do Supabase
  const loadInitialMessages = useCallback(async () => {
    if (!streamId) return;
    setLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase
        .from('live_chat_messages')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      if (data) setMessages(data);
    } catch (err) {
      console.error('Erro ao carregar mensagens iniciais:', err);
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  useEffect(() => {
    if (enabled && streamId) {
      loadInitialMessages();
    }
  }, [enabled, streamId, loadInitialMessages]);

  // Escutar novas mensagens via Socket.io
  useEffect(() => {
    if (!isConnected) return;

    const handleNewMessage = (message: ChatMessage) => {
      console.log('📩 useSocketChat: Nova mensagem via Socket.io:', message.id);
      setMessages(prev => {
        // 1. Evitar duplicatas por ID real
        if (prev.some(m => m.id === message.id)) return prev;

        // 2. Tentar encontrar uma mensagem otimista correspondente (mesmo texto e usuário)
        // para substituí-la pela real com ID definitivo
        const optimisticIndex = prev.findIndex(m => 
          m.id.startsWith('temp-') && 
          m.user_id === message.user_id && 
          m.message === message.message
        );

        if (optimisticIndex !== -1) {
          const newMessages = [...prev];
          newMessages[optimisticIndex] = message;
          return newMessages;
        }

        return [...prev, message];
      });
    };

    const handleMessageBroadcast = (message: ChatMessage) => {
      console.log('📢 useSocketChat: Confirmação de mensagem enviada:', message.id);
      // O handleNewMessage já cuida da substituição se o broadcast vier como 'new-message'
    };

    const handleMessageUpdated = (data: any) => {
      console.log('🔄 useSocketChat: Mensagem atualizada via Socket.io:', data.id);
      setMessages(prev => prev.map(m => m.id === data.id ? { ...m, ...data } : m));
    };

    const handleMessageDeleted = (data: any) => {
      const id = data.messageId || data.id;
      console.log('🗑️ useSocketChat: Mensagem deletada via Socket.io:', id);
      setMessages(prev => prev.filter(m => m.id !== id));
    };

    const handleStreamEnded = (data: any) => {
      console.log('🛑 useSocketChat: Transmissão encerrada:', data);
      const systemMessage: ChatMessage = {
        id: `system-ended-${Date.now()}`,
        stream_id: streamId,
        user_id: 'system',
        user_name: 'SISTEMA',
        message: 'Transmissão encerrada. Obrigado por assistir! A transmissão chegou ao fim. Fique atento para as próximas lives!',
        created_at: new Date().toISOString(),
        message_type: 'text'
      };
      setMessages(prev => [...prev, systemMessage]);
    };

    on('new-message', handleNewMessage);
    on('message-broadcast', handleMessageBroadcast);
    on('message-updated', handleMessageUpdated);
    on('message-deleted', handleMessageDeleted);
    on('stream-ended', handleStreamEnded);

    return () => {
      off('new-message', handleNewMessage);
      off('message-broadcast', handleMessageBroadcast);
      off('message-updated', handleMessageUpdated);
      off('message-deleted', handleMessageDeleted);
      off('stream-ended', handleStreamEnded);
    };
  }, [isConnected, on, off, streamId]);

  const sendMessage = async (message: string, options: MessageOptions = {}) => {
    if (!isConnected || !streamId) return;

    // Atualização Otimista Imediata
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      stream_id: streamId,
      user_id: user?.id || 'anonymous',
      user_name: (user as any)?.name || user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anônimo',
      user_email: user?.email,
      message,
      message_type: options.messageType || 'text',
      vip_color: options.vip_color,
      user_is_vip: !!options.vip_color,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMessage]);

    // Emitir para o servidor
    emit('chat-message', {
      streamId,
      userId: user?.id || null,
      userName: (user as any)?.name || user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anônimo',
      message,
      ...options // Já contém vip_color agora
    });
  };

  const updateMessage = async (_messageId: string, _updates: any) => {
    if (!isConnected) return;
    // No backend, atualizações de chat são ouvidas via Supabase Realtime no Server e broadcastadas como 'message-updated'
  };

  const deleteMessage = async (_messageId: string) => {
    if (!isConnected) return;
    // Mesma lógica do update, o backend não tem socket handler direto para delete de chat, apenas via DB
  };

  const onMessageUpdate = (callback: (data: any) => void) => {
    on('message-updated', callback);
  };

  const onMessageDelete = (callback: (data: any) => void) => {
    on('message-deleted', callback);
  };

  return {
    messages,
    isConnected,
    loading,
    sendMessage,
    updateMessage,
    deleteMessage,
    emit,
    on,
    off,
    onMessageUpdate,
    onMessageDelete
  };
};
