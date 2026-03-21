import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // FILA DE MENSAGENS VIP - Processa uma de cada vez
  const messageQueueRef = useRef<VipMessage[]>([]);
  const isProcessingQueueRef = useRef(false);

  const { on, off } = useSocket({
    streamId: streamId,
    autoConnect: !!streamId
  });


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
        // Se for apenas texto, aguardar 5 segundos
        setTimeout(() => {
          finishMessage();
        }, 5000);
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

    // ✅ Listener para mensagens normais que são de usuários VIP (Socket.io - MAIS RÁPIDO)
    const handleNewMessage = (msg: any) => {
      if (!msg.is_vip) return;

      // Deduplicação básica
      const isDuplicate = messageQueueRef.current.some(m => m.id === msg.id) || (currentMessage?.id === msg.id);
      if (isDuplicate) return;

      const userName = msg.user_name || msg.userName || msg.name || 'VIP';
      debug('✨ Nova mensagem VIP via Socket:', msg.message, 'por:', userName);
      
      const vipMsg: VipMessage = {
        id: msg.id || `socket-${Date.now()}`,
        user_id: msg.user_id,
        user_name: userName,
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

      const userName = msg.user_name || msg.userName || msg.name || 'VIP';
      debug('👑 Nova mensagem VIP Overlay via Socket:', msg.message, 'por:', userName);
      
      const vipMsg: VipMessage = {
        id: msg.id || `vip-${Date.now()}`,
        user_id: msg.user_id,
        user_name: userName,
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

    on('new-message', handleNewMessage);
    on('new-vip-message', handleNewVipMessage);

    return () => {
      off('new-message', handleNewMessage);
      off('new-vip-message', handleNewVipMessage);
    };
  }, [streamId, isActive, on, off]);


  if (!currentMessage) {
    return null;
  }

  return (
    <div className="absolute inset-x-0 top-4 pointer-events-none z-[99999] flex justify-center">
      {/* Overlay de Mensagem VIP Individual (Topo-Centro) */}
      <AnimatePresence mode="wait">
        {currentMessage && (() => {
          const vipColor = currentMessage.vip_color || 'purple';
          const colorClasses = getVipColorClasses(vipColor);

          return (
            <motion.div
              key={currentMessage.id}
              initial={{ opacity: 0, y: -50, scale: 0.9, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, scale: 0.9, filter: 'blur(10px)' }}
              transition={{
                duration: 0.5,
                ease: "easeOut"
              }}
              className="px-4"
            >
              <div className={`bg-gradient-to-r ${colorClasses.bg} backdrop-blur-md border border-white/20 md:border-2 ${colorClasses.border} rounded-xl md:rounded-2xl px-3 py-2 md:px-5 md:py-2.5 shadow-2xl w-full max-w-[280px] md:max-w-[340px] pointer-events-auto relative`}>
                <div className="absolute -top-2 -right-2 transform rotate-12">
                  <div className="bg-yellow-400 p-1 rounded-lg shadow-lg">
                    <Crown className="w-3.5 h-3.5 text-black" />
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="flex items-center gap-1">
                    <span className={`${colorClasses.text} text-[10px] font-black uppercase tracking-wider`}>
                      VIP
                    </span>
                    <Sparkles className="w-2.5 h-2.5 text-yellow-300 animate-pulse" />
                  </div>
                  {currentMessage.message_type === 'tts' && (
                    <span className={`${colorClasses.textLight} text-[10px] font-bold flex items-center gap-1`}>
                      <Volume2 className={`w-2.5 h-2.5 ${isPlayingAudio ? 'animate-pulse' : ''}`} />
                    </span>
                  )}
                  <span className="text-white text-[12px] md:text-sm font-black italic truncate max-w-[140px]">
                    {currentMessage.user_name}
                  </span>
                  {messageQueueRef.current.length > 0 && (
                    <div className="ml-auto bg-black/20 px-1.5 py-0.5 rounded-full">
                      <span className={`${colorClasses.text} text-[9px] font-black`}>
                        +{messageQueueRef.current.length}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-white text-[12px] md:text-sm font-bold leading-tight break-words line-clamp-2 drop-shadow-sm">
                  {currentMessage.message}
                </p>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div >
  );
};

export default VipMessageOverlay;
