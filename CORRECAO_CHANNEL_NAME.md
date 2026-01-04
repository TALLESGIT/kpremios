# 🔧 CORREÇÃO - Channel Name vs LiveKit Room

## ❌ PROBLEMA IDENTIFICADO

Quando o admin cria uma nova transmissão:
- **Título:** "Cruzeiro x Santos"
- **channel_name gerado:** "cruzeiro-x-santos"
- **ZK Studio precisa transmitir para:** Qual canal?

**Conflito:**
- Site procura por `channel_name` da transmissão criada
- ZK Studio pode estar transmitindo para canal diferente
- LiveKit room precisa corresponder ao `channel_name`

## ✅ SOLUÇÃO

### Opção 1: ZK Studio sempre usa o channel_name da live ativa

**No ZK Studio, quando iniciar transmissão:**

```typescript
async startStream(): Promise<void> {
  try {
    // 1. Buscar a live ativa no Supabase
    const supabaseUrl = 'https://bukigyhhgrtgryklabjg.supabase.co';
    const supabaseAnonKey = 'SUA_ANON_KEY_AQUI';
    
    const activeStreamResponse = await fetch(
      `${supabaseUrl}/rest/v1/live_streams?is_active=eq.true&select=channel_name&limit=1`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      }
    );
    
    const activeStreams = await activeStreamResponse.json();
    
    // Se não tem live ativa, usar 'zktv' como padrão
    const room = activeStreams && activeStreams.length > 0 
      ? activeStreams[0].channel_name 
      : 'zktv';
    
    console.log('[LiveKitService] 🎯 Usando room:', room);
    
    // 2. Obter token para esse room
    const token = await this.fetchToken(room, 'admin');
    
    // 3. Conectar ao LiveKit
    const livekitUrl = 'wss://zkoficial-6xokn1hv.livekit.cloud';
    await this.room.connect(livekitUrl, token);
    
    // 4. Publicar tracks
    // ... código de publicação ...
    
    // 5. Notificar Supabase (usando o room correto)
    await this.notifySupabaseStreamStarted(room);
    
  } catch (error) {
    console.error('[LiveKitService] ❌ Erro:', error);
    throw error;
  }
}
```

### Opção 2: ZK Studio sempre usa 'ZkPremios' (canal fixo)

**Se o ZK Studio sempre transmite para 'ZkPremios':**

1. **No AdminLiveStreamPage, ao iniciar live:**
   ```typescript
   const startStream = async () => {
     // ... código existente ...
     
     // IMPORTANTE: Sempre usar 'ZkPremios' como room do LiveKit
     // mas manter o channel_name original para o link
     const livekitRoom = 'ZkPremios'; // Canal fixo do ZK Studio
     const hlsUrl = `${httpsUrl}/hls/${livekitRoom}/index.m3u8`;
     
     // Atualizar com hls_url baseado no canal fixo
     await supabase.from('live_streams').update({
       is_active: true,
       hls_url: hlsUrl, // URL baseada em 'ZkPremios'
       started_at: new Date().toISOString()
     }).eq('id', selectedStream.id);
   };
   ```

2. **No ZK Studio:**
   ```typescript
   // Sempre usar 'ZkPremios' como room
   const room = 'ZkPremios';
   const token = await this.fetchToken(room, 'admin');
   ```

3. **No site, buscar pela live ativa (não por channel_name fixo):**
   ```typescript
   // Buscar qualquer live ativa, não apenas 'zktv'
   const { data } = await supabase
     .from('live_streams')
     .select('*')
     .eq('is_active', true)
     .order('started_at', { ascending: false })
     .limit(1)
     .single();
   ```

## 🎯 RECOMENDAÇÃO

**Usar Opção 2 (canal fixo 'ZkPremios'):**
- Mais simples
- ZK Studio sempre transmite para o mesmo canal
- Site busca pela live ativa (qualquer uma)
- Link da live continua usando o `channel_name` original

## 📝 CÓDIGO PARA IMPLEMENTAR

### 1. AdminLiveStreamPage.tsx - startStream()

```typescript
const startStream = async () => {
  if (!selectedStream) return;
  try {
    await updateLiveTitle(selectedStream.id, selectedStream.channel_name);
    
    // ✅ SEMPRE usar 'ZkPremios' como room do LiveKit
    const livekitRoom = 'ZkPremios';
    const livekitUrl = import.meta.env.VITE_LIVEKIT_URL || 'wss://zkoficial-6xokn1hv.livekit.cloud';
    const httpsUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    const hlsUrl = `${httpsUrl}/hls/${livekitRoom}/index.m3u8`;
    
    const { data, error } = await supabase
      .from('live_streams')
      .update({ 
        is_active: true,
        hls_url: hlsUrl, // URL baseada em 'ZkPremios'
        started_at: new Date().toISOString()
      })
      .eq('id', selectedStream.id)
      .select()
      .single();
    
    // ... resto do código ...
  }
};
```

### 2. ZK Studio - startStream()

```typescript
async startStream(): Promise<void> {
  // ✅ SEMPRE usar 'ZkPremios' como room
  const room = 'ZkPremios';
  const token = await this.fetchToken(room, 'admin');
  
  // Conectar e publicar...
  
  // Notificar Supabase (mas buscar pela live ativa, não por room)
  await this.notifySupabaseStreamStartedForActiveStream();
}
```

### 3. ZK Studio - notifySupabaseStreamStartedForActiveStream()

```typescript
async notifySupabaseStreamStartedForActiveStream(): Promise<void> {
  const supabaseUrl = 'https://bukigyhhgrtgryklabjg.supabase.co';
  const supabaseAnonKey = 'SUA_ANON_KEY_AQUI';
  
  // Buscar a live ativa (qualquer uma)
  const activeStreamResponse = await fetch(
    `${supabaseUrl}/rest/v1/live_streams?is_active=eq.true&select=id,channel_name&limit=1`,
    {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    }
  );
  
  const activeStreams = await activeStreamResponse.json();
  
  if (!activeStreams || activeStreams.length === 0) {
    console.warn('[LiveKitService] ⚠️ Nenhuma live ativa encontrada');
    return;
  }
  
  const stream = activeStreams[0];
  const livekitRoom = 'ZkPremios'; // Canal fixo
  const hlsUrl = `https://zkoficial-6xokn1hv.livekit.cloud/hls/${livekitRoom}/index.m3u8`;
  
  // Atualizar a live ativa
  await fetch(
    `${supabaseUrl}/rest/v1/live_streams?id=eq.${stream.id}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        is_active: true,
        hls_url: hlsUrl,
        started_at: new Date().toISOString()
      })
    }
  );
}
```

## ✅ RESUMO

**Fluxo correto:**
1. Admin cria live: "Cruzeiro x Santos" → `channel_name: "cruzeiro-x-santos"`
2. Admin inicia live → `hls_url` usa room `"ZkPremios"` (fixo)
3. ZK Studio transmite para: `"ZkPremios"` (sempre o mesmo)
4. Site busca: Live ativa (qualquer `channel_name`)
5. Site mostra: Player HLS com URL baseada em `"ZkPremios"`

**Tudo sincronizado!** ✅

