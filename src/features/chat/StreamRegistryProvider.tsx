// =====================================================
// StreamRegistryProvider - Gerencia o streamId ativo globalmente
// =====================================================
// Páginas registram seu streamId quando têm uma stream carregada
// Isso garante que o chat funcione em todas as rotas (/zk-tv, /live/:slug)

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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

  // Registrar um streamId ativo
  const registerStreamId = useCallback((id: string) => {
    if (id && id !== streamId) {
      console.log('📡 StreamRegistry: Registrando streamId:', id);
      setStreamId(id);
    }
  }, [streamId]);

  // Desregistrar o streamId (quando a página desmonta)
  const unregisterStreamId = useCallback(() => {
    console.log('📡 StreamRegistry: Desregistrando streamId');
    setStreamId(null);
  }, []);

  const value: StreamRegistryContextValue = {
    streamId,
    registerStreamId,
    unregisterStreamId
  };

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
