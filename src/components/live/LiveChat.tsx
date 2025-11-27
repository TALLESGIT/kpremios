import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Send, Trash2, User, Crown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import VipRequestModal from './VipRequestModal';

interface ChatMessage {
  id: string;
  user_name: string;
  message: string;
  is_admin: boolean;
  is_system: boolean;
  is_vip?: boolean;
  created_at: string;
  user_id?: string;
}

interface LiveChatProps {
  streamId: string;
  channelName: string;
}

const LiveChat: React.FC<LiveChatProps> = ({ streamId, channelName }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Verificar se usuário é VIP
  useEffect(() => {
    const checkVipStatus = async () => {
      if (!user?.email) return;
      
      try {
        const { data } = await supabase
          .from('users')
          .select('is_vip')
          .eq('email', user.email)
          .single();
        
        setIsVip(data?.is_vip || false);
      } catch (error) {
        console.error('Erro ao verificar status VIP:', error);
      }
    };

    checkVipStatus();
  }, [user]);

  // Carregar mensagens iniciais
  useEffect(() => {
    loadMessages();
  }, [streamId]);

  // Configurar subscription em tempo real
  useEffect(() => {
    let channel: any = null;
    let pollInterval: NodeJS.Timeout | null = null;
    let realtimeWorking = false;

    const setupRealtime = () => {
      try {
        channel = supabase
          .channel(`live-chat-${channelName}`, {
            config: {
              broadcast: { self: true },
              presence: { key: 'user' }
            }
          })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `stream_id=eq.${streamId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
              setMessages(prev => {
                // Evitar duplicatas
                if (prev.some(msg => msg.id === newMessage.id)) {
                  return prev;
                }
                return [...prev, newMessage];
              });
          scrollToBottom();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `stream_id=eq.${streamId}`
        },
        (payload) => {
          setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
        }
      )
      .subscribe((status, err) => {
        if (err) {
              // Erro de conexão WebSocket - não é crítico
              // Suprimir erro no console (já que não é crítico)
              if (!realtimeWorking && !pollInterval) {
                // Usar polling como fallback
                pollInterval = setInterval(() => {
                  loadMessages();
                }, 3000);
          }
          return;
        }
        
        if (status === 'SUBSCRIBED') {
              realtimeWorking = true;
              // Limpar polling se Realtime funcionar
              if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
              }
              console.log('✅ Chat conectado em tempo real!');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              if (!realtimeWorking && !pollInterval) {
                // Usar polling como fallback
                pollInterval = setInterval(() => {
                  loadMessages();
                }, 3000);
          }
        }
      });

        // Timeout para detectar se a conexão não foi estabelecida em 5 segundos
        const timeoutId = setTimeout(() => {
          if (!realtimeWorking && !pollInterval) {
            // Usar polling como fallback
            pollInterval = setInterval(() => {
              loadMessages();
            }, 3000);
          }
        }, 5000);

        return timeoutId;
      } catch (error) {
        console.error('❌ Erro ao configurar Realtime:', error);
        // Fallback para polling
        if (!pollInterval) {
          pollInterval = setInterval(() => {
            loadMessages();
          }, 3000);
        }
        return null;
      }
    };

    const timeoutId = setupRealtime();

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (channel) {
        supabase.removeChannel(channel).catch(() => {
          // Ignorar erros ao remover channel (não é crítico)
        });
      }
    };
  }, [streamId, channelName]);

  // Auto-scroll para última mensagem
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('live_chat_messages')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })
        .limit(100); // Últimas 100 mensagens

      if (error) throw error;
      setMessages(data || []);
      scrollToBottom();
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    if (sending) return;

    setSending(true);

    try {
      // Verificar se usuário é VIP
      let isVip = false;
      if (user?.email) {
        const { data: userData } = await supabase
          .from('users')
          .select('is_vip')
          .eq('email', user.email)
          .single();
        
        isVip = userData?.is_vip || false;
      }

      const messageData = {
        stream_id: streamId,
        user_id: user?.id || null,
        user_name: user?.name || user?.email || 'Anônimo',
        message: newMessage.trim(),
        is_admin: user?.is_admin || false,
        is_system: false,
        is_vip: isVip
      };

      const { error } = await supabase
        .from('live_chat_messages')
        .insert([messageData]);

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user?.is_admin) return;

    try {
      const { error } = await supabase
        .from('live_chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      toast.success('Mensagem deletada');
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
      toast.error('Erro ao deletar mensagem');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-800/95 backdrop-blur-sm rounded-lg border border-slate-700/50 shadow-xl">
      {/* Header do Chat - Estilo YouTube */}
      <div className="p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          💬 Chat ao Vivo
          <span className="text-xs text-slate-400 font-normal">
            ({messages.length} mensagens)
          </span>
        </h3>
      </div>

      {/* Mensagens - Scroll independente */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800"
        style={{ 
          maxHeight: 'none',
          height: '100%'
        }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <p>Nenhuma mensagem ainda.</p>
            <p className="text-sm mt-2">Seja o primeiro a comentar! 💬</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.is_system 
                  ? 'justify-center' 
                  : msg.is_vip
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-l-4 border-amber-400'
                    : msg.is_admin 
                      ? 'bg-amber-500/10 border-l-2 border-amber-500' 
                      : ''
              } p-2 rounded-lg`}
            >
              {!msg.is_system && (
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  msg.is_vip
                    ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                    : msg.is_admin 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-slate-600 text-white'
                }`}>
                  <User size={16} />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                {!msg.is_system && (
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`font-bold text-sm ${
                      msg.is_vip 
                        ? 'text-amber-300' 
                        : msg.is_admin 
                          ? 'text-amber-400' 
                          : 'text-white'
                    }`}>
                      {msg.user_name}
                    </span>
                    {msg.is_vip && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white text-xs rounded-full font-bold flex items-center gap-1">
                        👑 VIP
                      </span>
                    )}
                    {msg.is_admin && (
                      <span className="px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                        ADMIN
                      </span>
                    )}
                    <span className="text-slate-400 text-xs">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                )}
                <p className={`text-sm ${
                  msg.is_system 
                    ? 'text-slate-400 italic text-center' 
                    : 'text-slate-200'
                }`}>
                  {msg.message}
                </p>
              </div>

              {/* Botão deletar (só admin) */}
              {user?.is_admin && !msg.is_system && (
                <button
                  onClick={() => deleteMessage(msg.id)}
                  className="flex-shrink-0 text-slate-400 hover:text-red-400 transition-colors"
                  title="Deletar mensagem"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Botão Tornar-se VIP (se não for VIP) */}
      {user && !isVip && (
        <div className="px-4 py-2 border-t border-slate-700 bg-gradient-to-r from-amber-500/10 to-amber-600/10">
          <button
            onClick={() => setShowVipModal(true)}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-2 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Crown size={16} />
            Tornar-se VIP
          </button>
        </div>
      )}

      {/* Input de Mensagem */}
      <form onSubmit={sendMessage} className="p-4 border-t border-slate-700 bg-slate-900">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={user ? (isVip ? "Digite sua mensagem VIP..." : "Digite sua mensagem...") : "Faça login para comentar"}
            disabled={!user || sending}
            maxLength={500}
            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !user || sending}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-6 py-2 rounded-lg font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send size={18} />
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
        {!user && (
          <p className="text-xs text-slate-400 mt-2">
            💡 Faça login para participar do chat
          </p>
        )}
      </form>

      {/* Modal de Solicitação VIP */}
      <VipRequestModal
        isOpen={showVipModal}
        onClose={() => setShowVipModal(false)}
        onSuccess={() => {
          setIsVip(true);
          setShowVipModal(false);
        }}
      />
    </div>
  );
};

export default LiveChat;

