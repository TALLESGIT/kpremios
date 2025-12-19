import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Send, Pin, Trash2, Link as LinkIcon, MessageSquare, Smile } from 'lucide-react';

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
  const phonePatterns = [
    /\b\d{10,11}\b/,
    /\b\(\d{2}\)\s?\d{4,5}-?\d{4}\b/,
    /\b\d{2}\s?\d{4,5}-?\d{4}\b/,
    /\+\d{1,3}\s?\d{10,14}\b/,
    /\b\d{2}\.\d{4,5}\.\d{4}\b/,
  ];
  return phonePatterns.some(pattern => pattern.test(text));
};

// Função para validar se contém link
const containsLink = (text: string): boolean => {
  const linkPatterns = [
    /https?:\/\/[^\s]+/gi,
    /www\.[^\s]+/gi,
    /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*/gi,
  ];
  return linkPatterns.some(pattern => pattern.test(text));
};

// Função para extrair primeiro nome
const getFirstName = (fullName: string): string => {
  if (!fullName) return '';
  return fullName.trim().split(' ')[0];
};

// Função para formatar nome exibido
const formatDisplayName = (fullName: string, allMessages: ChatMessage[]): string => {
  if (!fullName) return 'Usuário';

  const firstName = getFirstName(fullName);
  const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);

  if (nameParts.length === 1) return firstName;

  const usersWithSameFirstName = allMessages
    .filter(msg => getFirstName(msg.user_name) === firstName)
    .map(msg => msg.user_name)
    .filter((name, index, self) => self.indexOf(name) === index);

  if (usersWithSameFirstName.length > 1) {
    return `${firstName} ${nameParts[1] || ''}`.trim();
  }

  return firstName;
};

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
    emojis: ['⚽', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎻', '🎲', '🎯', '🎳', '🎮', '🎰', '🧩', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏎️', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '✈️', '🛩️', '🛫', '🛬', '🪂', '💺', '🚀', '🚤', '帆', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧', '🚦', '🚥', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺']
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [moderatorIds, setModeratorIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current && messagesEndRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  useEffect(() => {
    loadMessages();
    loadPinnedMessage();
  }, [streamId]);

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

      if (error && error.code !== 'PGRST116') return;
      setIsModerator(!!data || isAdmin);
    } catch (error) {
      setIsModerator(isAdmin);
    }
  };

  const loadModeratorIds = async () => {
    try {
      const { data, error } = await supabase
        .from('stream_moderators')
        .select('user_id')
        .eq('stream_id', streamId);
      if (error) throw error;
      setModeratorIds(new Set((data || []).map((m: any) => m.user_id)));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
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
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as ChatMessage;
            setMessages((prev) => {
              const exists = prev.some((msg) => msg.id === newMsg.id);
              if (exists) return prev;
              return [...prev, newMsg];
            });
            if (newMsg.is_pinned && newMsg.pinned_link) setPinnedMessage(newMsg);
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as ChatMessage;
            setMessages((prev) =>
              prev.map((msg) => (msg.id === updatedMsg.id ? updatedMsg : msg))
            );
            if (updatedMsg.is_pinned) setPinnedMessage(updatedMsg);
            else if (pinnedMessage?.id === updatedMsg.id) setPinnedMessage(null);
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setMessages((prev) => prev.filter((msg) => msg.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, pinnedMessage]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('live_chat_messages')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      setMessages(data || []);
      setTimeout(() => scrollToBottom(), 100);
    } catch (error: any) {
      toast.error('Erro ao carregar mensagens');
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
      if (error) return;
      setPinnedMessage(data && data.length > 0 ? data[0] : null);
    } catch (error) {
      setPinnedMessage(null);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    if (!isAdmin) {
      if (containsPhoneNumber(newMessage)) {
        toast.error('Não envie telefones');
        return;
      }
      if (containsLink(newMessage)) {
        toast.error('Não envie links');
        return;
      }
    }

    try {
      const { data: userData } = await supabase.from('users').select('name').eq('id', user.id).single();
      const userName = userData?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário';

      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}-${Math.random()}`,
        stream_id: streamId,
        user_id: user.id,
        user_name: userName,
        message: newMessage.trim(),
        is_admin: isAdmin,
        is_system: false,
        pinned_link: null,
        is_pinned: false,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setNewMessage('');

      const { data, error } = await supabase
        .from('live_chat_messages')
        .insert({
          stream_id: streamId,
          user_id: user.id,
          user_name: userName,
          message: optimisticMessage.message,
          is_admin: isAdmin,
          is_system: false,
        })
        .select()
        .single();

      if (error) {
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
        throw error;
      }
      if (data) {
        setMessages((prev) => prev.map((msg) => (msg.id === optimisticMessage.id ? data : msg)));
      }
    } catch (error: any) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  const handleSendMessageWithLink = async (link: string) => {
    if (!link.trim() || !user) return;
    try {
      const { data: userData } = await supabase.from('users').select('name').eq('id', user.id).single();
      const userName = userData?.name || 'Admin';

      if (pinnedMessage) {
        await supabase.from('live_chat_messages').update({ is_pinned: false, pinned_link: null }).eq('id', pinnedMessage.id);
      }

      const { data, error } = await supabase
        .from('live_chat_messages')
        .insert({
          stream_id: streamId,
          user_id: user.id,
          user_name: userName,
          message: '🔗 Link compartilhado pelo admin',
          is_admin: true,
          is_system: false,
          pinned_link: link.trim(),
          is_pinned: true,
        })
        .select()
        .single();

      if (error) throw error;
      setPinnedMessage(data);
      toast.success('Link fixado!');
    } catch (error) {
      toast.error('Erro ao fixar link');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!isAdmin && !isModerator) return;
    try {
      const { error } = await supabase.from('live_chat_messages').delete().eq('id', messageId);
      if (error) throw error;
      toast.success('Mensagem deletada');
    } catch (error) {
      toast.error('Erro ao deletar');
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900/40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/60 backdrop-blur-xl">
      <div className="p-6 border-b border-white/5 bg-slate-800/40 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <MessageSquare className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Chat ao Vivo</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {messages.length} Mensagens
            </p>
          </div>
        </div>
      </div>

      {pinnedMessage?.pinned_link && (
        <div className="p-4 bg-blue-600/10 border-b border-blue-500/20 animate-in slide-in-from-top duration-300">
          <div className="flex items-start gap-3">
            <Pin className="w-4 h-4 text-blue-400 flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-blue-300 font-black uppercase tracking-widest mb-1">Link Fixado</p>
              <a href={pinnedMessage.pinned_link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm font-bold break-all flex items-center gap-2">
                <LinkIcon className="w-3.5 h-3.5" />
                {pinnedMessage.pinned_link}
              </a>
            </div>
          </div>
        </div>
      )}

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center opacity-40">
            <MessageSquare className="w-12 h-12 text-slate-500 mb-4" />
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest italic">Aguardando interações...</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMsgMod = moderatorIds.has(message.user_id || '');
            return (
              <div key={message.id} className={`flex gap-3 group animate-in fade-in duration-300 ${message.is_admin ? 'bg-blue-600/5 rounded-2xl p-4 border border-blue-500/10' : isMsgMod ? 'bg-purple-600/5 rounded-2xl p-4 border border-purple-500/10' : message.is_system ? 'bg-slate-500/5 rounded-2xl p-4 border border-white/5' : 'p-2'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                    <span className={`font-black text-xs uppercase italic tracking-tight ${message.is_admin ? 'text-blue-400' : isMsgMod ? 'text-purple-400' : message.is_system ? 'text-slate-500' : 'text-white'}`}>
                      {formatDisplayName(message.user_name, messages)}
                    </span>
                    {message.is_admin && <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 text-[9px] font-black border border-blue-500/20 uppercase">Admin</span>}
                    {isMsgMod && !message.is_admin && <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 text-[9px] font-black border border-purple-500/20 uppercase">Mod</span>}
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{formatTime(message.created_at)}</span>
                  </div>
                  <p className="text-slate-300 text-sm font-medium leading-relaxed break-words">{message.message}</p>
                </div>
                {(isAdmin || isModerator) && !message.is_system && (
                  <button onClick={() => handleDeleteMessage(message.id)} className="opacity-0 group-hover:opacity-100 transition-all p-2 text-slate-500 hover:text-rose-400 rounded-xl self-start">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 bg-slate-800/40 border-t border-white/5">
        {(isAdmin || isModerator) && (
          <div className="mb-6 space-y-2">
            <label className="text-[10px] font-black text-blue-200/40 uppercase tracking-[0.2em]">Fixar Link</label>
            <div className="flex gap-2">
              <input type="url" placeholder="https://exemplo.com" className="flex-1 px-4 py-3 bg-slate-900/50 border border-white/5 text-white rounded-xl text-xs font-bold focus:outline-none" onKeyPress={(e) => { if (e.key === 'Enter') { handleSendMessageWithLink(e.currentTarget.value); e.currentTarget.value = ''; } }} />
              <button onClick={(e) => { const input = e.currentTarget.previousElementSibling as HTMLInputElement; if (input) { handleSendMessageWithLink(input.value); input.value = ''; } }} className="p-3 bg-blue-600/10 hover:bg-blue-600 text-blue-400 rounded-xl transition-all">
                <Pin className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {!user ? (
          <div className="p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl text-center space-y-4">
            <p className="text-xs text-blue-200/60 font-black uppercase italic">Entre para participar</p>
            <div className="flex gap-3">
              <button onClick={() => navigate('/login')} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Login</button>
              <button onClick={() => navigate('/register')} className="flex-1 py-3 bg-white/5 text-white rounded-xl text-[10px] font-black uppercase border border-white/10">Cadastro</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 items-center">
            <div className="relative" ref={emojiPickerRef}>
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="w-12 h-12 flex items-center justify-center bg-slate-900/50 border border-white/5 rounded-2xl text-slate-400"><Smile className="w-5 h-5" /></button>
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-4 w-72 bg-slate-800 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden z-50">
                  <div className="p-4 border-b border-white/5 bg-slate-900/40"><p className="text-[10px] font-black text-white uppercase italic">Expressões</p></div>
                  <div className="p-4 max-h-72 overflow-y-auto custom-scrollbar">
                    {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => (
                      <div key={key} className="mb-6 last:mb-0">
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-3">{category.title}</p>
                        <div className="grid grid-cols-6 gap-2">
                          {category.emojis.map((emoji, idx) => (
                            <button key={idx} onClick={() => handleEmojiClick(emoji)} className="w-10 h-10 flex items-center justify-center text-xl hover:bg-white/5 rounded-xl">{emoji}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Sua mensagem..." className="flex-1 px-6 py-4 bg-slate-900/50 border border-white/5 text-white rounded-2xl text-sm font-bold focus:outline-none" />
            <button onClick={handleSendMessage} disabled={!newMessage.trim()} className="w-12 h-12 flex items-center justify-center bg-blue-600 rounded-2xl shadow-lg active:scale-95"><Send className="w-5 h-5 fill-current text-white" /></button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveChat;
