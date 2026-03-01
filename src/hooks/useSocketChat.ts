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
  onMessageUpdate: (callback: (data: any) => void) => void;
  onMessageDelete: (callback: (data: any) => void) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
}

interface MessageOptions {
  messageType?: 'text' | 'audio' | 'tts';
  ttsText?: string;
  audioUrl?: string;
  audioDuration?: number;
  isPinned?: boolean;
  pinnedLink?: string;
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
        // Evitar duplicatas
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
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

    on('new-message', handleNewMessage);
    on('message-updated', handleMessageUpdated);
    on('message-deleted', handleMessageDeleted);

    return () => {
      off('new-message', handleNewMessage);
      off('message-updated', handleMessageUpdated);
      off('message-deleted', handleMessageDeleted);
    };
  }, [isConnected, on, off]);

  const sendMessage = async (message: string, options: MessageOptions = {}) => {
    if (!isConnected || !streamId) return;

    // Backend espera 'chat-message' para mensagens normais
    emit('chat-message', {
      streamId,
      userId: user?.id || null,
      userName: (user as any)?.name || user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anônimo',
      message,
      ...options
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
    onMessageUpdate,
    onMessageDelete,
    on,
    off
  };
};
