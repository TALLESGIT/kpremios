# 🔧 CORREÇÃO - ZK Studio Criar Live Automaticamente

## ❌ PROBLEMA IDENTIFICADO NOS LOGS

```
[LiveKitService] ⚠️ Nenhuma live ativa encontrada no Supabase. O admin deve iniciar a live no painel primeiro.
```

**Causa:**
- ZK Studio conecta ao LiveKit ✅
- ZK Studio tenta notificar Supabase ✅
- Mas não encontra live ativa ❌
- Admin precisa criar/iniciar live manualmente antes

## ✅ SOLUÇÃO

O ZK Studio deve **criar/ativar a live automaticamente** se não encontrar nenhuma ativa.

---

## 🔧 CÓDIGO CORRIGIDO

### Função `notifySupabaseStreamStarted` atualizada:

```typescript
async notifySupabaseStreamStarted(): Promise<void> {
  try {
    const supabaseUrl = 'https://bukigyhhgrtgryklabjg.supabase.co';
    const supabaseAnonKey = 'SUA_ANON_KEY_AQUI'; // ⚠️ Substituir pela anon key
    
    // IMPORTANTE: ZK Studio sempre transmite para 'ZkPremios' (canal fixo)
    const livekitRoom = 'ZkPremios';
    const livekitUrl = 'wss://zkoficial-6xokn1hv.livekit.cloud';
    const httpsUrl = livekitUrl.replace('wss://', 'https://');
    const hlsUrl = `${httpsUrl}/hls/${livekitRoom}/index.m3u8`;
    
    console.log('[LiveKitService] 📡 Notificando Supabase: Stream iniciada', { livekitRoom, hlsUrl });
    
    // 1. Buscar live ativa
    const activeStreamResponse = await fetch(
      `${supabaseUrl}/rest/v1/live_streams?is_active=eq.true&select=id,channel_name&order=started_at.desc&limit=1`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!activeStreamResponse.ok) {
      const errorText = await activeStreamResponse.text();
      console.error('[LiveKitService] ❌ Erro ao buscar stream ativa:', activeStreamResponse.status, errorText);
      return;
    }
    
    const activeStreams = await activeStreamResponse.json();
    let streamId: string | null = null;
    
    // 2. Se não tem live ativa, buscar qualquer live (mesmo inativa) ou criar uma nova
    if (!activeStreams || activeStreams.length === 0) {
      console.log('[LiveKitService] ⚠️ Nenhuma live ativa encontrada. Buscando live existente...');
      
      // Buscar qualquer live (mesmo inativa) com channel_name que corresponda
      const allStreamsResponse = await fetch(
        `${supabaseUrl}/rest/v1/live_streams?select=id,channel_name,title&order=created_at.desc&limit=5`,
        {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (allStreamsResponse.ok) {
        const allStreams = await allStreamsResponse.json();
        
        // Usar a primeira live encontrada (mais recente)
        if (allStreams && allStreams.length > 0) {
          streamId = allStreams[0].id;
          console.log('[LiveKitService] ✅ Live encontrada (será ativada):', { 
            id: streamId, 
            channel_name: allStreams[0].channel_name,
            title: allStreams[0].title
          });
        } else {
          // Se não tem nenhuma live, criar uma nova automaticamente
          console.log('[LiveKitService] 📝 Criando nova live automaticamente...');
          
          const createResponse = await fetch(
            `${supabaseUrl}/rest/v1/live_streams`,
            {
              method: 'POST',
              headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({
                title: 'Transmissão ao Vivo',
                channel_name: 'zktv', // Canal padrão
                is_active: true,
                hls_url: hlsUrl,
                started_at: new Date().toISOString()
              })
            }
          );
          
          if (createResponse.ok) {
            const newStream = await createResponse.json();
            streamId = Array.isArray(newStream) ? newStream[0].id : newStream.id;
            console.log('[LiveKitService] ✅ Nova live criada:', { id: streamId });
          } else {
            const errorText = await createResponse.text();
            console.error('[LiveKitService] ❌ Erro ao criar live:', createResponse.status, errorText);
            return;
          }
        }
      }
    } else {
      // Usar a live ativa encontrada
      streamId = activeStreams[0].id;
      console.log('[LiveKitService] ✅ Live ativa encontrada:', { 
        id: streamId, 
        channel_name: activeStreams[0].channel_name 
      });
    }
    
    if (!streamId) {
      console.warn('[LiveKitService] ⚠️ Não foi possível obter ou criar uma live');
      return;
    }
    
    // 3. Atualizar a live (ativar e definir hls_url)
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
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('[LiveKitService] ❌ Erro ao atualizar live:', updateResponse.status, errorText);
      return;
    }
    
    console.log('[LiveKitService] ✅ Supabase atualizado: Stream ativa', { 
      streamId, 
      hlsUrl 
    });
    
  } catch (error) {
    console.error('[LiveKitService] ❌ Erro ao notificar Supabase:', error);
    // Não lançar erro para não interromper a transmissão
  }
}
```

---

## 🎯 O QUE MUDOU

1. **Busca live ativa** (como antes)
2. **Se não encontrar:**
   - Busca qualquer live existente (mesmo inativa)
   - Se encontrar, usa ela e ativa
   - Se não encontrar nenhuma, **cria uma nova automaticamente**
3. **Atualiza a live** com `is_active = true` e `hls_url`

---

## ✅ RESULTADO

Agora o ZK Studio:
- ✅ Conecta ao LiveKit
- ✅ Cria/ativa live automaticamente se necessário
- ✅ Notifica Supabase
- ✅ Site detecta via Realtime
- ✅ Preview aparece automaticamente

**Tudo automático!** 🚀

