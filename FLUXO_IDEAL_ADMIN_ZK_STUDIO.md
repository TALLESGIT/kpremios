# 🎬 Fluxo Ideal: ZK Studio → Admin → Site

## 📋 Como DEVERIA Funcionar

### 🎯 **Conceito Principal: Admin Vê Preview ANTES de Iniciar Transmissão**

O admin deve poder **editar e visualizar o conteúdo no ZK Studio ANTES de iniciar a transmissão** para os usuários. Isso permite que o admin veja exatamente como ficará antes de "ir ao ar".

---

### 1️⃣ **ZK Studio Transmite Preview (Privado)**

**No ZK Studio:**
1. Admin abre ZK Studio e cria/edita cenas (fontes, edições, etc.)
2. Admin clica "Iniciar Preview" no ZK Studio (NÃO "Iniciar Transmissão")
3. ZK Studio conecta ao LiveKit room `zkpremios`:
   ```typescript
   const token = await getLiveKitToken('zkpremios', 'admin');
   await room.connect(livekitUrl, token);
   ```
4. ZK Studio publica conteúdo editado:
   - Vídeo composto (cenas editadas)
   - Áudio mixado
   - Tudo que foi editado no ZK Studio

**Status:**
- ✅ ZK Studio transmitindo conteúdo editado
- ✅ Conteúdo disponível no room `zkpremios`
- ⚠️ Live ainda NÃO está ativa (`is_active = false`)
- ⚠️ Usuários ainda NÃO veem (site não mostra para público)

---

### 2️⃣ **Admin Vê Preview no Painel (Como Usuários Verão)**

**No site (AdminLiveStreamPage):**
1. Admin já tem uma live criada (ou cria uma nova)
2. Admin abre o painel admin da live
3. Site conecta ao LiveKit room `zkpremios`:
   - Usa `LiveKitViewer` com role `viewer`
   - Recebe tracks do ZK Studio
4. **Admin vê preview em tempo real** do que está sendo editado no ZK Studio

**Status:**
- ✅ Admin vê conteúdo editado no ZK Studio
- ✅ Preview funciona mesmo com `is_active = false`
- ⚠️ Usuários ainda NÃO veem (live não está ativa)
- ✅ Admin pode aprovar/ajustar antes de "ir ao ar"

---

### 3️⃣ **Admin Inicia Transmissão (Torna Público)**

**No site (AdminLiveStreamPage - botão "Iniciar Transmissão"):**
1. Admin revisa o preview e está satisfeito
2. Admin clica em "Iniciar Transmissão"
3. Site atualiza `live_streams`:
   - `is_active = true`
   - `started_at = now()`
   - `hls_url = https://zkoficial-6xokn1hv.livekit.cloud/hls/zkpremios/index.m3u8`
4. Site continua mostrando preview (agora também visível para usuários)

**Status:**
- ✅ Live marcada como ativa (`is_active = true`)
- ✅ `hls_url` configurado
- ✅ ZK Studio já estava transmitindo (conteúdo já disponível)
- ✅ Site mostra para admin E usuários

---

### 4️⃣ **Usuários Veem Transmissão Ao Vivo**

**No site (Páginas públicas - LiveViewer):**
1. Site detecta `is_active = true` via Realtime
2. Site conecta ao LiveKit usando `LiveKitViewer`:
   - Room: `zkpremios`
   - Role: `viewer`
3. Site recebe tracks de vídeo/áudio do ZK Studio
4. **Usuários veem a transmissão ao vivo**

**Resultado:**
- ✅ Admin já estava vendo preview
- ✅ Usuários agora também veem
- ✅ Conteúdo editado no ZK Studio aparece para todos

---

## 🔄 Fluxo Visual Completo

```
┌─────────────────────────────────────────────────────────┐
│ 1. ADMIN CRIA LIVE (Site) - OPCIONAL                   │
│    - Título: "Cruzeiro x Santos"                       │
│    - channel_name: "cruzeiro-x-santos"                 │
│    - is_active: false                                  │
│    - (Pode criar depois também)                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. ZK STUDIO TRANSMITE PREVIEW (Privado)               │
│    - Admin edita cenas no ZK Studio                    │
│    - Admin clica "Iniciar Preview"                     │
│    - ZK Studio conecta ao room "zkpremios"             │
│    - ZK Studio publica conteúdo editado                │
│    - is_active: false (ainda não público)              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. ADMIN VÊ PREVIEW NO PAINEL (Privado)                │
│    - Admin abre painel da live                         │
│    - Site conecta ao room "zkpremios"                  │
│    - Admin vê conteúdo editado em tempo real           │
│    - Admin revisa e aprova antes de "ir ao ar"         │
│    - is_active: false (usuários ainda não veem)        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. ADMIN INICIA TRANSMISSÃO (Torna Público)            │
│    - Admin clica "Iniciar Transmissão" no site         │
│    - is_active: true                                   │
│    - hls_url: https://.../hls/zkpremios/index.m3u8    │
│    - Conteúdo já estava disponível (ZK Studio já       │
│      transmitindo)                                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 5. USUÁRIOS VEEM TRANSMISSÃO AO VIVO (Público)         │
│    - Site detecta is_active: true                      │
│    - Site conecta ao room "zkpremios"                  │
│    - Usuários recebem tracks de vídeo/áudio            │
│    - Usuários veem conteúdo editado                    │
│    - Admin continua vendo (mesmo preview)              │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ O Que Precisa Acontecer

### **No ZK Studio (PRIMEIRO - Preview Privado):**

Quando admin clica "Iniciar Preview" no ZK Studio:
```typescript
async startPreview(): Promise<void> {
  // 1. Obter token para room fixo "zkpremios"
  const token = await getLiveKitToken('zkpremios', 'admin');
  
  // 2. Conectar ao LiveKit
  await room.connect(livekitUrl, token);
  
  // 3. Publicar conteúdo editado (preview)
  await room.localParticipant.publishTrack(videoTrack);
  await room.localParticipant.publishTrack(audioTrack);
  
  // 4. NÃO atualizar Supabase ainda (is_active = false)
  //    Preview só para admin ver
}
```

### **No Site (AdminLiveStreamPage - Preview):**

Sempre mostra preview (mesmo com `is_active = false`):
```typescript
// AdminLiveStreamPage.tsx
<LiveViewer
  channelName={selectedStream.channel_name}
  fitMode="contain"
  showOfflineMessage={false}
  isAdmin={true}
/>

// LiveViewer sempre conecta ao room "zkpremios"
// Se ZK Studio estiver transmitindo, admin vê preview
// Se is_active = false, apenas admin vê (usuários não)
```

### **No Site (AdminLiveStreamPage - Tornar Público):**

Quando admin clica "Iniciar Transmissão":
```typescript
const startStream = async () => {
  // 1. Atualizar live como ativa (torna público)
  await supabase
    .from('live_streams')
    .update({
      is_active: true,
      started_at: new Date().toISOString(),
      hls_url: 'https://zkoficial-6xokn1hv.livekit.cloud/hls/zkpremios/index.m3u8'
    })
    .eq('id', selectedStream.id);
  
  // 2. ZK Studio já estava transmitindo (preview)
  // 3. Agora usuários também podem ver
  // 4. Admin continua vendo o mesmo preview
};
```

### **No Site (Páginas Públicas - LiveViewer):**

Apenas quando `is_active = true`:
```typescript
// PublicLiveStreamPage.tsx ou ZkTVPage.tsx
if (stream.is_active) {
  // Mostra LiveViewer (conecta ao room "zkpremios")
  // Usuários veem conteúdo do ZK Studio
}
```

---

## ✅ Vantagens Deste Fluxo

### **1. Preview Antes de "Ir ao Ar"**
- ✅ Admin vê exatamente como ficará antes de tornar público
- ✅ Pode ajustar cenas, fontes, edições no ZK Studio
- ✅ Revisa preview no painel antes de iniciar

### **2. Controle Total**
- ✅ Admin decide quando tornar público
- ✅ Preview funciona independente de `is_active`
- ✅ Usuários só veem quando admin autoriza

### **3. Sem Interrupções**
- ✅ ZK Studio pode transmitir preview continuamente
- ✅ Admin inicia transmissão quando estiver pronto
- ✅ Sem delay - conteúdo já está disponível

---

## ✅ Status Atual

### **O que está funcionando:**
- ✅ Admin pode criar live no painel
- ✅ Site conecta ao LiveKit (preview)
- ✅ ZK Studio pode transmitir para `zkpremios`
- ✅ Admin pode iniciar transmissão (marca como ativa)

### **O que precisa ser implementado:**
- ⚠️ LiveViewer deve funcionar mesmo com `is_active = false` (apenas para admin)
- ⚠️ Páginas públicas só devem mostrar quando `is_active = true`
- ⚠️ ZK Studio precisa de modo "Preview" vs "Transmissão"

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

**Fluxo Ideal: ZK Studio → Admin → Site**

1. **ZK Studio transmite preview** (privado, `is_active = false`)
   - Admin edita conteúdo no ZK Studio
   - ZK Studio conecta ao room `zkpremios` e transmite
   - Apenas admin pode ver (preview)

2. **Admin vê preview no painel** (privado)
   - Admin abre painel da live
   - Site conecta ao room `zkpremios`
   - Admin vê conteúdo editado em tempo real
   - Admin revisa e aprova

3. **Admin inicia transmissão** (`is_active = true`)
   - Admin clica "Iniciar Transmissão"
   - Live torna-se pública
   - Conteúdo já estava disponível (ZK Studio transmitindo)

4. **Usuários veem ao vivo** (público)
   - Site detecta `is_active = true`
   - Usuários conectam ao room `zkpremios`
   - Usuários veem conteúdo editado

**Principais Benefícios:**
- ✅ Admin vê preview ANTES de tornar público
- ✅ Controle total sobre quando "ir ao ar"
- ✅ Sem delay - conteúdo já disponível
- ✅ ZK Studio sempre transmite para `zkpremios` (fixo)
- ✅ Site sempre conecta ao mesmo room `zkpremios`
