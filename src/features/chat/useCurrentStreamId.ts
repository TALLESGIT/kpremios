// =====================================================
// useCurrentStreamId - DEPRECATED
// =====================================================
// 
// Este hook foi substituído pelo sistema de registro explícito.
// 
// PROBLEMA ORIGINAL:
// - Fazia queries assíncronas para inferir streamId baseado na rota
// - Race conditions entre ZkTVPage.loadActiveStream() e este hook
// - Causava chat da /zk-tv não funcionar corretamente
//
// NOVA ARQUITETURA:
// - Páginas registram explicitamente seu streamId via useRegisterStreamId
// - ChatHost e outros componentes usam useRegisteredStreamId
// - Elimina race conditions e garante sincronização
//
// MIGRAÇÃO:
// - Use useRegisterStreamId(streamId) nas páginas que têm stream
// - Use useRegisteredStreamId() para acessar o streamId global
//
// Este arquivo será removido em uma versão futura.
// =====================================================

import { useRegisteredStreamId } from './StreamRegistryProvider';

/**
 * @deprecated Use useRegisteredStreamId do StreamRegistryProvider
 */
export function useCurrentStreamId(): string | null {
  console.warn(
    '⚠️ useCurrentStreamId está deprecated. ' +
    'Use useRegisterStreamId nas páginas e useRegisteredStreamId para acessar.'
  );
  return useRegisteredStreamId();
}
