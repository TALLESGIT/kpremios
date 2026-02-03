// =====================================================
// useRegisterStreamId - Hook para páginas registrarem seu streamId
// =====================================================
// Uso: useRegisterStreamId(activeStream?.id)
// Quando o componente monta com um streamId válido, ele é registrado globalmente
// Quando desmonta, o streamId é desregistrado

import { useEffect, useRef } from 'react';
import { useStreamRegistry } from './StreamRegistryProvider';

const isRegistryDebug = () => (import.meta as any).env?.DEV === true || (import.meta as any).env?.VITE_DEBUG_LIVE === '1';

/**
 * Hook para páginas registrarem seu streamId no contexto global.
 * Isso permite que o ChatHost e outros componentes acessem o streamId
 * independente da rota atual.
 * 
 * @param streamId - O ID da stream ativa (pode ser null/undefined durante loading)
 */
export function useRegisterStreamId(streamId: string | null | undefined) {
  const { registerStreamId, unregisterStreamId } = useStreamRegistry();
  const registeredRef = useRef<string | null>(null);

  useEffect(() => {
    // Se temos um streamId válido e diferente do registrado
    if (streamId && streamId !== registeredRef.current) {
      if (isRegistryDebug()) console.log('🔗 useRegisterStreamId: Registrando streamId:', streamId);
      registerStreamId(streamId);
      registeredRef.current = streamId;
    }

    // Cleanup: desregistrar quando o componente desmonta
    return () => {
      if (registeredRef.current) {
        if (isRegistryDebug()) console.log('🔗 useRegisterStreamId: Desregistrando streamId:', registeredRef.current);
        unregisterStreamId();
        registeredRef.current = null;
      }
    };
  }, [streamId, registerStreamId, unregisterStreamId]);
}
