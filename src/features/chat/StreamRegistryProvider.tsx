// =====================================================
// StreamRegistryProvider - Gerencia o streamId ativo globalmente
// =====================================================
// Páginas registram seu streamId quando têm uma stream carregada
// Isso garante que o chat funcione em todas as rotas (/zk-tv, /live/:slug)

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, ReactNode } from 'react';

interface StreamRegistryContextValue {
  streamId: string | null;
  registerStreamId: (id: string) => void;
  unregisterStreamId: () => void;
}

const StreamRegistryContext = createContext<StreamRegistryContextValue | null>(null);

interface StreamRegistryProviderProps {
  children: ReactNode;
}

export function StreamRegistryProvider({ children }: StreamRegistryProviderProps) {
  const [streamId, setStreamId] = useState<string | null>(null);
  const streamIdRef = useRef<string | null>(null);

  // Manter ref sincronizado com state
  streamIdRef.current = streamId;

  // Registrar um streamId ativo (função estável - não recria)
  const registerStreamId = useCallback((id: string) => {
    if (id && id !== streamIdRef.current) {
      console.log('📡 StreamRegistry: Registrando streamId:', id);
      setStreamId(id);
    }
  }, []); // Sem dependências - usa ref internamente

  // Desregistrar o streamId (quando a página desmonta)
  const unregisterStreamId = useCallback(() => {
    if (streamIdRef.current) {
      console.log('📡 StreamRegistry: Desregistrando streamId');
      setStreamId(null);
    }
  }, []); // Sem dependências

  // Memoizar value para evitar re-renders desnecessários
  const value = useMemo<StreamRegistryContextValue>(() => ({
    streamId,
    registerStreamId,
    unregisterStreamId
  }), [streamId, registerStreamId, unregisterStreamId]);

  return (
    <StreamRegistryContext.Provider value={value}>
      {children}
    </StreamRegistryContext.Provider>
  );
}

// Hook para acessar o registry
export function useStreamRegistry() {
  const context = useContext(StreamRegistryContext);
  if (!context) {
    throw new Error('useStreamRegistry deve ser usado dentro de StreamRegistryProvider');
  }
  return context;
}

// Hook para obter apenas o streamId (compatibilidade com código existente)
export function useRegisteredStreamId() {
  const { streamId } = useStreamRegistry();
  return streamId;
}
