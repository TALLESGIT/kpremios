// =====================================================
// ChatSessionStore - Store singleton por streamId
// =====================================================
// Encapsula estado e lógica do chat para uma stream específica

import { supabase } from '../../lib/supabase';
import type { ChatMessage } from '../../hooks/useSocketChat';
import type { Socket } from 'socket.io-client';

export interface ChatSessionState {
  messages: ChatMessage[];
  loading: boolean;
  connected: boolean;
  error: string | null;
}

type ChatSessionListener = (state: ChatSessionState) => void;

interface SocketHelpers {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
}

export class ChatSessionStore {
  private streamId: string;
  private state: ChatSessionState = {
    messages: [],
    loading: false,
    connected: false,
    error: null
  };
  private listeners = new Set<ChatSessionListener>();
  private socketHelpers: SocketHelpers | null = null;
  private initialized = false;
  private loadInitialExecuted = false;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor(streamId: string) {
    this.streamId = streamId;
  }

  // Inicializar conexão e listeners (chamado pelo provider)
  initialize(socketHelpers: SocketHelpers) {
    if (this.initialized) return;
    this.socketHelpers = socketHelpers;
    this.initialized = true;
    this.setupListeners();
    this.loadInitialMessages();
  }

  // Carregar mensagens iniciais (1x por streamId)
  private async loadInitialMessages() {
    if (this.loadInitialExecuted) return;
    this.loadInitialExecuted = true;

    this.updateState({ loading: true });
    try {
      const { data, error } = await supabase
        .from('live_chat_messages')
        .select('*')
        .eq('stream_id', this.streamId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      this.updateState({
        messages: data || [],
        loading: false
      });
    } catch (err: any) {
      console.error('Erro ao carregar mensagens iniciais:', err);
      this.updateState({
        loading: false,
        error: err.message || 'Erro ao carregar mensagens'
      });
    }
  }

  // Configurar listeners Socket.IO
  private setupListeners() {
    if (!this.socketHelpers) return;

    // Se já conectado, configurar imediatamente
    if (this.socketHelpers.isConnected) {
      this.updateState({ connected: true });
      this.attachSocketListeners();
      return;
    }

    // Aguardar conexão (verificar periodicamente)
    const checkConnection = () => {
      if (this.socketHelpers?.isConnected) {
        this.updateState({ connected: true });
        this.attachSocketListeners();
      } else if (this.socketHelpers) {
        // Continuar verificando enquanto socketHelpers existir
        setTimeout(checkConnection, 500);
      }
    };
    checkConnection();
  }

  private attachSocketListeners() {
    if (!this.socketHelpers) return;

    const handleNewMessage = (message: ChatMessage) => {
      console.log('📩 ChatSessionStore: Nova mensagem via Socket.io:', message.id);
      // Filtrar apenas mensagens desta stream
      if (message.stream_id !== this.streamId) return;
      
      this.updateState(prev => {
        // Evitar duplicatas
        if (prev.messages.some(m => m.id === message.id)) {
          return prev;
        }
        return {
          ...prev,
          messages: [...prev.messages, message]
        };
      });
    };

    const handleMessageUpdated = (data: any) => {
      console.log('🔄 ChatSessionStore: Mensagem atualizada via Socket.io:', data.id);
      // Filtrar apenas mensagens desta stream
      if (data.stream_id !== this.streamId) return;
      
      this.updateState(prev => ({
        ...prev,
        messages: prev.messages.map(m => m.id === data.id ? { ...m, ...data } : m)
      }));
    };

    const handleMessageDeleted = (data: any) => {
      const id = data.messageId || data.id;
      console.log('🗑️ ChatSessionStore: Mensagem deletada via Socket.io:', id);
      // Filtrar apenas mensagens desta stream
      if (data.streamId && data.streamId !== this.streamId) return;
      
      this.updateState(prev => ({
        ...prev,
        messages: prev.messages.filter(m => m.id !== id)
      }));
    };

    this.socketHelpers.on('new-message', handleNewMessage);
    this.socketHelpers.on('message-updated', handleMessageUpdated);
    this.socketHelpers.on('message-deleted', handleMessageDeleted);

    // Armazenar handlers para cleanup
    this.messageHandlers.set('new-message', handleNewMessage);
    this.messageHandlers.set('message-updated', handleMessageUpdated);
    this.messageHandlers.set('message-deleted', handleMessageDeleted);
  }

  // Enviar mensagem (não usado diretamente - provider faz isso)
  // Mantido para compatibilidade
  sendMessage(_message: string, _options: {
    messageType?: 'text' | 'audio' | 'tts';
    ttsText?: string;
    audioUrl?: string;
    audioDuration?: number;
  } = {}) {
    // Não fazer nada - o provider chama emit diretamente
  }

  // Emitir evento customizado (não usado diretamente - provider faz isso)
  emit(_event: string, _data: any) {
    // Não fazer nada - o provider chama emit diretamente
  }

  // Atualizar estado e notificar listeners
  // Aceita objeto parcial OU função que recebe estado anterior
  private updateState(updates: Partial<ChatSessionState> | ((prev: ChatSessionState) => ChatSessionState | Partial<ChatSessionState>)) {
    if (typeof updates === 'function') {
      const result = updates(this.state);
      // Se a função retornar o mesmo objeto (sem mudanças), não notificar
      if (result === this.state) return;
      this.state = { ...this.state, ...result };
    } else {
      this.state = { ...this.state, ...updates };
    }
    this.notifyListeners();
  }

  // Notificar todos os listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Subscribe para mudanças de estado
  subscribe(listener: ChatSessionListener) {
    this.listeners.add(listener);
    // Notificar imediatamente com estado atual
    listener(this.state);
    // Retornar função de unsubscribe
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Obter estado atual (sem subscribe)
  getState(): ChatSessionState {
    return this.state;
  }

  // Cleanup
  destroy() {
    if (this.socketHelpers) {
      // Remover listeners específicos
      const newMessageHandler = this.messageHandlers.get('new-message');
      const updatedHandler = this.messageHandlers.get('message-updated');
      const deletedHandler = this.messageHandlers.get('message-deleted');
      
      if (newMessageHandler) {
        this.socketHelpers.off('new-message', newMessageHandler);
      }
      if (updatedHandler) {
        this.socketHelpers.off('message-updated', updatedHandler);
      }
      if (deletedHandler) {
        this.socketHelpers.off('message-deleted', deletedHandler);
      }
    }
    this.messageHandlers.clear();
    this.listeners.clear();
    this.initialized = false;
    this.loadInitialExecuted = false;
  }
}

// Map global de stores por streamId
const stores = new Map<string, ChatSessionStore>();

export function getChatSessionStore(streamId: string): ChatSessionStore {
  if (!stores.has(streamId)) {
    stores.set(streamId, new ChatSessionStore(streamId));
  }
  return stores.get(streamId)!;
}

export function destroyChatSessionStore(streamId: string) {
  const store = stores.get(streamId);
  if (store) {
    store.destroy();
    stores.delete(streamId);
  }
}
