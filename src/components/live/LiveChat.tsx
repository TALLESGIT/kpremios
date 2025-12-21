import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { MessageSquare, Smile, Send, Pin, Link2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ChatMessage {
  id: string;
  user_id: string | null;
  message: string;
  created_at: string;
  user_email?: string;
  is_pinned?: boolean;
  pinned_link?: string;
}

interface LiveChatProps {
  streamId: string;
  isActive?: boolean; // Se a live está ativa (permite enviar mensagens)
}

const EMOJI_CATEGORIES = {
  reactions: {
    title: 'Reações',
    emojis: ['🔥', '⚽', '💎', '🚀', '⭐', '❤️', '👏', '🙌', '💪', '🏆', '🎉']
  },
  faces: {
    title: 'Expressões',
    emojis: ['😊', '😂', '😎', '🤔', '😍', '🤩', '🥳', '🤯', '😇', '😴']
  }
};

const LiveChat: React.FC<LiveChatProps> = ({ streamId, isActive = true }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [slowModeSecondsRemaining, setSlowModeSecondsRemaining] = useState(0);
  const [showPinLinkModal, setShowPinLinkModal] = useState(false);
  const [linkToPin, setLinkToPin] = useState('');
  const [linkMessage, setLinkMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    checkModeratorStatus();
    checkAdminStatus();
    checkBanStatus();

    const channel = supabase.channel(`live_chat_${streamId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_chat_messages', filter: `stream_id=eq.${streamId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as ChatMessage;
            setMessages(prev => {
              if (prev.find(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            if (newMsg.is_pinned) setPinnedMessage(newMsg);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ChatMessage;
            setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
            if (updated.is_pinned) {
              setPinnedMessage(updated);
            } else if (pinnedMessage?.id === updated.id) {
              // Se a mensagem fixada foi desfixada, remover
              setPinnedMessage(null);
            }
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as ChatMessage;
            setMessages(prev => prev.filter(m => m.id !== deleted.id));
            if (pinnedMessage?.id === deleted.id) {
              setPinnedMessage(null);
            }
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [streamId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase.from('live_chat_messages').select('*').eq('stream_id', streamId).order('created_at', { ascending: true }).limit(100);
    if (data) {
      setMessages(data);
      const pinned = data.find(m => m.is_pinned);
      if (pinned) setPinnedMessage(pinned);
    }
  };

  const checkModeratorStatus = async () => {
    if (!user) return;
    const { data } = await supabase.rpc('is_moderator', { p_user_id: user.id, p_stream_id: streamId });
    setIsModerator(data || false);
  };

  const checkAdminStatus = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      
      if (!error && data) {
        setIsAdmin(data.is_admin || false);
      }
    } catch (err) {
      console.error('Erro ao verificar status de admin:', err);
    }
  };

  const checkBanStatus = async () => {
    if (!user) return;
    const { data } = await supabase.rpc('is_user_banned', { p_user_id: user.id, p_stream_id: streamId });
    setIsBanned(data || false);
  };

  // Funções para validar conteúdo
  const containsPhoneNumber = (text: string): boolean => {
    // Padrões para números de telefone brasileiros e internacionais
    const phonePatterns = [
      /(\+55\s?)?(\(?\d{2}\)?\s?)?(\d{4,5}[-.\s]?\d{4})/g, // Brasil: (11) 98765-4321, 11 98765-4321, 11987654321
      /(\+?\d{1,3}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{4,5}[-.\s]?\d{4}/g, // Internacional
      /\d{10,}/g, // Sequências longas de números (pode ser telefone)
    ];
    
    return phonePatterns.some(pattern => pattern.test(text));
  };

  const containsLink = (text: string): boolean => {
    // Padrões para URLs e links
    const linkPatterns = [
      /https?:\/\/[^\s]+/gi, // http:// ou https://
      /www\.[^\s]+/gi, // www.exemplo.com
      /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*/gi, // dominio.com, dominio.com.br
      /bit\.ly\/[^\s]+/gi, // bit.ly
      /t\.me\/[^\s]+/gi, // t.me
      /wa\.me\/[^\s]+/gi, // wa.me
    ];
    
    return linkPatterns.some(pattern => pattern.test(text));
  };

  const canSendRestrictedContent = (): boolean => {
    return isAdmin || isModerator;
  };

  const handleSendMessage = async () => {
    if (!user || !newMessage.trim()) return;

    try {
      // Verificar se pode enviar (bans + slow mode)
      const { data: canSend, error: rpcError } = await supabase.rpc('can_send_message', {
        p_user_id: user.id,
        p_stream_id: streamId
      });

      // Se houver erro ou retorno null, permitir envio (fallback)
      if (rpcError) {
        console.error('Erro ao verificar permissão de envio:', rpcError);
        // Continuar e enviar mesmo assim
      } else if (canSend && !canSend.can_send) {
        // Verificação retornou que NÃO pode enviar
        if (canSend.reason === 'banned') {
          toast.error(canSend.message);
          setIsBanned(true);
          return;
        } else if (canSend.reason === 'slow_mode') {
          toast.error(canSend.message);
          setSlowModeSecondsRemaining(canSend.seconds_remaining);
          return;
        }
      }

      // Validar conteúdo restrito (telefones e links)
      const msg = newMessage.trim();
      const hasPhone = containsPhoneNumber(msg);
      const hasLink = containsLink(msg);

      if (!canSendRestrictedContent() && (hasPhone || hasLink)) {
        if (hasPhone && hasLink) {
          toast.error('Você não pode enviar números de telefone e links. Apenas administradores e moderadores podem.');
        } else if (hasPhone) {
          toast.error('Você não pode enviar números de telefone. Apenas administradores e moderadores podem.');
        } else if (hasLink) {
          toast.error('Você não pode enviar links. Apenas administradores e moderadores podem.');
        }
        return;
      }

      setNewMessage('');

      const { error: insertError } = await supabase.from('live_chat_messages').insert({
        stream_id: streamId,
        user_id: user.id,
        message: msg,
        user_email: user.email,
        user_name: user.email?.split('@')[0] || 'Usuário'
      });

      if (insertError) {
        console.error('Erro ao inserir mensagem:', insertError);
        toast.error('Erro ao enviar mensagem: ' + insertError.message);
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      toast.error('Erro ao enviar mensagem');
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Deletar esta mensagem?')) return;
    try {
      await supabase.from('live_chat_messages').delete().eq('id', messageId);
      toast.success('Mensagem removida');
    } catch (err) {
      toast.error('Erro ao deletar');
    }
  };

  const pinLink = async () => {
    if (!linkToPin.trim()) {
      toast.error('Por favor, insira um link válido');
      return;
    }

    // Validar formato do link
    let validLink = linkToPin.trim();
    if (!validLink.startsWith('http://') && !validLink.startsWith('https://')) {
      validLink = 'https://' + validLink;
    }

    try {
      // Desfixar qualquer link anterior
      await supabase
        .from('live_chat_messages')
        .update({ is_pinned: false, pinned_link: null })
        .eq('stream_id', streamId)
        .eq('is_pinned', true);

      // Criar nova mensagem fixada com o link
      const { error } = await supabase.from('live_chat_messages').insert({
        stream_id: streamId,
        user_id: user?.id || null,
        message: linkMessage.trim() || 'Link compartilhado',
        user_email: user?.email,
        user_name: user?.email?.split('@')[0] || 'Admin',
        is_pinned: true,
        pinned_link: validLink
      });

      if (error) {
        console.error('Erro ao fixar link:', error);
        toast.error('Erro ao fixar link: ' + error.message);
      } else {
        toast.success('Link fixado com sucesso!');
        setShowPinLinkModal(false);
        setLinkToPin('');
        setLinkMessage('');
      }
    } catch (err) {
      console.error('Erro ao fixar link:', err);
      toast.error('Erro ao fixar link');
    }
  };

  const unpinLink = async () => {
    if (!confirm('Desfixar este link?')) return;
    try {
      await supabase
        .from('live_chat_messages')
        .update({ is_pinned: false, pinned_link: null })
        .eq('stream_id', streamId)
        .eq('is_pinned', true);
      
      toast.success('Link desfixado');
    } catch (err) {
      console.error('Erro ao desfixar link:', err);
      toast.error('Erro ao desfixar link');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="p-4 border-b border-white/5 bg-slate-800/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-black text-white uppercase italic tracking-tight">Chat ao Vivo</h3>
        </div>
        {(isAdmin || isModerator) && (
          <button
            onClick={() => setShowPinLinkModal(true)}
            className="p-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg transition-all"
            title="Fixar link no chat"
          >
            <Link2 className="w-4 h-4 text-blue-400" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {pinnedMessage && (
          <div className="p-4 bg-gradient-to-r from-blue-600/30 to-blue-500/20 border-2 border-blue-500/50 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Link Fixado</span>
              </div>
              {(isAdmin || isModerator) && (
                <button
                  onClick={unpinLink}
                  className="p-1 hover:bg-red-500/20 rounded transition-all"
                  title="Desfixar link"
                >
                  <X className="w-3 h-3 text-red-400" />
                </button>
              )}
            </div>
            {pinnedMessage.message && (
              <p className="text-xs text-white font-bold mb-2">{pinnedMessage.message}</p>
            )}
            {pinnedMessage.pinned_link && (
              <a
                href={pinnedMessage.pinned_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase rounded-lg transition-all shadow-lg"
              >
                <Link2 className="w-3 h-3" />
                Acessar Link
              </a>
            )}
          </div>
        )}
        {messages.filter(msg => !msg.is_pinned).map((msg) => (
          <div key={msg.id} className="flex flex-col items-start gap-1 group">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                {msg.user_email?.split('@')[0]}
              </span>
              {/* Badge de Moderador/Admin */}
              {(isModerator || isAdmin) && msg.user_id === user?.id && (
                <span className="px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[8px] font-black uppercase rounded">
                  {isAdmin ? '👑 ADMIN' : '🛡️ MOD'}
                </span>
              )}
            </div>
            <div className="flex items-start gap-2 w-full">
              <div className="px-4 py-2 bg-white/5 border border-white/5 rounded-2xl max-w-full overflow-hidden flex-1">
                <p className="text-xs text-white break-words">{msg.message}</p>
              </div>
              {/* Botão deletar (apenas moderadores) */}
              {isModerator && (
                <button
                  onClick={() => deleteMessage(msg.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/10 rounded-lg"
                  title="Deletar mensagem"
                >
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-slate-800/40 border-t border-white/5">
        {!user ? (
          <button
            onClick={() => navigate('/login', { state: { returnTo: window.location.pathname } })}
            className="w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase"
          >
            Entre para comentar
          </button>
        ) : isBanned ? (
          <div className="text-center py-3">
            <p className="text-xs font-bold text-red-400 uppercase tracking-wide">🚫 Você foi silenciado</p>
          </div>
        ) : !isActive ? (
          <div className="text-center py-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Chat disponível durante a transmissão</p>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <div className="relative" ref={emojiPickerRef}>
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="w-10 h-10 flex items-center justify-center bg-slate-900/50 border border-white/5 rounded-xl text-slate-400"><Smile className="w-5 h-5" /></button>
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-3 w-64 bg-slate-800 rounded-2xl border border-white/10 p-3 shadow-2xl z-50">
                  {Object.entries(EMOJI_CATEGORIES).map(([key, cat]) => (
                    <div key={key} className="mb-3">
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-2">{cat.title}</p>
                      <div className="grid grid-cols-6 gap-1">
                        {cat.emojis.map(e => <button key={e} onClick={() => { setNewMessage(p => p + e); setShowEmojiPicker(false); }} className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/5 rounded-lg">{e}</button>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Sua mensagem..." className="flex-1 px-4 py-2.5 bg-slate-900 border border-white/5 rounded-xl text-white text-xs font-bold" />
            <button onClick={handleSendMessage} disabled={!newMessage.trim()} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase italic shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2">
              <span className="md:hidden">Enviar</span>
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Modal para fixar link */}
      {showPinLinkModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-white/10 p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white uppercase">Fixar Link no Chat</h3>
              <button
                onClick={() => {
                  setShowPinLinkModal(false);
                  setLinkToPin('');
                  setLinkMessage('');
                }}
                className="p-2 hover:bg-white/5 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                  Link (URL)
                </label>
                <input
                  type="text"
                  value={linkToPin}
                  onChange={(e) => setLinkToPin(e.target.value)}
                  placeholder="https://exemplo.com"
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                  Mensagem (opcional)
                </label>
                <input
                  type="text"
                  value={linkMessage}
                  onChange={(e) => setLinkMessage(e.target.value)}
                  placeholder="Descrição do link..."
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowPinLinkModal(false);
                    setLinkToPin('');
                    setLinkMessage('');
                  }}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-black uppercase transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={pinLink}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-black uppercase transition-all shadow-lg shadow-blue-600/20"
                >
                  Fixar Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveChat;
