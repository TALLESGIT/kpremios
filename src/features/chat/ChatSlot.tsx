// =====================================================
// ChatSlot - Container que registra um slot para o chat
// =====================================================

import React, { useEffect, useRef, ReactNode } from 'react';
import { registerChatSlot, unregisterChatSlot } from './chatSlotRegistry';

export interface ChatSlotProps {
  id: string;
  priority: number; // Maior prioridade = mais importante (será usado primeiro)
  children?: ReactNode; // Conteúdo opcional a ser renderizado no slot
  className?: string;
}

/**
 * ChatSlot registra um container DOM onde o chat pode ser renderizado.
 * O ChatHost escolhe o slot ativo baseado na prioridade.
 */
export function ChatSlot({ id, priority, children, className }: ChatSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Registrar slot
    registerChatSlot(id, {
      container: containerRef.current,
      priority,
      id
    });

    return () => {
      // Desregistrar ao desmontar
      unregisterChatSlot(id);
    };
  }, [id, priority]);

  return (
    <div ref={containerRef} className={className} data-chat-slot-id={id}>
      {children}
    </div>
  );
}
