// =====================================================
// ChatHost - Instância única que renderiza o chat no slot ativo
// =====================================================

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getActiveSlot, subscribe } from './chatSlotRegistry';
import { Chat } from './Chat';

/**
 * ChatHost é a única instância do componente Chat.
 * Ele usa React Portal para renderizar o chat no slot ativo (maior prioridade).
 */
export function ChatHost({ streamId }: { streamId: string | null | undefined }) {
  const [activeSlot, setActiveSlot] = useState<ReturnType<typeof getActiveSlot>>(null);

  useEffect(() => {
    // Atualizar slot ativo quando slots mudarem
    const updateActiveSlot = () => {
      const slot = getActiveSlot();
      setActiveSlot(slot);
    };

    // Verificar slot inicial
    updateActiveSlot();

    // Subscribe para mudanças
    const unsubscribe = subscribe(updateActiveSlot);

    // Verificar periodicamente (fallback caso o listener não funcione)
    const interval = setInterval(updateActiveSlot, 500);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Não renderizar se não houver streamId ou slot ativo
  if (!streamId || !activeSlot) {
    return null;
  }

  // Renderizar chat no slot ativo via Portal
  return createPortal(
    <Chat streamId={streamId} />,
    activeSlot.container
  );
}
