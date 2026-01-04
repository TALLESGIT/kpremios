# 🎬 FLUXO COMPLETO - ZK Studio → Site

## 📋 COMO FUNCIONA

### 1️⃣ **ZK Studio (Electron) - BROADCASTER**
- Você cria as cenas no ZK Studio
- Quando clica "Iniciar Transmissão" no ZK Studio:
  - ZK Studio obtém token LiveKit (chama Edge Function `livekit-token` com role `admin`)
  - ZK Studio conecta ao LiveKit usando o token
  - ZK Studio começa a transmitir vídeo/áudio para a sala `zktv`
  - **IMPORTANTE:** ZK Studio deve atualizar o Supabase quando começar a transmitir

### 2️⃣ **Site (React) - VIEWER**
- Usuários acessam o site
- Site consulta Supabase: `live_streams` onde `channel_name = 'zktv'`
- Se `is_active = true` e `hls_url` existe → Site mostra o player HLS
- Site usa Realtime para detectar mudanças automaticamente

---

## 🔄 FLUXO DETALHADO

```
┌─────────────────┐
│   ZK Studio     │
│   (Electron)    │
└────────┬────────┘
         │
         │ 1. Clica "Iniciar Live"
         │
         ▼
┌─────────────────────────────────┐
│ Chama Edge Function:             │
│ livekit-token (role: admin)     │
└────────┬────────────────────────┘
         │
         │ 2. Recebe token JWT
         │
         ▼
┌─────────────────────────────────┐
│ Conecta ao LiveKit:             │
│ wss://zkoficial-6xokn1hv...     │
│ Sala: zktv                      │
└────────┬────────────────────────┘
         │
         │ 3. Começa a transmitir
         │
         ▼
┌─────────────────────────────────┐
│ Atualiza Supabase:              │
│ - is_active = true               │
│ - hls_url = https://.../hls/... │
│ - started_at = now()             │
└────────┬────────────────────────┘
         │
         │ 4. Realtime propaga mudança
         │
         ▼
┌─────────────────┐
│   Site React    │
│   (Viewers)     │
└────────┬────────┘
         │
         │ 5. Detecta mudança via Realtime
         │
         ▼
┌─────────────────────────────────┐
│ Mostra LivePlayer com HLS:     │
│ https://.../hls/zktv/index.m3u8│
└─────────────────────────────────┘
```

---

## ⚙️ O QUE O ZK STUDIO PRECISA FAZER

### Quando INICIAR a transmissão:

1. **Obter token LiveKit:**
   ```typescript
   const token = await getLiveKitToken('zktv', 'admin');
   ```

2. **Conectar ao LiveKit:**
   ```typescript
   // Usar LiveKit SDK no ZK Studio
   const room = new Room();
   await room.connect('wss://zkoficial-6xokn1hv.livekit.cloud', token);
   ```

3. **Publicar vídeo/áudio:**
   ```typescript
   const localVideoTrack = await createLocalVideoTrack();
   const localAudioTrack = await createLocalAudioTrack();
   await room.localParticipant.publishTrack(localVideoTrack);
   await room.localParticipant.publishTrack(localAudioTrack);
   ```

4. **Notificar Supabase (IMPORTANTE):**
   ```typescript
   // Chamar função do site ou fazer update direto
   await notifyStreamStarted(streamId, 'zktv');
   // OU fazer update direto:
   await supabase
     .from('live_streams')
     .update({
       is_active: true,
       hls_url: 'https://zkoficial-6xokn1hv.livekit.cloud/hls/zktv/index.m3u8',
       started_at: new Date().toISOString()
     })
     .eq('channel_name', 'zktv');
   ```

### Quando ENCERRAR a transmissão:

1. **Parar de transmitir:**
   ```typescript
   await room.disconnect();
   ```

2. **Notificar Supabase:**
   ```typescript
   await notifyStreamStopped(streamId);
   // OU:
   await supabase
     .from('live_streams')
     .update({
       is_active: false,
       hls_url: null
     })
     .eq('channel_name', 'zktv');
   ```

---

## ✅ O QUE JÁ ESTÁ PRONTO NO SITE

1. ✅ Edge Function `livekit-token` criada
2. ✅ Serviço `livekitService.ts` com funções:
   - `getLiveKitToken()` - Obtém token
   - `getLiveKitHlsUrl()` - Gera URL HLS
   - `notifyStreamStarted()` - Notifica início
   - `notifyStreamStopped()` - Notifica fim
3. ✅ `LiveViewer` detecta mudanças via Realtime
4. ✅ `LivePlayer` reproduz HLS automaticamente

---

## 🎯 RESUMO

**SIM, quando você iniciar a transmissão no ZK Studio e atualizar o Supabase, o site vai mostrar automaticamente!**

O site usa **Realtime** do Supabase, então qualquer mudança em `live_streams` é detectada instantaneamente por todos os usuários.

**Fluxo:**
1. ZK Studio inicia → Atualiza Supabase
2. Realtime propaga → Todos os sites recebem
3. Site detecta `is_active = true` → Mostra player HLS
4. Usuários assistem via HLS (sem WebRTC)

