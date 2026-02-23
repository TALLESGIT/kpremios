// =====================================================
// StreamIdProvider - DEPRECATED
// =====================================================
// 
// Este arquivo foi substituído por StreamRegistryProvider.tsx
// 
// A nova arquitetura usa registro explícito de streamId pelas páginas
// em vez de inferência automática baseada na rota.
//
// Use:
// - StreamRegistryProvider (em App.tsx)
// - useRegisterStreamId (nas páginas ZkTVPage, PublicLiveStreamPage)
// - useRegisteredStreamId ou useStreamRegistry (para acessar o streamId)
//
// Este arquivo será removido em uma versão futura.
// =====================================================

// Re-exportar do novo provider para compatibilidade
export { 
  StreamRegistryProvider as StreamIdProvider, 
  useRegisteredStreamId as useStreamId 
} from './StreamRegistryProvider';
