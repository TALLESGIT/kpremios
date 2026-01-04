# 🔄 SINCRONIZAÇÃO ZK STUDIO → SUPABASE → SITE

## ❌ PROBLEMA ATUAL

ZK Studio está transmitindo com sucesso:
```
✅ Conectado ao LiveKit Cloud
✅ Publicação Ativa
✅ AO VIVO
```

Mas o **site não mostra** a transmissão porque o Supabase não foi atualizado.

## ✅ SOLUÇÃO

O ZK Studio precisa **atualizar o Supabase** quando iniciar a transmissão.

---

## 🔧 CÓDIGO PARA ADICIONAR NO ZK STUDIO

### 1️⃣ Adicionar função para notificar Supabase

No arquivo `livekitService.ts` do ZK Studio, adicione:

```typescript
/**
 * Notifica o Supabase que a transmissão começou
 */
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
    
    // Buscar a live stream ATIVA (qualquer uma, não importa o channel_name)
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
    
    // Se não tem live ativa, buscar qualquer live existente ou criar uma nova
    if (!activeStreams || activeStreams.length === 0) {
      console.log('[LiveKitService] ⚠️ Nenhuma live ativa encontrada. Buscando live existente...');
      
      // Buscar qualquer live (mesmo inativa) - usar a mais recente
      const allStreamsResponse = await fetch(
        `${supabaseUrl}/rest/v1/live_streams?select=id,channel_name,title&order=created_at.desc&limit=1`,
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
        
        if (allStreams && allStreams.length > 0) {
          // Usar a live mais recente encontrada
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
            console.log('[LiveKitService] ✅ Nova live criada automaticamente:', { id: streamId });
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
    
    // Atualizar a live stream
    const { error: updateError } = await fetch(
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
    
    if (updateError) {
      console.error('[LiveKitService] ❌ Erro ao atualizar Supabase:', updateError);
      throw updateError;
    }
    
    console.log('[LiveKitService] ✅ Supabase atualizado: Stream ativa', { 
      streamId, 
      channel_name: stream.channel_name,
      hlsUrl 
    });
    
  } catch (error) {
    console.error('[LiveKitService] ❌ Erro ao notificar Supabase:', error);
    // Não lançar erro para não interromper a transmissão
  }
}

/**
 * Notifica o Supabase que a transmissão foi encerrada
 */
async notifySupabaseStreamStopped(): Promise<void> {
  try {
    const supabaseUrl = 'https://bukigyhhgrtgryklabjg.supabase.co';
    const supabaseAnonKey = 'SUA_ANON_KEY_AQUI'; // ⚠️ Substituir pela anon key
    
    // Buscar a live stream ATIVA (qualquer uma)
    const activeStreamResponse = await fetch(
      `${supabaseUrl}/rest/v1/live_streams?is_active=eq.true&select=id&limit=1`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!activeStreamResponse.ok) {
      console.error('[LiveKitService] ❌ Erro ao buscar stream ativa:', activeStreamResponse.status);
      return;
    }
    
    const activeStreams = await activeStreamResponse.json();
    
    if (!activeStreams || activeStreams.length === 0) {
      console.warn('[LiveKitService] ⚠️ Nenhuma live ativa encontrada');
      return;
    }
    
    const streamId = activeStreams[0].id;
    
    // Atualizar a live stream
    const { error: updateError } = await fetch(
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
          is_active: false,
          hls_url: null
        })
      }
    );
    
    if (updateError) {
      console.error('[LiveKitService] ❌ Erro ao atualizar Supabase:', updateError);
    } else {
      console.log('[LiveKitService] ✅ Supabase atualizado: Stream encerrada', { streamId });
    }
    
  } catch (error) {
    console.error('[LiveKitService] ❌ Erro ao notificar Supabase:', error);
  }
}
```

### 2️⃣ Chamar a função quando iniciar a transmissão

Na função `startStream` do ZK Studio, após conectar com sucesso:

```typescript
async startStream(): Promise<void> {
  try {
    console.log('[LiveKitService] 🚀 Iniciando Transmissão...');
    
    // ✅ IMPORTANTE: ZK Studio sempre transmite para 'ZkPremios' (canal fixo)
    const livekitRoom = 'ZkPremios';
    
    // 1. Obter token para 'ZkPremios'
    const token = await this.fetchToken(livekitRoom, 'admin');
    
    // 2. Conectar ao LiveKit
    const livekitUrl = 'wss://zkoficial-6xokn1hv.livekit.cloud';
    await this.room.connect(livekitUrl, token);
    
    // 3. Publicar tracks
    // ... código de publicação ...
    
    // 4. ✅ NOTIFICAR SUPABASE (IMPORTANTE!)
    // Busca automaticamente a live ativa e atualiza
    await this.notifySupabaseStreamStarted();
    
    console.log('[LiveKitService] ✅ Transmissão iniciada e Supabase notificado');
    
  } catch (error) {
    console.error('[LiveKitService] ❌ Erro ao iniciar:', error);
    throw error;
  }
}
```

### 3️⃣ Chamar a função quando encerrar a transmissão

Na função `stopStream` do ZK Studio:

```typescript
async stopStream(): Promise<void> {
  try {
    // 1. Desconectar do LiveKit
    await this.room.disconnect();
    
    // 2. ✅ NOTIFICAR SUPABASE (IMPORTANTE!)
    // Busca automaticamente a live ativa e atualiza
    await this.notifySupabaseStreamStopped();
    
    console.log('[LiveKitService] ✅ Transmissão encerrada e Supabase notificado');
    
  } catch (error) {
    console.error('[LiveKitService] ❌ Erro ao encerrar:', error);
    throw error;
  }
}
```

---

## 🎯 FLUXO COMPLETO

```
1. ZK Studio inicia transmissão
   ↓
2. Conecta ao LiveKit ✅
   ↓
3. Publica tracks ✅
   ↓
4. ✅ NOVO: Notifica Supabase
   - is_active = true
   - hls_url = https://.../hls/zktv/index.m3u8
   - started_at = now()
   ↓
5. Realtime propaga mudança
   ↓
6. Site detecta mudança ✅
   ↓
7. Site mostra player HLS ✅
   ↓
8. Usuários assistem ✅
```

---

## ⚙️ CONFIGURAÇÃO NECESSÁRIA

1. **Obter Supabase Anon Key:**
   - Acesse: https://supabase.com/dashboard/project/bukigyhhgrtgryklabjg/settings/api
   - Copie a "anon public" key
   - Substitua `'SUA_ANON_KEY_AQUI'` no código

2. **Verificar que a live existe no Supabase:**
   - A live deve ter `channel_name = 'zktv'` (ou o nome da sala)
   - Pode criar via painel admin do site antes de transmitir

---

## ✅ APÓS IMPLEMENTAR

Quando o ZK Studio iniciar a transmissão:
1. ✅ Conecta ao LiveKit
2. ✅ Notifica Supabase
3. ✅ Site detecta via Realtime
4. ✅ Player HLS aparece automaticamente
5. ✅ Usuários assistem

**Tudo automático!** 🚀

