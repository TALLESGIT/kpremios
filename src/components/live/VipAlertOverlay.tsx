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
          // Adicionar novo alerta à fila
          setAlerts((prev) => [...prev, newAlert]);

          // Remover o alerta após 6 segundos
          setTimeout(() => {
            setAlerts((prev) => prev.filter((a) => a.id !== newAlert.id));
          }, 6000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  // ✅ Socket.io VIP Alerts
  useEffect(() => {
    if (!isConnected || !streamId) return;

    const handleVipAlert = (data: any) => {
      console.log('💎 VipAlertOverlay: Alerta VIP recebido via socket:', data);
      const newAlert: VipAlert = {
        id: data.id || Math.random().toString(36).substring(2),
        user_name: data.user_name || data.userName || 'Doador'
      };

      setAlerts((prev) => [...prev, newAlert]);

      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== newAlert.id));
      }, 6000);
    };

    on('vip-alert-received', handleVipAlert);
    on('chat-vip-alert', handleVipAlert); // Fallback for direct broadcast

    return () => {
      off('vip-alert-received', handleVipAlert);
      off('chat-vip-alert', handleVipAlert);
    };
  }, [isConnected, streamId, on, off]);

  return (
    <div className="absolute inset-x-0 bottom-24 sm:bottom-10 z-[100] flex flex-col items-start pointer-events-none px-4 overflow-hidden">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.8, transition: { duration: 0.4 } }}
            className="relative mb-3 last:mb-0"
          >
            {/* Efeito de Brilho de Fundo mais sutil */}
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
              className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full"
            />

            {/* Card do Alerta Compacto e Mobile Ready */}
            <div className="relative bg-gradient-to-r from-slate-900/95 via-purple-900/95 to-slate-900/95 backdrop-blur-md border border-yellow-500/40 px-3 py-2 sm:px-4 sm:py-3 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center gap-3 max-w-[260px] sm:max-w-none">

              {/* Ícone de Coroa Menor */}
              <div className="relative flex-shrink-0">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                  className="bg-gradient-to-tr from-yellow-400 to-yellow-600 p-1.5 sm:p-2 rounded-lg shadow-md"
                >
                  <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </motion.div>
              </div>

              {/* Texto do Alerta Compacto */}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] sm:text-[9px] font-black text-yellow-400 uppercase tracking-wider italic">Novo VIP</span>
                  <div className="flex gap-0.5">
                    <Star className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-yellow-500 fill-yellow-500" />
                  </div>
                </div>
                <h4 className="text-sm sm:text-base font-black text-white italic uppercase tracking-tighter leading-none mt-0.5 truncate">
                  {alert.user_name}
                </h4>
                <p className="text-[9px] sm:text-[10px] font-bold text-purple-300 mt-0.5 italic truncate">ADQUIRIU O VIP! 💎</p>
              </div>

              {/* Sparkle animado discreto */}
              <motion.div
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1"
              >
                <Sparkles className="w-3 h-3 text-yellow-400" />
              </motion.div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default VipAlertOverlay;
