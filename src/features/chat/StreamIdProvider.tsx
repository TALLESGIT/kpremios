// =====================================================
// StreamIdProvider - Provider para expor streamId atual globalmente
// =====================================================

import React, { createContext, useContext, ReactNode } from 'react';
import { useCurrentStreamId } from './useCurrentStreamId';

interface StreamIdContextValue {
  streamId: string | null;
}

const StreamIdContext = createContext<StreamIdContextValue | null>(null);

interface StreamIdProviderProps {
  children: ReactNode;
}

export function StreamIdProvider({ children }: StreamIdProviderProps) {
  const streamId = useCurrentStreamId();

  return (
    <StreamIdContext.Provider value={{ streamId }}>
      {children}
    </StreamIdContext.Provider>
  );
}

export function useStreamId() {
  const context = useContext(StreamIdContext);
  if (!context) {
    throw new Error('useStreamId deve ser usado dentro de StreamIdProvider');
  }
  return context.streamId;
}
