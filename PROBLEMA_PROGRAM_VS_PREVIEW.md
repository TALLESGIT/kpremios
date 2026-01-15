# 🎬 Problema: ZK Studio Transmitindo Tela Errada

## ❌ PROBLEMA IDENTIFICADO

### **No ZK Studio existem 2 telas:**

1. **Preview Edição** (Tela de Edição)
   - Onde o admin edita fontes, cenas, efeitos
   - É uma tela de trabalho/preview interno
   - ❌ **NÃO deve ser transmitida para o site**

2. **Programa** (Tela de Saída)
   - O que realmente vai "para o ar"
   - É o resultado final editado
   - ✅ **DEVE ser transmitida para o site**

### **Problema Atual:**
- ❌ ZK Studio está transmitindo a tela de **Preview Edição**
- ❌ Site admin recebe a tela de Preview Edição (não o que deveria)
- ❌ Site admin não vê o conteúdo que os usuários deveriam ver

---

## ✅ SOLUÇÃO

### **No ZK Studio:**

O ZK Studio precisa publicar a track da tela de **Programa** ao invés da tela de Preview Edição.

**Código que precisa ser corrigido no ZK Studio:**

```typescript
// ❌ ERRADO - Publicando Preview Edição
const previewTrack = await createLocalVideoTrack({
  source: 'preview' // ❌ Tela de Preview Edição
});
await room.localParticipant.publishTrack(previewTrack);

// ✅ CORRETO - Publicar Programa
const programTrack = await createLocalVideoTrack({
  source: 'program' // ✅ Tela de Programa (saída final)
});
await room.localParticipant.publishTrack(programTrack);
```

**Ou, se usar canvas/elemento:**

```typescript
// No ZK Studio - Capturar elemento da tela de PROGRAMA
const programCanvas = document.getElementById('program-canvas'); // Tela Programa
const programStream = programCanvas.captureStream(30); // 30fps
const programVideoTrack = programStream.getVideoTracks()[0];

// Publicar track do Programa
await room.localParticipant.publishTrack(programVideoTrack);
```

---

## 🔄 FLUXO CORRETO

```
┌─────────────────────────────────────────────────────────┐
│ ZK Studio - Preview Edição                             │
│ - Admin edita cenas, fontes, efeitos                   │
│ - Tela de trabalho (NÃO transmite)                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ ZK Studio - Programa                                   │
│ - Resultado final editado                              │
│ - ✅ ESTA tela é transmitida para LiveKit              │
│ - É o que os usuários devem ver                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ LiveKit Room: zkpremios                                │
│ - Recebe track de vídeo da tela Programa               │
│ - Transmite para viewers                               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Site Admin (Painel)                                    │
│ - LiveKitViewer conecta ao room zkpremios              │
│ - Recebe track de vídeo                                │
│ - ✅ Renderiza tela Programa em tempo real             │
│ - Admin vê exatamente o que usuários verão             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Site Público (Usuários)                                │
│ - Quando is_active = true                              │
│ - Usuários veem a mesma tela Programa                  │
│ - ✅ Verão o conteúdo final editado                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 COMO VERIFICAR NO ZK STUDIO

### **1. Verificar qual tela está sendo capturada:**

No código do ZK Studio, procurar onde está sendo criada a track de vídeo:

```typescript
// Verificar qual elemento/canvas está sendo usado
const videoElement = document.getElementById('???');
const stream = videoElement.captureStream(30);
const videoTrack = stream.getVideoTracks()[0];

// Deve ser a tela de PROGRAMA, não Preview Edição
```

### **2. Verificar qual track está sendo publicada:**

```typescript
// Verificar qual track está sendo publicada
await room.localParticipant.publishTrack(videoTrack);

// O videoTrack deve vir da tela de PROGRAMA
```

### **3. Logs para debug:**

No ZK Studio, adicionar logs:

```typescript
console.log('[ZK Studio] 📹 Publicando track:', {
  source: 'program', // ou 'preview'
  elementId: programCanvas.id, // verificar qual elemento
  width: videoTrack.getSettings().width,
  height: videoTrack.getSettings().height
});
```

---

## ✅ O QUE O SITE JÁ ESTÁ FAZENDO CORRETO

O site admin já está configurado para receber e renderizar em tempo real:

1. ✅ **LiveKitViewer** conecta ao room `zkpremios`
2. ✅ **Recebe tracks** de vídeo/áudio automaticamente
3. ✅ **Renderiza em tempo real** quando track é recebida
4. ✅ **Verifica participantes** já conectados ao entrar no room

**O problema não está no site - está no ZK Studio transmitindo a tela errada!**

---

## 🎯 SOLUÇÃO RÁPIDA

**No ZK Studio, quando publicar o track de vídeo:**

1. **Identificar o elemento/canvas da tela PROGRAMA**
2. **Capturar stream desse elemento** (não da Preview Edição)
3. **Publicar essa track** no LiveKit

**Exemplo:**

```typescript
// No ZK Studio
async publishProgramToLiveKit() {
  // 1. Obter elemento da tela PROGRAMA (não Preview Edição)
  const programOutput = document.getElementById('program-output'); // Tela Programa
  // OU
  const programCanvas = document.querySelector('[data-program-output]');
  
  // 2. Capturar stream do Programa
  const programStream = programOutput.captureStream(30); // 30fps
  const programVideoTrack = programStream.getVideoTracks()[0];
  const programAudioTrack = programStream.getAudioTracks()[0];
  
  // 3. Publicar no LiveKit (room zkpremios)
  const token = await getLiveKitToken('zkpremios', 'admin');
  await room.connect(livekitUrl, token);
  await room.localParticipant.publishTrack(programVideoTrack);
  if (programAudioTrack) {
    await room.localParticipant.publishTrack(programAudioTrack);
  }
  
  console.log('✅ [ZK Studio] Transmitindo tela PROGRAMA para LiveKit');
}
```

---

## 📝 RESUMO

**Problema:**
- ❌ ZK Studio transmite tela de Preview Edição (trabalho interno)
- ✅ Deveria transmitir tela de Programa (saída final)

**Solução:**
- ✅ No ZK Studio, capturar e publicar track da tela **PROGRAMA**
- ✅ Site já está pronto para receber e renderizar em tempo real

**Verificar no ZK Studio:**
- Qual elemento/canvas está sendo capturado
- Se é a tela de Programa ou Preview Edição
- Ajustar para capturar sempre a tela de Programa
