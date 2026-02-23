import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Volume2 } from 'lucide-react';
import googleTtsService from '../../services/googleTtsService';
import { useSocket } from '../../hooks/useSocket';

// Função para obter classes CSS baseadas na cor escolhida
const getVipColorClasses = (colorValue: string) => {
  const colorMap: { [key: string]: any } = {
    purple: {
      bg: 'from-purple-900/60 via-purple-800/60 to-purple-900/60',
      border: 'border-purple-500/40',
      text: 'text-purple-300',
      textLight: 'text-purple-200'
    },
    pink: {
      bg: 'from-pink-900/60 via-pink-800/60 to-pink-900/60',
      border: 'border-pink-500/40',
      text: 'text-pink-300',
      textLight: 'text-pink-200'
    },
    blue: {
      bg: 'from-blue-900/60 via-blue-800/60 to-blue-900/60',
      border: 'border-blue-500/40',
      text: 'text-blue-300',
      textLight: 'text-blue-200'
    },
    cyan: {
      bg: 'from-cyan-900/60 via-cyan-800/60 to-cyan-900/60',
      border: 'border-cyan-500/40',
      text: 'text-cyan-300',
      textLight: 'text-cyan-200'
    },
    green: {
      bg: 'from-green-900/60 via-green-800/60 to-green-900/60',
      border: 'border-green-500/40',
      text: 'text-green-300',
      textLight: 'text-green-200'
    },
    yellow: {
      bg: 'from-yellow-900/60 via-yellow-800/60 to-yellow-900/60',
      border: 'border-yellow-500/40',
      text: 'text-yellow-300',
      textLight: 'text-yellow-200'
    },
    orange: {
      bg: 'from-orange-900/60 via-orange-800/60 to-orange-900/60',
      border: 'border-orange-500/40',
      text: 'text-orange-300',
      textLight: 'text-orange-200'
    },
    red: {
      bg: 'from-red-900/60 via-red-800/60 to-red-900/60',
      border: 'border-red-500/40',
      text: 'text-red-300',
      textLight: 'text-red-200'
    },
    gold: {
      bg: 'from-yellow-900/60 via-yellow-700/60 to-yellow-900/60',
      border: 'border-yellow-400/40',
      text: 'text-yellow-300',
      textLight: 'text-yellow-200'
    },
    silver: {
      bg: 'from-slate-700/60 via-slate-600/60 to-slate-700/60',
      border: 'border-slate-400/40',
      text: 'text-slate-300',
      textLight: 'text-slate-200'
    }
  };

  return colorMap[colorValue] || colorMap.purple;
};

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
  vip_color?: string; // Cor personalizada do VIP
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

// MELHORIAS: Rate Limiting e Controle de Frequência
const MAX_VIP_MESSAGES_PER_MINUTE = 3; // Máximo 3 mensagens VIP por minuto (global)
const MIN_INTERVAL_PER_USER = 60000; // 1 minuto entre mensagens do mesmo usuário VIP
const RATE_LIMIT_WINDOW = 60000; // Janela de 1 minuto para rate limiting

const isDebug = () => (import.meta as any).env?.DEV === true || (import.meta as any).env?.VITE_DEBUG_VIP_OVERLAY === '1';
const debug = (...args: unknown[]) => { if (isDebug()) console.log('[VipMessageOverlay]', ...args); };
const debugWarn = (...args: unknown[]) => { if (isDebug()) console.warn('[VipMessageOverlay]', ...args); };

const VipMessageOverlay: React.FC<VipMessageOverlayProps> = ({ streamId, isActive }) => {
  debug('Componente renderizado', { streamId, isActive });

  // ✅ MIGRAÇÃO: Usar Socket.io para escutar novas mensagens
  const { socket, isConnected, on, off, joinStream, leaveStream } = useSocket({
    streamId: isActive ? streamId : undefined,
    autoConnect: isActive
  });

  const [currentMessage, setCurrentMessage] = useState<VipMessage | null>(null);
  const [userRoles, setUserRoles] = useState<{ [userId: string]: { isVip: boolean; vipColor?: string } }>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [overlayMessagesCount, setOverlayMessagesCount] = useState(0);
  const [queueWaitTime, setQueueWaitTime] = useState<number | null>(null);
  const userRolesRef = useRef<{ [userId: string]: { isVip: boolean; vipColor?: string } }>({});

  // FILA DE MENSAGENS VIP - Processa uma de cada vez
  const messageQueueRef = useRef<VipMessage[]>([]);
  const isProcessingQueueRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const videoVolumeBeforeTTSRef = useRef<number | null>(null);
  const lastMessageProcessedAtRef = useRef<number>(0); // Timestamp da última mensagem processada

  // MELHORIAS: Controle de rate limiting e limite por usuário
  const messagesInLastMinuteRef = useRef<Array<{ timestamp: number }>>([]); // Mensagens nos últimos 60 segundos
  const lastMessagePerUserRef = useRef<{ [userId: string]: number }>({}); // Última mensagem de cada usuário

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
      debug('Volume do vídeo reduzido para 20% durante TTS');
    }
  };

  // Função para restaurar volume do vídeo após TTS
  const restoreVideoVolume = () => {
    const video = findAndControlVideo();
    if (video && videoVolumeBeforeTTSRef.current !== null) {
      video.volume = videoVolumeBeforeTTSRef.current;
      videoVolumeBeforeTTSRef.current = null;
      debug('Volume do vídeo restaurado');
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
          debug('Áudio TTS finalizado');
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

        // Tentar reproduzir com tratamento de erro robusto
        try {
          debug('Tentando reproduzir áudio TTS...');

          // Configurar áudio para melhor compatibilidade
          audio.preload = 'auto';
          audio.crossOrigin = 'anonymous';

          // Tentar reproduzir diretamente
          const playPromise = audio.play();

          if (playPromise !== undefined) {
            await playPromise;
            debug('Áudio TTS iniciado com sucesso');
          }
        } catch (playError: any) {
          // Se falhar por autoplay policy, tentar múltiplas estratégias
          debugWarn('Autoplay bloqueado, tentando estratégias alternativas...', playError);

          // Estratégia 1: Aguardar e tentar novamente
          await new Promise(resolve => setTimeout(resolve, 300));

          try {
            const retryPromise = audio.play();
            if (retryPromise !== undefined) {
              await retryPromise;
              debug('Áudio TTS iniciado (após retry 1)');
            }
          } catch (retryError1: any) {
            debugWarn('Retry 1 falhou, tentando estratégia 2...', retryError1);

            // Estratégia 2: Aguardar mais tempo e tentar novamente
            await new Promise(resolve => setTimeout(resolve, 500));

            try {
              const finalPromise = audio.play();
              if (finalPromise !== undefined) {
                await finalPromise;
                debug('Áudio TTS iniciado (estratégia final)');
              }
            } catch (finalError: any) {
              console.error('❌ VipMessageOverlay: Todas as estratégias falharam:', finalError);
              debugWarn('Áudio não pôde ser reproduzido, mas a mensagem será exibida');
              restoreVideoVolume();
              currentAudioRef.current = null;
              setIsPlayingAudio(false);
              // Resolver mesmo com erro para não bloquear a fila
              resolve();
              return;
            }
          }
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
      debug(`Aguardando ${waitSeconds}s antes de processar próxima mensagem...`);

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

    debug('Processando mensagem da fila:', {
      id: message.id,
      message_type: message.message_type,
      user_name: message.user_name,
      message_preview: message.message.substring(0, 30) + '...',
      queue_length: messageQueueRef.current.length
    });

    // Exibir mensagem
    debug('Definindo currentMessage para exibição');
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

    debug(`Cooldown de ${cooldownInterval / 1000}s após mensagem ${message.message_type}`);

    // Aguardar cooldown antes de processar próxima mensagem
    await new Promise(resolve => setTimeout(resolve, cooldownInterval));

    // Processar próxima mensagem da fila
    isProcessingQueueRef.current = false;

    // Processar próxima mensagem
    processMessageQueue();
  };

  // Função para adicionar mensagem à fila (mantida para compatibilidade, mas lógica principal está no listener)
  const addMessageToQueue = (message: VipMessage) => {
    // Verificar se a mensagem já está na fila
    if (messageQueueRef.current.some(m => m.id === message.id)) {
      debug(`Mensagem ${message.id} já está na fila, ignorando...`);
      return;
    }

    // Mensagens TTS têm prioridade (início da fila), texto normal vai para o final
    const isTtsMessage = message.message_type === 'tts' || message.message_type === 'audio';
    if (isTtsMessage) {
      messageQueueRef.current.unshift(message); // Prioridade: início da fila
    } else {
      messageQueueRef.current.push(message); // Normal: final da fila
    }

    debug('Mensagem adicionada à fila. Total:', messageQueueRef.current.length, {
      message_id: message.id,
      user_name: message.user_name,
      message_type: message.message_type,
      priority: isTtsMessage ? 'high' : 'normal'
    });

    // Iniciar processamento se não estiver processando
    if (!isProcessingQueueRef.current) {
      processMessageQueue();
    }
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
    if (!isActive || !streamId) {
      debug('Não ativo ou streamId ausente', { isActive, streamId });
      return;
    }

    debug('Iniciando conexão Socket.io para stream:', streamId);

    // ✅ MIGRAÇÃO: Escutar novas mensagens via Socket.io (evento 'new-message')
    const handleNewMessage = async (newMsg: any) => {

      debug('Nova mensagem recebida via Socket:', {
        id: newMsg.id,
        user_id: newMsg.user_id,
        message_type: newMsg.message_type,
        stream_id: newMsg.stream_id,
        message: newMsg.message?.substring(0, 50) + '...',
        user_name: newMsg.user_name,
        is_vip_field: newMsg.is_vip
      });

      // IMPORTANTE: Se for mensagem TTS, deve aparecer para TODOS, independente de verificação VIP
      const isTtsMessage = newMsg.message_type === 'tts';

      // Verificar se o usuário é VIP (apenas se não for TTS, pois TTS já é garantido)
      let isVip = false;
      if (newMsg.user_id && !isTtsMessage) {
        // Verificar primeiro no cache
        isVip = userRolesRef.current[newMsg.user_id]?.isVip;

        // Se não temos no cache, buscar diretamente
        if (isVip === undefined) {
          try {
            // Tentar via RPC seguro (acessível para anônimos)
            const { data, error } = await supabase.rpc('public_get_vip_status', {
              p_user_id: newMsg.user_id
            });

            if (error) {
              // Fallback: tentar consulta direta (pode falhar para anônimos, mas tentamos)
              debugWarn('RPC public_get_vip_status falhou, tentando fallback...', error);
              try {
                const { data: userData, error: userError } = await supabase
                  .from('users')
                  .select('is_vip, vip_color')
                  .eq('id', newMsg.user_id)
                  .single();

                if (userError) {
                  debugWarn('Consulta direta também falhou (pode ser usuário anônimo):', userError);
                  isVip = false;
                } else {
                  isVip = userData?.is_vip || false;
                  // Atualizar cache com cor VIP
                  setUserRoles(prev => ({
                    ...prev,
                    [newMsg.user_id]: {
                      isVip: isVip || false,
                      vipColor: userData?.vip_color || 'purple'
                    }
                  }));
                }
              } catch (fallbackErr) {
                console.error('Erro no fallback de verificação VIP:', fallbackErr);
                isVip = false;
              }
            } else {
              isVip = data || false;
              // Buscar cor VIP se for VIP
              if (isVip) {
                try {
                  const { data: userData } = await supabase
                    .from('users')
                    .select('vip_color')
                    .eq('id', newMsg.user_id)
                    .single();

                  if (userData?.vip_color) {
                    setUserRoles(prev => ({
                      ...prev,
                      [newMsg.user_id]: {
                        isVip: true,
                        vipColor: userData.vip_color
                      }
                    }));
                  }
                } catch (err) {
                  console.error('Erro ao buscar cor VIP:', err);
                }
              }
            }

            // Atualizar cache se ainda não foi atualizado
            if (!userRolesRef.current[newMsg.user_id]) {
              setUserRoles(prev => ({
                ...prev,
                [newMsg.user_id]: {
                  isVip: isVip || false,
                  vipColor: prev[newMsg.user_id]?.vipColor || 'purple'
                }
              }));
            }

            debug('Status VIP verificado para', newMsg.user_id, ':', isVip);
          } catch (err) {
            console.error('Erro ao verificar VIP:', err);
            // Fallback seguro: assumir false para evitar erros
            isVip = false;
          }
        } else {
          debug('Status VIP do cache para', newMsg.user_id, ':', isVip);
        }
      }

      debug('Decisão de exibição:', {
        isVip,
        isTtsMessage,
        shouldShow: isVip || isTtsMessage,
        message_type: newMsg.message_type,
        user_id: newMsg.user_id
      });

      // Se for VIP OU se for mensagem TTS, processar para overlay
      // IMPORTANTE: Mensagens TTS devem aparecer para TODOS os usuários
      if (isVip || isTtsMessage) {
        debug('Mensagem será exibida (VIP ou TTS)');

        // Verificar quantas mensagens VIP já apareceram na tela
        const { data: currentCount, error: countError } = await supabase.rpc('count_vip_overlay_messages', {
          p_stream_id: streamId
        });

        const messagesShown = countError ? overlayMessagesCount : (currentCount || 0);

        // Se já mostrou 10 mensagens, não mostrar mais
        if (messagesShown >= 10) {
          debug('Limite de mensagens VIP na tela atingido (10/10)');
          return;
        }

        // MELHORIA 1: Verificar limite por usuário (cada VIP só pode enviar 1 mensagem por minuto)
        const now = Date.now();
        const lastMessageFromUser = lastMessagePerUserRef.current[newMsg.user_id];

        if (lastMessageFromUser && (now - lastMessageFromUser) < MIN_INTERVAL_PER_USER) {
          const waitTime = Math.ceil((MIN_INTERVAL_PER_USER - (now - lastMessageFromUser)) / 1000);
          debug(`Usuário ${newMsg.user_name} precisa aguardar ${waitTime}s antes de enviar outra mensagem VIP`);
          return; // Ignorar mensagem - usuário enviou muito recentemente
        }

        // MELHORIA 2: Verificar rate limiting global (máximo X mensagens por minuto)
        // Limpar mensagens antigas (fora da janela de 1 minuto)
        const oneMinuteAgo = now - RATE_LIMIT_WINDOW;
        messagesInLastMinuteRef.current = messagesInLastMinuteRef.current.filter(
          msg => msg.timestamp > oneMinuteAgo
        );

        // Verificar se excedeu o limite
        if (messagesInLastMinuteRef.current.length >= MAX_VIP_MESSAGES_PER_MINUTE) {
          const oldestMessage = messagesInLastMinuteRef.current[0];
          const waitTime = Math.ceil((oldestMessage.timestamp + RATE_LIMIT_WINDOW - now) / 1000);
          debug(`Rate limit atingido (${MAX_VIP_MESSAGES_PER_MINUTE} mensagens/minuto). Aguarde ${waitTime}s`);
          return; // Ignorar mensagem - limite global atingido
        }

        // MELHORIA 3: Mensagens TTS têm prioridade (adicionar no início da fila)
        // Mensagens normais vão para o final da fila
        const isTtsMessage = newMsg.message_type === 'tts' || newMsg.message_type === 'audio';

        const truncatedMsg = truncateMessage(newMsg.message);
        // Buscar cor VIP do cache ou usar padrão
        const vipColor = userRolesRef.current[newMsg.user_id]?.vipColor || 'purple';

        const messageData: VipMessage = {
          id: newMsg.id,
          user_id: newMsg.user_id,
          message: truncatedMsg,
          user_name: newMsg.user_name || newMsg.user_email?.split('@')[0] || 'VIP',
          user_email: newMsg.user_email,
          created_at: newMsg.created_at,
          message_type: newMsg.message_type || 'text',
          tts_text: newMsg.tts_text || newMsg.message,
          audio_duration: newMsg.audio_duration,
          vip_color: vipColor
        };

        debug('Adicionando mensagem VIP à fila:', {
          id: messageData.id,
          user_name: messageData.user_name,
          message_type: messageData.message_type,
          message_preview: messageData.message.substring(0, 30) + '...',
          isTts: isTtsMessage,
          priority: isTtsMessage ? 'high' : 'normal'
        });

        // Adicionar à fila (TTS no início, texto no final)
        if (isTtsMessage) {
          messageQueueRef.current.unshift(messageData); // Prioridade: início da fila
        } else {
          messageQueueRef.current.push(messageData); // Normal: final da fila
        }

        // Atualizar controles de rate limiting
        messagesInLastMinuteRef.current.push({ timestamp: now });
        lastMessagePerUserRef.current[newMsg.user_id] = now;

        // Processar fila se não estiver processando
        if (!isProcessingQueueRef.current) {
          processMessageQueue();
        }

        setOverlayMessagesCount(messagesShown + 1);
      } else {
        debug('Usuário NÃO é VIP, ignorando mensagem para overlay');
      }
    };

    // ✅ Escutar evento 'new-message' do Socket.io
    if (socket && isConnected) {
      on('new-message', handleNewMessage);
      debug('Conectado ao Socket.io e escutando mensagens VIP');
    }

    return () => {
      if (socket) {
        debug('Removendo listener Socket.io', { streamId });
        off('new-message', handleNewMessage);
      }
    };
  }, [streamId, isActive, socket, isConnected, on, off]);

  // Log quando currentMessage muda
  useEffect(() => {
    if (currentMessage) {
      debug('currentMessage definido, overlay deve aparecer:', {
        id: currentMessage.id,
        user_name: currentMessage.user_name,
        message_type: currentMessage.message_type
      });
    } else {
      debug('currentMessage é null, overlay não será exibido');
    }
  }, [currentMessage]);

  if (!currentMessage) {
    debug('Renderizando null (sem mensagem atual)');
    return null;
  }

  debug('Renderizando overlay com mensagem:', {
    id: currentMessage.id,
    user_name: currentMessage.user_name
  });

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
        {(() => {
          const vipColor = currentMessage.vip_color || 'purple';
          const colorClasses = getVipColorClasses(vipColor);

          return (
            <div className={`bg-gradient-to-r ${colorClasses.bg} backdrop-blur-md border-2 ${colorClasses.border} rounded-2xl px-5 py-3 shadow-2xl w-full max-w-lg mx-auto`}>
              <div className="flex items-center gap-3 mb-2">
                <span className={`${colorClasses.text} text-xs font-black uppercase tracking-wider flex items-center gap-1`}>
                  <span className="text-lg animate-pulse">💎</span> VIP
                </span>
                {currentMessage.message_type === 'tts' && (
                  <span className={`${colorClasses.textLight} text-xs font-bold flex items-center gap-1`}>
                    <Volume2 className={`w-3 h-3 ${isPlayingAudio ? 'animate-pulse' : ''}`} />
                    ÁUDIO
                  </span>
                )}
                <span className="text-white text-sm font-bold truncate max-w-[200px]">
                  {currentMessage.user_name}
                </span>
                {/* Mostrar tamanho da fila e tempo de espera se houver mensagens aguardando */}
                {messageQueueRef.current.length > 0 && (
                  <span className={`${colorClasses.text} text-[10px] font-bold flex items-center gap-1`}>
                    <span>+{messageQueueRef.current.length} na fila</span>
                    {queueWaitTime !== null && (
                      <span className={`${colorClasses.textLight} animate-pulse`}>
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
          );
        })()}
      </motion.div>
    </AnimatePresence>
  );
};

export default VipMessageOverlay;
