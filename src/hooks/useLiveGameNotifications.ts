import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useWhatsApp } from './useWhatsApp';

interface EliminationNotification {
  id: string;
  game_id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  lucky_number: number;
  eliminated_at: string;
  notification_sent: boolean;
}

export const useLiveGameNotifications = (gameId: string, userId?: string) => {
  const [eliminations, setEliminations] = useState<EliminationNotification[]>([]);
  const [isEliminated, setIsEliminated] = useState(false);
  const { sendWhatsAppMessage } = useWhatsApp();

  // Escutar eliminações em tempo real
  useEffect(() => {
    if (!gameId) return;

    const channel = supabase
      .channel(`live_game_${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_participants',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          console.log('🔔 Eliminação detectada:', payload);
          
          if (payload.new.status === 'eliminated') {
            const elimination: EliminationNotification = {
              id: payload.new.id,
              game_id: payload.new.game_id,
              user_id: payload.new.user_id,
              user_name: payload.new.user_name || 'Usuário',
              user_phone: payload.new.user_phone || '',
              lucky_number: payload.new.lucky_number,
              eliminated_at: payload.new.eliminated_at,
              notification_sent: false
            };

            setEliminations(prev => [...prev, elimination]);

            // Verificar se o usuário atual foi eliminado
            if (userId && payload.new.user_id === userId) {
              setIsEliminated(true);
              showEliminationNotification(elimination);
              sendEliminationWhatsApp(elimination);
            } else {
              // Notificar outros usuários sobre a eliminação
              showOtherEliminationNotification(elimination);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, userId]);

  const showEliminationNotification = (elimination: EliminationNotification) => {
    // Notificação visual
    toast.error(
      `❌ Você foi eliminado! Número ${elimination.lucky_number}`,
      {
        duration: 10000,
        style: {
          background: '#dc2626',
          color: 'white',
          fontSize: '16px',
          fontWeight: 'bold',
        },
        icon: '💀',
      }
    );

    // Notificação do navegador
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('💀 Você foi eliminado!', {
        body: `Número ${elimination.lucky_number} foi eliminado do jogo`,
        icon: '/zk-favicon.svg',
        badge: '/zk-favicon.svg',
        tag: 'elimination',
        requireInteraction: true,
      });
    }

    // Som de eliminação
    playEliminationSound();
  };

  const showOtherEliminationNotification = (elimination: EliminationNotification) => {
    toast(
      `❌ ${elimination.user_name} (${elimination.lucky_number}) foi eliminado!`,
      {
        duration: 5000,
        style: {
          background: '#374151',
          color: 'white',
        },
        icon: '👋',
      }
    );
  };

  const sendEliminationWhatsApp = async (elimination: EliminationNotification) => {
    try {
      const message = `💀 *ELIMINAÇÃO NO JOGO RESTA UM* 💀

❌ *Você foi eliminado!*

🎮 *Jogo:* Resta Um
🔢 *Seu número:* ${elimination.lucky_number}
⏰ *Eliminado em:* ${new Date(elimination.eliminated_at).toLocaleString('pt-BR')}

😔 Infelizmente sua sorte não foi desta vez, mas continue participando dos próximos jogos!

🎯 *Próximos jogos:* Acesse o app para ver quando haverá novos sorteios.

Obrigado por participar! 🎉`;

      await sendWhatsAppMessage(elimination.user_phone, message);
      
      // Marcar notificação como enviada
      await supabase
        .from('live_participants')
        .update({ notification_sent: true })
        .eq('id', elimination.id);

    } catch (error) {
      console.error('Erro ao enviar WhatsApp de eliminação:', error);
    }
  };

  const playEliminationSound = () => {
    try {
      // Criar som de eliminação usando Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Som de "game over"
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Frequência descendente (som de eliminação)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.5);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Erro ao reproduzir som:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  const clearEliminations = () => {
    setEliminations([]);
    setIsEliminated(false);
  };

  return {
    eliminations,
    isEliminated,
    requestNotificationPermission,
    clearEliminations,
  };
};
