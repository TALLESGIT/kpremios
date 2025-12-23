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

// INTERVALOS ENTRE MENSAGENS VIP (em milissegundos)
const MIN_INTERVAL_BETWEEN_MESSAGES = 5000; // 5 segundos mínimo entre mensagens
const MIN_INTERVAL_AFTER_TTS = 3000; // 3 segundos após TTS terminar
const MIN_INTERVAL_AFTER_TEXT = 2000; // 2 segundos após mensagem de texto

const VipMessageOverlay: React.FC<VipMessageOverlayProps> = ({ streamId, isActive }) => {
  const [currentMessage, setCurrentMessage] = useState<VipMessage | null>(null);
  const [userRoles, setUserRoles] = useState<{ [userId: string]: { isVip: boolean } }>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [overlayMessagesCount, setOverlayMessagesCount] = useState(0);
  const [queueWaitTime, setQueueWaitTime] = useState<number | null>(null);
  const userRolesRef = useRef<{ [userId: string]: { isVip: boolean } }>({});
  
  // FILA DE MENSAGENS VIP - Processa uma de cada vez
  const messageQueueRef = useRef<VipMessage[]>([]);
  const isProcessingQueueRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const videoVolumeBeforeTTSRef = useRef<number | null>(null);
  const lastMessageProcessedAtRef = useRef<number>(0); // Timestamp da última mensagem processada

  // Sincronizar ref com state
  useEffect(() => {
    userRolesRef.current = userRoles;
  }, [userRoles]);

  // Função para encontrar e controlar o elemento de vídeo
  const findAndControlVideo = () => {
    // Tentar encontrar o elemento de vídeo do Agora/ZKViewer
    const videoElements = document.querySelectorAll('video');
    let videoElement: HTMLVideoElement | null = null;

    // Procurar pelo vídeo que está sendo reproduzido
    for (const video of Array.from(videoElements)) {
      if (!video.paused || video.readyState >= 2) {
        videoElement = video;
        break;
      }
    }

    return videoElement;
  };

  // Função para reduzir volume do vídeo durante TTS
  const reduceVideoVolume = () => {
    const video = findAndControlVideo();
    if (video) {
      // Salvar volume atual
      videoVolumeBeforeTTSRef.current = video.volume;
      // Reduzir volume para 20% durante TTS
      video.volume = 0.2;
      console.log('🔉 Volume do vídeo reduzido para 20% durante TTS');
    }
  };

  // Função para restaurar volume do vídeo após TTS
  const restoreVideoVolume = () => {
    const video = findAndControlVideo();
    if (video && videoVolumeBeforeTTSRef.current !== null) {
      video.volume = videoVolumeBeforeTTSRef.current;
      videoVolumeBeforeTTSRef.current = null;
      console.log('🔊 Volume do vídeo restaurado');
    }
  };

  // Função para reproduzir TTS com melhor controle de áudio
  const playTTS = async (text: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        setIsPlayingAudio(true);

        // Reduzir volume do vídeo antes de tocar TTS
        reduceVideoVolume();

        // Sintetizar áudio
        const audioUrl = await googleTtsService.synthesizeSpeech({
          text,
          languageCode: 'pt-BR',
          voiceName: 'pt-BR-Neural2-A',
          speakingRate: 1.0
        });

        if (!audioUrl) {
          throw new Error('Falha ao sintetizar áudio');
        }

        // Criar elemento de áudio
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        // Configurar volume alto para garantir que seja audível
        audio.volume = 1.0;

        // Event listeners
        audio.onended = () => {
          console.log('✅ Áudio TTS finalizado');
          restoreVideoVolume();
          currentAudioRef.current = null;
          setIsPlayingAudio(false);
          resolve();
        };

        audio.onerror = (error) => {
          console.error('❌ Erro ao reproduzir áudio TTS:', error);
          restoreVideoVolume();
          currentAudioRef.current = null;
          setIsPlayingAudio(false);
          reject(error);
        };

        // Tentar reproduzir com tratamento de erro
        try {
          await audio.play();
          console.log('🔊 Áudio TTS iniciado');
        } catch (playError: any) {
          // Se falhar por autoplay policy, tentar com user interaction
          console.warn('⚠️ Autoplay bloqueado, tentando novamente...', playError);
          
          // Criar um evento de clique temporário para desbloquear
          const clickEvent = new MouseEvent('click', { bubbles: true });
          document.dispatchEvent(clickEvent);
          
          // Tentar novamente após pequeno delay
          setTimeout(async () => {
            try {
              await audio.play();
              console.log('🔊 Áudio TTS iniciado (após interação)');
            } catch (retryError) {
              console.error('❌ Falha ao reproduzir áudio mesmo após interação:', retryError);
              restoreVideoVolume();
              currentAudioRef.current = null;
              setIsPlayingAudio(false);
              reject(retryError);
            }
          }, 100);
        }

      } catch (error) {
        console.error('❌ Erro ao reproduzir TTS:', error);
        restoreVideoVolume();
        currentAudioRef.current = null;
        setIsPlayingAudio(false);
        reject(error);
      }
    });
  };

  // Função para processar a fila de mensagens
  const processMessageQueue = async () => {
    // Se já está processando ou não há mensagens, retornar
    if (isProcessingQueueRef.current || messageQueueRef.current.length === 0) {
      return;
    }

    // Verificar intervalo mínimo desde a última mensagem
    const now = Date.now();
    const timeSinceLastMessage = now - lastMessageProcessedAtRef.current;
    
    if (timeSinceLastMessage < MIN_INTERVAL_BETWEEN_MESSAGES) {
      const waitTime = MIN_INTERVAL_BETWEEN_MESSAGES - timeSinceLastMessage;
      const waitSeconds = Math.ceil(waitTime / 1000);
      console.log(`⏳ Aguardando ${waitSeconds}s antes de processar próxima mensagem...`);
      
      // Atualizar indicador visual de espera
      setQueueWaitTime(waitSeconds);
      
      // Atualizar contador a cada segundo (apenas se houver mensagem atual sendo exibida)
      let remainingSeconds = waitSeconds;
      const intervalId = setInterval(() => {
        remainingSeconds--;
        if (remainingSeconds > 0) {
          setQueueWaitTime(remainingSeconds);
        } else {
          setQueueWaitTime(null);
          clearInterval(intervalId);
        }
      }, 1000);
      
      // Aguardar o intervalo mínimo antes de processar
      setTimeout(() => {
        clearInterval(intervalId);
        setQueueWaitTime(null);
        processMessageQueue();
      }, waitTime);
      return;
    }
    
    // Se não precisa esperar, limpar indicador
    setQueueWaitTime(null);

    isProcessingQueueRef.current = true;
    const message = messageQueueRef.current.shift();

    if (!message) {
      isProcessingQueueRef.current = false;
      return;
    }

    // Atualizar timestamp da última mensagem processada
    lastMessageProcessedAtRef.current = Date.now();

    console.log(`📨 Processando mensagem da fila: ${message.id} (${message.message_type})`);

    // Exibir mensagem
    setCurrentMessage(message);

    // Se for mensagem TTS, reproduzir áudio
    if (message.message_type === 'tts' && message.tts_text) {
      try {
        // Pequeno delay para garantir que o overlay apareceu
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Reproduzir TTS
        await playTTS(message.tts_text);
      } catch (error) {
        console.error('Erro ao reproduzir TTS:', error);
      }
    }

    // Calcular tempo de exibição baseado no tipo de mensagem
    const displayDuration = message.message_type === 'tts' && message.audio_duration
      ? Math.max(message.audio_duration * 1000 + 2000, 5000) // Duração do áudio + 2s extra, mínimo 5s
      : 8000; // 8 segundos para mensagens de texto

    // Aguardar o tempo de exibição
    await new Promise(resolve => setTimeout(resolve, displayDuration));

    // Remover mensagem atual
    setCurrentMessage(null);

    // Determinar intervalo de cooldown baseado no tipo de mensagem
    const cooldownInterval = message.message_type === 'tts' 
      ? MIN_INTERVAL_AFTER_TTS  // 3 segundos após TTS
      : MIN_INTERVAL_AFTER_TEXT; // 2 segundos após texto

    console.log(`⏸️ Cooldown de ${cooldownInterval / 1000}s após mensagem ${message.message_type}`);

    // Aguardar cooldown antes de processar próxima mensagem
    await new Promise(resolve => setTimeout(resolve, cooldownInterval));

    // Processar próxima mensagem da fila
    isProcessingQueueRef.current = false;
    
    // Processar próxima mensagem
    processMessageQueue();
  };

  // Função para adicionar mensagem à fila
  const addMessageToQueue = (message: VipMessage) => {
    // Verificar se a mensagem já está na fila
    if (messageQueueRef.current.some(m => m.id === message.id)) {
      console.log(`⚠️ Mensagem ${message.id} já está na fila, ignorando...`);
      return;
    }

    // Adicionar à fila
    messageQueueRef.current.push(message);
    console.log(`➕ Mensagem adicionada à fila. Total na fila: ${messageQueueRef.current.length}`);

    // Iniciar processamento se não estiver processando
    processMessageQueue();
  };

  // Função para truncar mensagem se muito longa
  const truncateMessage = (message: string): string => {
    if (message.length <= MAX_OVERLAY_MESSAGE_LENGTH) {
      return message;
    }
    return message.substring(0, MAX_OVERLAY_MESSAGE_LENGTH) + '...';
  };

  // Limpar áudio ao desmontar
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      restoreVideoVolume();
    };
  }, []);

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
                // Fallback: tentar consulta direta (pode falhar para anônimos, mas tentamos)
                console.warn('RPC public_get_vip_status falhou, tentando fallback...', error);
                try {
                  const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('is_vip')
                    .eq('id', newMsg.user_id)
                    .single();

                  if (userError) {
                    console.warn('Consulta direta também falhou (pode ser usuário anônimo):', userError);
                    // Se falhar, verificar se a mensagem tem message_type='tts' ou se é de um VIP conhecido
                    // Por enquanto, vamos assumir false se não conseguir verificar
                    isVip = false;
                  } else {
                    isVip = userData?.is_vip || false;
                  }
                } catch (fallbackErr) {
                  console.error('Erro no fallback de verificação VIP:', fallbackErr);
                  isVip = false;
                }
              } else {
                isVip = data || false;
              }

              // Atualizar cache
              setUserRoles(prev => ({ ...prev, [newMsg.user_id]: { isVip: isVip || false } }));
              
              console.log(`✅ Status VIP verificado para ${newMsg.user_id}: ${isVip}`);
            } catch (err) {
              console.error('Erro ao verificar VIP:', err);
              // Fallback seguro: assumir false para evitar erros
              isVip = false;
            }
          } else {
            console.log(`✅ Status VIP do cache para ${newMsg.user_id}: ${isVip}`);
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

            // Adicionar à fila ao invés de exibir diretamente
            addMessageToQueue(messageData);
            setOverlayMessagesCount(messagesShown + 1);
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
            {/* Mostrar tamanho da fila e tempo de espera se houver mensagens aguardando */}
            {messageQueueRef.current.length > 0 && (
              <span className="text-purple-300 text-[10px] font-bold flex items-center gap-1">
                <span>+{messageQueueRef.current.length} na fila</span>
                {queueWaitTime !== null && (
                  <span className="text-purple-400 animate-pulse">
                    (⏳ {queueWaitTime}s)
                  </span>
                )}
              </span>
            )}
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
