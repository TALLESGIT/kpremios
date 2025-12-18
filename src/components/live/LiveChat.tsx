import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Send, Pin, Trash2, Link as LinkIcon, MessageSquare, LogIn, Smile } from 'lucide-react';

interface ChatMessage {
  id: string;
  stream_id: string;
  user_id: string | null;
  user_name: string;
  message: string;
  is_admin: boolean;
  is_system: boolean;
  pinned_link: string | null;
  is_pinned: boolean;
  created_at: string;
}

interface LiveChatProps {
  streamId: string;
  isAdmin?: boolean;
}

// Função para validar se contém número de telefone
const containsPhoneNumber = (text: string): boolean => {
  // Padrões comuns de telefone brasileiro e internacional
  const phonePatterns = [
    /\b\d{10,11}\b/, // 10 ou 11 dígitos
    /\b\(\d{2}\)\s?\d{4,5}-?\d{4}\b/, // (11) 99999-9999
    /\b\d{2}\s?\d{4,5}-?\d{4}\b/, // 11 99999-9999
    /\+\d{1,3}\s?\d{10,14}\b/, // +55 11 99999-9999
    /\b\d{2}\.\d{4,5}\.\d{4}\b/, // 11.99999.9999
  ];
  
  return phonePatterns.some(pattern => pattern.test(text));
};

// Função para validar se contém link
const containsLink = (text: string): boolean => {
  const linkPatterns = [
    /https?:\/\/[^\s]+/gi, // http:// ou https://
    /www\.[^\s]+/gi, // www.
    /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*/gi, // domínios como exemplo.com
  ];
  
  return linkPatterns.some(pattern => pattern.test(text));
};

// Função para extrair primeiro nome
const getFirstName = (fullName: string): string => {
  if (!fullName) return '';
  return fullName.trim().split(' ')[0];
};

// Função para formatar nome exibido (primeiro nome ou primeiro + sobrenome se houver duplicata)
const formatDisplayName = (fullName: string, allMessages: ChatMessage[]): string => {
  if (!fullName) return 'Usuário';
  
  const firstName = getFirstName(fullName);
  const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);
  
  // Se tiver apenas uma palavra, retorna ela
  if (nameParts.length === 1) {
    return firstName;
  }
  
  // Verificar se há outros usuários com o mesmo primeiro nome no chat
  const usersWithSameFirstName = allMessages
    .filter(msg => getFirstName(msg.user_name) === firstName)
    .map(msg => msg.user_name)
    .filter((name, index, self) => self.indexOf(name) === index); // Remover duplicatas
  
  // Se houver mais de um usuário com o mesmo primeiro nome, mostrar primeiro + sobrenome
  if (usersWithSameFirstName.length > 1) {
    // Retornar primeiro nome + segundo nome (sobrenome)
    return `${firstName} ${nameParts[1] || ''}`.trim();
  }
  
  // Se não houver duplicata, mostrar apenas o primeiro nome
  return firstName;
};

// Emojis organizados por categoria
const EMOJI_CATEGORIES = {
  padrao: {
    title: 'Padrão',
    emojis: ['😀', '😂', '😍', '🥰', '😎', '🤔', '😊', '😉', '😋', '😜', '🤪', '😏', '😌', '😴', '🤤', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '😳', '🤯', '😢', '😭', '😤', '😠', '😡', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖']
  },
  reacoes: {
    title: 'Reações',
    emojis: ['👍', '👎', '❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🔥', '⭐', '🌟', '✨', '💫', '⚡', '🎉', '🎊', '🙌', '👏', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '🤙', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👊', '✊', '🤛', '🤜', '🤲', '👐', '🙌', '👏', '🤝', '🙏']
  },
  futebol: {
    title: 'Futebol',
    emojis: ['⚽', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎻', '🎲', '🎯', '🎳', '🎮', '🎰', '🧩', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏎️', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '✈️', '🛩️', '🛫', '🛬', '🪂', '💺', '🚀', '🚤', '⛵', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧', '🚦', '🚥', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺']
  },
  times: {
    title: 'Times',
    emojis: ['🇧🇷', '⚽', '🏆', '🥇', '🥈', '🥉', '🎯', '🔥', '💪', '👏', '🙌', '🎉', '🎊', '🚀', '⭐', '🌟', '✨', '💫', '⚡', '🎖️', '🏅', '🎗️', '🎫', '🎟️', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎻', '🎲', '🎯', '🎳', '🎮', '🎰', '🧩', '💚', '💛', '🔴', '🔵', '⚫', '⚪', '🟢', '🟡', '🟠', '🟣', '🟤', '🟥', '🟦', '🟧', '🟨', '🟩', '🟪', '🟫', '⬛', '⬜', '🟰', '🔴', '🔵', '🟢', '🟡', '🟠', '🟣', '🟤']
  }
};

const LiveChat: React.FC<LiveChatProps> = ({ streamId, isAdmin = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [moderatorIds, setModeratorIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Scroll para o final do chat (apenas dentro do container do chat)
  const scrollToBottom = () => {
    if (chatContainerRef.current && messagesEndRef.current) {
      // Scroll apenas dentro do container do chat, não na página inteira
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    // Só fazer scroll se o usuário não estiver rolando manualmente
    scrollToBottom();
  }, [messages]);

  // Fechar emoji picker ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleEmojiClick = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Carregar mensagens iniciais
  useEffect(() => {
    loadMessages();
  }, [streamId]);

  // Carregar mensagem fixada
  useEffect(() => {
    loadPinnedMessage();
  }, [streamId]);

  // Verificar se o usuário é moderador e carregar lista de moderadores
  useEffect(() => {
    if (streamId) {
      checkModeratorStatus();
      loadModeratorIds();
    }
  }, [streamId, user]);

  const checkModeratorStatus = async () => {
    if (!user) {
      setIsModerator(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('stream_moderators')
        .select('id')
        .eq('user_id', user.id)
        .eq('stream_id', streamId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar status de moderador:', error);
        return;
      }

      setIsModerator(!!data || isAdmin);
    } catch (error) {
      console.error('Erro ao verificar moderador:', error);
      setIsModerator(isAdmin); // Fallback: se for admin, é moderador
    }
  };

  const loadModeratorIds = async () => {
    try {
      const { data, error } = await supabase
        .from('stream_moderators')
        .select('user_id')
        .eq('stream_id', streamId);

      if (error) throw error;

      const ids = new Set<string>((data || []).map((m: any) => m.user_id));
      setModeratorIds(ids);
    } catch (error) {
      console.error('Erro ao carregar IDs de moderadores:', error);
    }
  };

  // Subscribe para novas mensagens
  useEffect(() => {
    console.log('🔔 Configurando subscription do chat para stream:', streamId);
    
    const channel = supabase
      .channel(`live_chat_${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          console.log('📨 Nova mensagem recebida via Realtime:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as ChatMessage;
            
            // Verificar se a mensagem já existe (evitar duplicatas)
            setMessages((prev) => {
              const exists = prev.some((msg) => msg.id === newMsg.id);
              if (exists) {
                console.log('⚠️ Mensagem já existe, ignorando:', newMsg.id);
                return prev;
              }
              console.log('✅ Adicionando nova mensagem ao chat:', newMsg.id);
              return [...prev, newMsg];
            });
            
            // Se for mensagem fixada, atualizar
            if (newMsg.is_pinned && newMsg.pinned_link) {
              setPinnedMessage(newMsg);
            }
            
            // Scroll para o final após adicionar mensagem
            setTimeout(() => scrollToBottom(), 100);
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as ChatMessage;
            setMessages((prev) =>
              prev.map((msg) => (msg.id === updatedMsg.id ? updatedMsg : msg))
            );
            
            // Se for mensagem fixada, atualizar
            if (updatedMsg.is_pinned && updatedMsg.pinned_link) {
              setPinnedMessage(updatedMsg);
            } else if (!updatedMsg.is_pinned) {
              setPinnedMessage(null);
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setMessages((prev) => prev.filter((msg) => msg.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da subscription do chat:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscription do chat ativa');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erro na subscription do chat');
        }
      });

    return () => {
      console.log('🔕 Removendo subscription do chat');
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      console.log('📥 Carregando mensagens do chat para stream:', streamId);
      
      const { data, error } = await supabase
        .from('live_chat_messages')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('❌ Erro ao carregar mensagens:', error);
        throw error;
      }

      console.log('✅ Mensagens carregadas:', data?.length || 0, 'mensagens');
      setMessages(data || []);
      
      // Scroll para o final após carregar
      setTimeout(() => scrollToBottom(), 100);
    } catch (error: any) {
      console.error('❌ Erro ao carregar mensagens:', error);
      toast.error(error.message || 'Erro ao carregar mensagens do chat');
    } finally {
      setLoading(false);
    }
  };

  const loadPinnedMessage = async () => {
    try {
      const { data, error } = await supabase
        .from('live_chat_messages')
        .select('*')
        .eq('stream_id', streamId)
        .eq('is_pinned', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        // Se for erro de permissão ou outro erro, apenas loga
        if (error.code !== 'PGRST116') {
          console.error('Erro ao carregar mensagem fixada:', error);
        }
        return;
      }

      // Se houver dados e pelo menos uma mensagem fixada
      if (data && data.length > 0) {
        setPinnedMessage(data[0]);
      } else {
        setPinnedMessage(null);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagem fixada:', error);
      // Não quebra o fluxo, apenas não mostra mensagem fixada
      setPinnedMessage(null);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    // Verificar se o usuário está autenticado
    if (!user) {
      setShowLoginModal(true);
      toast.error('Você precisa estar cadastrado para enviar mensagens');
      return;
    }

    // Validação para usuários não-admin
    if (!isAdmin) {
      if (containsPhoneNumber(newMessage)) {
        toast.error('Você não pode enviar números de telefone no chat');
        return;
      }

      if (containsLink(newMessage)) {
        toast.error('Você não pode enviar links no chat');
        return;
      }
    }

    try {
      // Buscar nome do usuário na tabela users
      let userName = 'Usuário';
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();
        
        if (userData?.name) {
          userName = userData.name;
        } else {
          // Fallback para user_metadata ou email
          userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário';
        }
      }

      const messageText = newMessage.trim();
      
      // Atualização otimista: adicionar mensagem ao estado local imediatamente
      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}-${Math.random()}`,
        stream_id: streamId,
        user_id: user.id,
        user_name: userName,
        message: messageText,
        is_admin: isAdmin || false,
        is_system: false,
        pinned_link: null,
        is_pinned: false,
        created_at: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, optimisticMessage]);
      setNewMessage('');
      scrollToBottom();

      // Enviar mensagem para o banco
      const { data, error } = await supabase
        .from('live_chat_messages')
        .insert({
          stream_id: streamId,
          user_id: user.id,
          user_name: userName,
          message: messageText,
          is_admin: isAdmin || false,
          is_system: false,
        })
        .select()
        .single();

      if (error) {
        // Remover mensagem otimista em caso de erro
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
        throw error;
      }

      // Substituir mensagem otimista pela mensagem real do banco
      if (data) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === optimisticMessage.id ? data : msg))
        );
      }
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error(error.message || 'Erro ao enviar mensagem');
    }
  };

  const handleSendMessageWithLink = async (link: string) => {
    if (!link.trim()) {
      toast.error('Por favor, insira um link válido');
      return;
    }

    // Validar formato do link
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlPattern.test(link)) {
      toast.error('Por favor, insira um link válido (ex: https://exemplo.com)');
      return;
    }

    try {
      // Buscar nome do usuário na tabela users
      let userName = 'Admin';
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();
        
        if (userData?.name) {
          userName = userData.name;
        } else {
          // Fallback para user_metadata ou email
          userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Admin';
        }
      }

      // Primeiro, desfixar mensagem anterior se houver
      if (pinnedMessage) {
        await supabase
          .from('live_chat_messages')
          .update({ is_pinned: false, pinned_link: null })
          .eq('id', pinnedMessage.id);
      }

      // Criar nova mensagem com link fixado
      const { data, error } = await supabase
        .from('live_chat_messages')
        .insert({
          stream_id: streamId,
          user_id: user?.id || null,
          user_name: userName,
          message: `🔗 Link compartilhado pelo admin`,
          is_admin: true,
          is_system: false,
          pinned_link: link.trim(),
          is_pinned: true,
        })
        .select()
        .single();

      if (error) throw error;

      setPinnedMessage(data);
      toast.success('Link fixado no chat!');
    } catch (error) {
      console.error('Erro ao fixar link:', error);
      toast.error('Erro ao fixar link');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!isAdmin && !isModerator) return;

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
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-700">
      {/* Header do Chat */}
      <div className="p-4 border-b border-slate-700 bg-slate-800">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Chat ao Vivo
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          {messages.length} mensagem{messages.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Mensagem Fixada (se houver) */}
      {pinnedMessage && pinnedMessage.pinned_link && (
        <div className="p-3 bg-amber-500/20 border-b border-amber-500/30">
          <div className="flex items-start gap-2">
            <Pin className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-amber-300 font-medium mb-1">
                Link Fixado pelo Admin
              </p>
              <a
                href={pinnedMessage.pinned_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 text-sm font-medium break-all flex items-center gap-1"
              >
                <LinkIcon className="w-3 h-3" />
                {pinnedMessage.pinned_link}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Área de Mensagens */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <p>Nenhuma mensagem ainda.</p>
            <p className="text-sm mt-2">Seja o primeiro a comentar!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMessageModerator = message.user_id && moderatorIds.has(message.user_id);
            return (
            <div
              key={message.id}
              className={`flex gap-2 group ${
                message.is_admin 
                  ? 'bg-amber-500/10 border-l-2 border-amber-500' 
                  : isMessageModerator
                  ? 'bg-purple-500/10 border-l-2 border-purple-500'
                  : message.is_system 
                  ? 'bg-blue-500/10 border-l-2 border-blue-500' 
                  : ''
              } p-2 rounded transition-colors`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span
                    className={`font-medium text-sm truncate max-w-[200px] sm:max-w-[300px] ${
                      message.is_admin
                        ? 'text-amber-400'
                        : isMessageModerator
                        ? 'text-purple-400'
                        : message.is_system
                        ? 'text-blue-400'
                        : 'text-white'
                    }`}
                    title={message.user_name}
                  >
                    {formatDisplayName(message.user_name, messages)}
                    {message.is_admin && (
                      <span className="ml-1 text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded whitespace-nowrap font-semibold">
                        ADMIN
                      </span>
                    )}
                    {isMessageModerator && !message.is_admin && (
                      <span className="ml-1 text-xs bg-gradient-to-r from-purple-500 to-purple-600 text-white px-1.5 py-0.5 rounded whitespace-nowrap font-semibold shadow-sm">
                        MOD
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                    {formatTime(message.created_at)}
                  </span>
                </div>
                <p className="text-slate-200 text-sm whitespace-pre-wrap break-words">
                  {message.message}
                </p>
                {message.pinned_link && (
                  <a
                    href={message.pinned_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 text-sm font-medium"
                  >
                    <LinkIcon className="w-3 h-3" />
                    {message.pinned_link}
                  </a>
                )}
              </div>
              {(isAdmin || isModerator) && !message.is_system && (
                <button
                  onClick={() => handleDeleteMessage(message.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                  title="Deletar mensagem"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Mensagem */}
      <div className="p-4 border-t border-slate-700 bg-slate-800">
        {(isAdmin || isModerator) && (
          <div className="mb-3">
            <label className="block text-xs text-slate-400 mb-1">
              Fixar Link no Chat {isModerator && !isAdmin ? '(Moderador)' : '(Admin)'}
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://exemplo.com"
                className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessageWithLink(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  if (input) {
                    handleSendMessageWithLink(input.value);
                    input.value = '';
                  }
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center gap-2"
                title="Fixar link"
              >
                <Pin className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Aviso para usuários não autenticados */}
        {!user && (
          <div className="mb-3 p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
            <p className="text-xs text-amber-300 mb-2">
              ⚠️ Você precisa estar cadastrado para enviar mensagens no chat
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const currentPath = window.location.pathname;
                  navigate('/login', { state: { returnTo: currentPath } });
                }}
                className="flex-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3 h-3" />
                Fazer Login
              </button>
              <button
                onClick={() => {
                  const currentPath = window.location.pathname;
                  navigate('/register', { state: { returnTo: currentPath } });
                }}
                className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-medium transition-colors"
              >
                Cadastrar
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 relative">
          {/* Botão de Emoji */}
          {user && (
            <div className="relative" ref={emojiPickerRef}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center border border-slate-600"
                title="Adicionar emoji"
              >
                <Smile className="w-4 h-4" />
              </button>

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-2 w-80 max-h-96 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-slate-700 bg-slate-900">
                    <h4 className="text-sm font-bold text-white">Emojis</h4>
                  </div>
                  <div className="overflow-y-auto max-h-80 p-3">
                    {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => (
                      <div key={key} className="mb-4 last:mb-0">
                        <h5 className="text-xs font-semibold text-slate-400 mb-2 uppercase">
                          {category.title}
                        </h5>
                        <div className="grid grid-cols-8 gap-1">
                          {category.emojis.map((emoji, index) => (
                            <button
                              key={`${key}-${index}`}
                              type="button"
                              onClick={() => handleEmojiClick(emoji)}
                              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-700 rounded transition-colors"
                              title={emoji}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              !user
                ? 'Faça login para enviar mensagens...'
                : isAdmin
                ? 'Digite sua mensagem...'
                : 'Digite sua mensagem (sem links ou telefones)...'
            }
            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm border border-slate-600 focus:border-amber-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!user}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !user}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            title={!user ? 'Faça login para enviar mensagens' : 'Enviar mensagem'}
          >
            <Send className="w-4 h-4" />
            Enviar
          </button>
        </div>
      </div>

      {/* Modal de Login (se necessário) */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700 mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Login Necessário</h3>
            <p className="text-slate-300 mb-6">
              Você precisa estar cadastrado e fazer login para enviar mensagens no chat ao vivo.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const currentPath = window.location.pathname;
                  navigate('/login', { state: { returnTo: currentPath } });
                  setShowLoginModal(false);
                }}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Fazer Login
              </button>
              <button
                onClick={() => {
                  const currentPath = window.location.pathname;
                  navigate('/register', { state: { returnTo: currentPath } });
                  setShowLoginModal(false);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Cadastrar
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveChat;

