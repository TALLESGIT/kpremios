# 🔍 DEBUG - ZK Studio não atualiza Supabase

## ❌ PROBLEMA

Logs do ZK Studio mostram:
```
[LiveKitService] ✅ Live encontrada (será ativada): Object
[LiveKitService] ✅ Supabase atualizado: Stream ativa Object
```

Mas no banco de dados:
- `is_active: false`
- `hls_url: null`

**A atualização não está sendo aplicada!**

---

## 🔍 POSSÍVEIS CAUSAS

### 1. Erro na requisição PATCH (silencioso)

O código pode estar retornando erro mas não logando. Verifique no ZK Studio:

```typescript
const updateResponse = await fetch(
  `${supabaseUrl}/rest/v1/live_streams?id=eq.${streamId}`,
  {
    method: 'PATCH',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      is_active: true,
      hls_url: hlsUrl,
      started_at: new Date().toISOString()
    })
  }
);

// ✅ ADICIONAR LOGS DETALHADOS
console.log('[LiveKitService] 📝 Tentando atualizar:', {
  streamId,
  hlsUrl,
  updateUrl: `${supabaseUrl}/rest/v1/live_streams?id=eq.${streamId}`
});

if (!updateResponse.ok) {
  const errorText = await updateResponse.text();
  console.error('[LiveKitService] ❌ Erro ao atualizar:', {
    status: updateResponse.status,
    statusText: updateResponse.statusText,
    error: errorText
  });
  return;
}

console.log('[LiveKitService] ✅ Resposta do update:', updateResponse.status);
```

### 2. Política RLS bloqueando

Verifique se a política `"Public can update stream status"` está funcionando:

```sql
-- Testar se anon pode atualizar
SELECT * FROM pg_policies 
WHERE tablename = 'live_streams' 
AND cmd = 'UPDATE';
```

### 3. Stream ID incorreto

O ZK Studio pode estar usando um `streamId` que não existe. Adicione log:

```typescript
console.log('[LiveKitService] 🔍 Stream ID a ser atualizado:', streamId);
```

### 4. URL do Supabase incorreta

Verifique se a URL está correta:

```typescript
const supabaseUrl = 'https://bukigyhhgrtgryklabjg.supabase.co';
```

---

## ✅ TESTE MANUAL

Execute no Supabase SQL Editor para testar:

```sql
-- Verificar live atual
SELECT id, channel_name, title, is_active, hls_url 
FROM live_streams 
WHERE id = '6c8cc494-a262-4515-b59b-85368d22c391';

-- Atualizar manualmente (simular o que o ZK Studio deveria fazer)
UPDATE live_streams 
SET 
  is_active = true,
  hls_url = 'https://zkoficial-6xokn1hv.livekit.cloud/hls/ZkPremios/index.m3u8',
  started_at = NOW()
WHERE id = '6c8cc494-a262-4515-b59b-85368d22c391'
RETURNING id, channel_name, is_active, hls_url;
```

Se funcionar manualmente, o problema está no código do ZK Studio.

---

## 🔧 CÓDIGO CORRIGIDO COM LOGS DETALHADOS

```typescript
async notifySupabaseStreamStarted(): Promise<void> {
  try {
    const supabaseUrl = 'https://bukigyhhgrtgryklabjg.supabase.co';
    const supabaseAnonKey = 'SUA_ANON_KEY_AQUI';
    
    const livekitRoom = 'ZkPremios';
    const livekitUrl = 'wss://zkoficial-6xokn1hv.livekit.cloud';
    const httpsUrl = livekitUrl.replace('wss://', 'https://');
    const hlsUrl = `${httpsUrl}/hls/${livekitRoom}/index.m3u8`;
    
    console.log('[LiveKitService] 📡 Notificando Supabase:', { livekitRoom, hlsUrl });
    
    // ... código de busca de live ...
    
    if (!streamId) {
      console.warn('[LiveKitService] ⚠️ Não foi possível obter ou criar uma live');
      return;
    }
    
    console.log('[LiveKitService] 📝 Atualizando live:', {
      streamId,
      hlsUrl,
      updateUrl: `${supabaseUrl}/rest/v1/live_streams?id=eq.${streamId}`
    });
    
    // Atualizar a live stream
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/live_streams?id=eq.${streamId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation' // ✅ Mudar para 'representation' para ver o resultado
        },
        body: JSON.stringify({
          is_active: true,
          hls_url: hlsUrl,
          started_at: new Date().toISOString()
        })
      }
    );
    
    console.log('[LiveKitService] 📊 Resposta do update:', {
      status: updateResponse.status,
      statusText: updateResponse.statusText,
      ok: updateResponse.ok
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('[LiveKitService] ❌ Erro ao atualizar:', {
        status: updateResponse.status,
        error: errorText
      });
      return;
    }
    
    // ✅ Verificar resultado
    const updatedData = await updateResponse.json();
    console.log('[LiveKitService] ✅ Live atualizada:', updatedData);
    
    // Verificar se realmente foi atualizado
    if (Array.isArray(updatedData) && updatedData.length > 0) {
      const stream = updatedData[0];
      console.log('[LiveKitService] ✅ Confirmação:', {
        id: stream.id,
        is_active: stream.is_active,
        hls_url: stream.hls_url
      });
    }
    
  } catch (error) {
    console.error('[LiveKitService] ❌ Erro ao notificar Supabase:', error);
  }
}
```

---

## 🎯 PRÓXIMOS PASSOS

1. **Adicionar logs detalhados** no ZK Studio
2. **Testar manualmente** no Supabase SQL Editor
3. **Verificar políticas RLS**
4. **Verificar se o streamId está correto**

**Com os logs detalhados, vamos identificar exatamente onde está falhando!**

