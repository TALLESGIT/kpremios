// =====================================================
// ChatHost - Instância única que renderiza o chat no slot ativo
// =====================================================

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getActiveSlot, subscribe, ChatSlot } from './chatSlotRegistry';
import { Chat } from './Chat';
import { useStreamRegistry } from './StreamRegistryProvider';

/**
 * ChatHost é a única instância do componente Chat.
 * Ele usa React Portal para renderizar o chat no slot ativo (maior prioridade).
 * 
 * O streamId vem do StreamRegistryProvider - as páginas registram seu streamId
 * quando têm uma stream carregada, garantindo sincronização entre rotas.
 */
export function ChatHost() {
  // Obter streamId do registry global (registrado pelas páginas)
  const { streamId } = useStreamRegistry();
  const [activeSlot, setActiveSlot] = useState<ChatSlot | null>(null);
  const lastSlotIdRef = useRef<string | null>(null);

  // Atualizar slot se mudou o ID OU qualquer propriedade relevante
  const updateActiveSlot = useCallback(() => {
    const slot = getActiveSlot();
    const newSlotId = slot?.id || null;
    const newShowHeader = slot?.showHeader;
    const newOnClose = slot?.onClose;
    const newHideCloseButton = slot?.hideCloseButton;

    // Só atualizar state se o slot ou suas props visíveis realmente mudaram
    if (
      newSlotId !== lastSlotIdRef.current ||
      newShowHeader !== (lastSlotIdRef.current ? activeSlot?.showHeader : undefined) ||
      newOnClose !== (lastSlotIdRef.current ? activeSlot?.onClose : undefined) ||
      newHideCloseButton !== (lastSlotIdRef.current ? activeSlot?.hideCloseButton : undefined) ||
      slot?.isActive !== activeSlot?.isActive
    ) {
      lastSlotIdRef.current = newSlotId;
      setActiveSlot(slot);
    }
  }, [activeSlot]);

  useEffect(() => {
    // Verificar slot inicial
    updateActiveSlot();

    // Subscribe para mudanças
    const unsubscribe = subscribe(updateActiveSlot);

    // Verificar periodicamente (fallback caso o listener não funcione)
    // Intervalo maior para reduzir overhead
    const interval = setInterval(updateActiveSlot, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [updateActiveSlot]);

  // Não renderizar se não houver streamId ou slot ativo
  if (!streamId || !activeSlot) {
    return null;
  }

  // Renderizar chat no slot ativo via Portal
  return createPortal(
    <Chat
      streamId={streamId}
      showHeader={activeSlot.showHeader}
      onClose={activeSlot.onClose}
      hideCloseButton={activeSlot.hideCloseButton}
      isActive={activeSlot.isActive}
    />,
    activeSlot.container
  );
}
