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

          // Remover o alerta após 3 segundos
          setTimeout(() => {
            setAlerts((prev) => prev.filter((a) => a.id !== newAlert.id));
          }, 3000);
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
      }, 5000);
    };

    on('vip-alert-received', handleVipAlert);
    on('chat-vip-alert', handleVipAlert); // Fallback for direct broadcast

    return () => {
      off('vip-alert-received', handleVipAlert);
      off('chat-vip-alert', handleVipAlert);
    };
  }, [isConnected, streamId, on, off, playVipSound]);

  return (
    <div className="absolute bottom-24 left-4 z-[99999] flex flex-col items-start justify-end pointer-events-none px-0 overflow-visible">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.8, transition: { duration: 0.3 } }}
            style={{ marginBottom: '0.75rem' }}
            className="relative group"
          >
            {/* Efeitos de Partículas sutil */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [-10, -30],
                  x: [0, (i - 1) * 20],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.4
                }}
                className="absolute left-1/2 top-0"
              >
                <Star className="w-1.5 h-1.5 text-yellow-400 fill-yellow-400" />
              </motion.div>
            ))}

            {/* Aura de Brilho Premium - Reduzida */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.2, 0.4, 0.2]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-[-5px] bg-gradient-to-tr from-yellow-500/20 via-purple-500/20 to-blue-500/20 blur-xl rounded-2xl"
            />

            {/* Card Principal - Menor e mais premium */}
            <div className="relative bg-black/90 backdrop-blur-xl border border-yellow-500/40 p-0.5 rounded-lg shadow-[0_0_20px_rgba(234,179,8,0.15)] overflow-hidden">
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-15deg] z-10"
              />

              <div className="bg-gradient-to-br from-slate-900 via-yellow-900/10 to-slate-900 px-2 py-1.5 sm:px-3 sm:py-2 flex items-center gap-2 min-w-[160px] sm:min-w-[200px]">
                <div className="relative flex-shrink-0">
                  <motion.div
                    animate={{
                      rotateY: [0, 360],
                    }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                    className="bg-gradient-to-tr from-yellow-400 to-amber-600 p-1 rounded-md shadow-[0_0_8px_rgba(250,204,21,0.3)]"
                  >
                    <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black stroke-[2.5px]" />
                  </motion.div>
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[6px] sm:text-[8px] font-black text-yellow-400 uppercase tracking-widest italic">
                      NOVO VIP
                    </span>
                    <Sparkles className="w-2 h-2 text-yellow-500" />
                  </div>

                  <h4 className="text-[11px] sm:text-[13px] font-black text-white italic uppercase tracking-tight leading-none mt-0.5 truncate">
                    {alert.user_name}
                  </h4>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default VipAlertOverlay;
