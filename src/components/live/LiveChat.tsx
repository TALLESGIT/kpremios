import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { MessageSquare, Smile, Send, Pin } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
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
            if (updated.is_pinned) setPinnedMessage(updated);
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

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

  const handleSendMessage = async () => {
    if (!user || !newMessage.trim()) return;
    const msg = newMessage.trim();
    setNewMessage('');
    try {
      await supabase.from('live_chat_messages').insert({ stream_id: streamId, user_id: user.id, message: msg, user_email: user.email });
    } catch (err) {
      toast.error('Erro ao enviar');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="p-4 border-b border-white/5 bg-slate-800/40 flex items-center gap-3">
        <MessageSquare className="w-5 h-5 text-blue-400" />
        <h3 className="text-sm font-black text-white uppercase italic tracking-tight">Chat ao Vivo</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {pinnedMessage && (
          <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Pin className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Fixado</span>
            </div>
            <p className="text-xs text-white font-bold">{pinnedMessage.message}</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col items-start gap-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{msg.user_email?.split('@')[0]}</span>
            <div className="px-4 py-2 bg-white/5 border border-white/5 rounded-2xl max-w-full overflow-hidden">
              <p className="text-xs text-white break-words">{msg.message}</p>
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
    </div>
  );
};

export default LiveChat;
