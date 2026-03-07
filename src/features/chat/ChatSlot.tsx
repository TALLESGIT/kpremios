// =====================================================
// ChatSlot - Container que registra um slot para o chat
// =====================================================

import { useEffect, useRef, ReactNode } from 'react';
import { registerChatSlot, unregisterChatSlot } from './chatSlotRegistry';

export interface ChatSlotProps {
  id: string;
  priority: number;
  children?: ReactNode;
  className?: string;
  showHeader?: boolean;
  onClose?: () => void;
  hideCloseButton?: boolean;
  isActive?: boolean;
}

export function ChatSlot({ id, priority, children, className, showHeader, onClose, hideCloseButton, isActive }: ChatSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    registerChatSlot(id, {
      container: containerRef.current,
      priority,
      id,
      showHeader,
      onClose,
      hideCloseButton,
      isActive
    });

    return () => {
      unregisterChatSlot(id);
    };
  }, [id, priority, showHeader, onClose, hideCloseButton, isActive]);

  return (
    <div ref={containerRef} className={`h-full ${className || ''}`} data-chat-slot-id={id}>
      {children}
    </div>
  );
}
