# ✅ CORREÇÃO APLICADA - Channel Name vs LiveKit Room

## 🔧 PROBLEMA RESOLVIDO

**Antes:**
- Admin cria live: "Cruzeiro x Santos" → `channel_name: "cruzeiro-x-santos"`
- ZK Studio procurava por `channel_name` → Não encontrava
- Site procurava por "zktv" fixo → Não encontrava live criada

**Agora:**
- Admin cria live: "Cruzeiro x Santos" → `channel_name: "cruzeiro-x-santos"`
- ZK Studio sempre transmite para: `"ZkPremios"` (canal fixo)
- Admin inicia live → `hls_url` usa room `"ZkPremios"` (fixo)
- ZK Studio notifica Supabase → Busca live ativa (qualquer `channel_name`)
- Site busca: Live ativa (qualquer `channel_name`)
- Site mostra: Player HLS com URL baseada em `"ZkPremios"`

## 📝 MUDANÇAS APLICADAS

### 1. AdminLiveStreamPage.tsx
- ✅ `startStream()` agora sempre usa `"ZkPremios"` como room do LiveKit
- ✅ `LiveViewer` usa `channelName={selectedStream.channel_name}` (dinâmico)

### 2. ZkTVPage.tsx
- ✅ `LiveViewer` usa `channelName={activeStream?.channel_name || 'zktv'}` (dinâmico)
- ✅ Busca pela live ativa (qualquer `channel_name`)

### 3. ZK_STUDIO_SUPABASE_SYNC.md
- ✅ `notifySupabaseStreamStarted()` busca live ativa (não por `channel_name`)
- ✅ `notifySupabaseStreamStopped()` busca live ativa (não por `channel_name`)
- ✅ `startStream()` sempre usa `"ZkPremios"` como room
- ✅ `stopStream()` não precisa de parâmetro

## 🎯 FLUXO CORRETO

1. **Admin cria live:**
   - Título: "Cruzeiro x Santos"
   - `channel_name`: "cruzeiro-x-santos" (gerado automaticamente)
   - Link: `https://zkoficial.com.br/live/cruzeiro-x-santos`

2. **Admin inicia live:**
   - `hls_url`: `https://zkoficial-6xokn1hv.livekit.cloud/hls/ZkPremios/index.m3u8`
   - `is_active`: `true`
   - `started_at`: timestamp atual

3. **ZK Studio inicia transmissão:**
   - Room: `"ZkPremios"` (sempre fixo)
   - Token: Obtido para `"ZkPremios"`
   - Conecta ao LiveKit

4. **ZK Studio notifica Supabase:**
   - Busca live ativa (qualquer `channel_name`)
   - Atualiza `hls_url` com URL baseada em `"ZkPremios"`
   - Atualiza `is_active: true`

5. **Site detecta via Realtime:**
   - Busca live ativa (qualquer `channel_name`)
   - Mostra `LiveViewer` com `channelName` da live ativa
   - Player HLS usa `hls_url` (baseado em `"ZkPremios"`)

## ✅ TUDO SINCRONIZADO!

- ✅ Admin cria live com qualquer título
- ✅ ZK Studio sempre transmite para `"ZkPremios"`
- ✅ Site busca live ativa automaticamente
- ✅ Player HLS funciona com qualquer `channel_name`
- ✅ Link da live usa `channel_name` original

**Pronto para testar!** 🚀

