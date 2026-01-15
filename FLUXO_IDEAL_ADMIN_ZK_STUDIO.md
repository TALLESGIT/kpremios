# 🎬 Fluxo Ideal: Admin → ZK Studio → Site

## 📋 Como DEVERIA Funcionar

### 1️⃣ **Admin Cria Live no Painel**

**No site (AdminLiveStreamPage):**
1. Admin cria uma nova live com título (ex: "Cruzeiro x Santos")
2. Sistema gera `channel_name` automaticamente (ex: "cruzeiro-x-santos")
3. Live é criada no banco com `is_active = false`

**Status:**
- ✅ Live criada no banco
- ✅ `channel_name` gerado
- ❌ `is_active = false` (ainda não está ao vivo)

---

### 2️⃣ **Admin Inicia a Transmissão**

**No site (AdminLiveStreamPage - botão "Iniciar Transmissão"):**
1. Admin clica em "Iniciar Transmissão"
2. Site atualiza `live_streams`:
   - `is_active = true`
   - `started_at = now()`
   - `hls_url = https://zkoficial-6xokn1hv.livekit.cloud/hls/zkpremios/index.m3u8`
3. Site mostra preview da live (ainda sem conteúdo do ZK Studio)

**Status:**
- ✅ Live marcada como ativa no banco
- ✅ `hls_url` configurado
- ⚠️ ZK Studio ainda não está transmitindo (aguardando)

---

### 3️⃣ **ZK Studio Detecta Live Ativa e Conecta**

**No ZK Studio (quando admin clica "Iniciar Transmissão" no ZK Studio):**
1. ZK Studio busca live ativa no Supabase:
   ```typescript
   const activeStream = await fetch(
     `${supabaseUrl}/rest/v1/live_streams?is_active=eq.true&limit=1`
   );
   ```
2. ZK Studio obtém token LiveKit para room `zkpremios`:
   ```typescript
   const token = await getLiveKitToken('zkpremios', 'admin');
   ```
3. ZK Studio conecta ao LiveKit:
   ```typescript
   await room.connect(livekitUrl, token);
   ```
4. ZK Studio publica suas fontes/edições:
   - Vídeo composto (cenas editadas)
   - Áudio mixado
   - Tudo que foi editado no ZK Studio

**Status:**
- ✅ ZK Studio conectado ao LiveKit
- ✅ ZK Studio transmitindo conteúdo editado
- ✅ Conteúdo disponível no room `zkpremios`

---

### 4️⃣ **Site Detecta e Mostra Conteúdo**

**No site (LiveViewer):**
1. Site detecta `is_active = true` via Realtime
2. Site conecta ao LiveKit usando `LiveKitViewer`:
   - Room: `zkpremios`
   - Role: `viewer`
3. Site recebe tracks de vídeo/áudio do ZK Studio
4. Site renderiza o conteúdo editado pelo admin no ZK Studio

**Resultado:**
- ✅ Admin vê preview da transmissão (como os usuários verão)
- ✅ Usuários veem a transmissão ao vivo
- ✅ Conteúdo editado no ZK Studio aparece no site

---

## 🔄 Fluxo Visual Completo

```
┌─────────────────────────────────────────────────────────┐
│ 1. ADMIN CRIA LIVE (Site)                              │
│    - Título: "Cruzeiro x Santos"                       │
│    - channel_name: "cruzeiro-x-santos"                 │
│    - is_active: false                                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. ADMIN INICIA TRANSMISSÃO (Site)                     │
│    - Clica "Iniciar Transmissão"                       │
│    - is_active: true                                   │
│    - hls_url: https://.../hls/zkpremios/index.m3u8    │
│    - Site mostra preview (aguardando ZK Studio)        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. ZK STUDIO DETECTA LIVE ATIVA                        │
│    - Busca live ativa no Supabase                      │
│    - Obtém token para room "zkpremios"                 │
│    - Conecta ao LiveKit                                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. ZK STUDIO TRANSMITE CONTEÚDO EDITADO                │
│    - Publica vídeo composto (cenas editadas)          │
│    - Publica áudio mixado                              │
│    - Tudo que foi editado no ZK Studio                 │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 5. SITE RECEBE E RENDERIZA                             │
│    - LiveKitViewer conecta ao room "zkpremios"         │
│    - Recebe tracks de vídeo/áudio                      │
│    - Renderiza conteúdo editado                        │
│    - Admin vê preview (como usuários verão)            │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ O Que Precisa Acontecer

### **No Site (AdminLiveStreamPage):**

Quando admin clica "Iniciar Transmissão":
```typescript
const startStream = async () => {
  // 1. Atualizar live como ativa
  await supabase
    .from('live_streams')
    .update({
      is_active: true,
      started_at: new Date().toISOString(),
      hls_url: 'https://zkoficial-6xokn1hv.livekit.cloud/hls/zkpremios/index.m3u8'
    })
    .eq('id', selectedStream.id);
  
  // 2. Site já mostra preview (LiveViewer detecta via Realtime)
  // 3. Aguarda ZK Studio conectar e transmitir
};
```

### **No ZK Studio:**

Quando admin clica "Iniciar Transmissão" no ZK Studio:
```typescript
async startStream(): Promise<void> {
  // 1. Buscar live ativa no Supabase
  const activeStream = await fetch(
    `${supabaseUrl}/rest/v1/live_streams?is_active=eq.true&limit=1`
  );
  
  // 2. Obter token para room fixo "zkpremios"
  const token = await getLiveKitToken('zkpremios', 'admin');
  
  // 3. Conectar ao LiveKit
  await room.connect(livekitUrl, token);
  
  // 4. Publicar conteúdo editado
  await room.localParticipant.publishTrack(videoTrack);
  await room.localParticipant.publishTrack(audioTrack);
  
  // 5. Notificar Supabase (opcional, já está ativa)
  // O site já detecta via Realtime quando ZK Studio começa a transmitir
}
```

### **No Site (LiveViewer):**

Automaticamente:
```typescript
// 1. Detecta is_active = true via Realtime
// 2. Conecta ao LiveKit room "zkpremios"
// 3. Recebe tracks do ZK Studio
// 4. Renderiza conteúdo editado
```

---

## ✅ Status Atual

### **O que está funcionando:**
- ✅ Admin pode criar live no painel
- ✅ Admin pode iniciar transmissão (marca como ativa)
- ✅ Site detecta mudanças via Realtime
- ✅ Site conecta ao LiveKit
- ✅ ZK Studio pode transmitir para `zkpremios`

### **O que precisa ser verificado:**
- ⚠️ ZK Studio está transmitindo? (verificar logs)
- ⚠️ Site está recebendo tracks? (verificar logs)
- ⚠️ Room name está correto? (`zkpremios` minúsculo)

---

## 🎯 Resultado Esperado

**Quando tudo estiver funcionando:**

1. **Admin cria live** → Live criada no banco
2. **Admin inicia transmissão** → Live marcada como ativa
3. **ZK Studio inicia transmissão** → Conecta ao LiveKit e transmite
4. **Site detecta** → Conecta ao LiveKit e recebe vídeo
5. **Admin vê preview** → Vê exatamente como os usuários verão
6. **Usuários veem live** → Veem o conteúdo editado no ZK Studio

**O conteúdo editado no ZK Studio (cenas, fontes, edições) aparece automaticamente no site!**

---

## 🔍 Como Verificar se Está Funcionando

### **Logs do ZK Studio devem mostrar:**
```
[LiveKitService] ✅ Conectado à sala: zkpremios
[LiveKitService] ✅ Track de vídeo publicada
[LiveKitService] ✅ Track de áudio publicada
[VideoComposer] 🎬 Frame X, delay: Yms
```

### **Logs do Site devem mostrar:**
```
✅ LiveKitViewer: Conectado ao LiveKit
👤 LiveKitViewer: Participante conectado: admin-XXXXX
📹 LiveKitViewer: Vídeo track recebido
🔊 LiveKitViewer: Áudio track recebido
```

### **Se não aparecer vídeo:**
1. Verificar se ZK Studio está transmitindo (logs)
2. Verificar se room name está correto (`zkpremios`)
3. Verificar se site está conectado ao mesmo room
4. Verificar se tracks estão sendo recebidas

---

## 📝 Resumo

**Fluxo Ideal:**
1. Admin cria live → Banco
2. Admin inicia → `is_active = true`
3. ZK Studio detecta → Conecta e transmite
4. Site detecta → Conecta e recebe
5. **Conteúdo editado aparece automaticamente!**

**O ZK Studio NÃO precisa saber qual live específica - ele sempre transmite para `zkpremios` e o site sempre conecta ao mesmo room!**
