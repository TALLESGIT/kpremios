import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSocket } from '../../hooks/useSocket';

interface VipAlert {
  id: string;
  user_name: string;
}

interface VipAlertOverlayProps {
  streamId: string | undefined;
  isAdmin?: boolean;
}

const VipAlertOverlay: React.FC<VipAlertOverlayProps> = ({ streamId, isAdmin = false }) => {
  const [alerts, setAlerts] = useState<VipAlert[]>([]);

  // ✅ Função para tocar som premium de VIP (acessível para todos os viewers)
  const playVipSound = React.useCallback(() => {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const frequencies = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // Escala ascendente mais longa

      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.value = freq;
        osc.type = i === frequencies.length - 1 ? 'square' : 'sine'; // Final mais brilhante

        const startTime = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    } catch (e) {
      console.warn('Erro ao reproduzir som VIP:', e);
    }
  }, []);

  if (isAdmin && streamId) {
    console.log(`[VipAlertOverlay] Admin viewing stream: ${streamId}`);
  }

  const { isConnected, on, off } = useSocket({
    streamId: streamId || '',
    autoConnect: !!streamId
  });

  useEffect(() => {
    if (!streamId) return;

    // Escutar novos alertas na tabela vip_alerts filtrando por stream_id
    const channel = supabase
      .channel(`vip-alerts-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vip_alerts',
          filter: `stream_id=eq.${streamId}`
        },
        (payload) => {
          const newAlert = payload.new as VipAlert;
          // Tocar som
          playVipSound();
          // Adicionar novo alerta à fila
          setAlerts((prev) => [...prev, newAlert]);

          // Remover o alerta após 6 segundos
          setTimeout(() => {
            setAlerts((prev) => prev.filter((a) => a.id !== newAlert.id));
          }, 8000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, playVipSound]);

  // ✅ Socket.io VIP Alerts
  useEffect(() => {
    if (!isConnected || !streamId) return;

    const handleVipAlert = (data: any) => {
      console.log('💎 VipAlertOverlay: Alerta VIP recebido via socket:', data);
      const newAlert: VipAlert = {
        id: data.id || Math.random().toString(36).substring(2),
        user_name: data.user_name || data.userName || data.name || 'Doador'
      };

      // Tocar som
      playVipSound();
      setAlerts((prev) => [...prev, newAlert]);

      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== newAlert.id));
      }, 8000);
    };

    on('vip-alert-received', handleVipAlert);
    on('chat-vip-alert', handleVipAlert); // Fallback for direct broadcast

    return () => {
      off('vip-alert-received', handleVipAlert);
      off('chat-vip-alert', handleVipAlert);
    };
  }, [isConnected, streamId, on, off, playVipSound]);

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center pointer-events-none px-4 overflow-visible">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: 50, scale: 0.8, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -100, scale: 0.9, transition: { duration: 0.5 } }}
            style={{ willChange: 'transform, opacity' }}
            className="relative mb-4 last:mb-0 group"
          >
            {/* Efeitos de Partículas sutil */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [-20, -60],
                  x: [0, (i - 1) * 30],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.4
                }}
                className="absolute left-1/2 top-0"
              >
                <Star className="w-2 h-2 text-yellow-400 fill-yellow-400" />
              </motion.div>
            ))}

            {/* Aura de Brilho Premium */}
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.3, 0.6, 0.3],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-[-10px] bg-gradient-to-tr from-yellow-500/30 via-purple-500/30 to-blue-500/30 blur-2xl rounded-3xl"
            />

            {/* Card Principal */}
            <div className="relative bg-black/80 backdrop-blur-xl border-2 border-yellow-500/50 p-1 rounded-2xl shadow-[0_0_40px_rgba(234,179,8,0.3)] overflow-hidden">
              {/* Efeito Shine (Brilho que passa) */}
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] z-10"
              />

              <div className="bg-gradient-to-br from-slate-900 via-purple-900/40 to-slate-900 px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-3 sm:gap-5 min-w-[240px] sm:min-w-[320px]">

                {/* Ícone de Coroa Animado */}
                <div className="relative flex-shrink-0">
                  <motion.div
                    animate={{
                      rotateY: [0, 360],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="bg-gradient-to-tr from-yellow-400 via-amber-200 to-yellow-600 p-2 sm:p-2.5 rounded-xl shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                  >
                    <Crown className="w-5 h-5 sm:w-7 sm:h-7 text-black stroke-[2.5px]" />
                  </motion.div>
                </div>

                {/* Container de Texto */}
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-[9px] sm:text-[11px] font-black text-yellow-400 uppercase tracking-[0.2em] italic"
                    >
                      NOVO MEMBRO VIP
                    </motion.span>
                    <Sparkles className="w-3 h-3 text-yellow-400 animate-pulse" />
                  </div>

                  <h4 className="text-lg sm:text-2xl font-black text-white italic uppercase tracking-tighter leading-none mt-1 truncate drop-shadow-md">
                    {alert.user_name}
                  </h4>

                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-[2px] w-8 bg-gradient-to-r from-yellow-400 to-transparent" />
                    <p className="text-[10px] sm:text-xs font-bold text-yellow-200/80 italic tracking-widest">
                      ACABOU DE ENTRAR NO TIME! 💎
                    </p>
                  </div>
                </div>

                {/* Badge lateral */}
                <div className="hidden sm:flex flex-col items-center justify-center pl-4 border-l border-white/10 ml-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sombra projetada no fundo */}
            <div className="absolute -bottom-2 inset-x-4 h-4 bg-black/40 blur-lg rounded-full -z-10" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default VipAlertOverlay;
