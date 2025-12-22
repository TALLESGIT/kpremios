import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';

interface VipMessage {
  id: string;
  user_id: string;
  message: string;
  user_name?: string;
  user_email?: string;
  created_at: string;
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
  const userRolesRef = useRef<{ [userId: string]: { isVip: boolean } }>({});
  
  // Sincronizar ref com state
  useEffect(() => {
    userRolesRef.current = userRoles;
  }, [userRoles]);

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
            setCurrentMessage({
              id: newMsg.id,
              user_id: newMsg.user_id,
              message: truncatedMsg,
              user_name: newMsg.user_name || newMsg.user_email?.split('@')[0] || 'VIP',
              user_email: newMsg.user_email,
              created_at: newMsg.created_at
            });
            
            // Remover após 8 segundos
            setTimeout(() => {
              setCurrentMessage(prev => prev?.id === newMsg.id ? null : prev);
            }, 8000);
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
        style={{ maxWidth: '600px', width: 'auto', minWidth: '300px' }}
      >
        <div className="bg-gradient-to-r from-purple-900/95 via-purple-800/95 to-purple-900/95 backdrop-blur-md border-2 border-purple-500/60 rounded-2xl px-5 py-3 shadow-2xl max-w-lg">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-purple-300 text-xs font-black uppercase tracking-wider flex items-center gap-1">
              <span className="text-lg animate-pulse">💎</span> VIP
            </span>
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

