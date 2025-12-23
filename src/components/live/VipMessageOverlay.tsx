import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Volume2 } from 'lucide-react';
import googleTtsService from '../../services/googleTtsService';

interface VipMessage {
  id: string;
  user_id: string;
  message: string;
  user_name?: string;
  user_email?: string;
  created_at: string;
  message_type?: 'text' | 'audio' | 'tts';
  tts_text?: string;
  audio_duration?: number;
}

interface VipMessageOverlayProps {
  streamId: string;
  isActive: boolean;
}

// Limite de caracteres para overlay (mensagens muito longas são truncadas)
const MAX_OVERLAY_MESSAGE_LENGTH = 150; // Limite para overlay na tela

const VipMessageOverlay: React.FC<VipMessageOverlayProps> = ({ streamId, isActive }) => {
  const [currentMessage, setCurrentMessage] = useState<VipMessage | null>(null);
  const [userRoles, setUserRoles] = useState<{ [userId: string]: { isVip: boolean } }>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [overlayMessagesCount, setOverlayMessagesCount] = useState(0);
  const userRolesRef = useRef<{ [userId: string]: { isVip: boolean } }>({});

  // Sincronizar ref com state
  useEffect(() => {
    userRolesRef.current = userRoles;
  }, [userRoles]);

  // Função para reproduzir TTS
  const playTTS = async (text: string) => {
    try {
      setIsPlayingAudio(true);

      // Usar serviço Google Cloud TTS (via Edge Function)
      // A função speak já toca o áudio
      await googleTtsService.speak({
        text,
        languageCode: 'pt-BR',
        voiceName: 'pt-BR-Neural2-A', // Voz feminina neural de alta qualidade
        speakingRate: 1.0
      });

    } catch (error) {
      console.error('Erro ao reproduzir TTS Neural:', error);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  // Função para truncar mensagem se muito longa
  const truncateMessage = (message: string): string => {
    if (message.length <= MAX_OVERLAY_MESSAGE_LENGTH) {
      return message;
    }
    return message.substring(0, MAX_OVERLAY_MESSAGE_LENGTH) + '...';
  };

  useEffect(() => {
    if (!isActive || !streamId) return;

    // Escutar novas mensagens em tempo real (sem filtro de user_id para aparecer para todos)
    const channel = supabase.channel(`vip_overlay_${streamId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_chat_messages',
        filter: `stream_id=eq.${streamId}`
      }, async (payload) => {
        const newMsg = payload.new as any;

        console.log('📨 Nova mensagem recebida via Realtime:', {
          id: newMsg.id,
          user_id: newMsg.user_id,
          message_type: newMsg.message_type,
          stream_id: newMsg.stream_id
        });

        // Verificar se o usuário é VIP
        if (newMsg.user_id) {
          // Verificar primeiro no cache
          let isVip = userRolesRef.current[newMsg.user_id]?.isVip;

          // Se não temos no cache, buscar diretamente
          if (isVip === undefined) {
            try {
              // Tentar via RPC seguro (acessível para anônimos)
              const { data, error } = await supabase.rpc('public_get_vip_status', {
                p_user_id: newMsg.user_id
              });

              if (error) {
                // Fallback para método antigo (só funciona se logado)
                console.warn('RPC public_get_vip_status falhou/não existe, tentando fallback...', error);
                const { data: userData } = await supabase
                  .from('users')
                  .select('is_vip')
                  .eq('id', newMsg.user_id)
                  .single();

                isVip = userData?.is_vip || false;
              } else {
                isVip = data || false;
              }

              // Atualizar cache
              setUserRoles(prev => ({ ...prev, [newMsg.user_id]: { isVip: isVip || false } }));
            } catch (err) {
              console.error('Erro ao verificar VIP:', err);
              // Fallback seguro: assumir false para evitar erros
              isVip = false;
            }
          }

          // Se for VIP, verificar limite de mensagens na tela (máximo 10 por live)
          if (isVip) {
            // Verificar quantas mensagens VIP já apareceram na tela
            const { data: currentCount, error: countError } = await supabase.rpc('count_vip_overlay_messages', {
              p_stream_id: streamId
            });

            const messagesShown = countError ? overlayMessagesCount : (currentCount || 0);

            // Se já mostrou 10 mensagens, não mostrar mais
            if (messagesShown >= 10) {
              console.log('Limite de mensagens VIP na tela atingido (10/10)');
              return;
            }

            const truncatedMsg = truncateMessage(newMsg.message);
            const messageData: VipMessage = {
              id: newMsg.id,
              user_id: newMsg.user_id,
              message: truncatedMsg,
              user_name: newMsg.user_name || newMsg.user_email?.split('@')[0] || 'VIP',
              user_email: newMsg.user_email,
              created_at: newMsg.created_at,
              message_type: newMsg.message_type || 'text',
              tts_text: newMsg.tts_text || newMsg.message,
              audio_duration: newMsg.audio_duration
            };

            setCurrentMessage(messageData);
            setOverlayMessagesCount(messagesShown + 1);

            // Se for mensagem TTS, reproduzir áudio
            if (messageData.message_type === 'tts' && messageData.tts_text) {
              // Pequeno delay para garantir que o overlay apareceu
              setTimeout(() => {
                playTTS(messageData.tts_text!);
              }, 300);
            }

            // Calcular tempo de exibição baseado no tipo de mensagem
            const displayDuration = messageData.message_type === 'tts' && messageData.audio_duration
              ? Math.max(messageData.audio_duration * 1000 + 2000, 5000) // Duração do áudio + 2s extra, mínimo 5s
              : 8000; // 8 segundos para mensagens de texto

            // Remover após o tempo calculado
            setTimeout(() => {
              setCurrentMessage(prev => prev?.id === newMsg.id ? null : prev);
            }, displayDuration);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, isActive]);

  if (!currentMessage) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentMessage.id}
        initial={{ opacity: 0, y: -100, scale: 0.8, filter: 'blur(10px)' }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)'
        }}
        exit={{
          opacity: 0,
          y: 100,
          scale: 0.8,
          filter: 'blur(10px)'
        }}
        transition={{
          duration: 0.6,
          ease: [0.25, 0.46, 0.45, 0.94], // Curva de animação suave
          opacity: { duration: 0.4 },
          scale: { duration: 0.5 },
          filter: { duration: 0.4 }
        }}
        className="absolute top-4 z-50 pointer-events-none w-full flex justify-center"
        style={{
          left: 0,
          right: 0,
          maxWidth: '600px',
          width: '100%',
          margin: '0 auto',
          paddingLeft: '1rem',
          paddingRight: '1rem'
        }}
      >
        <div className="bg-gradient-to-r from-purple-900/60 via-purple-800/60 to-purple-900/60 backdrop-blur-md border-2 border-purple-500/40 rounded-2xl px-5 py-3 shadow-2xl w-full max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-purple-300 text-xs font-black uppercase tracking-wider flex items-center gap-1">
              <span className="text-lg animate-pulse">💎</span> VIP
            </span>
            {currentMessage.message_type === 'tts' && (
              <span className="text-purple-200 text-xs font-bold flex items-center gap-1">
                <Volume2 className={`w-3 h-3 ${isPlayingAudio ? 'animate-pulse' : ''}`} />
                ÁUDIO
              </span>
            )}
            <span className="text-white text-sm font-bold truncate max-w-[200px]">
              {currentMessage.user_name}
            </span>
          </div>
          <p
            className="text-white text-sm font-medium leading-relaxed break-words"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxHeight: '4.5rem'
            }}
          >
            {currentMessage.message}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VipMessageOverlay;
