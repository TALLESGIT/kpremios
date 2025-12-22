import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Volume2 } from 'lucide-react';

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
  const userRolesRef = useRef<{ [userId: string]: { isVip: boolean } }>({});
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Sincronizar ref com state
  useEffect(() => {
    userRolesRef.current = userRoles;
  }, [userRoles]);

  // Função para reproduzir TTS
  const playTTS = (text: string) => {
    // Verificar se o navegador suporta Web Speech API
    if (!('speechSynthesis' in window)) {
      console.warn('Text-to-Speech não suportado neste navegador');
      return;
    }

    // Cancelar qualquer áudio anterior
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configurar voz (priorizar português brasileiro)
    const voices = window.speechSynthesis.getVoices();
    
    // Priorizar vozes em pt-BR (português brasileiro)
    const brazilianVoices = voices.filter(voice => 
      voice.lang === 'pt-BR' || voice.lang === 'pt_BR' || voice.lang.startsWith('pt-BR')
    );
    
    // Se não encontrar pt-BR, buscar qualquer português
    const portugueseVoices = brazilianVoices.length > 0 
      ? brazilianVoices 
      : voices.filter(voice => voice.lang.includes('pt'));
    
    if (portugueseVoices.length > 0) {
      // Priorizar vozes do Google (geralmente melhores)
      const googleVoice = portugueseVoices.find(voice => 
        voice.name.toLowerCase().includes('google')
      );
      
      if (googleVoice) {
        utterance.voice = googleVoice;
        utterance.lang = 'pt-BR';
      } else {
        // Tentar encontrar vozes femininas (geralmente soam mais naturais)
        const femaleVoice = portugueseVoices.find(voice => 
          voice.name.toLowerCase().includes('female') || 
          voice.name.toLowerCase().includes('mulher') ||
          voice.name.toLowerCase().includes('feminina') ||
          voice.name.toLowerCase().includes('brasil') ||
          voice.name.toLowerCase().includes('brazil')
        );
        
        if (femaleVoice) {
          utterance.voice = femaleVoice;
          utterance.lang = 'pt-BR';
        } else {
          // Usar a primeira voz brasileira disponível, ou a segunda se houver múltiplas
          const selectedVoice = portugueseVoices.length > 1 ? portugueseVoices[1] : portugueseVoices[0];
          utterance.voice = selectedVoice;
          utterance.lang = 'pt-BR';
        }
      }
    } else {
      // Fallback: usar voz padrão mas forçar idioma pt-BR
      const defaultVoice = voices.find(voice => voice.default) || voices[0];
      if (defaultVoice) {
        utterance.voice = defaultVoice;
      }
      // Sempre forçar pt-BR mesmo se a voz não for brasileira
      utterance.lang = 'pt-BR';
    }
    
    // Configurar idioma para português brasileiro
    utterance.lang = 'pt-BR';
    utterance.rate = 0.65; // Velocidade mais lenta e natural (0.1 a 10, padrão é 1.0)
    utterance.pitch = 0.9; // Tom um pouco mais baixo (mais natural)
    utterance.volume = 0.9; // Volume um pouco mais alto

    utterance.onstart = () => {
      setIsPlayingAudio(true);
    };

    utterance.onend = () => {
      setIsPlayingAudio(false);
    };

    utterance.onerror = (error) => {
      console.error('Erro ao reproduzir TTS:', error);
      setIsPlayingAudio(false);
    };

    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Carregar vozes do TTS quando componente montar
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Carregar vozes (alguns navegadores precisam de um evento para carregar)
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  // Limpar TTS quando componente desmontar ou mensagem mudar
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Função para truncar mensagem se muito longa
  const truncateMessage = (message: string): string => {
    if (message.length <= MAX_OVERLAY_MESSAGE_LENGTH) {
      return message;
    }
    return message.substring(0, MAX_OVERLAY_MESSAGE_LENGTH) + '...';
  };

  useEffect(() => {
    if (!isActive || !streamId) return;

    // Escutar novas mensagens em tempo real
    const channel = supabase.channel(`vip_overlay_${streamId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_chat_messages',
        filter: `stream_id=eq.${streamId}`
      }, async (payload) => {
        const newMsg = payload.new as any;
        
        // Verificar se o usuário é VIP
        if (newMsg.user_id) {
          // Verificar primeiro no cache
          let isVip = userRolesRef.current[newMsg.user_id]?.isVip;
          
          // Se não temos no cache, buscar diretamente
          if (isVip === undefined) {
            try {
              const { data } = await supabase
                .from('users')
                .select('is_vip')
                .eq('id', newMsg.user_id)
                .single();
              
              isVip = data?.is_vip || false;
              
              // Atualizar cache
              setUserRoles(prev => ({ ...prev, [newMsg.user_id]: { isVip: isVip || false } }));
            } catch (err) {
              console.error('Erro ao verificar VIP:', err);
              return;
            }
          }
          
          // Se for VIP, mostrar overlay (truncar mensagem se muito longa)
          if (isVip) {
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

