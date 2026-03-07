import React, { useState, useEffect, useCallback } from 'react';
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
}

const VipAlertOverlay: React.FC<VipAlertOverlayProps> = ({ streamId }) => {
  const [alerts, setAlerts] = useState<VipAlert[]>([]);

  // ✅ Som Premium - Shimmering Chime (Major 7th Chord)
  const playVipSound = useCallback(() => {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      const playTone = (freq: number, startTime: number, duration: number, vol: number, type: OscillatorType = 'triangle') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.02, startTime + duration);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      // Premium Chord (C Major 7th feel)
      playTone(523.25, now, 1.5, 0.15);      // C5
      playTone(659.25, now + 0.1, 1.4, 0.1);   // E5
      playTone(783.99, now + 0.2, 1.3, 0.08);  // G5
      playTone(987.77, now + 0.3, 1.2, 0.05);  // B5

      // High Shimmer (Sine for pure tone)
      playTone(1567.98, now + 0.05, 0.8, 0.05, 'sine'); // G6
      playTone(2093.00, now + 0.15, 0.6, 0.03, 'sine'); // C7
    } catch (err) {
      console.warn('Erro ao reproduzir som VIP:', err);
    }
  }, []);

  const { isConnected, on, off } = useSocket({
    streamId: streamId || '',
    autoConnect: !!streamId
  });

  // Supabase Real-time
  useEffect(() => {
    if (!streamId) return;

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
          playVipSound();
          setAlerts((prev) => [...prev, newAlert]);
          setTimeout(() => {
            setAlerts((prev) => prev.filter((a) => a.id !== newAlert.id));
          }, 10000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, playVipSound]);

  // Socket.io Real-time
  useEffect(() => {
    if (!isConnected || !streamId) return;

    const handleVipAlert = (data: any) => {
      const newAlert: VipAlert = {
        id: data.id || Math.random().toString(36).substring(2),
        user_name: data.user_name || data.userName || data.name || 'Doador'
      };

      playVipSound();
      setAlerts((prev) => [...prev, newAlert]);

      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== newAlert.id));
      }, 10000);
    };

    on('vip-alert-received', handleVipAlert);
    on('chat-vip-alert', handleVipAlert);

    return () => {
      off('vip-alert-received', handleVipAlert);
      off('chat-vip-alert', handleVipAlert);
    };
  }, [isConnected, streamId, on, off, playVipSound]);

  return (
    <div className="absolute bottom-24 left-4 z-[100] flex flex-col items-start gap-4 pointer-events-none">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -150, scale: 0.8, filter: 'blur(10px)' }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -50, scale: 0.9, filter: 'blur(10px)' }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              duration: 0.6
            }}
            className="relative group"
          >
            {/* Outer Premium Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-600 via-amber-400 to-yellow-600 rounded-3xl blur-md opacity-50 group-hover:opacity-100 transition duration-1000 animate-pulse" />

            {/* Main Premium Card */}
            <div className="relative flex items-center gap-4 px-6 py-4 bg-slate-950/95 backdrop-blur-2xl rounded-[1.5rem] border border-yellow-500/50 shadow-2xl overflow-hidden min-w-[280px]">

              {/* Shiny Sweep Effect */}
              <motion.div
                animate={{ x: ['-200%', '200%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-25deg] pointer-events-none"
              />

              {/* Icon Section */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-yellow-400 blur-lg opacity-40 animate-pulse" />
                <motion.div
                  animate={{ rotateY: [0, 360] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="relative p-3 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-2xl shadow-lg ring-1 ring-yellow-300/50"
                >
                  <Crown className="w-7 h-7 text-slate-950 fill-slate-900" strokeWidth={2.5} />
                </motion.div>

                {/* Floating stars around icon */}
                <motion.div
                  animate={{ y: [-5, 5, -5], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -top-2 -right-2"
                >
                  <Star className="w-3 h-3 text-yellow-300 fill-yellow-300 shadow-glow" />
                </motion.div>
              </div>

              {/* Text Section */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">
                    NOVO VIP
                  </span>
                  <div className="flex gap-0.5">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                        className="w-1 h-1 bg-yellow-400 rounded-full"
                      />
                    ))}
                  </div>
                </div>
                <h3 className="text-2xl font-black text-white italic tracking-tight drop-shadow-[0_2px_4px_rgba(255,255,255,0.1)] uppercase">
                  {alert.user_name}
                </h3>
              </div>

              {/* Corner Decoration */}
              <div className="absolute top-0 right-0 p-3 opacity-20">
                <Sparkles className="w-6 h-6 text-yellow-400" />
              </div>
            </div>

            {/* Entrance Particle Burst */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0.8, scale: 0, x: 0, y: 0 }}
                animate={{
                  opacity: 0,
                  scale: 0.5,
                  x: (i % 2 === 0 ? 60 : -60) * Math.random(),
                  y: -50 * Math.random()
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-yellow-400 rounded-full blur-[1px]"
              />
            ))}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default VipAlertOverlay;
