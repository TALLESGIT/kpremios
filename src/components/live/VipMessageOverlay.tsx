import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Volume2, Crown, Sparkles } from 'lucide-react';
import googleTtsService from '../../services/googleTtsService';
import { useSocket } from '../../hooks/useSocket';

interface VipMessage {
  id: string;
  user_id: string;
  message: string;
  user_name: string;
  created_at: string;
  message_type: 'text' | 'tts';
  vip_color: string;
  tts_audio_url?: string;
}

interface VipMessageOverlayProps {
  streamId: string;
  isActive: boolean;
}

const isDebug = () => (import.meta as any).env?.VITE_DEBUG_VIP_OVERLAY === '1';
const debug = (...args: any[]) => { if (isDebug()) console.log('[VipMessageOverlay]', ...args); };

const VipMessageOverlay: React.FC<VipMessageOverlayProps> = ({ streamId, isActive }) => {
  const [currentMessage, setCurrentMessage] = useState<VipMessage | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [queueWaitTime, setQueueWaitTime] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userRolesRef = useRef<{ [userId: string]: { isVip: boolean; vipColor?: string } }>({});

  // Estado para Animação Global de Novo VIP
  const [showVipGlobalAnimation, setShowVipGlobalAnimation] = useState({ show: false, username: '' });

  // FILA DE MENSAGENS VIP - Processa uma de cada vez
  const messageQueueRef = useRef<VipMessage[]>([]);
  const isProcessingQueueRef = useRef(false);

  const { on, off } = useSocket({
    streamId: streamId,
    autoConnect: !!streamId
  });

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cleanup de áudio ao desmontar ou trocar mensagem
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, [currentMessage]);

  // Cores VIP
  const getVipColorClasses = (color: string) => {
    switch (color) {
      case 'gold': return {
        bg: 'from-amber-500/90 via-amber-400/90 to-yellow-500/90',
        border: 'border-yellow-400/50',
        text: 'text-yellow-100',
        textLight: 'text-yellow-200/70'
      };
      case 'purple': return {
        bg: 'from-purple-600/90 via-purple-500/90 to-indigo-600/90',
        border: 'border-purple-400/50',
        text: 'text-purple-100',
        textLight: 'text-purple-200/70'
      };
      case 'pink': return {
        bg: 'from-pink-600/90 via-pink-500/90 to-rose-600/90',
        border: 'border-pink-400/50',
        text: 'text-pink-100',
        textLight: 'text-pink-200/70'
      };
      case 'blue': return {
        bg: 'from-blue-600/90 via-blue-500/90 to-cyan-600/90',
        border: 'border-blue-400/50',
        text: 'text-blue-100',
        textLight: 'text-blue-200/70'
      };
      case 'cyan': return {
        bg: 'from-cyan-600/90 via-cyan-500/90 to-sky-600/90',
        border: 'border-cyan-400/50',
        text: 'text-cyan-100',
        textLight: 'text-cyan-200/70'
      };
      case 'green':
      case 'emerald': return {
        bg: 'from-emerald-600/90 via-emerald-500/90 to-teal-600/90',
        border: 'border-emerald-400/50',
        text: 'text-emerald-100',
        textLight: 'text-emerald-200/70'
      };
      case 'yellow': return {
        bg: 'from-yellow-600/90 via-yellow-500/90 to-amber-600/90',
        border: 'border-yellow-400/50',
        text: 'text-yellow-100',
        textLight: 'text-yellow-200/70'
      };
      case 'orange': return {
        bg: 'from-orange-600/90 via-orange-500/90 to-red-600/90',
        border: 'border-orange-400/50',
        text: 'text-orange-100',
        textLight: 'text-orange-200/70'
      };
      case 'red': return {
        bg: 'from-red-600/90 via-red-500/90 to-rose-700/90',
        border: 'border-red-400/50',
        text: 'text-red-100',
        textLight: 'text-red-200/70'
      };
      case 'silver': return {
        bg: 'from-slate-600/90 via-slate-500/90 to-slate-600/90',
        border: 'border-slate-400/50',
        text: 'text-slate-100',
        textLight: 'text-slate-200/70'
      };
      default: return {
        bg: 'from-slate-800/90 via-slate-700/90 to-slate-800/90',
        border: 'border-white/20',
        text: 'text-white',
        textLight: 'text-slate-300'
      };
    }
  };

  const processMessageQueue = async () => {
    if (isProcessingQueueRef.current || messageQueueRef.current.length === 0) return;

    isProcessingQueueRef.current = true;
    const nextMessage = messageQueueRef.current.shift();

    if (nextMessage) {
      setCurrentMessage(nextMessage);

      // Se for TTS, sintetizar e tocar áudio
      if (nextMessage.message_type === 'tts') {
        setIsPlayingAudio(true);
        try {
          const ttsText = `${nextMessage.user_name} diz: ${nextMessage.message}`;
          const audioUrl = await googleTtsService.synthesizeSpeech({ text: ttsText });

          if (audioUrl) {
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            audio.onended = () => {
              setIsPlayingAudio(false);
              audioRef.current = null;
              setTimeout(() => {
                setCurrentMessage(null);
                isProcessingQueueRef.current = false;
                processMessageQueue();
              }, 1500); // Reduzido para 1.5s após o áudio
            };
            audio.play().catch(e => {
              console.error('Erro ao tocar áudio TTS:', e);
              setIsPlayingAudio(false);
              finishMessage();
            });
          } else {
            setIsPlayingAudio(false);
            finishMessage();
          }
        } catch (err) {
          console.error('Erro no processamento de TTS:', err);
          setIsPlayingAudio(false);
          finishMessage();
        }
      } else {
        // Se for apenas texto, aguardar 7 segundos (conforme plano)
        setTimeout(() => {
          finishMessage();
        }, 7000);
      }
    }
  };

  const finishMessage = () => {
    setCurrentMessage(null);
    setTimeout(() => {
      isProcessingQueueRef.current = false;
      processMessageQueue();
    }, 1000);
  };

  useEffect(() => {
    if (!streamId || !isActive) return;

    // Listener para mensagens VIP do DB (Realtime Supabase)
    const vipChannel = supabase
      .channel(`vip_messages_${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `stream_id=eq.${streamId}`,
        },
        async (payload) => {
          const newMsg = payload.new;

          // Verificar se o usuário é VIP
          if (!userRolesRef.current[newMsg.user_id]) {
            const { data: profile } = await supabase
              .from('users')
              .select('is_vip, vip_color')
              .eq('id', newMsg.user_id)
              .single();

            userRolesRef.current[newMsg.user_id] = {
              isVip: profile?.is_vip || false,
              vipColor: profile?.vip_color || 'purple'
            };
          }

          const role = userRolesRef.current[newMsg.user_id];

          if (role.isVip) {
            debug('Nova mensagem VIP recebida:', newMsg.message);
            const vipMsg: VipMessage = {
              id: newMsg.id,
              user_id: newMsg.user_id,
              user_name: newMsg.user_name,
              message: newMsg.message,
              created_at: newMsg.created_at,
              message_type: newMsg.message_type || 'text',
              vip_color: role.vipColor || 'purple'
            };

            messageQueueRef.current.push(vipMsg);
            if (!isProcessingQueueRef.current) {
              processMessageQueue();
            }
          }
        }
      )
      .subscribe();

    // ✅ Listener para mensagens normais que são de usuários VIP (Socket.io - MAIS RÁPIDO)
    const handleNewMessage = (msg: any) => {
      if (!msg.is_vip) return;

      // Deduplicação básica
      const isDuplicate = messageQueueRef.current.some(m => m.id === msg.id) || (currentMessage?.id === msg.id);
      if (isDuplicate) return;

      debug('✨ Nova mensagem VIP via Socket:', msg.message);
      const vipMsg: VipMessage = {
        id: msg.id || `socket-${Date.now()}`,
        user_id: msg.user_id,
        user_name: msg.user_name,
        message: msg.message,
        created_at: msg.created_at || new Date().toISOString(),
        message_type: msg.message_type || 'text',
        vip_color: msg.vip_color || 'purple'
      };

      messageQueueRef.current.push(vipMsg);
      if (!isProcessingQueueRef.current) {
        processMessageQueue();
      }
    };

    // ✅ Listener para mensagens VIP específicas (overlay overlay)
    const handleNewVipMessage = (msg: any) => {
      // Deduplicação básica
      const isDuplicate = messageQueueRef.current.some(m => m.id === msg.id) || (currentMessage?.id === msg.id);
      if (isDuplicate) return;

      debug('👑 Nova mensagem VIP Overlay via Socket:', msg.message);
      const vipMsg: VipMessage = {
        id: msg.id || `vip-${Date.now()}`,
        user_id: msg.user_id,
        user_name: msg.user_name,
        message: msg.message,
        created_at: msg.created_at || new Date().toISOString(),
        message_type: msg.message_type || 'text',
        vip_color: msg.vip_color || 'purple'
      };

      messageQueueRef.current.push(vipMsg);
      if (!isProcessingQueueRef.current) {
        processMessageQueue();
      }
    };

    // ✅ Listener para overlay "Novo VIP!" disparado pelo admin
    const handleNewVipSubscriber = (data: { name: string; streamId: string }) => {
      debug('Novo VIP anunciado pelo admin (Global Anim):', data.name);

      // Ativar animação "WOW" central
      setShowVipGlobalAnimation({ show: true, username: data.name });
      setTimeout(() => setShowVipGlobalAnimation({ show: false, username: '' }), 7000);

      // Tocar som épico
      try {
        const audio = new Audio('https://www.myinstants.com/media/sounds/epic.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Áudio VIP bloqueado pelo navegador:', e));
      } catch (err) { }

      // Mantém a mensagem no topo como log secundário
      const fakeMsg: VipMessage = {
        id: `vip-announce-${Date.now()}`,
        user_id: 'admin-announce',
        message: `🎉 ${data.name} acabou de se tornar VIP! Bem-vindo ao clube! 💎`,
        user_name: data.name,
        created_at: new Date().toISOString(),
        message_type: 'text',
        vip_color: 'gold',
      };
      messageQueueRef.current.push(fakeMsg);
      if (!isProcessingQueueRef.current) processMessageQueue();
    };

    on('new-message', handleNewMessage);
    on('new-vip-message', handleNewVipMessage);
    on('vip-new-subscriber', handleNewVipSubscriber);

    return () => {
      supabase.removeChannel(vipChannel);
      off('new-message', handleNewMessage);
      off('new-vip-message', handleNewVipMessage);
      off('vip-new-subscriber', handleNewVipSubscriber);
    };
  }, [streamId, isActive, on, off]);

  // Efeito para calcular tempo de espera estimado na fila
  useEffect(() => {
    const interval = setInterval(() => {
      if (messageQueueRef.current.length > 0) {
        setQueueWaitTime(messageQueueRef.current.length * 10);
      } else {
        setQueueWaitTime(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentMessage]);

  if ((!currentMessage && !showVipGlobalAnimation.show) || isMobile) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-[99999]">
      {/* Overlay de Mensagem VIP Individual (Topo) */}
      <AnimatePresence mode="wait">
        {currentMessage && (() => {
          const vipColor = currentMessage.vip_color || 'purple';
          const colorClasses = getVipColorClasses(vipColor);

          return (
            <motion.div
              key={currentMessage.id}
              initial={{ opacity: 0, x: -50, y: 50, scale: 0.8, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -50, y: 20, scale: 0.8, filter: 'blur(10px)' }}
              transition={{
                duration: 0.6,
                ease: "easeOut"
              }}
              className="absolute bottom-32 left-4 flex justify-start z-[60]"
            >
              <div className={`bg-gradient-to-r ${colorClasses.bg} backdrop-blur-md border border-white/20 md:border-2 ${colorClasses.border} rounded-xl md:rounded-2xl px-2.5 py-1.5 md:px-4 md:py-2 shadow-2xl w-full max-w-[280px] md:max-w-[320px] pointer-events-auto relative`}>
                <div className="absolute -top-2 -right-2 transform rotate-12">
                  <div className="bg-yellow-400 p-1 rounded-lg shadow-lg">
                    <Crown className="w-3 h-3 text-black" />
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-1.5">
                  <span className={`${colorClasses.text} text-[10px] font-black uppercase tracking-wider flex items-center gap-1`}>
                    VIP
                  </span>
                  {currentMessage.message_type === 'tts' && (
                    <span className={`${colorClasses.textLight} text-[10px] font-bold flex items-center gap-1`}>
                      <Volume2 className={`w-2.5 h-2.5 ${isPlayingAudio ? 'animate-pulse' : ''}`} />
                    </span>
                  )}
                  <span className="text-white text-[11px] md:text-xs font-bold truncate max-w-[120px]">
                    {currentMessage.user_name}
                  </span>
                  {messageQueueRef.current.length > 0 && (
                    <span className={`${colorClasses.text} text-[9px] font-bold flex items-center gap-1`}>
                      <span>+{messageQueueRef.current.length}</span>
                    </span>
                  )}
                </div>
                <p className="text-white text-[11px] md:text-xs font-medium leading-tight break-words line-clamp-2">
                  {currentMessage.message}
                </p>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Animação Global VIP (WOW - Centro) */}
      <AnimatePresence>
        {showVipGlobalAnimation.show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 flex items-center justify-center z-[100000] pointer-events-none"
          >
            <div className="relative pointer-events-auto">
              {/* Efeito de Brilho Giratório */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-100px] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(250,204,21,0.4)_360deg)] rounded-full blur-3xl"
              />

              <motion.div
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="relative bg-slate-900/90 backdrop-blur-xl border-2 md:border-4 border-yellow-400 p-6 md:p-10 rounded-[24px] md:rounded-[40px] shadow-[0_0_80px_rgba(250,204,21,0.4)] flex flex-col items-center gap-4 md:gap-6 text-center overflow-hidden max-w-[90vw]"
              >
                {/* Partículas de Brilho */}
                <div className="absolute top-4 left-4"><Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" /></div>
                <div className="absolute bottom-4 right-4"><Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" /></div>

                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Crown className="w-16 h-16 md:w-28 md:h-28 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" />
                </motion.div>

                <div className="space-y-2">
                  <h2 className="text-xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 uppercase tracking-tighter italic">
                    Novo VIP na Área!
                  </h2>
                  <div className="h-1 w-24 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto" />
                </div>

                <p className="text-3xl md:text-6xl font-black text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] tracking-tight">
                  {showVipGlobalAnimation.username}
                </p>

                <p className="text-yellow-200/80 font-bold uppercase tracking-widest text-sm">
                  Bem-vindo ao Time de Elite 💎
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
};

export default VipMessageOverlay;
