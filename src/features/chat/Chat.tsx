// =====================================================
// Chat - Componente de UI pura para chat
// =====================================================
// Usa ChatProvider para obter mensagens e enviar mensagens

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { MessageSquare, Smile, Send, Pin, Link2, X, Palette, Mic, Volume2, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useChatSession, useChat } from './ChatProvider';
import type { ChatMessage } from '../../hooks/useSocketChat';
import PinnedLinkOverlay from '../../components/live/PinnedLinkOverlay';

interface ChatProps {
  streamId: string;
  isActive?: boolean;
  className?: string;
  showHeader?: boolean;
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

const VIP_EMOJIS = {
  exclusive: {
    title: '💎 VIP Exclusivos',
    emojis: ['💎', '✨', '🌟', '👑', '⭐', '💫', '🔥', '🎯', '🏅', '🎖️', '💍', '🔮']
  }
};

const MAX_MESSAGE_LENGTH = 500;
const MAX_MESSAGE_LENGTH_VIP = 1500;

const VIP_COLOR_PRESETS = [
  { name: 'Roxo Padrão', value: 'purple', hex: '#a855f7' },
  { name: 'Rosa', value: 'pink', hex: '#ec4899' },
  { name: 'Azul', value: 'blue', hex: '#3b82f6' },
  { name: 'Ciano', value: 'cyan', hex: '#06b6d4' },
  { name: 'Verde', value: 'green', hex: '#10b981' },
  { name: 'Amarelo', value: 'yellow', hex: '#eab308' },
  { name: 'Laranja', value: 'orange', hex: '#f97316' },
  { name: 'Vermelho', value: 'red', hex: '#ef4444' },
  { name: 'Dourado', value: 'gold', hex: '#fbbf24' },
  { name: 'Prata', value: 'silver', hex: '#94a3b8' },
];

export function Chat({ streamId, isActive = true, className, showHeader = true }: ChatProps) {
  const { user } = useAuth();
  const { currentUser } = useData();
  const navigate = useNavigate();
  const { sendMessage, emit } = useChat();
  const { messages, loading, connected } = useChatSession(streamId);

  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [userRoles, setUserRoles] = useState<{ [userId: string]: { isAdmin: boolean; isVip: boolean; isModerator: boolean } }>({});
  const [slowModeSecondsRemaining, setSlowModeSecondsRemaining] = useState(0);
  const [showPinLinkModal, setShowPinLinkModal] = useState(false);
  const [linkToPin, setLinkToPin] = useState('');
  const [linkMessage, setLinkMessage] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [vipCustomColor, setVipCustomColor] = useState<string>('purple');
  const [isSendingAudio, setIsSendingAudio] = useState(false);
  const [lastAudioSentAt, setLastAudioSentAt] = useState<number>(0);
  const [audioCountRemaining, setAudioCountRemaining] = useState<number>(3);
  const [vipOverlayCountRemaining, setVipOverlayCountRemaining] = useState<number>(10);
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set());
  const [currentPinnedLink, setCurrentPinnedLink] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const userScrolledUpRef = useRef(false);

  // Carregar dados iniciais
  useEffect(() => {
    loadUserRoles();
    checkModeratorStatus();
    checkAdminStatus();
    checkVipStatus();
    checkBanStatus();
    loadVipColor();
    if (isVip) {
      loadVipLimits();
    }
  }, [streamId, isVip]);

  // Carregar roles de usuários
  const loadUserRoles = async () => {
    const userIds = messages.filter(m => m.user_id).map(m => m.user_id!);
    if (userIds.length === 0) return;

    try {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, is_admin, is_vip')
        .in('id', userIds);

      const { data: moderatorsData } = await supabase
        .from('stream_moderators')
        .select('user_id')
        .eq('stream_id', streamId)
        .in('user_id', userIds);

      const moderatorIds = new Set(moderatorsData?.map(m => m.user_id) || []);

      const roles: { [userId: string]: { isAdmin: boolean; isVip: boolean; isModerator: boolean } } = {};
      usersData?.forEach(u => {
        roles[u.id] = {
          isAdmin: u.is_admin || false,
          isVip: u.is_vip || false,
          isModerator: moderatorIds.has(u.id)
        };
      });

      setUserRoles(prev => ({ ...prev, ...roles }));
    } catch (err) {
      console.error('Erro ao carregar roles dos usuários:', err);
    }
  };

  // Carregar likes do usuário
  const loadUserLikes = async (messageIds: string[]) => {
    if (!user && !sessionStorage.getItem('session_id')) return;

    try {
      const sessionId = sessionStorage.getItem('session_id') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (!sessionStorage.getItem('session_id')) {
        sessionStorage.setItem('session_id', sessionId);
      }

      const likedSet = new Set<string>();
      for (const msgId of messageIds) {
        const { data } = await supabase.rpc('has_user_liked', {
          p_message_id: msgId,
          p_user_id: user?.id || null,
          p_session_id: user?.id ? null : sessionId
        });
        if (data) likedSet.add(msgId);
      }
      setLikedMessages(likedSet);
    } catch (error) {
      console.error('Erro ao carregar likes:', error);
    }
  };

  // Carregar likes quando mensagens mudarem
  useEffect(() => {
    if (messages.length > 0) {
      loadUserLikes(messages.map(m => m.id));
    }
  }, [messages.length]);

  // ✅ Sincronizar Link Fixado via Socket.io
  useEffect(() => {
    if (!connected || !streamId) return;

    const handlePinnedLink = (data: any) => {
      console.log('📌 Chat: Link fixado recebido/atualizado:', data?.id);
      setCurrentPinnedLink(data);
    };

    // Registrar ouvintes
    emit('chat-get-pinned-link', { streamId });
    // Nota: O useChatSession expõe o socket via ChatProvider se necessário, 
    // mas aqui vamos usar o padrão de emit direto.
    // Como o PinnedLinkOverlay também tem seu próprio socket, isso é redundante mas garante o estado local.
  }, [connected, streamId, emit]);

  // Scroll automático
  useEffect(() => {
    if (messagesContainerRef.current && messagesEndRef.current) {
      const container = messagesContainerRef.current;
      const target = messagesEndRef.current;

      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        setTimeout(() => {
          if (container && target) {
            container.scrollTop = container.scrollHeight;
          }
        }, 100);
        return;
      }

      if (userScrolledUpRef.current) return;

      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const scrollTop = container.scrollTop;
        const targetTop = targetRect.top - containerRect.top + scrollTop;
        container.scrollTo({
          top: targetTop,
          behavior: 'smooth'
        });
      }
    }
  }, [messages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      userScrolledUpRef.current = !isAtBottom;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const checkVipStatus = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('is_vip')
        .eq('id', user.id)
        .single();
      if (!error && data) {
        setIsVip(data.is_vip || false);
      }
    } catch (err) {
      console.error('Erro ao verificar status VIP:', err);
    }
  };

  const checkBanStatus = async () => {
    if (!user) return;
    const { data } = await supabase.rpc('is_user_banned', { p_user_id: user.id, p_stream_id: streamId });
    setIsBanned(data || false);
  };

  const loadVipColor = () => {
    if (!user) return;
    const savedColor = localStorage.getItem(`vip_color_${user.id}`);
    if (savedColor) {
      setVipCustomColor(savedColor);
    }
  };

  const saveVipColor = async (color: string) => {
    if (!user) return;
    localStorage.setItem(`vip_color_${user.id}`, color);
    setVipCustomColor(color);
    try {
      await supabase
        .from('users')
        .update({ vip_color: color })
        .eq('id', user.id);
    } catch (err) {
      console.error('Erro ao salvar cor VIP:', err);
    }
    setShowColorPicker(false);
    toast.success('Cor personalizada salva!');
  };

  const loadVipLimits = async () => {
    if (!user || !isVip || !streamId) return;
    try {
      const { data: audioCount } = await supabase.rpc('count_user_audio_messages', {
        p_user_id: user.id,
        p_stream_id: streamId
      });
      if (audioCount !== null) {
        setAudioCountRemaining(Math.max(0, 3 - audioCount));
      }

      const { data: overlayCount } = await supabase.rpc('count_vip_overlay_messages', {
        p_stream_id: streamId
      });
      if (overlayCount !== null) {
        setVipOverlayCountRemaining(Math.max(0, 10 - overlayCount));
      }
    } catch (err) {
      console.error('Erro ao carregar limites VIP:', err);
    }
  };

  const handleToggleLike = async (messageId: string) => {
    try {
      const sessionId = sessionStorage.getItem('session_id') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (!sessionStorage.getItem('session_id')) {
        sessionStorage.setItem('session_id', sessionId);
      }

      // ✅ NOVO: Emitir via Socket.io ao invés de chamar RPC diretamente
      // O backend processa e faz broadcast para todos
      emit(streamId, 'like-message', {
        messageId,
        userId: user?.id || null,
        sessionId: user?.id ? null : sessionId
      });

      // Atualização otimista do estado local (será confirmado pelo broadcast)
      const newLikedMessages = new Set(likedMessages);
      if (likedMessages.has(messageId)) {
        newLikedMessages.delete(messageId);
      } else {
        newLikedMessages.add(messageId);
      }
      setLikedMessages(newLikedMessages);
    } catch (error: any) {
      console.error('Erro ao curtir mensagem:', error);
      toast.error('Erro ao curtir mensagem');
    }
  };

  const containsPhoneNumber = (text: string): boolean => {
    const phonePatterns = [
      /(\+55\s?)?(\(?\d{2}\)?\s?)?(\d{4,5}[-.\s]?\d{4})/g,
      /(\+?\d{1,3}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{4,5}[-.\s]?\d{4}/g,
      /\d{10,}/g,
    ];
    return phonePatterns.some(pattern => pattern.test(text));
  };

  const containsLink = (text: string): boolean => {
    const linkPatterns = [
      /https?:\/\/[^\s]+/gi,
      /www\.[^\s]+/gi,
      /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*/gi,
      /bit\.ly\/[^\s]+/gi,
      /t\.me\/[^\s]+/gi,
      /wa\.me\/[^\s]+/gi,
    ];
    return linkPatterns.some(pattern => pattern.test(text));
  };

  const canSendRestrictedContent = (): boolean => {
    return isAdmin || isModerator;
  };

  const getVipColorClasses = (colorValue: string) => {
    const colorMap: { [key: string]: any } = {
      purple: { border: 'border-2 border-purple-500/60', bg: 'bg-gradient-to-r from-purple-900/20 to-purple-800/10', nameColor: 'text-purple-400', badgeClass: 'bg-purple-500/20 border-purple-500/40 text-purple-300' },
      pink: { border: 'border-2 border-pink-500/60', bg: 'bg-gradient-to-r from-pink-900/20 to-pink-800/10', nameColor: 'text-pink-400', badgeClass: 'bg-pink-500/20 border-pink-500/40 text-pink-300' },
      blue: { border: 'border-2 border-blue-500/60', bg: 'bg-gradient-to-r from-blue-900/20 to-blue-800/10', nameColor: 'text-blue-400', badgeClass: 'bg-blue-500/20 border-blue-500/40 text-blue-300' },
      cyan: { border: 'border-2 border-cyan-500/60', bg: 'bg-gradient-to-r from-cyan-900/20 to-cyan-800/10', nameColor: 'text-cyan-400', badgeClass: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' },
      green: { border: 'border-2 border-green-500/60', bg: 'bg-gradient-to-r from-green-900/20 to-green-800/10', nameColor: 'text-green-400', badgeClass: 'bg-green-500/20 border-green-500/40 text-green-300' },
      yellow: { border: 'border-2 border-yellow-500/60', bg: 'bg-gradient-to-r from-yellow-900/20 to-yellow-800/10', nameColor: 'text-yellow-400', badgeClass: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' },
      orange: { border: 'border-2 border-orange-500/60', bg: 'bg-gradient-to-r from-orange-900/20 to-orange-800/10', nameColor: 'text-orange-400', badgeClass: 'bg-orange-500/20 border-orange-500/40 text-orange-300' },
      red: { border: 'border-2 border-red-500/60', bg: 'bg-gradient-to-r from-red-900/20 to-red-800/10', nameColor: 'text-red-400', badgeClass: 'bg-red-500/20 border-red-500/40 text-red-300' },
      gold: { border: 'border-2 border-yellow-400/60', bg: 'bg-gradient-to-r from-yellow-900/20 to-yellow-700/10', nameColor: 'text-yellow-300', badgeClass: 'bg-yellow-400/20 border-yellow-400/40 text-yellow-200' },
      silver: { border: 'border-2 border-slate-400/60', bg: 'bg-gradient-to-r from-slate-700/20 to-slate-600/10', nameColor: 'text-slate-300', badgeClass: 'bg-slate-400/20 border-slate-400/40 text-slate-200' }
    };
    return colorMap[colorValue] || colorMap.purple;
  };

  const getMessageStyles = (msg: ChatMessage) => {
    const hasLink = containsLink(msg.message);

    // ✅ NOVO: Primeiro verificar dados da própria mensagem (vêm do backend em tempo real)
    // Fallback para userRoles (para mensagens antigas carregadas do banco)
    const msgData = msg as any; // Type cast para acessar is_vip, is_admin
    const roles = userRoles[msg.user_id || ''] || { isAdmin: false, isVip: false, isModerator: false };

    // Priorizar dados da mensagem, depois fallback para userRoles
    const isUserAdmin = msgData.is_admin === true || roles.isAdmin;
    const isUserVip = msgData.is_vip === true || roles.isVip;
    const isUserModerator = roles.isModerator; // Moderador ainda vem do userRoles

    if (isUserAdmin) {
      return {
        border: hasLink ? 'border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'border-2 border-yellow-500/60',
        bg: hasLink ? 'bg-gradient-to-r from-yellow-600/30 to-yellow-500/20' : 'bg-gradient-to-r from-yellow-900/20 to-yellow-800/10',
        nameColor: 'text-yellow-400',
        badge: '👑 ADMIN',
        badgeClass: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
        isHighlighted: hasLink
      };
    } else if (isUserModerator) {
      return {
        border: hasLink ? 'border-2 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-2 border-blue-500/60',
        bg: hasLink ? 'bg-gradient-to-r from-blue-600/30 to-blue-500/20' : 'bg-gradient-to-r from-blue-900/20 to-blue-800/10',
        nameColor: 'text-blue-400',
        badge: '🛡️ MOD',
        badgeClass: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
        isHighlighted: hasLink
      };
    } else if (isUserVip) {
      const isOwnMessage = msg.user_id === user?.id;
      const colorToUse = isOwnMessage ? vipCustomColor : 'purple';
      const colorConfig = VIP_COLOR_PRESETS.find(c => c.value === colorToUse) || VIP_COLOR_PRESETS[0];
      const colorClasses = getVipColorClasses(colorConfig.value);
      return {
        border: colorClasses.border,
        bg: colorClasses.bg,
        nameColor: colorClasses.nameColor,
        badge: '💎 VIP',
        badgeClass: colorClasses.badgeClass,
        isHighlighted: false
      };
    }

    return {
      border: 'border border-white/5',
      bg: 'bg-white/5',
      nameColor: 'text-slate-500',
      badge: null,
      badgeClass: '',
      isHighlighted: false
    };
  };

  const handleSendAudioMessage = async () => {
    if (!user || !isVip || !newMessage.trim()) {
      toast.error('Apenas VIPs podem enviar mensagens de áudio');
      return;
    }

    const { data: audioCount } = await supabase.rpc('count_user_audio_messages', {
      p_user_id: user.id,
      p_stream_id: streamId
    });

    if (audioCount !== null && audioCount >= 3) {
      toast.error('Você já enviou 3 áudios nesta live. Limite atingido.');
      return;
    }

    const now = Date.now();
    const timeSinceLastAudio = now - lastAudioSentAt;
    const MIN_AUDIO_INTERVAL = 30000;

    if (timeSinceLastAudio < MIN_AUDIO_INTERVAL) {
      const secondsRemaining = Math.ceil((MIN_AUDIO_INTERVAL - timeSinceLastAudio) / 1000);
      toast.error(`Aguarde ${secondsRemaining} segundos antes de enviar outro áudio`);
      return;
    }

    const MAX_TTS_LENGTH = 500;
    if (newMessage.length > MAX_TTS_LENGTH) {
      toast.error(`Mensagem de áudio muito longa! Limite: ${MAX_TTS_LENGTH} caracteres`);
      return;
    }

    try {
      setIsSendingAudio(true);

      const { data: canSend } = await supabase.rpc('can_send_message', {
        p_user_id: user.id,
        p_stream_id: streamId
      });

      if (canSend && !canSend.can_send) {
        if (canSend.reason === 'banned') {
          toast.error(canSend.message);
          setIsBanned(true);
          setIsSendingAudio(false);
          return;
        } else if (canSend.reason === 'slow_mode') {
          toast.error(canSend.message);
          setSlowModeSecondsRemaining(canSend.seconds_remaining);
          setIsSendingAudio(false);
          return;
        }
      }

      const msg = newMessage.trim();
      setNewMessage('');
      setLastAudioSentAt(now);

      const words = msg.split(' ').length;
      const estimatedDuration = Math.ceil((words / 150) * 60);

      if (!connected) {
        toast.error('Não conectado ao servidor. Tentando reconectar...');
        setIsSendingAudio(false);
        return;
      }

      sendMessage(streamId, msg, {
        messageType: 'tts',
        ttsText: msg,
        audioDuration: estimatedDuration
      });

      const remaining = Math.max(0, 3 - (audioCount || 0) - 1);
      setAudioCountRemaining(remaining);
      await loadVipLimits();

      toast.success(`🔊 Áudio enviado! Restam ${remaining} áudios`, { duration: 4000 });
    } catch (err) {
      console.error('Erro ao enviar mensagem de áudio:', err);
      toast.error('Erro ao enviar mensagem de áudio');
    } finally {
      setIsSendingAudio(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !newMessage.trim()) return;

    try {
      const maxLength = isVip ? MAX_MESSAGE_LENGTH_VIP : MAX_MESSAGE_LENGTH;
      if (newMessage.length > maxLength) {
        toast.error(`Mensagem muito longa! Limite: ${maxLength} caracteres${isVip ? ' (VIP)' : ''}`);
        return;
      }

      const { data: canSend } = await supabase.rpc('can_send_message', {
        p_user_id: user.id,
        p_stream_id: streamId
      });

      if (canSend && !canSend.can_send) {
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

      if (!connected) {
        toast.error('Não conectado ao servidor. Tentando reconectar...');
        return;
      }

      sendMessage(streamId, msg, { messageType: 'text' });
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

  const pinMessage = async (msg: ChatMessage) => {
    try {
      await supabase
        .from('live_chat_messages')
        .update({ is_pinned: false })
        .eq('stream_id', streamId)
        .eq('is_pinned', true);

      const { error } = await supabase
        .from('live_chat_messages')
        .update({ is_pinned: true })
        .eq('id', msg.id);

      if (error) {
        toast.error('Erro ao fixar: ' + error.message);
      } else {
        toast.success('Mensagem fixada com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao fixar mensagem:', err);
      toast.error('Erro ao fixar mensagem');
    }
  };

  const pinLink = async () => {
    if (!linkToPin.trim()) {
      toast.error('Por favor, insira um link válido');
      return;
    }

    let validLink = linkToPin.trim();
    if (!validLink.startsWith('http://') && !validLink.startsWith('https://')) {
      validLink = 'https://' + validLink;
    }

    try {
      emit(streamId, 'chat-pin-link', {
        userId: user?.id,
        message: linkMessage.trim() || 'Link compartilhado',
        pinned_link: validLink,
        userName: (currentUser?.name || user?.email?.split('@')[0] || 'Admin').split(' ')[0],
        userEmail: user?.email
      });

      setShowPinLinkModal(false);
      setLinkToPin('');
      setLinkMessage('');
      toast.success('Solicitação de fixação enviada');
    } catch (err) {
      console.error('Erro ao fixar link:', err);
      toast.error('Erro ao fixar link');
    }
  };

  const handleUnpinLink = async () => {
    if (!confirm('Desfixar este link?')) return;
    try {
      emit(streamId, 'chat-unpin-link', {});
      toast.success('Solicitação de desfixação enviada');
    } catch (err) {
      console.error('Erro ao desfixar link:', err);
      toast.error('Erro ao desfixar link');
    }
  };

  const rootClassName = ['flex flex-col h-full', className].filter(Boolean).join(' '); // Removed default bg-slate-900 to allow overrides

  return (
    <div className={rootClassName}>
      {showHeader && (
        <div className="p-4 border-b border-white/5 bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-black text-white uppercase italic tracking-tight">Chat ao Vivo</h3>
          </div>
          <div className="flex items-center gap-2">
            {(isAdmin || isModerator) && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPinLinkModal(true)}
                  className="p-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg transition-all"
                  title="Fixar link no chat"
                >
                  <Link2 className="w-4 h-4 text-blue-400" />
                </button>
                <button
                  onClick={handleUnpinLink}
                  className="p-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg transition-all"
                  title="Desfixar link atual"
                >
                  <X className="w-4 h-4 text-red-400" />
                </button>
              </div>
            )}
            {isVip && (
              <div className="relative" ref={colorPickerRef}>
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg transition-all"
                  title="Escolher cor personalizada"
                >
                  <Palette className="w-4 h-4 text-purple-400" />
                </button>
                {showColorPicker && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 rounded-2xl border border-white/10 p-4 shadow-2xl z-50">
                    <div className="mb-3">
                      <p className="text-[10px] font-black text-purple-400 uppercase mb-3">💎 Escolher Cor VIP</p>
                      <div className="grid grid-cols-5 gap-2">
                        {VIP_COLOR_PRESETS.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => saveVipColor(color.value)}
                            className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${vipCustomColor === color.value
                              ? 'border-white ring-2 ring-offset-2 ring-offset-slate-800 ring-white'
                              : 'border-white/20'
                              }`}
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                          >
                            {vipCustomColor === color.value && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                      <p className="text-[8px] text-slate-400 mt-3 text-center">
                        Suas mensagens aparecerão nesta cor
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/50">
        <PinnedLinkOverlay
          streamId={streamId}
          canUnpin={isAdmin || isModerator}
          pinnedLink={currentPinnedLink}
        />
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.filter(msg => !msg.is_pinned).map((msg) => {
          const styles = getMessageStyles(msg);
          const roles = userRoles[msg.user_id || ''] || { isAdmin: false, isVip: false, isModerator: false };
          const isVipMessage = roles.isVip;

          return (
            <div
              key={msg.id}
              className={`flex flex-col items-start gap-1 group ${isVipMessage ? 'vip-message' : ''} ${styles.isHighlighted ? 'highlight-message' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black ${styles.nameColor} uppercase tracking-tighter`}>
                  {(msg.user_name || msg.user_email?.split('@')[0] || 'Usuário').split(' ')[0]}
                </span>
                {msg.message_type === 'tts' && (
                  <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-[8px] font-black uppercase rounded flex items-center gap-1">
                    <Volume2 className="w-2.5 h-2.5" />
                    ÁUDIO
                  </span>
                )}
                {styles.badge && (
                  <span className={`px-1.5 py-0.5 ${styles.badgeClass} text-[8px] font-black uppercase rounded`}>
                    {styles.badge}
                  </span>
                )}
              </div>
              <div className="flex items-start gap-2 w-full">
                <div className="flex-1 flex items-start gap-2">
                  <div
                    className={`px-4 py-2 ${styles.bg} ${styles.border} rounded-2xl max-w-full overflow-hidden flex-1 shadow-lg transition-all ${styles.isHighlighted ? 'ring-2 ring-blue-500/50 scale-[1.02] origin-left' : ''}`}
                  >
                    <p className="text-xs text-white break-words font-medium">{msg.message}</p>
                  </div>

                  <button
                    onClick={() => handleToggleLike(msg.id)}
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all ${likedMessages.has(msg.id)
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-red-400'
                      }`}
                    title="Curtir"
                  >
                    <Heart className={`w-4 h-4 ${likedMessages.has(msg.id) ? 'fill-current' : ''}`} />
                    {msg.likes_count && msg.likes_count > 0 && (
                      <span className="text-[9px] font-bold">{msg.likes_count}</span>
                    )}
                  </button>
                </div>

                {(isModerator || isAdmin) && (
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => pinMessage(msg)}
                      className="p-1.5 hover:bg-blue-500/10 rounded-lg text-blue-400"
                      title="Fixar mensagem"
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-400"
                      title="Deletar mensagem"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
                <div className="absolute bottom-full left-0 mb-3 w-64 bg-slate-800 rounded-2xl border border-white/10 p-3 shadow-2xl z-50 max-h-96 overflow-y-auto">
                  {isVip && (
                    <div className="mb-3 pb-3 border-b border-purple-500/20">
                      <p className="text-[8px] font-black text-purple-400 uppercase mb-2 flex items-center gap-1">
                        {VIP_EMOJIS.exclusive.title}
                        <span className="text-[6px] text-purple-500">EXCLUSIVO</span>
                      </p>
                      <div className="grid grid-cols-6 gap-1">
                        {VIP_EMOJIS.exclusive.emojis.map(e => (
                          <button
                            key={e}
                            onClick={() => { setNewMessage(p => p + e); setShowEmojiPicker(false); }}
                            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-purple-500/20 rounded-lg transition-all hover:scale-110"
                            title="Emoji VIP exclusivo"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {Object.entries(EMOJI_CATEGORIES).map(([key, cat]) => (
                    <div key={key} className="mb-3">
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-2">{cat.title}</p>
                      <div className="grid grid-cols-6 gap-1">
                        {cat.emojis.map(e => (
                          <button
                            key={e}
                            onClick={() => { setNewMessage(p => p + e); setShowEmojiPicker(false); }}
                            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/5 rounded-lg transition-all"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Sua mensagem..."
                maxLength={isVip ? MAX_MESSAGE_LENGTH_VIP : MAX_MESSAGE_LENGTH}
                className="w-full px-4 py-2.5 bg-slate-900 border border-white/5 rounded-xl text-white text-xs font-bold"
              />
              <div className="absolute right-2 bottom-1 text-[9px] text-slate-500 flex flex-col items-end gap-0.5">
                {slowModeSecondsRemaining > 0 && (
                  <span className="text-red-400 animate-pulse font-black">Aguarde {slowModeSecondsRemaining}s</span>
                )}
                <span>{newMessage.length}/{isVip ? MAX_MESSAGE_LENGTH_VIP : MAX_MESSAGE_LENGTH}</span>
              </div>
            </div>
            {isVip && (
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={handleSendAudioMessage}
                  disabled={!newMessage.trim() || isSendingAudio || newMessage.length > 500 || audioCountRemaining <= 0}
                  className="px-3 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase italic shadow-lg shadow-purple-600/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={`Enviar como áudio (TTS) - Máximo 500 caracteres. Restam ${audioCountRemaining} áudios nesta live`}
                >
                  <Mic className="w-4 h-4" />
                </button>
                {audioCountRemaining > 0 && (
                  <span className="text-[8px] text-purple-300 font-bold">
                    Restam {audioCountRemaining} áudios
                  </span>
                )}
                {audioCountRemaining === 0 && (
                  <span className="text-[8px] text-red-400 font-bold">
                    Limite atingido
                  </span>
                )}
              </div>
            )}
            <button onClick={handleSendMessage} disabled={!newMessage.trim()} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase italic shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2">
              <span className="md:hidden">Enviar</span>
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

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
}
