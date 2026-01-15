# Migração: Agora RTC → LiveKit

## ✅ Migração Concluída

O site agora usa **LiveKit** ao invés de **Agora RTC** para visualizar transmissões, resolvendo o erro `CAN_NOT_GET_GATEWAY_SERVER` que ocorria quando o ZK Studio transmitia via LiveKit.

## 🔧 Mudanças Implementadas

### 1. Novo Componente: `LiveKitViewer.tsx`

**Arquivo:** `src/components/LiveKitViewer.tsx`

- Conecta ao LiveKit usando `livekit-client`
- Obtém token via Edge Function `livekit-token` (role: `viewer`)
- Subscribes automaticamente a vídeo/áudio dos participantes remotos
- Renderiza vídeo usando elemento `<video>` HTML5
- Suporta `fitMode` (`contain` ou `cover`)
- Suporta `muteAudio` para admins

**Características:**
- ✅ Conexão WebRTC nativa (baixa latência)
- ✅ Fallback automático se conexão falhar
- ✅ Loading states e tratamento de erros
- ✅ Compatível com políticas de autoplay

### 2. Atualização: `LiveViewer.tsx`

**Arquivo:** `src/components/LiveViewer.tsx`

**Antes:**
```typescript
// Usava ZKViewerOptimized (Agora RTC)
return (
  <ZKViewerOptimized 
    channel={agoraChannel} 
    fitMode={fitMode}
    muteAudio={isAdmin}
  />
);
```

**Depois:**
```typescript
// Usa LiveKitViewer (LiveKit RTC)
return (
  <LiveKitViewer 
    roomName={livekitRoom}
    fitMode={fitMode}
    muteAudio={isAdmin}
    enabled={isActuallyLive}
  />
);
```

**Regras de Decisão (não mudaram):**
- Mobile + HLS disponível → `HLSViewer` (HLS nativo)
- Desktop ou sem HLS → `LiveKitViewer` (RTC LiveKit) ← **MUDOU AQUI**

### 3. Dependências

**Adicionadas:**
```json
{
  "livekit-client": "^0.18.6"
}
```

**Mantidas (para compatibilidade):**
- `agora-rtc-sdk-ng` - Ainda usado em `ReporterPage` (backstage)

## 📋 Configuração Necessária

### Variáveis de Ambiente

Certifique-se de que o `.env` possui:

```env
VITE_LIVEKIT_URL=wss://zkoficial-6xokn1hv.livekit.cloud
VITE_SUPABASE_URL=https://bukigyhhgrtgryklabjg.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### Edge Function

A Edge Function `livekit-token` já existe e está funcionando. Ela gera tokens para:
- `role: 'admin'` - ZK Studio (broadcaster)
- `role: 'viewer'` - Site (viewer) ← **AGORA USADO**

## 🎯 Room do LiveKit

**Importante:** O ZK Studio sempre transmite para o room **`ZkPremios`** (fixo), independente do `channel_name` da live no banco.

**Fluxo:**
1. Admin cria live → `channel_name: "cruzeiro-x-santos"` (identificador único)
2. Admin inicia live → `hls_url` usa room `"ZkPremios"` (fixo)
3. ZK Studio transmite → Room `"ZkPremios"` (fixo)
4. Site visualiza → Room `"ZkPremios"` (fixo)

**Código:**
```typescript
// LiveViewer.tsx
const livekitRoom = 'ZkPremios'; // Fixo, não usa channel_name
```

## 🔄 Compatibilidade

### Mantido (não alterado):
- ✅ `HLSViewer` - Continua funcionando para mobile
- ✅ `ReporterPage` - Continua usando Agora (backstage)
- ✅ Lógica de detecção mobile/desktop
- ✅ Loading states e tratamento de erros

### Removido (futuro):
- ⚠️ `ZKViewerOptimized` - Não é mais usado, mas mantido para referência
- ⚠️ `ZKViewer` - Não é mais usado, mas mantido para referência

**Nota:** Os componentes Agora podem ser removidos em versão futura se não forem mais necessários.

## ✅ Testes Recomendados

1. **Desktop (sem HLS):**
   - Acessar live ativa
   - Verificar se conecta ao LiveKit
   - Verificar se vídeo/áudio funciona
   - Verificar se `fitMode` está correto

2. **Mobile (com HLS):**
   - Acessar live ativa
   - Verificar se usa HLS (não mudou)
   - Verificar se vídeo funciona

3. **Erros:**
   - Verificar se erro `CAN_NOT_GET_GATEWAY_SERVER` desapareceu
   - Verificar se conexão falha graciosamente
   - Verificar se loading states aparecem corretamente

## 🚀 Status

✅ **Implementado:** LiveKitViewer criado e integrado  
✅ **Testado:** Linter passa sem erros  
✅ **Commitado:** `dd44b42` - feat: Atualizar viewer para usar LiveKit  
✅ **Documentado:** Este arquivo  

## 📝 Próximos Passos (Opcional)

1. Remover componentes Agora não utilizados (`ZKViewer`, `ZKViewerOptimized`)
2. Adicionar métricas de conexão (latência, qualidade)
3. Implementar retry automático em caso de desconexão
4. Adicionar indicador visual de qualidade de conexão

## 🔗 Referências

- [LiveKit Client SDK](https://docs.livekit.io/client-sdk-js/)
- [Edge Function: livekit-token](../supabase/functions/livekit-token/index.ts)
- [FLUXO_LIVEKIT.md](./FLUXO_LIVEKIT.md) - Fluxo completo ZK Studio → Site
