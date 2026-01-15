# 🔍 Diferença: Agora vs LiveKit - Por que Agora precisava de APP_ID?

## ❓ Por que Agora precisava de `VITE_AGORA_APP_ID` no frontend?

### 🔴 **Agora (Sistema Antigo)**

**Como funcionava:**
```typescript
// Frontend se conecta DIRETAMENTE ao Agora
const client = AgoraRTC.createClient({ mode: 'live', codec: 'h264' });
await client.join(appId, channel, token, null);
//                    ^^^^^^
//                    Precisa do APP_ID aqui!
```

**Por que precisava do APP_ID no frontend:**
1. ✅ O frontend se conecta **DIRETAMENTE** aos servidores do Agora
2. ✅ O Agora valida a conexão usando o **APP_ID** (é público, não é secreto)
3. ✅ O código usa o APP_ID diretamente na função `client.join()`
4. ✅ O APP_ID é exposto no frontend (não é problema, é público mesmo)

**Exemplo do código Agora:**
```typescript
// src/components/ZKViewerOptimized.tsx (antigo)
const appId = import.meta.env.VITE_AGORA_APP_ID; // ← Precisava aqui

if (!appId) {
  return; // Erro se não tiver APP_ID
}

await client.join(appId, channel, token || null, null);
//              ^^^^^^
//              Usa o APP_ID diretamente
```

**Variáveis necessárias no `.env` para Agora:**
```env
VITE_AGORA_APP_ID=1e4cb25acbd349c6a540d0c0e1b13931  ← Precisa no frontend
VITE_AGORA_TOKEN=seu-token-opcional-aqui            ← Opcional
```

---

### 🟢 **LiveKit (Sistema Novo)**

**Como funciona:**
```typescript
// Frontend NÃO se conecta diretamente - primeiro obtém token
const token = await getLiveKitToken(roomName, 'viewer');
//              ^^^^^^^^^^^^^^^^^^^
//              Obtém token via Edge Function (backend)

// Depois conecta usando apenas URL + token
await room.connect(livekitUrl, token);
//                  ^^^^^^^^^^^^ ^^^^^
//                  Só URL        Token (não precisa de Key/Secret)
```

**Por que NÃO precisa de API Key/Secret no frontend:**
1. ✅ O frontend **NÃO** se conecta diretamente ao LiveKit
2. ✅ O frontend primeiro obtém um **token JWT** via Edge Function (backend)
3. ✅ A Edge Function usa as credenciais secretas (`LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET`) para gerar o token
4. ✅ O frontend só recebe o token já pronto e usa ele para conectar
5. ✅ As credenciais secretas ficam no backend (Supabase), nunca expostas

**Exemplo do código LiveKit:**
```typescript
// src/components/LiveKitViewer.tsx (novo)
const livekitUrl = import.meta.env.VITE_LIVEKIT_URL; // ← Só precisa da URL

// Obtém token via Edge Function (backend faz a autenticação)
const token = await getLiveKitToken(roomName, 'viewer');
// A função getLiveKitToken chama:
// fetch(`${supabaseUrl}/functions/v1/livekit-token`, ...)
// A Edge Function usa LIVEKIT_API_KEY/API_SECRET para gerar token

// Conecta usando URL + token (não precisa de Key/Secret)
await room.connect(livekitUrl, token);
```

**Variáveis necessárias no `.env` para LiveKit:**
```env
VITE_LIVEKIT_URL=wss://zkoficial-6xokn1hv.livekit.cloud  ← Só precisa da URL
# ❌ NÃO precisa de LIVEKIT_API_KEY no frontend
# ❌ NÃO precisa de LIVEKIT_API_SECRET no frontend
#    (Essas ficam no Supabase - Edge Functions)
```

---

## 📊 Comparação Rápida

| Aspecto | **Agora** (Antigo) | **LiveKit** (Novo) |
|---------|-------------------|-------------------|
| **APP_ID/Key no frontend?** | ✅ SIM (`VITE_AGORA_APP_ID`) | ❌ NÃO (só URL) |
| **Como autentica?** | Frontend usa APP_ID diretamente | Backend gera token JWT |
| **Onde ficam credenciais?** | Frontend (APP_ID é público) | Backend (Edge Functions) |
| **Segurança** | APP_ID exposto (ok, é público) | Credenciais secretas no backend ✅ |
| **Conexão** | Direta ao Agora | Via token JWT |

---

## 🔐 Por que LiveKit é mais seguro?

### **Agora:**
```
Frontend → Agora Servers
   ↓
Usa APP_ID diretamente (exposto no código)
```

### **LiveKit:**
```
Frontend → Supabase Edge Function → LiveKit Servers
              ↓
         Usa API Key/Secret
         (nunca expostas no frontend)
```

**Vantagens:**
- ✅ Credenciais secretas nunca expostas no frontend
- ✅ Token JWT tem expiração (mais seguro)
- ✅ Backend controla quem pode obter tokens
- ✅ Pode revogar tokens facilmente

---

## 📝 Resumo

### **Agora precisava de APP_ID porque:**
- O código fazia `client.join(appId, ...)` - precisava do APP_ID
- O Agora valida conexões usando APP_ID
- O APP_ID é público (não é secreto), então não é problema expor

### **LiveKit NÃO precisa de API Key/Secret porque:**
- O frontend não usa credenciais diretamente
- O frontend obtém token via Edge Function (backend)
- O backend usa as credenciais secretas para gerar token
- O frontend só recebe o token já pronto

---

## ✅ Conclusão

**No `.env` do frontend você precisa:**

**Para Agora (se ainda usar):**
```env
VITE_AGORA_APP_ID=1e4cb25acbd349c6a540d0c0e1b13931
```

**Para LiveKit (atual):**
```env
VITE_LIVEKIT_URL=wss://zkoficial-6xokn1hv.livekit.cloud
# ❌ NÃO precisa de API Key/Secret aqui
```

**No Supabase (Edge Functions - backend):**
```env
LIVEKIT_API_KEY=API9965XMvebp4M          ← Fica aqui (não no .env)
LIVEKIT_API_SECRET=tNyXfazDdepMX6ZleO... ← Fica aqui (não no .env)
LIVEKIT_URL=wss://zkoficial-6xokn1hv...  ← Fica aqui (também)
```

🎯 **Agora você pode remover `VITE_AGORA_APP_ID` do ambiente se não estiver mais usando Agora!**
